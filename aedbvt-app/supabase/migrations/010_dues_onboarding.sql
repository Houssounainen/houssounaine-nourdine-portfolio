begin;

create table if not exists public.membership_dues_cycles (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,
  starts_on date not null,
  ends_on date not null,
  due_on date not null,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'draft' check (status in ('draft','open','closed')),
  opened_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (due_on >= starts_on and due_on <= ends_on)
);

create table if not exists public.member_dues (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.membership_dues_cycles(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount_due numeric(14,2) not null check (amount_due >= 0),
  waived_amount numeric(14,2) not null default 0 check (waived_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'due' check (status in ('due','partial','paid','overdue','exempt')),
  notes text,
  last_reminded_at timestamptz,
  reminder_count integer not null default 0 check (reminder_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cycle_id,member_id),
  check (waived_amount <= amount_due)
);

alter table public.payments
  add column if not exists dues_cycle_id uuid references public.membership_dues_cycles(id) on delete set null;

alter table public.members
  add column if not exists invitation_sent_at timestamptz;

alter table public.members
  add column if not exists account_activated_at timestamptz;

create index if not exists member_dues_member_idx on public.member_dues(member_id,status);
create index if not exists member_dues_cycle_idx on public.member_dues(cycle_id,status);
create index if not exists payments_dues_cycle_idx on public.payments(dues_cycle_id,member_id) where dues_cycle_id is not null;

alter table public.membership_dues_cycles enable row level security;
alter table public.member_dues enable row level security;

revoke all on table public.membership_dues_cycles, public.member_dues from anon, authenticated;
grant select, insert, update on table public.membership_dues_cycles, public.member_dues to authenticated;

create policy dues_cycles_finance_read on public.membership_dues_cycles
for select to authenticated
using (public.is_finance());

create policy dues_cycles_finance_manage on public.membership_dues_cycles
for all to authenticated
using (public.is_finance())
with check (public.is_finance());

create policy dues_cycles_self_read on public.membership_dues_cycles
for select to authenticated
using (
  exists (
    select 1
    from public.member_dues d
    join public.members m on m.id=d.member_id
    where d.cycle_id=membership_dues_cycles.id
      and m.profile_id=auth.uid()
  )
);

create policy member_dues_finance_read on public.member_dues
for select to authenticated
using (public.is_finance());

create policy member_dues_self_read on public.member_dues
for select to authenticated
using (
  exists (
    select 1 from public.members m
    where m.id=member_id and m.profile_id=auth.uid()
  )
);

create policy member_dues_finance_manage on public.member_dues
for all to authenticated
using (public.is_finance())
with check (public.is_finance());

create or replace function public.refresh_member_due(
  p_cycle_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_due public.member_dues%rowtype;
  v_cycle public.membership_dues_cycles%rowtype;
  v_paid numeric(14,2);
  v_effective numeric(14,2);
  v_status text;
begin
  select * into v_due
  from public.member_dues
  where cycle_id=p_cycle_id and member_id=p_member_id
  for update;

  if not found then
    return;
  end if;

  select * into v_cycle
  from public.membership_dues_cycles
  where id=p_cycle_id;

  select coalesce(sum(amount),0) into v_paid
  from public.payments
  where member_id=p_member_id
    and dues_cycle_id=p_cycle_id
    and status='confirmed';

  v_effective := greatest(0,v_due.amount_due-v_due.waived_amount);

  v_status := case
    when v_effective=0 then 'exempt'
    when v_paid>=v_effective then 'paid'
    when v_paid>0 then 'partial'
    when v_cycle.due_on<current_date then 'overdue'
    else 'due'
  end;

  update public.member_dues
  set paid_amount=v_paid,
      status=v_status,
      updated_at=now()
  where id=v_due.id;
end $$;

revoke all on function public.refresh_member_due(uuid,uuid) from public;
grant execute on function public.refresh_member_due(uuid,uuid) to authenticated;

create or replace function public.validate_dues_payment()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_cycle public.membership_dues_cycles%rowtype;
  v_due public.member_dues%rowtype;
  v_paid numeric(14,2);
  v_effective numeric(14,2);
begin
  if new.dues_cycle_id is null then
    return new;
  end if;

  select * into v_cycle
  from public.membership_dues_cycles
  where id=new.dues_cycle_id;

  if not found then
    raise exception 'Exercice de cotisation introuvable.';
  end if;

  if v_cycle.status<>'open' then
    raise exception 'Cet exercice de cotisation n’est pas ouvert.';
  end if;

  select * into v_due
  from public.member_dues
  where cycle_id=new.dues_cycle_id and member_id=new.member_id;

  if not found then
    raise exception 'Aucune cotisation n’est attendue pour ce membre sur cet exercice.';
  end if;

  v_effective := greatest(0,v_due.amount_due-v_due.waived_amount);

  select coalesce(sum(amount),0) into v_paid
  from public.payments
  where member_id=new.member_id
    and dues_cycle_id=new.dues_cycle_id
    and status='confirmed'
    and id is distinct from new.id;

  if new.status='confirmed' and v_paid+new.amount>v_effective then
    raise exception 'Le paiement dépasse le reste à régler pour cet exercice.';
  end if;

  return new;
end $$;

drop trigger if exists validate_dues_payment on public.payments;
create trigger validate_dues_payment
before insert or update of amount,status,dues_cycle_id,member_id on public.payments
for each row execute function public.validate_dues_payment();

create or replace function public.refresh_due_after_payment()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op<>'DELETE' and new.dues_cycle_id is not null then
    perform public.refresh_member_due(new.dues_cycle_id,new.member_id);
  end if;

  if tg_op<>'INSERT' and old.dues_cycle_id is not null
     and (
       tg_op='DELETE'
       or old.dues_cycle_id is distinct from new.dues_cycle_id
       or old.member_id is distinct from new.member_id
     ) then
    perform public.refresh_member_due(old.dues_cycle_id,old.member_id);
  end if;

  return coalesce(new,old);
end $$;

drop trigger if exists refresh_due_after_payment on public.payments;
create trigger refresh_due_after_payment
after insert or update or delete on public.payments
for each row execute function public.refresh_due_after_payment();

create or replace function public.open_dues_cycle(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_cycle public.membership_dues_cycles%rowtype;
begin
  if not public.is_finance() then
    raise exception 'Accès financier requis.';
  end if;

  select * into v_cycle
  from public.membership_dues_cycles
  where id=p_cycle_id
  for update;

  if not found then
    raise exception 'Exercice introuvable.';
  end if;

  if v_cycle.status<>'draft' then
    raise exception 'Seul un exercice brouillon peut être ouvert.';
  end if;

  if exists (
    select 1 from public.membership_dues_cycles
    where status='open' and id<>p_cycle_id
  ) then
    raise exception 'Un autre exercice de cotisation est déjà ouvert.';
  end if;

  insert into public.member_dues(cycle_id,member_id,amount_due)
  select v_cycle.id,m.id,v_cycle.amount
  from public.members m
  where m.status='active'
    and coalesce(m.joined_at,v_cycle.starts_on)<=v_cycle.ends_on
  on conflict(cycle_id,member_id) do nothing;

  update public.membership_dues_cycles
  set status='open',opened_at=now(),updated_at=now()
  where id=p_cycle_id;

  update public.member_dues
  set status=case when v_cycle.due_on<current_date then 'overdue' else 'due' end,
      updated_at=now()
  where cycle_id=p_cycle_id
    and paid_amount=0
    and waived_amount<amount_due;
end $$;

revoke all on function public.open_dues_cycle(uuid) from public;
grant execute on function public.open_dues_cycle(uuid) to authenticated;

create or replace function public.close_dues_cycle(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_finance() then
    raise exception 'Accès financier requis.';
  end if;

  update public.membership_dues_cycles
  set status='closed',closed_at=now(),updated_at=now()
  where id=p_cycle_id and status='open';

  if not found then
    raise exception 'Cet exercice ne peut pas être clôturé.';
  end if;
end $$;

revoke all on function public.close_dues_cycle(uuid) from public;
grant execute on function public.close_dues_cycle(uuid) to authenticated;

create or replace function public.refresh_due_after_waiver()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  perform public.refresh_member_due(new.cycle_id,new.member_id);
  return new;
end $$;

drop trigger if exists refresh_due_after_waiver on public.member_dues;
create trigger refresh_due_after_waiver
after update of waived_amount,amount_due on public.member_dues
for each row execute function public.refresh_due_after_waiver();

create or replace function public.enrol_member_in_open_dues()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from new.status) then
    insert into public.member_dues(cycle_id,member_id,amount_due)
    select c.id,new.id,c.amount
    from public.membership_dues_cycles c
    where c.status='open'
      and coalesce(new.joined_at,c.starts_on)<=c.ends_on
    on conflict(cycle_id,member_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists enrol_member_in_open_dues on public.members;
create trigger enrol_member_in_open_dues
after insert or update of status on public.members
for each row execute function public.enrol_member_in_open_dues();

create or replace function public.mark_my_account_activated()
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.members
  set account_activated_at=coalesce(account_activated_at,now())
  where profile_id=auth.uid();
end $$;

revoke all on function public.mark_my_account_activated() from public;
grant execute on function public.mark_my_account_activated() to authenticated;

create or replace view public.member_dues_overview
with (security_invoker=true)
as
select
  d.id,
  d.cycle_id,
  c.label as cycle_label,
  c.starts_on,
  c.ends_on,
  c.due_on,
  c.status as cycle_status,
  d.member_id,
  d.amount_due,
  d.waived_amount,
  d.paid_amount,
  greatest(0,d.amount_due-d.waived_amount-d.paid_amount) as balance,
  case
    when greatest(0,d.amount_due-d.waived_amount)=0 then 'exempt'
    when d.paid_amount>=greatest(0,d.amount_due-d.waived_amount) then 'paid'
    when d.paid_amount>0 then 'partial'
    when c.due_on<current_date then 'overdue'
    else 'due'
  end as current_status,
  d.notes,
  d.last_reminded_at,
  d.reminder_count,
  d.updated_at
from public.member_dues d
join public.membership_dues_cycles c on c.id=d.cycle_id;

grant select on public.member_dues_overview to authenticated;

drop trigger if exists audit_membership_dues_cycles on public.membership_dues_cycles;
create trigger audit_membership_dues_cycles
after insert or update or delete on public.membership_dues_cycles
for each row execute function public.audit_row();

drop trigger if exists audit_member_dues on public.member_dues;
create trigger audit_member_dues
after insert or update or delete on public.member_dues
for each row execute function public.audit_row();

commit;
