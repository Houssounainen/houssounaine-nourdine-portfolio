begin;

create sequence if not exists public.membership_application_seq start 1;

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  public_token_hash text not null,
  full_name text not null,
  village text not null check (village in ('Darsalama','Bandrani-Vouani')),
  program text,
  study_level text,
  phone text not null,
  email text not null,
  motivation text,
  status text not null default 'pending' check (status in ('pending','in_review','approved','rejected','withdrawn')),
  decision_note text,
  member_id uuid references public.members(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  consent_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists membership_applications_active_email_unique
on public.membership_applications(lower(email))
where status in ('pending','in_review');

create unique index if not exists membership_applications_active_phone_unique
on public.membership_applications(phone)
where status in ('pending','in_review');

create index if not exists membership_applications_status_idx
on public.membership_applications(status,submitted_at desc);

alter table public.membership_applications enable row level security;

revoke all on table public.membership_applications from anon, authenticated;
grant select on table public.membership_applications to authenticated;

create policy membership_applications_staff_read
on public.membership_applications
for select to authenticated
using (public.is_staff());

create or replace function public.submit_membership_application(
  p_full_name text,
  p_village text,
  p_program text,
  p_study_level text,
  p_phone text,
  p_email text,
  p_motivation text,
  p_consent boolean
)
returns table(reference text, public_token text)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_reference text;
  v_token text;
  v_email text;
begin
  if not p_consent then
    raise exception 'Le consentement est requis.';
  end if;

  if length(trim(coalesce(p_full_name,''))) < 3 then
    raise exception 'Nom complet invalide.';
  end if;

  if p_village not in ('Darsalama','Bandrani-Vouani') then
    raise exception 'Village invalide.';
  end if;

  if length(trim(coalesce(p_phone,''))) < 6 then
    raise exception 'Téléphone invalide.';
  end if;

  v_email := lower(trim(coalesce(p_email,'')));
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Adresse email invalide.';
  end if;

  if exists(
    select 1 from public.members m
    where lower(coalesce(m.email,''))=v_email
      and m.status='active'
  ) then
    raise exception 'Une adhésion active existe déjà avec cette adresse email.';
  end if;

  if exists(
    select 1 from public.membership_applications a
    where lower(a.email)=v_email
      and a.status in ('pending','in_review')
  ) then
    raise exception 'Une candidature est déjà en cours avec cette adresse email.';
  end if;

  if exists(
    select 1 from public.membership_applications a
    where a.phone=trim(p_phone)
      and a.status in ('pending','in_review')
  ) then
    raise exception 'Une candidature est déjà en cours avec ce numéro de téléphone.';
  end if;

  v_reference := 'APP-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.membership_application_seq')::text,4,'0');
  v_token := gen_random_uuid()::text;

  insert into public.membership_applications(
    reference,public_token_hash,full_name,village,program,study_level,phone,email,motivation,consent_at
  )
  values(
    v_reference,
    encode(digest(v_token,'sha256'),'hex'),
    trim(p_full_name),
    p_village,
    nullif(trim(coalesce(p_program,'')),''),
    nullif(trim(coalesce(p_study_level,'')),''),
    trim(p_phone),
    v_email,
    nullif(trim(coalesce(p_motivation,'')),''),
    now()
  );

  insert into public.internal_notifications(recipient_id,kind,title,message,href)
  select p.id,'info','Nouvelle candidature AEDBVT',trim(p_full_name) || ' · ' || v_reference,'/applications'
  from public.profiles p
  where p.active=true
    and p.role in ('admin','bureau','secretaire');

  return query select v_reference,v_token;
end $$;

revoke all on function public.submit_membership_application(text,text,text,text,text,text,text,boolean) from public;
grant execute on function public.submit_membership_application(text,text,text,text,text,text,text,boolean) to anon, authenticated;

create or replace function public.get_membership_application_status(
  p_reference text,
  p_public_token text
)
returns table(
  reference text,
  full_name text,
  status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decision_note text,
  member_number text
)
language sql
stable
security definer
set search_path=public
as $$
  select
    a.reference,
    a.full_name,
    a.status,
    a.submitted_at,
    a.reviewed_at,
    case when a.status in ('approved','rejected') then a.decision_note else null end,
    m.member_number
  from public.membership_applications a
  left join public.members m on m.id=a.member_id
  where a.reference=upper(trim(p_reference))
    and a.public_token_hash=encode(digest(trim(p_public_token),'sha256'),'hex')
  limit 1
$$;

revoke all on function public.get_membership_application_status(text,text) from public;
grant execute on function public.get_membership_application_status(text,text) to anon, authenticated;

create or replace function public.review_membership_application(
  p_application_id uuid,
  p_status text,
  p_decision_note text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_application public.membership_applications%rowtype;
  v_member_id uuid;
  v_member_number text;
begin
  if not public.is_staff() then
    raise exception 'Accès staff requis.';
  end if;

  if p_status not in ('in_review','approved','rejected') then
    raise exception 'Décision invalide.';
  end if;

  select * into v_application
  from public.membership_applications
  where id=p_application_id
  for update;

  if not found then
    raise exception 'Candidature introuvable.';
  end if;

  if v_application.status in ('approved','rejected','withdrawn') then
    raise exception 'Cette candidature est déjà clôturée.';
  end if;

  if p_status='approved' then
    select m.id into v_member_id
    from public.members m
    where lower(coalesce(m.email,''))=lower(v_application.email)
    limit 1;

    if v_member_id is null then
      v_member_number := replace(v_application.reference,'APP-','AED-');

      while exists(select 1 from public.members where member_number=v_member_number) loop
        v_member_number := 'AED-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.membership_application_seq')::text,4,'0');
      end loop;

      insert into public.members(
        member_number,full_name,village,program,study_level,phone,email,status,joined_at,created_by
      )
      values(
        v_member_number,
        v_application.full_name,
        v_application.village,
        v_application.program,
        v_application.study_level,
        v_application.phone,
        lower(v_application.email),
        'active',
        current_date,
        auth.uid()
      )
      returning id into v_member_id;
    else
      v_member_number := replace(v_application.reference,'APP-','AED-');
      while exists(
        select 1 from public.members
        where member_number=v_member_number
          and id<>v_member_id
      ) loop
        v_member_number := 'AED-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.membership_application_seq')::text,4,'0');
      end loop;

      update public.members
      set status='active',
          member_number=coalesce(member_number,v_member_number),
          full_name=v_application.full_name,
          village=v_application.village,
          program=v_application.program,
          study_level=v_application.study_level,
          phone=v_application.phone,
          email=lower(v_application.email)
      where id=v_member_id;
    end if;
  end if;

  update public.membership_applications
  set status=p_status,
      decision_note=nullif(trim(coalesce(p_decision_note,'')),''),
      member_id=case when p_status='approved' then v_member_id else member_id end,
      reviewed_by=auth.uid(),
      reviewed_at=case when p_status in ('approved','rejected') then now() else reviewed_at end,
      updated_at=now()
  where id=p_application_id;

  return v_member_id;
end $$;

revoke all on function public.review_membership_application(uuid,text,text) from public;
grant execute on function public.review_membership_application(uuid,text,text) to authenticated;

drop trigger if exists audit_membership_applications on public.membership_applications;
create trigger audit_membership_applications
after insert or update or delete on public.membership_applications
for each row execute function public.audit_row();

commit;
