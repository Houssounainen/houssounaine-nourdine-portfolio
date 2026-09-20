begin;

create table if not exists public.assemblies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assembly_type text not null default 'ordinary' check (assembly_type in ('ordinary','extraordinary')),
  starts_at timestamptz not null,
  location text,
  mode text not null default 'Présentiel' check (mode in ('Présentiel','Visio','Hybride')),
  status text not null default 'draft' check (status in ('draft','published','open','closed','archived')),
  quorum_percent numeric(5,2) not null default 50 check (quorum_percent > 0 and quorum_percent <= 100),
  agenda jsonb not null default '[]'::jsonb,
  notice text,
  minutes text,
  minutes_published boolean not null default false,
  published_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assembly_rsvps (
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('attending','not_attending')),
  updated_at timestamptz not null default now(),
  primary key(assembly_id,user_id)
);

create table if not exists public.assembly_attendance (
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  present boolean not null default true,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references public.profiles(id) on delete set null,
  primary key(assembly_id,member_id)
);

create table if not exists public.assembly_proxies (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  grantor_member_id uuid not null references public.members(id) on delete cascade,
  holder_member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(assembly_id,grantor_member_id),
  check (grantor_member_id <> holder_member_id)
);

create table if not exists public.motions (
  id uuid primary key default gen_random_uuid(),
  assembly_id uuid not null references public.assemblies(id) on delete cascade,
  title text not null,
  body text,
  vote_method text not null default 'secret' check (vote_method in ('secret','recorded')),
  majority_rule text not null default 'simple' check (majority_rule in ('simple','two_thirds')),
  status text not null default 'draft' check (status in ('draft','open','closed','cancelled')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.motion_vote_receipts (
  motion_id uuid not null references public.motions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(motion_id,user_id)
);

create table if not exists public.motion_ballots (
  id uuid primary key default gen_random_uuid(),
  motion_id uuid not null references public.motions(id) on delete cascade,
  choice text not null check (choice in ('yes','no','abstain'))
);

create table if not exists public.recorded_motion_votes (
  motion_id uuid not null references public.motions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  choice text not null check (choice in ('yes','no','abstain')),
  created_at timestamptz not null default now(),
  primary key(motion_id,user_id)
);

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','open','closed','cancelled')),
  rules text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.election_positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  title text not null,
  seats integer not null default 1 check (seats = 1),
  sort_order integer not null default 0
);

create table if not exists public.election_candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.election_positions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  statement text,
  status text not null default 'pending' check (status in ('pending','approved','withdrawn','rejected')),
  created_at timestamptz not null default now(),
  unique(position_id,member_id)
);

create table if not exists public.election_vote_receipts (
  position_id uuid not null references public.election_positions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(position_id,user_id)
);

create table if not exists public.election_ballots (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.election_positions(id) on delete cascade,
  candidate_id uuid not null references public.election_candidates(id) on delete cascade
);

alter table public.assemblies enable row level security;
alter table public.assembly_rsvps enable row level security;
alter table public.assembly_attendance enable row level security;
alter table public.assembly_proxies enable row level security;
alter table public.motions enable row level security;
alter table public.motion_vote_receipts enable row level security;
alter table public.motion_ballots enable row level security;
alter table public.recorded_motion_votes enable row level security;
alter table public.elections enable row level security;
alter table public.election_positions enable row level security;
alter table public.election_candidates enable row level security;
alter table public.election_vote_receipts enable row level security;
alter table public.election_ballots enable row level security;

revoke all on table public.assemblies, public.assembly_rsvps, public.assembly_attendance, public.assembly_proxies,
  public.motions, public.motion_vote_receipts, public.motion_ballots, public.recorded_motion_votes,
  public.elections, public.election_positions, public.election_candidates, public.election_vote_receipts,
  public.election_ballots from anon, authenticated;

grant select, insert, update, delete on table public.assemblies, public.assembly_rsvps, public.assembly_attendance,
  public.assembly_proxies, public.motions, public.recorded_motion_votes, public.elections, public.election_positions,
  public.election_candidates to authenticated;
grant select on table public.motion_vote_receipts, public.election_vote_receipts to authenticated;

create policy assemblies_read on public.assemblies for select to authenticated
using (status <> 'draft' or public.is_staff());
create policy assemblies_manage on public.assemblies for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy assembly_rsvps_read on public.assembly_rsvps for select to authenticated
using (user_id=auth.uid() or public.is_staff());
create policy assembly_rsvps_self_insert on public.assembly_rsvps for insert to authenticated
with check (user_id=auth.uid());
create policy assembly_rsvps_self_update on public.assembly_rsvps for update to authenticated
using (user_id=auth.uid() or public.is_staff()) with check (user_id=auth.uid() or public.is_staff());
create policy assembly_rsvps_self_delete on public.assembly_rsvps for delete to authenticated
using (user_id=auth.uid() or public.is_staff());

create policy assembly_attendance_staff on public.assembly_attendance for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy assembly_proxies_read on public.assembly_proxies for select to authenticated
using (
  public.is_staff()
  or exists(select 1 from public.members m where m.id=grantor_member_id and m.profile_id=auth.uid())
  or exists(select 1 from public.members m where m.id=holder_member_id and m.profile_id=auth.uid())
);
create policy assembly_proxies_self_insert on public.assembly_proxies for insert to authenticated
with check (
  exists(select 1 from public.members m where m.id=grantor_member_id and m.profile_id=auth.uid())
);
create policy assembly_proxies_staff_update on public.assembly_proxies for update to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy motions_read on public.motions for select to authenticated
using (
  status <> 'draft'
  or public.is_staff()
);
create policy motions_manage on public.motions for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy motion_receipts_self on public.motion_vote_receipts for select to authenticated
using (user_id=auth.uid());
create policy recorded_votes_self_read on public.recorded_motion_votes for select to authenticated
using (user_id=auth.uid() or public.is_staff());

create policy elections_read on public.elections for select to authenticated
using (status <> 'draft' or public.is_staff());
create policy elections_manage on public.elections for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy election_positions_read on public.election_positions for select to authenticated
using (
  public.is_staff()
  or exists(select 1 from public.elections e where e.id=election_id and e.status <> 'draft')
);
create policy election_positions_manage on public.election_positions for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy candidates_read on public.election_candidates for select to authenticated
using (
  public.is_staff()
  or status='approved'
  or exists(select 1 from public.members m where m.id=member_id and m.profile_id=auth.uid())
);
create policy candidates_self_insert on public.election_candidates for insert to authenticated
with check (
  status='pending'
  and exists(select 1 from public.members m where m.id=member_id and m.profile_id=auth.uid() and m.status='active')
);
create policy candidates_staff_update on public.election_candidates for update to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy candidates_self_withdraw on public.election_candidates for update to authenticated
using (
  exists(select 1 from public.members m where m.id=member_id and m.profile_id=auth.uid())
)
with check (
  status='withdrawn'
  and exists(select 1 from public.members m where m.id=member_id and m.profile_id=auth.uid())
);
create policy election_receipts_self on public.election_vote_receipts for select to authenticated
using (user_id=auth.uid());

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select id from public.members where profile_id=auth.uid() and status='active' limit 1
$;

revoke all on function public.current_member_id() from public;
grant execute on function public.current_member_id() to authenticated;

create or replace function public.list_proxy_eligible_members()
returns table(id uuid, full_name text, member_number text, village text)
language sql
stable
security definer
set search_path=public
as $$
  select m.id,m.full_name,m.member_number,m.village
  from public.members m
  where m.status='active'
  order by m.full_name
$;

revoke all on function public.list_proxy_eligible_members() from public;
grant execute on function public.list_proxy_eligible_members() to authenticated;

create or replace function public.list_election_candidates(p_election_id uuid)
returns table(candidate_id uuid, position_id uuid, member_id uuid, full_name text, member_number text, village text, statement text, candidate_status text)
language sql
stable
security definer
set search_path=public
as $$
  select c.id,c.position_id,c.member_id,m.full_name,m.member_number,m.village,c.statement,c.status
  from public.election_candidates c
  join public.election_positions p on p.id=c.position_id
  join public.members m on m.id=c.member_id
  where p.election_id=p_election_id
    and (
      c.status='approved'
      or public.is_staff()
      or m.profile_id=auth.uid()
    )
  order by p.sort_order,m.full_name
$;

revoke all on function public.list_election_candidates(uuid) from public;
grant execute on function public.list_election_candidates(uuid) to authenticated;

create or replace function public.set_my_proxy(p_assembly_id uuid, p_holder_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  grantor uuid;
  result_id uuid;
  assembly_status text;
begin
  grantor := public.current_member_id();
  if grantor is null then
    raise exception 'Adhésion active requise.';
  end if;
  if grantor=p_holder_member_id then
    raise exception 'Vous ne pouvez pas vous donner procuration à vous-même.';
  end if;
  if not exists(select 1 from public.members where id=p_holder_member_id and status='active') then
    raise exception 'Mandataire invalide.';
  end if;

  select status into assembly_status from public.assemblies where id=p_assembly_id;
  if assembly_status not in ('published','open') then
    raise exception 'Les procurations ne sont pas ouvertes pour cette assemblée.';
  end if;

  insert into public.assembly_proxies(assembly_id,grantor_member_id,holder_member_id,status,updated_at)
  values(p_assembly_id,grantor,p_holder_member_id,'pending',now())
  on conflict(assembly_id,grantor_member_id) do update
    set holder_member_id=excluded.holder_member_id,status='pending',updated_at=now()
  returning id into result_id;

  return result_id;
end $$;

revoke all on function public.set_my_proxy(uuid,uuid) from public;
grant execute on function public.set_my_proxy(uuid,uuid) to authenticated;

create or replace function public.respond_to_proxy(p_proxy_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare holder uuid;
begin
  if p_status not in ('accepted','rejected') then
    raise exception 'Réponse de procuration invalide.';
  end if;

  select holder_member_id into holder from public.assembly_proxies where id=p_proxy_id for update;
  if holder is null or holder <> public.current_member_id() then
    raise exception 'Seul le mandataire peut répondre à cette procuration.';
  end if;

  update public.assembly_proxies
  set status=p_status, updated_at=now()
  where id=p_proxy_id and status='pending';
end $$;

revoke all on function public.respond_to_proxy(uuid,text) from public;
grant execute on function public.respond_to_proxy(uuid,text) to authenticated;

create or replace function public.revoke_my_proxy(p_proxy_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.assembly_proxies
  set status='revoked', updated_at=now()
  where id=p_proxy_id
    and grantor_member_id=public.current_member_id()
    and status in ('pending','accepted');

  if not found then
    raise exception 'Procuration introuvable ou non révocable.';
  end if;
end $$;

revoke all on function public.revoke_my_proxy(uuid) from public;
grant execute on function public.revoke_my_proxy(uuid) to authenticated;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select id from public.members where profile_id=auth.uid() and status='active' limit 1
$$;

revoke all on function public.current_member_id() from public;
grant execute on function public.current_member_id() to authenticated;

create or replace function public.cast_motion_vote(p_motion_id uuid, p_choice text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  m public.motions%rowtype;
begin
  if public.current_member_id() is null then
    raise exception 'Adhésion active requise.';
  end if;

  select * into m from public.motions where id=p_motion_id for update;
  if not found or m.status <> 'open' then
    raise exception 'Ce vote n’est pas ouvert.';
  end if;
  if m.opens_at is not null and now() < m.opens_at then
    raise exception 'Le vote n’a pas encore commencé.';
  end if;
  if m.closes_at is not null and now() >= m.closes_at then
    raise exception 'Le vote est terminé.';
  end if;
  if p_choice not in ('yes','no','abstain') then
    raise exception 'Choix invalide.';
  end if;

  if m.vote_method='secret' then
    insert into public.motion_vote_receipts(motion_id,user_id) values(p_motion_id,auth.uid());
    insert into public.motion_ballots(motion_id,choice) values(p_motion_id,p_choice);
  else
    insert into public.recorded_motion_votes(motion_id,user_id,choice)
    values(p_motion_id,auth.uid(),p_choice);
  end if;
end $$;

revoke all on function public.cast_motion_vote(uuid,text) from public;
grant execute on function public.cast_motion_vote(uuid,text) to authenticated;

create or replace function public.get_motion_turnout(p_motion_id uuid)
returns bigint
language sql
security definer
set search_path=public
as $$
  select case
    when m.vote_method='secret' then (select count(*) from public.motion_vote_receipts r where r.motion_id=m.id)
    else (select count(*) from public.recorded_motion_votes r where r.motion_id=m.id)
  end
  from public.motions m where m.id=p_motion_id
$;

revoke all on function public.get_motion_turnout(uuid) from public;
grant execute on function public.get_motion_turnout(uuid) to authenticated;

create or replace function public.get_election_turnout(p_position_id uuid)
returns bigint
language sql
security definer
set search_path=public
as $$
  select count(*) from public.election_vote_receipts where position_id=p_position_id
$;

revoke all on function public.get_election_turnout(uuid) from public;
grant execute on function public.get_election_turnout(uuid) to authenticated;

create or replace function public.get_motion_results(p_motion_id uuid)
returns table(choice text, votes bigint)
language plpgsql
security definer
set search_path=public
as $$
declare m public.motions%rowtype;
begin
  select * into m from public.motions where id=p_motion_id;
  if not found then
    return;
  end if;
  if m.status <> 'closed' then
    raise exception 'Résultats indisponibles avant clôture.';
  end if;

  if m.vote_method='secret' then
    return query
      select b.choice,count(*) from public.motion_ballots b
      where b.motion_id=p_motion_id group by b.choice;
  else
    return query
      select v.choice,count(*) from public.recorded_motion_votes v
      where v.motion_id=p_motion_id group by v.choice;
  end if;
end $$;

revoke all on function public.get_motion_results(uuid) from public;
grant execute on function public.get_motion_results(uuid) to authenticated;

create or replace function public.cast_election_vote(p_position_id uuid, p_candidate_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  e public.elections%rowtype;
  candidate_ok boolean;
begin
  if public.current_member_id() is null then
    raise exception 'Adhésion active requise.';
  end if;

  select e1.* into e
  from public.elections e1
  join public.election_positions p on p.election_id=e1.id
  where p.id=p_position_id
  for update;

  if not found or e.status <> 'open' or now() < e.starts_at or now() >= e.ends_at then
    raise exception 'Ce scrutin n’est pas ouvert.';
  end if;

  select exists(
    select 1 from public.election_candidates c
    where c.id=p_candidate_id and c.position_id=p_position_id and c.status='approved'
  ) into candidate_ok;

  if not candidate_ok then
    raise exception 'Candidature invalide.';
  end if;

  insert into public.election_vote_receipts(position_id,user_id) values(p_position_id,auth.uid());
  insert into public.election_ballots(position_id,candidate_id) values(p_position_id,p_candidate_id);
end $$;

revoke all on function public.cast_election_vote(uuid,uuid) from public;
grant execute on function public.cast_election_vote(uuid,uuid) to authenticated;

create or replace function public.get_election_results(p_position_id uuid)
returns table(candidate_id uuid, votes bigint)
language plpgsql
security definer
set search_path=public
as $$
declare election_status text;
begin
  select e.status into election_status
  from public.elections e join public.election_positions p on p.election_id=e.id
  where p.id=p_position_id;

  if election_status is null then
    return;
  end if;
  if election_status <> 'closed' then
    raise exception 'Résultats indisponibles avant clôture.';
  end if;

  return query
    select b.candidate_id,count(*)
    from public.election_ballots b
    where b.position_id=p_position_id
    group by b.candidate_id;
end $$;

revoke all on function public.get_election_results(uuid) from public;
grant execute on function public.get_election_results(uuid) to authenticated;

create or replace function public.get_assembly_quorum(p_assembly_id uuid)
returns table(eligible bigint, present bigint, represented bigint, total_counted bigint, required bigint, met boolean)
language plpgsql
security definer
set search_path=public
as $$
declare
  q numeric(5,2);
begin
  select quorum_percent into q from public.assemblies where id=p_assembly_id;
  return query
  with eligible_members as (
    select id from public.members where status='active'
  ),
  physically_present as (
    select a.member_id from public.assembly_attendance a
    where a.assembly_id=p_assembly_id and a.present=true
  ),
  represented_members as (
    select pr.grantor_member_id
    from public.assembly_proxies pr
    where pr.assembly_id=p_assembly_id
      and pr.status='accepted'
      and exists(
        select 1 from public.assembly_attendance a
        where a.assembly_id=p_assembly_id and a.member_id=pr.holder_member_id and a.present=true
      )
      and not exists(
        select 1 from public.assembly_attendance a
        where a.assembly_id=p_assembly_id and a.member_id=pr.grantor_member_id and a.present=true
      )
  )
  select
    (select count(*) from eligible_members),
    (select count(*) from physically_present),
    (select count(*) from represented_members),
    (select count(*) from physically_present)+(select count(*) from represented_members),
    ceil((select count(*) from eligible_members) * coalesce(q,50) / 100.0)::bigint,
    ((select count(*) from physically_present)+(select count(*) from represented_members))
      >= ceil((select count(*) from eligible_members) * coalesce(q,50) / 100.0)::bigint;
end $$;

revoke all on function public.get_assembly_quorum(uuid) from public;
grant execute on function public.get_assembly_quorum(uuid) to authenticated;

create or replace function public.guard_assembly_status()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if not (
    (old.status='draft' and new.status='published')
    or (old.status='published' and new.status='open')
    or (old.status='open' and new.status='closed')
    or (old.status='closed' and new.status='archived')
  ) then
    raise exception 'Transition d’assemblée invalide : % vers %.',old.status,new.status;
  end if;
  return new;
end $$;

drop trigger if exists guard_assembly_status on public.assemblies;
create trigger guard_assembly_status before update of status on public.assemblies
for each row execute function public.guard_assembly_status();

create or replace function public.guard_motion_status()
returns trigger
language plpgsql
set search_path=public
as $$
declare assembly_status text;
declare quorum_met boolean;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if not (
    (old.status='draft' and new.status in ('open','cancelled'))
    or (old.status='open' and new.status='closed')
  ) then
    raise exception 'Transition de motion invalide : % vers %.',old.status,new.status;
  end if;

  if new.status='open' then
    select status into assembly_status from public.assemblies where id=new.assembly_id;
    select q.met into quorum_met from public.get_assembly_quorum(new.assembly_id) q limit 1;

    if assembly_status <> 'open' then
      raise exception 'L’assemblée doit être ouverte avant le vote.';
    end if;
    if not coalesce(quorum_met,false) then
      raise exception 'Le quorum configuré n’est pas atteint.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_motion_status on public.motions;
create trigger guard_motion_status before update of status on public.motions
for each row execute function public.guard_motion_status();

create or replace function public.guard_election_status()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if not (
    (old.status='draft' and new.status in ('published','cancelled'))
    or (old.status='published' and new.status in ('open','cancelled'))
    or (old.status='open' and new.status='closed')
  ) then
    raise exception 'Transition de scrutin invalide : % vers %.',old.status,new.status;
  end if;
  if new.status='open' then
    if now() < new.starts_at or now() >= new.ends_at then
      raise exception 'Le scrutin ne peut être ouvert qu’entre sa date de début et sa date de clôture.';
    end if;
    if not exists(select 1 from public.election_positions p where p.election_id=new.id) then
      raise exception 'Ajoutez au moins un poste avant d’ouvrir le scrutin.';
    end if;
    if not exists(
      select 1
      from public.election_candidates c
      join public.election_positions p on p.id=c.position_id
      where p.election_id=new.id and c.status='approved'
    ) then
      raise exception 'Au moins une candidature approuvée est requise.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_election_status on public.elections;
create trigger guard_election_status before update of status on public.elections
for each row execute function public.guard_election_status();

do $
declare t text;
begin
  foreach t in array array['assemblies','assembly_proxies','motions','recorded_motion_votes','elections','election_positions','election_candidates']
  loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row()',t,t);
  end loop;
end $$;

commit;
