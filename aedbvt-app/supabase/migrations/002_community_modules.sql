begin;

alter table public.members add column if not exists email text;
alter table public.events add column if not exists category text not null default 'Vie associative';
alter table public.meetings add column if not exists mode text not null default 'Présentiel';
alter table public.meetings add column if not exists published boolean not null default false;

create sequence if not exists public.member_seq start 1;

create or replace function public.set_member_number()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.member_number is null then
    new.member_number := 'AED-' || to_char(coalesce(new.joined_at,current_date),'YYYY') || '-' || lpad(nextval('public.member_seq')::text,4,'0');
  end if;
  return new;
end $$;

drop trigger if exists members_number on public.members;
create trigger members_number before insert on public.members
for each row execute function public.set_member_number();

create table if not exists public.event_registrations (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(event_id,user_id)
);

create table if not exists public.meeting_attendance (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(meeting_id,user_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  level text not null default 'info' check (level in ('info','alert','urgent')),
  pinned boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_positions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  mission text not null,
  parent_slug text,
  sort_order integer not null default 0,
  member_id uuid references public.members(id) on delete set null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.organization_positions(slug,title,mission,parent_slug,sort_order) values
('ag','Assemblée générale','Organe souverain : orientations, élections, approbation des rapports et décisions majeures.',null,0),
('president','Président','Représente l’association, coordonne le Bureau et veille à l’exécution des décisions.','ag',10),
('vice-president','Vice-président','Assiste le Président et assure la continuité en cas d’empêchement.','president',20),
('secretariat','Secrétariat général','Prépare les convocations, procès-verbaux, registres, archives et correspondances.','president',30),
('tresorerie','Trésorerie','Tient les comptes, cotisations, pièces justificatives, budget et états financiers.','president',40),
('controle','Contrôle des comptes','Vérifie la caisse, les pièces et la cohérence des informations financières.','ag',50),
('communication','Communication','Anime l’information officielle, les publications et l’identité numérique de l’association.','president',60),
('vie-etudiante','Vie étudiante','Coordonne l’accueil, les événements, l’intégration et les activités étudiantes.','president',70),
('solidarite','Social & solidarité','Coordonne l’entraide et les actions de solidarité dans un cadre confidentiel.','president',80)
on conflict (slug) do update set title=excluded.title, mission=excluded.mission, parent_slug=excluded.parent_slug, sort_order=excluded.sort_order;

alter table public.event_registrations enable row level security;
alter table public.meeting_attendance enable row level security;
alter table public.announcements enable row level security;
alter table public.organization_positions enable row level security;

revoke all on table public.event_registrations, public.meeting_attendance, public.announcements, public.organization_positions from anon, authenticated;
grant select, insert, update, delete on table public.event_registrations, public.meeting_attendance to authenticated;
grant select, insert, update, delete on table public.announcements, public.organization_positions to authenticated;
grant usage, select on sequence public.member_seq to authenticated;

create policy event_reg_read on public.event_registrations for select to authenticated using (true);
create policy event_reg_self_insert on public.event_registrations for insert to authenticated with check (user_id=auth.uid());
create policy event_reg_self_update on public.event_registrations for update to authenticated using (user_id=auth.uid() or public.is_staff()) with check (user_id=auth.uid() or public.is_staff());
create policy event_reg_self_delete on public.event_registrations for delete to authenticated using (user_id=auth.uid() or public.is_staff());

create policy meeting_att_read on public.meeting_attendance for select to authenticated using (true);
create policy meeting_att_self_insert on public.meeting_attendance for insert to authenticated with check (user_id=auth.uid());
create policy meeting_att_self_update on public.meeting_attendance for update to authenticated using (user_id=auth.uid() or public.is_staff()) with check (user_id=auth.uid() or public.is_staff());
create policy meeting_att_self_delete on public.meeting_attendance for delete to authenticated using (user_id=auth.uid() or public.is_staff());

create policy announcements_read on public.announcements for select to authenticated using (published_at is not null or public.is_staff());
create policy announcements_staff_all on public.announcements for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy organization_read on public.organization_positions for select to authenticated using (active=true or public.is_staff());
create policy organization_staff_all on public.organization_positions for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements for each row execute function public.audit_row();
drop trigger if exists audit_organization_positions on public.organization_positions;
create trigger audit_organization_positions after insert or update or delete on public.organization_positions for each row execute function public.audit_row();

commit;
