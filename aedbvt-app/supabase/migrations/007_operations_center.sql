begin;

create table if not exists public.bureau_mandates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  scope text,
  starts_on date not null,
  ends_on date,
  status text not null default 'active' check (status in ('active','completed','revoked')),
  appointment_basis text,
  decision_id uuid references public.decision_register(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  mandate text,
  status text not null default 'active' check (status in ('active','closed')),
  lead_profile_id uuid references public.profiles(id) on delete set null,
  decision_id uuid references public.decision_register(id) on delete set null,
  starts_on date,
  ends_on date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists public.commission_members (
  commission_id uuid not null references public.commissions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'membre',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (commission_id,profile_id)
);

create table if not exists public.operational_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'backlog' check (status in ('backlog','in_progress','blocked','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  progress integer not null default 0 check (progress between 0 and 100),
  due_on date,
  decision_id uuid references public.decision_register(id) on delete set null,
  assembly_id uuid references public.assemblies(id) on delete set null,
  commission_id uuid references public.commissions(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  blocker_note text,
  auto_generated boolean not null default false,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists operational_tasks_auto_decision_unique
on public.operational_tasks(decision_id)
where auto_generated=true and decision_id is not null;

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.operational_tasks(id) on delete cascade,
  update_type text not null default 'comment' check (update_type in ('comment','progress','blocker','resolution')),
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'info' check (kind in ('info','task','deadline','decision','warning')),
  title text not null,
  message text,
  href text,
  source_task_id uuid references public.operational_tasks(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bureau_mandates enable row level security;
alter table public.commissions enable row level security;
alter table public.commission_members enable row level security;
alter table public.operational_tasks enable row level security;
alter table public.task_updates enable row level security;
alter table public.internal_notifications enable row level security;

revoke all on table public.bureau_mandates, public.commissions, public.commission_members,
  public.operational_tasks, public.task_updates, public.internal_notifications from anon, authenticated;

grant select, insert, update on table public.bureau_mandates, public.commissions, public.commission_members,
  public.operational_tasks, public.task_updates to authenticated;
grant select on table public.internal_notifications to authenticated;

create policy bureau_mandates_read on public.bureau_mandates for select to authenticated using (true);
create policy bureau_mandates_manage on public.bureau_mandates for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy commissions_read on public.commissions for select to authenticated using (true);
create policy commissions_manage on public.commissions for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy commission_members_read on public.commission_members for select to authenticated using (true);
create policy commission_members_manage on public.commission_members for all to authenticated
using (public.is_staff()) with check (public.is_staff());

create or replace function public.can_access_operational_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    public.is_staff()
    or exists(
      select 1 from public.operational_tasks t
      where t.id=p_task_id and t.assignee_id=auth.uid()
    )
    or exists(
      select 1
      from public.operational_tasks t
      join public.commission_members cm on cm.commission_id=t.commission_id
      where t.id=p_task_id and cm.profile_id=auth.uid() and cm.left_at is null
    )
$$;

revoke all on function public.can_access_operational_task(uuid) from public;
grant execute on function public.can_access_operational_task(uuid) to authenticated;

create policy operational_tasks_read on public.operational_tasks for select to authenticated
using (
  public.is_staff()
  or assignee_id=auth.uid()
  or exists(
    select 1 from public.commission_members cm
    where cm.commission_id=operational_tasks.commission_id
      and cm.profile_id=auth.uid()
      and cm.left_at is null
  )
);

create policy operational_tasks_staff_insert on public.operational_tasks for insert to authenticated
with check (public.is_staff());

create policy operational_tasks_staff_update on public.operational_tasks for update to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy task_updates_read on public.task_updates for select to authenticated
using (public.can_access_operational_task(task_id));

create policy task_updates_insert on public.task_updates for insert to authenticated
with check (
  public.can_access_operational_task(task_id)
  and created_by=auth.uid()
);

create policy notifications_self_read on public.internal_notifications for select to authenticated
using (recipient_id=auth.uid() or public.current_role()='admin');

create or replace function public.update_operational_task_state(
  p_task_id uuid,
  p_status text,
  p_progress integer,
  p_blocker_note text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.can_access_operational_task(p_task_id) then
    raise exception 'Accès à cette tâche refusé.';
  end if;
  if p_status not in ('backlog','in_progress','blocked','done','cancelled') then
    raise exception 'Statut de tâche invalide.';
  end if;
  if p_status='cancelled' and not public.is_staff() then
    raise exception 'Seul le Bureau peut annuler une tâche.';
  end if;
  if p_progress < 0 or p_progress > 100 then
    raise exception 'Progression invalide.';
  end if;
  if p_status='blocked' and nullif(trim(coalesce(p_blocker_note,'')),'') is null then
    raise exception 'Un motif de blocage est requis.';
  end if;

  update public.operational_tasks
  set status=p_status,
      progress=case when p_status='done' then 100 else p_progress end,
      blocker_note=case when p_status='blocked' then nullif(trim(coalesce(p_blocker_note,'')),'') else null end,
      completed_at=case when p_status='done' then coalesce(completed_at,now()) else null end,
      updated_at=now()
  where id=p_task_id;
end $$;

revoke all on function public.update_operational_task_state(uuid,text,integer,text) from public;
grant execute on function public.update_operational_task_state(uuid,text,integer,text) to authenticated;

create or replace function public.mark_internal_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.internal_notifications
  set read_at=coalesce(read_at,now())
  where id=p_notification_id and recipient_id=auth.uid();

  if not found then
    raise exception 'Notification introuvable.';
  end if;
end $$;

revoke all on function public.mark_internal_notification_read(uuid) from public;
grant execute on function public.mark_internal_notification_read(uuid) to authenticated;

create or replace function public.mark_all_internal_notifications_read()
returns void
language sql
security definer
set search_path=public
as $$
  update public.internal_notifications
  set read_at=coalesce(read_at,now())
  where recipient_id=auth.uid() and read_at is null
$$;

revoke all on function public.mark_all_internal_notifications_read() from public;
grant execute on function public.mark_all_internal_notifications_read() to authenticated;

create or replace function public.notify_operational_task_assignment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.assignee_id is not null
     and (tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.internal_notifications(
      recipient_id,kind,title,message,href,source_task_id
    )
    values(
      new.assignee_id,
      'task',
      'Nouvelle tâche attribuée',
      new.title,
      '/operations/tasks/' || new.id,
      new.id
    );
  end if;
  return new;
end $$;

drop trigger if exists notify_operational_task_assignment on public.operational_tasks;
create trigger notify_operational_task_assignment
after insert or update of assignee_id on public.operational_tasks
for each row execute function public.notify_operational_task_assignment();

create or replace function public.notify_operational_task_state()
returns trigger
language plpgsql
security definer
set search_path=public
as $
declare lead_id uuid;
begin
  if old.status is distinct from new.status and new.status in ('blocked','done') then
    if new.created_by is not null and new.created_by is distinct from auth.uid() then
      insert into public.internal_notifications(recipient_id,kind,title,message,href,source_task_id)
      values(
        new.created_by,
        case when new.status='blocked' then 'warning' else 'task' end,
        case when new.status='blocked' then 'Tâche bloquée' else 'Tâche terminée' end,
        new.title,
        '/operations/tasks/' || new.id,
        new.id
      );
    end if;

    if new.commission_id is not null then
      select lead_profile_id into lead_id from public.commissions where id=new.commission_id;
      if lead_id is not null
         and lead_id is distinct from new.created_by
         and lead_id is distinct from auth.uid() then
        insert into public.internal_notifications(recipient_id,kind,title,message,href,source_task_id)
        values(
          lead_id,
          case when new.status='blocked' then 'warning' else 'task' end,
          case when new.status='blocked' then 'Action de commission bloquée' else 'Action de commission terminée' end,
          new.title,
          '/operations/tasks/' || new.id,
          new.id
        );
      end if;
    end if;
  end if;
  return new;
end $;

drop trigger if exists notify_operational_task_state on public.operational_tasks;
create trigger notify_operational_task_state
after update of status on public.operational_tasks
for each row execute function public.notify_operational_task_state();

create or replace function public.create_followup_task_from_decision()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare task_title text;
begin
  if new.outcome in ('adopted','elected') then
    task_title := case
      when new.outcome='elected' then 'Formaliser la décision : ' || new.title
      else 'Mettre en œuvre : ' || new.title
    end;

    insert into public.operational_tasks(
      title,description,status,priority,progress,decision_id,assembly_id,
      auto_generated,created_by
    )
    values(
      task_title,
      new.summary,
      'backlog',
      'normal',
      0,
      new.id,
      new.assembly_id,
      true,
      new.created_by
    )
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists create_followup_task_from_decision on public.decision_register;
create trigger create_followup_task_from_decision
after insert on public.decision_register
for each row execute function public.create_followup_task_from_decision();

insert into public.operational_tasks(
  title,description,status,priority,progress,decision_id,assembly_id,auto_generated,created_by
)
select
  case
    when d.outcome='elected' then 'Formaliser la décision : ' || d.title
    else 'Mettre en œuvre : ' || d.title
  end,
  d.summary,
  'backlog',
  'normal',
  0,
  d.id,
  d.assembly_id,
  true,
  d.created_by
from public.decision_register d
where d.outcome in ('adopted','elected')
  and not exists(
    select 1 from public.operational_tasks t
    where t.decision_id=d.id and t.auto_generated=true
  );

create or replace function public.guard_commission_closure()
returns trigger
language plpgsql
set search_path=public
as $
begin
  if old.status='active' and new.status='closed'
     and exists(
       select 1 from public.operational_tasks t
       where t.commission_id=old.id and t.status not in ('done','cancelled')
     ) then
    raise exception 'La commission possède encore des tâches ouvertes.';
  end if;
  return new;
end $;

drop trigger if exists guard_commission_closure on public.commissions;
create trigger guard_commission_closure
before update of status on public.commissions
for each row execute function public.guard_commission_closure();

create or replace function public.guard_closed_commission_membership()
returns trigger
language plpgsql
set search_path=public
as $
declare commission_status text;
begin
  select status into commission_status
  from public.commissions
  where id=coalesce(new.commission_id,old.commission_id);

  if commission_status='closed' and (tg_op='INSERT' or new.left_at is null) then
    raise exception 'Une commission clôturée ne peut plus recevoir de membres.';
  end if;
  return coalesce(new,old);
end $;

drop trigger if exists guard_closed_commission_membership on public.commission_members;
create trigger guard_closed_commission_membership
before insert or update on public.commission_members
for each row execute function public.guard_closed_commission_membership();

create or replace function public.guard_closed_commission_task()
returns trigger
language plpgsql
set search_path=public
as $
begin
  if new.commission_id is not null
     and exists(select 1 from public.commissions c where c.id=new.commission_id and c.status='closed') then
    raise exception 'Une tâche ne peut pas être affectée à une commission clôturée.';
  end if;
  return new;
end $;

drop trigger if exists guard_closed_commission_task on public.operational_tasks;
create trigger guard_closed_commission_task
before insert or update of commission_id on public.operational_tasks
for each row execute function public.guard_closed_commission_task();

create or replace function public.guard_operational_task_history()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if old.status in ('done','cancelled') then
    if new.status is distinct from old.status
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.decision_id is distinct from old.decision_id
       or new.assembly_id is distinct from old.assembly_id
       or new.commission_id is distinct from old.commission_id
       or new.assignee_id is distinct from old.assignee_id
       or new.priority is distinct from old.priority
       or new.due_on is distinct from old.due_on then
      raise exception 'Une tâche terminée ou annulée conserve son historique.';
    end if;
  end if;
  return new;
end $;

drop trigger if exists guard_operational_task_history on public.operational_tasks;
create trigger guard_operational_task_history
before update on public.operational_tasks
for each row execute function public.guard_operational_task_history();

do $$
declare t text;
begin
  foreach t in array array['bureau_mandates','commissions','commission_members','operational_tasks','task_updates']
  loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row()',t,t);
  end loop;
end $$;

commit;
