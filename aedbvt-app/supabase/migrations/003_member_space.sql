begin;

alter table public.members add column if not exists verification_token uuid default gen_random_uuid();
update public.members set verification_token = gen_random_uuid() where verification_token is null;
alter table public.members alter column verification_token set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_verification_token_key'
  ) then
    alter table public.members add constraint members_verification_token_key unique (verification_token);
  end if;
end $$;

create table if not exists public.member_service_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  request_type text not null check (request_type in ('attestation','information','correction','aide','document','autre')),
  subject text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','in_review','completed','rejected')),
  response text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_service_requests enable row level security;

revoke all on table public.member_service_requests from anon, authenticated;
grant select, insert, update on table public.member_service_requests to authenticated;

create policy member_requests_read on public.member_service_requests
for select to authenticated
using (
  public.is_staff()
  or exists (
    select 1 from public.members m
    where m.id = member_id and m.profile_id = auth.uid()
  )
);

create policy member_requests_self_insert on public.member_service_requests
for insert to authenticated
with check (
  exists (
    select 1 from public.members m
    where m.id = member_id and m.profile_id = auth.uid()
  )
);

create policy member_requests_staff_update on public.member_service_requests
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

drop trigger if exists audit_member_service_requests on public.member_service_requests;
create trigger audit_member_service_requests
after insert or update or delete on public.member_service_requests
for each row execute function public.audit_row();

create or replace function public.update_my_member_profile(
  p_phone text,
  p_program text,
  p_study_level text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.members
  set
    phone = nullif(trim(coalesce(p_phone,'')),''),
    program = nullif(trim(coalesce(p_program,'')),''),
    study_level = nullif(trim(coalesce(p_study_level,'')),'')
  where profile_id = auth.uid();

  if not found then
    raise exception 'Aucun profil membre lié à ce compte.';
  end if;
end $$;

revoke all on function public.update_my_member_profile(text,text,text) from public;
grant execute on function public.update_my_member_profile(text,text,text) to authenticated;

commit;
