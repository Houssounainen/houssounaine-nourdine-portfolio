begin;

create sequence if not exists public.correspondence_seq start 1;
create sequence if not exists public.issuance_seq start 1;

create table if not exists public.administrative_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  document_type text not null check (document_type in ('attestation','letter','notice','request','other')),
  subject_template text,
  body_template text not null,
  variables jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.correspondence_register (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default ('COR-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.correspondence_seq')::text,4,'0')),
  direction text not null check (direction in ('incoming','outgoing')),
  category text not null default 'general',
  subject text not null,
  correspondent_name text not null,
  correspondent_contact text,
  body text,
  received_on date,
  sent_on date,
  status text not null default 'draft' check (status in ('draft','registered','review','approved','dispatched','closed','rejected')),
  member_id uuid references public.members(id) on delete set null,
  service_request_id uuid references public.member_service_requests(id) on delete set null,
  decision_id uuid references public.decision_register(id) on delete set null,
  template_id uuid references public.administrative_templates(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  secretary_approved_by uuid references public.profiles(id) on delete set null,
  secretary_approved_at timestamptz,
  presidency_approved_by uuid references public.profiles(id) on delete set null,
  presidency_approved_at timestamptz,
  dispatched_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.administrative_issuances (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default ('ADM-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.issuance_seq')::text,4,'0')),
  document_type text not null check (document_type in ('attestation','certificate','letter','other')),
  member_id uuid references public.members(id) on delete restrict,
  template_id uuid references public.administrative_templates(id) on delete set null,
  service_request_id uuid references public.member_service_requests(id) on delete set null,
  subject text not null,
  purpose text,
  body_snapshot text not null,
  status text not null default 'draft' check (status in ('draft','review','approved','issued','rejected','cancelled')),
  secretary_approved_by uuid references public.profiles(id) on delete set null,
  secretary_approved_at timestamptz,
  presidency_approved_by uuid references public.profiles(id) on delete set null,
  presidency_approved_at timestamptz,
  issued_at timestamptz,
  verification_token uuid not null default gen_random_uuid() unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.administrative_attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('correspondence','issuance')),
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null unique,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.administrative_templates enable row level security;
alter table public.correspondence_register enable row level security;
alter table public.administrative_issuances enable row level security;
alter table public.administrative_attachments enable row level security;

revoke all on table public.administrative_templates, public.correspondence_register,
  public.administrative_issuances, public.administrative_attachments from anon, authenticated;

grant select, insert, update on table public.administrative_templates, public.correspondence_register,
  public.administrative_issuances, public.administrative_attachments to authenticated;
grant usage, select on sequence public.correspondence_seq, public.issuance_seq to authenticated;

create policy admin_templates_staff on public.administrative_templates for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy correspondence_staff on public.correspondence_register for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy issuances_staff on public.administrative_issuances for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy issuances_member_read on public.administrative_issuances for select to authenticated
using (
  status='issued'
  and exists(select 1 from public.members m where m.id=member_id and m.profile_id=auth.uid())
);

create policy admin_attachments_staff on public.administrative_attachments for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy admin_attachments_member_read on public.administrative_attachments for select to authenticated
using (
  entity_type='issuance'
  and exists(
    select 1
    from public.administrative_issuances i
    join public.members m on m.id=i.member_id
    where i.id=entity_id and i.status='issued' and m.profile_id=auth.uid()
  )
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'administrative-files',
  'administrative-files',
  false,
  5242880,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=false,
  file_size_limit=5242880,
  allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'];

drop policy if exists administrative_storage_read on storage.objects;
create policy administrative_storage_read on storage.objects
for select to authenticated
using (
  bucket_id='administrative-files'
  and (
    public.is_staff()
    or exists(
      select 1
      from public.administrative_attachments a
      join public.administrative_issuances i on i.id=a.entity_id and a.entity_type='issuance'
      join public.members m on m.id=i.member_id
      where a.storage_path=name and i.status='issued' and m.profile_id=auth.uid()
    )
  )
);

drop policy if exists administrative_storage_insert on storage.objects;
create policy administrative_storage_insert on storage.objects
for insert to authenticated
with check (bucket_id='administrative-files' and public.is_staff());

drop policy if exists administrative_storage_delete on storage.objects;
create policy administrative_storage_delete on storage.objects
for delete to authenticated
using (bucket_id='administrative-files' and public.is_staff());

create or replace function public.submit_outgoing_correspondence(p_correspondence_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_staff() then
    raise exception 'Accès secrétariat requis.';
  end if;

  update public.correspondence_register
  set status='review',updated_at=now()
  where id=p_correspondence_id and direction='outgoing' and status='draft';

  if not found then
    raise exception 'Seul un courrier sortant en brouillon peut être soumis.';
  end if;
end $$;

revoke all on function public.submit_outgoing_correspondence(uuid) from public;
grant execute on function public.submit_outgoing_correspondence(uuid) to authenticated;

create or replace function public.review_correspondence(
  p_correspondence_id uuid,
  p_stage text,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare c public.correspondence_register%rowtype;
declare r public.app_role;
begin
  r:=public.current_role();
  select * into c from public.correspondence_register where id=p_correspondence_id for update;
  if not found or c.direction<>'outgoing' or c.status not in ('review','approved') then
    raise exception 'Courrier non disponible pour validation.';
  end if;

  if p_stage='secretariat' then
    if r not in ('admin','bureau','secretaire') then
      raise exception 'Validation secrétariat non autorisée.';
    end if;
    if not p_approve then
      update public.correspondence_register set status='rejected',updated_at=now() where id=p_correspondence_id;
      return;
    end if;
    update public.correspondence_register
    set secretary_approved_by=auth.uid(),secretary_approved_at=now(),updated_at=now()
    where id=p_correspondence_id;
  elsif p_stage='presidency' then
    if r not in ('admin','bureau') then
      raise exception 'Validation présidence non autorisée.';
    end if;
    if c.secretary_approved_by is null then
      raise exception 'La validation secrétariat est requise en premier.';
    end if;
    if c.secretary_approved_by=auth.uid() then
      raise exception 'La seconde validation doit être effectuée par une autre personne.';
    end if;
    if not p_approve then
      update public.correspondence_register set status='rejected',updated_at=now() where id=p_correspondence_id;
      return;
    end if;
    update public.correspondence_register
    set presidency_approved_by=auth.uid(),presidency_approved_at=now(),status='approved',updated_at=now()
    where id=p_correspondence_id;
  else
    raise exception 'Étape de validation invalide.';
  end if;
end $$;

revoke all on function public.review_correspondence(uuid,text,boolean) from public;
grant execute on function public.review_correspondence(uuid,text,boolean) to authenticated;

create or replace function public.dispatch_correspondence(p_correspondence_id uuid, p_sent_on date default current_date)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_staff() then
    raise exception 'Accès secrétariat requis.';
  end if;

  update public.correspondence_register
  set status='dispatched',
      sent_on=coalesce(p_sent_on,current_date),
      dispatched_at=now(),
      updated_at=now()
  where id=p_correspondence_id and direction='outgoing' and status='approved';

  if not found then
    raise exception 'Le courrier doit être approuvé avant envoi.';
  end if;
end $$;

revoke all on function public.dispatch_correspondence(uuid,date) from public;
grant execute on function public.dispatch_correspondence(uuid,date) to authenticated;

create or replace function public.submit_issuance(p_issuance_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_staff() then
    raise exception 'Accès secrétariat requis.';
  end if;
  update public.administrative_issuances
  set status='review',updated_at=now()
  where id=p_issuance_id and status='draft';

  if not found then
    raise exception 'Seul un brouillon peut être soumis.';
  end if;
end $$;

revoke all on function public.submit_issuance(uuid) from public;
grant execute on function public.submit_issuance(uuid) to authenticated;

create or replace function public.review_issuance(
  p_issuance_id uuid,
  p_stage text,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare i public.administrative_issuances%rowtype;
declare r public.app_role;
begin
  r:=public.current_role();
  select * into i from public.administrative_issuances where id=p_issuance_id for update;
  if not found or i.status not in ('review','approved') then
    raise exception 'Document non disponible pour validation.';
  end if;

  if p_stage='secretariat' then
    if r not in ('admin','bureau','secretaire') then
      raise exception 'Validation secrétariat non autorisée.';
    end if;
    if not p_approve then
      update public.administrative_issuances set status='rejected',updated_at=now() where id=p_issuance_id;
      return;
    end if;
    update public.administrative_issuances
    set secretary_approved_by=auth.uid(),secretary_approved_at=now(),updated_at=now()
    where id=p_issuance_id;
  elsif p_stage='presidency' then
    if r not in ('admin','bureau') then
      raise exception 'Validation présidence non autorisée.';
    end if;
    if i.secretary_approved_by is null then
      raise exception 'La validation secrétariat est requise en premier.';
    end if;
    if i.secretary_approved_by=auth.uid() then
      raise exception 'La seconde validation doit être effectuée par une autre personne.';
    end if;
    if not p_approve then
      update public.administrative_issuances set status='rejected',updated_at=now() where id=p_issuance_id;
      return;
    end if;
    update public.administrative_issuances
    set presidency_approved_by=auth.uid(),presidency_approved_at=now(),status='approved',updated_at=now()
    where id=p_issuance_id;
  else
    raise exception 'Étape de validation invalide.';
  end if;
end $$;

revoke all on function public.review_issuance(uuid,text,boolean) from public;
grant execute on function public.review_issuance(uuid,text,boolean) to authenticated;

create or replace function public.issue_administrative_document(p_issuance_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_staff() then
    raise exception 'Accès secrétariat requis.';
  end if;

  update public.administrative_issuances
  set status='issued',issued_at=now(),updated_at=now()
  where id=p_issuance_id and status='approved';

  if not found then
    raise exception 'Le document doit être approuvé avant délivrance.';
  end if;
end $$;

revoke all on function public.issue_administrative_document(uuid) from public;
grant execute on function public.issue_administrative_document(uuid) to authenticated;

create or replace function public.verify_administrative_document(p_token uuid)
returns table(
  valid boolean,
  number text,
  subject text,
  document_type text,
  member_name text,
  member_number text,
  issued_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $
  select
    true,
    i.number,
    i.subject,
    i.document_type,
    m.full_name,
    m.member_number,
    i.issued_at
  from public.administrative_issuances i
  left join public.members m on m.id=i.member_id
  where i.verification_token=p_token and i.status='issued'
$;

revoke all on function public.verify_administrative_document(uuid) from public;
grant execute on function public.verify_administrative_document(uuid) to anon, authenticated;

create or replace function public.guard_administrative_final_state()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_table_name='correspondence_register' and old.status in ('dispatched','closed','rejected') then
    if new.subject is distinct from old.subject or new.body is distinct from old.body or new.correspondent_name is distinct from old.correspondent_name then
      raise exception 'Un courrier finalisé conserve son contenu.';
    end if;
  end if;
  if tg_table_name='administrative_issuances' and old.status in ('issued','rejected','cancelled') then
    if new.subject is distinct from old.subject or new.body_snapshot is distinct from old.body_snapshot or new.member_id is distinct from old.member_id then
      raise exception 'Un document finalisé conserve son contenu.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_correspondence_final_state on public.correspondence_register;
create trigger guard_correspondence_final_state
before update on public.correspondence_register
for each row execute function public.guard_administrative_final_state();

drop trigger if exists guard_issuance_final_state on public.administrative_issuances;
create trigger guard_issuance_final_state
before update on public.administrative_issuances
for each row execute function public.guard_administrative_final_state();

insert into public.administrative_templates(code,title,document_type,subject_template,body_template,variables)
values
(
  'ATT-MEMBRE',
  'Attestation de qualité de membre',
  'attestation',
  'Attestation de qualité de membre',
  'Nous soussignés, responsables de l’AEDBVT, attestons que {{member_name}}, membre n° {{member_number}}, originaire de {{village}}, est enregistré(e) au sein de l’association. La présente attestation est délivrée à sa demande pour servir et valoir ce que de droit.',
  '["member_name","member_number","village","issue_date"]'::jsonb
),
(
  'LET-GEN',
  'Lettre administrative générale',
  'letter',
  '{{subject}}',
  'Madame, Monsieur,

{{body}}

Veuillez agréer l’expression de nos salutations distinguées.',
  '["subject","body","issue_date"]'::jsonb
)
on conflict(code) do nothing;

do $$
declare t text;
begin
  foreach t in array array['administrative_templates','correspondence_register','administrative_issuances','administrative_attachments']
  loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row()',t,t);
  end loop;
end $$;

commit;
