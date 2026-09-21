begin;

create sequence if not exists public.confidential_case_seq start 1;

create table if not exists public.confidential_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text unique,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  member_id uuid references public.members(id) on delete set null,
  category text not null check (category in ('conduct','harassment','discrimination','finance','governance','safety','other')),
  subject text not null,
  details text not null,
  desired_outcome text,
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  status text not null default 'received' check (status in ('received','in_review','action_required','resolved','closed','dismissed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_summary text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.confidential_case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.confidential_cases(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  message text not null,
  visibility text not null default 'member' check (visibility in ('member','staff')),
  event_type text not null default 'message' check (event_type in ('message','status','assignment')),
  created_at timestamptz not null default now()
);

create index if not exists confidential_cases_submitter_idx on public.confidential_cases(submitted_by,created_at desc);
create index if not exists confidential_cases_status_idx on public.confidential_cases(status,created_at desc);
create index if not exists confidential_cases_assignee_idx on public.confidential_cases(assigned_to,status);
create index if not exists confidential_case_updates_case_idx on public.confidential_case_updates(case_id,created_at);

alter table public.notification_preferences
  add column if not exists cases boolean not null default true;

alter table public.confidential_cases enable row level security;
alter table public.confidential_case_updates enable row level security;

revoke all on table public.confidential_cases, public.confidential_case_updates from anon, authenticated;
grant select on table public.confidential_cases, public.confidential_case_updates to authenticated;

create or replace function public.is_case_manager()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(public.current_role() in ('admin','bureau'),false)
$$;

create policy confidential_cases_self_read
on public.confidential_cases
for select to authenticated
using (submitted_by=auth.uid());

create policy confidential_cases_manager_read
on public.confidential_cases
for select to authenticated
using (public.is_case_manager());

create policy confidential_updates_self_read
on public.confidential_case_updates
for select to authenticated
using (
  visibility='member'
  and exists(
    select 1 from public.confidential_cases c
    where c.id=case_id and c.submitted_by=auth.uid()
  )
);

create policy confidential_updates_manager_read
on public.confidential_case_updates
for select to authenticated
using (public.is_case_manager());

create or replace function public.set_confidential_case_number()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.case_number is null then
    new.case_number := 'CASE-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.confidential_case_seq')::text,4,'0');
  end if;
  return new;
end $$;

drop trigger if exists set_confidential_case_number on public.confidential_cases;
create trigger set_confidential_case_number
before insert on public.confidential_cases
for each row execute function public.set_confidential_case_number();

create or replace function public.create_confidential_case(
  p_category text,
  p_subject text,
  p_details text,
  p_desired_outcome text,
  p_priority text
)
returns table(case_id uuid, case_number text, manager_ids uuid[])
language plpgsql
security definer
set search_path=public
as $$
declare
  v_case public.confidential_cases%rowtype;
  v_member_id uuid;
  v_managers uuid[];
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if p_category not in ('conduct','harassment','discrimination','finance','governance','safety','other') then
    raise exception 'Catégorie invalide.';
  end if;

  if p_priority not in ('normal','high','urgent') then
    raise exception 'Priorité invalide.';
  end if;

  if char_length(trim(coalesce(p_subject,''))) < 4 then
    raise exception 'Objet trop court.';
  end if;

  if char_length(trim(coalesce(p_details,''))) < 10 then
    raise exception 'Description trop courte.';
  end if;

  select m.id into v_member_id
  from public.members m
  where m.profile_id=auth.uid()
  limit 1;

  insert into public.confidential_cases(
    submitted_by,member_id,category,subject,details,desired_outcome,priority
  )
  values(
    auth.uid(),v_member_id,p_category,trim(p_subject),trim(p_details),
    nullif(trim(coalesce(p_desired_outcome,'')),''),p_priority
  )
  returning * into v_case;

  insert into public.confidential_case_updates(
    case_id,author_id,message,visibility,event_type
  )
  values(
    v_case.id,auth.uid(),'Signalement reçu par l’AEDBVT.','member','status'
  );

  select coalesce(array_agg(p.id),array[]::uuid[]) into v_managers
  from public.profiles p
  where p.active=true and p.role in ('admin','bureau');

  insert into public.internal_notifications(recipient_id,kind,title,message,href)
  select manager_id,
         case when p_priority='urgent' then 'warning' else 'info' end,
         'Nouveau dossier confidentiel',
         'Un nouveau signalement confidentiel nécessite une prise en charge.',
         '/cases/'||v_case.id
  from unnest(v_managers) as managers(manager_id)
  where manager_id<>auth.uid();

  return query select v_case.id,v_case.case_number,v_managers;
end $$;

revoke all on function public.create_confidential_case(text,text,text,text,text) from public;
grant execute on function public.create_confidential_case(text,text,text,text,text) to authenticated;

create or replace function public.add_confidential_case_message(
  p_case_id uuid,
  p_message text,
  p_visibility text default 'member'
)
returns table(recipient_ids uuid[])
language plpgsql
security definer
set search_path=public
as $$
declare
  v_case public.confidential_cases%rowtype;
  v_is_manager boolean;
  v_visibility text;
  v_recipients uuid[];
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  if char_length(trim(coalesce(p_message,''))) < 2 then
    raise exception 'Message trop court.';
  end if;

  select * into v_case
  from public.confidential_cases
  where id=p_case_id;

  if not found then
    raise exception 'Dossier introuvable.';
  end if;

  v_is_manager := public.is_case_manager();

  if not v_is_manager and v_case.submitted_by<>auth.uid() then
    raise exception 'Accès refusé.';
  end if;

  if v_case.status in ('closed','dismissed') then
    raise exception 'Ce dossier est clôturé.';
  end if;

  v_visibility := case when v_is_manager and p_visibility='staff' then 'staff' else 'member' end;

  insert into public.confidential_case_updates(case_id,author_id,message,visibility,event_type)
  values(v_case.id,auth.uid(),trim(p_message),v_visibility,'message');

  if v_is_manager then
    if v_visibility='member' then
      v_recipients := array[v_case.submitted_by];
      insert into public.internal_notifications(recipient_id,kind,title,message,href)
      values(
        v_case.submitted_by,'info','Dossier confidentiel mis à jour',
        'Une nouvelle mise à jour est disponible dans votre dossier confidentiel.',
        '/cases/'||v_case.id
      );
    else
      v_recipients := array[]::uuid[];
    end if;
  else
    select coalesce(array_agg(distinct p.id),array[]::uuid[]) into v_recipients
    from public.profiles p
    where p.active=true
      and (
        p.id=v_case.assigned_to
        or (v_case.assigned_to is null and p.role in ('admin','bureau'))
      );

    insert into public.internal_notifications(recipient_id,kind,title,message,href)
    select recipient_id,'info','Dossier confidentiel mis à jour',
           'Le membre a ajouté un message dans un dossier confidentiel.',
           '/cases/'||v_case.id
    from unnest(v_recipients) as recipients(recipient_id);
  end if;

  return query select v_recipients;
end $$;

revoke all on function public.add_confidential_case_message(uuid,text,text) from public;
grant execute on function public.add_confidential_case_message(uuid,text,text) to authenticated;

create or replace function public.update_confidential_case(
  p_case_id uuid,
  p_status text,
  p_assigned_to uuid,
  p_resolution_summary text,
  p_message text,
  p_visible_to_member boolean
)
returns table(recipient_ids uuid[])
language plpgsql
security definer
set search_path=public
as $$
declare
  v_case public.confidential_cases%rowtype;
  v_allowed boolean;
  v_status_changed boolean;
  v_assignment_changed boolean;
  v_recipients uuid[];
begin
  if not public.is_case_manager() then
    raise exception 'Accès Admin/Bureau requis.';
  end if;

  select * into v_case
  from public.confidential_cases
  where id=p_case_id
  for update;

  if not found then
    raise exception 'Dossier introuvable.';
  end if;

  if p_status not in ('received','in_review','action_required','resolved','closed','dismissed') then
    raise exception 'Statut invalide.';
  end if;

  v_allowed := (
    v_case.status=p_status
    or (v_case.status='received' and p_status in ('in_review','dismissed'))
    or (v_case.status='in_review' and p_status in ('action_required','resolved','dismissed'))
    or (v_case.status='action_required' and p_status in ('in_review','resolved'))
    or (v_case.status='resolved' and p_status in ('closed','in_review'))
  );

  if not v_allowed then
    raise exception 'Transition de statut invalide : % vers %.',v_case.status,p_status;
  end if;

  if p_assigned_to is not null and not exists(
    select 1 from public.profiles p
    where p.id=p_assigned_to and p.active=true and p.role in ('admin','bureau')
  ) then
    raise exception 'Responsable de dossier invalide.';
  end if;

  v_status_changed := v_case.status is distinct from p_status;
  v_assignment_changed := v_case.assigned_to is distinct from p_assigned_to;

  update public.confidential_cases
  set status=p_status,
      assigned_to=p_assigned_to,
      resolution_summary=nullif(trim(coalesce(p_resolution_summary,'')),''),
      resolved_at=case
        when p_status='resolved' then coalesce(resolved_at,now())
        when p_status in ('received','in_review','action_required') then null
        else resolved_at
      end,
      closed_at=case when p_status in ('closed','dismissed') then coalesce(closed_at,now()) else null end,
      updated_at=now()
  where id=p_case_id;

  if v_status_changed then
    insert into public.confidential_case_updates(case_id,author_id,message,visibility,event_type)
    values(
      p_case_id,auth.uid(),
      'Statut : '||v_case.status||' → '||p_status,
      case when p_visible_to_member then 'member' else 'staff' end,
      'status'
    );
  end if;

  if v_assignment_changed then
    insert into public.confidential_case_updates(case_id,author_id,message,visibility,event_type)
    values(
      p_case_id,auth.uid(),
      'Responsable du dossier modifié.',
      'staff',
      'assignment'
    );
  end if;

  if nullif(trim(coalesce(p_message,'')),'') is not null then
    insert into public.confidential_case_updates(case_id,author_id,message,visibility,event_type)
    values(
      p_case_id,auth.uid(),trim(p_message),
      case when p_visible_to_member then 'member' else 'staff' end,
      'message'
    );
  end if;

  v_recipients := array[]::uuid[];
  if p_visible_to_member then
    v_recipients := array_append(v_recipients,v_case.submitted_by);
  end if;
  if p_assigned_to is not null and v_assignment_changed and p_assigned_to<>auth.uid() then
    v_recipients := array_append(v_recipients,p_assigned_to);
  end if;

  if p_visible_to_member and (v_status_changed or nullif(trim(coalesce(p_message,'')),'') is not null) then
    insert into public.internal_notifications(recipient_id,kind,title,message,href)
    values(
      v_case.submitted_by,'info','Dossier confidentiel mis à jour',
      'Une mise à jour est disponible dans votre dossier confidentiel.',
      '/cases/'||p_case_id
    );
  end if;

  if p_assigned_to is not null and v_assignment_changed and p_assigned_to<>auth.uid() then
    insert into public.internal_notifications(recipient_id,kind,title,message,href)
    values(
      p_assigned_to,'info','Dossier confidentiel attribué',
      'Un dossier confidentiel vous a été attribué.',
      '/cases/'||p_case_id
    );
  end if;

  return query select v_recipients;
end $$;

revoke all on function public.update_confidential_case(uuid,text,uuid,text,text,boolean) from public;
grant execute on function public.update_confidential_case(uuid,text,uuid,text,text,boolean) to authenticated;

drop trigger if exists audit_confidential_cases on public.confidential_cases;
create trigger audit_confidential_cases
after insert or update or delete on public.confidential_cases
for each row execute function public.audit_row();

drop trigger if exists audit_confidential_case_updates on public.confidential_case_updates;
create trigger audit_confidential_case_updates
after insert or update or delete on public.confidential_case_updates
for each row execute function public.audit_row();

commit;
