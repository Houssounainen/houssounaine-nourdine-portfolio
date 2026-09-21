begin;

create sequence if not exists public.partner_receipt_seq start 1;

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_type text not null default 'institution'
    check (partner_type in ('donor','sponsor','institution','business','ngo','other')),
  status text not null default 'prospect'
    check (status in ('prospect','contacted','active','inactive')),
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_commitments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  title text not null,
  contribution_type text not null
    check (contribution_type in ('donation','sponsorship','in_kind')),
  pledged_amount numeric(14,2) not null default 0 check (pledged_amount >= 0),
  received_amount numeric(14,2) not null default 0 check (received_amount >= 0),
  in_kind_details text,
  pledged_on date not null default current_date,
  due_on date,
  status text not null default 'pledged'
    check (status in ('pledged','partial','received','cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    contribution_type='in_kind'
    or pledged_amount > 0
  )
);

create table if not exists public.partner_receipts (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid references public.partner_commitments(id) on delete set null,
  partner_id uuid not null references public.partners(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  method text not null,
  external_reference text,
  receipt_number text unique,
  received_at timestamptz not null default now(),
  category_id uuid references public.finance_categories(id) on delete set null,
  account_id uuid references public.cash_accounts(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists partners_status_idx on public.partners(status,partner_type);
create index if not exists partner_commitments_partner_idx on public.partner_commitments(partner_id,status);
create index if not exists partner_commitments_due_idx on public.partner_commitments(due_on) where status in ('pledged','partial');
create index if not exists partner_receipts_partner_idx on public.partner_receipts(partner_id,received_at desc);
create index if not exists partner_receipts_commitment_idx on public.partner_receipts(commitment_id) where commitment_id is not null;

alter table public.partners enable row level security;
alter table public.partner_commitments enable row level security;
alter table public.partner_receipts enable row level security;

revoke all on table public.partners, public.partner_commitments, public.partner_receipts from anon, authenticated;
grant select, insert on table public.partners to authenticated;
grant update (name,partner_type,status,contact_name,email,phone,address,website,notes,updated_at)
  on table public.partners to authenticated;
grant select, insert on table public.partner_commitments to authenticated;
grant update (title,contribution_type,pledged_amount,in_kind_details,pledged_on,due_on,status,notes,updated_at)
  on table public.partner_commitments to authenticated;
grant select, insert on table public.partner_receipts to authenticated;
grant usage, select on sequence public.partner_receipt_seq to authenticated;

create policy partners_staff_read on public.partners
for select to authenticated
using (public.is_staff());

create policy partners_staff_insert on public.partners
for insert to authenticated
with check (public.is_staff() and created_by=auth.uid());

create policy partners_staff_update on public.partners
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy commitments_staff_read on public.partner_commitments
for select to authenticated
using (public.is_staff());

create policy commitments_staff_insert on public.partner_commitments
for insert to authenticated
with check (public.is_staff() and created_by=auth.uid());

create policy commitments_staff_update on public.partner_commitments
for update to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy partner_receipts_finance_read on public.partner_receipts
for select to authenticated
using (public.is_finance());

create policy partner_receipts_finance_insert on public.partner_receipts
for insert to authenticated
with check (public.is_finance() and created_by=auth.uid());

create or replace function public.set_partner_receipt_number()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.receipt_number := 'DON-' || to_char(coalesce(new.received_at,now()),'YYYY') || '-' ||
    lpad(nextval('public.partner_receipt_seq')::text,4,'0');
  return new;
end $$;

drop trigger if exists partner_receipt_number on public.partner_receipts;
create trigger partner_receipt_number
before insert on public.partner_receipts
for each row execute function public.set_partner_receipt_number();

create or replace function public.validate_partner_receipt()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_commitment public.partner_commitments%rowtype;
  v_category_kind text;
  v_received numeric(14,2);
begin
  if new.category_id is not null then
    select kind into v_category_kind
    from public.finance_categories
    where id=new.category_id;

    if v_category_kind is distinct from 'income' then
      raise exception 'La catégorie doit être une catégorie de recette.';
    end if;
  end if;

  if new.commitment_id is not null then
    select * into v_commitment
    from public.partner_commitments
    where id=new.commitment_id;

    if not found then
      raise exception 'Engagement introuvable.';
    end if;

    if v_commitment.partner_id<>new.partner_id then
      raise exception 'Le partenaire ne correspond pas à l’engagement.';
    end if;

    if v_commitment.contribution_type='in_kind' then
      raise exception 'Un apport en nature ne peut pas recevoir un encaissement monétaire.';
    end if;

    if v_commitment.status='cancelled' then
      raise exception 'Cet engagement est annulé.';
    end if;

    select coalesce(sum(amount),0) into v_received
    from public.partner_receipts
    where commitment_id=new.commitment_id
      and id is distinct from new.id;

    if v_commitment.pledged_amount>0 and v_received+new.amount>v_commitment.pledged_amount then
      raise exception 'L’encaissement dépasse le montant engagé.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists validate_partner_receipt on public.partner_receipts;
create trigger validate_partner_receipt
before insert or update of commitment_id,partner_id,amount,category_id on public.partner_receipts
for each row execute function public.validate_partner_receipt();

create or replace function public.refresh_partner_commitment()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_commitment_id uuid;
  v_total numeric(14,2);
  v_pledged numeric(14,2);
begin
  v_commitment_id := coalesce(new.commitment_id,old.commitment_id);
  if v_commitment_id is null then
    return coalesce(new,old);
  end if;

  select pledged_amount into v_pledged
  from public.partner_commitments
  where id=v_commitment_id;

  select coalesce(sum(amount),0) into v_total
  from public.partner_receipts
  where commitment_id=v_commitment_id;

  update public.partner_commitments
  set received_amount=v_total,
      status=case
        when status='cancelled' then 'cancelled'
        when v_pledged>0 and v_total>=v_pledged then 'received'
        when v_total>0 then 'partial'
        else 'pledged'
      end,
      updated_at=now()
  where id=v_commitment_id;

  if tg_op='UPDATE'
     and old.commitment_id is distinct from new.commitment_id
     and old.commitment_id is not null then
    select pledged_amount into v_pledged
    from public.partner_commitments
    where id=old.commitment_id;

    select coalesce(sum(amount),0) into v_total
    from public.partner_receipts
    where commitment_id=old.commitment_id;

    update public.partner_commitments
    set received_amount=v_total,
        status=case
          when status='cancelled' then 'cancelled'
          when v_pledged>0 and v_total>=v_pledged then 'received'
          when v_total>0 then 'partial'
          else 'pledged'
        end,
        updated_at=now()
    where id=old.commitment_id;
  end if;

  return coalesce(new,old);
end $$;

drop trigger if exists refresh_partner_commitment on public.partner_receipts;
create trigger refresh_partner_commitment
after insert or update or delete on public.partner_receipts
for each row execute function public.refresh_partner_commitment();

create or replace function public.guard_partner_commitment_status()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status in ('received','cancelled') then
    raise exception 'Un engagement finalisé conserve son historique.';
  end if;

  if new.status='cancelled' and old.received_amount>0 then
    raise exception 'Un engagement déjà encaissé ne peut pas être annulé.';
  end if;

  if new.status='received'
     and new.contribution_type<>'in_kind'
     and new.received_amount<new.pledged_amount then
    raise exception 'Un engagement monétaire n’est reçu qu’après encaissement complet.';
  end if;

  if not (
    (old.status='pledged' and new.status in ('partial','received','cancelled'))
    or (old.status='partial' and new.status='received')
  ) then
    raise exception 'Transition d’engagement invalide : % vers %.',old.status,new.status;
  end if;

  return new;
end $$;

drop trigger if exists guard_partner_commitment_status on public.partner_commitments;
create trigger guard_partner_commitment_status
before update of status on public.partner_commitments
for each row execute function public.guard_partner_commitment_status();

create or replace function public.guard_partner_commitment_amount()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.contribution_type<>'in_kind' and new.pledged_amount<new.received_amount then
    raise exception 'Le montant engagé ne peut pas être inférieur au montant déjà reçu.';
  end if;

  if new.contribution_type='in_kind' and new.received_amount>0 then
    raise exception 'Un apport en nature ne peut pas avoir de montant encaissé.';
  end if;

  return new;
end $$;

drop trigger if exists guard_partner_commitment_amount on public.partner_commitments;
create trigger guard_partner_commitment_amount
before update of pledged_amount,contribution_type on public.partner_commitments
for each row execute function public.guard_partner_commitment_amount();

create or replace view public.finance_ledger
with (security_invoker=true)
as
select
  p.id,
  p.paid_at::date as entry_date,
  'member_payment'::text as source_type,
  p.receipt_number as reference,
  coalesce(c.name,'Cotisations') as label,
  p.amount as income,
  0::numeric as expense,
  p.category_id,
  p.account_id
from public.payments p
left join public.finance_categories c on c.id=p.category_id
where p.status='confirmed'

union all

select
  ip.id,
  ip.paid_at::date,
  'invoice_payment',
  ip.receipt_number,
  i.subject,
  ip.amount,
  0::numeric,
  ip.category_id,
  ip.account_id
from public.invoice_payments ip
join public.invoices i on i.id=ip.invoice_id

union all

select
  pr.id,
  pr.received_at::date,
  'partner_receipt',
  pr.receipt_number,
  coalesce(pc.title,p.name),
  pr.amount,
  0::numeric,
  pr.category_id,
  pr.account_id
from public.partner_receipts pr
join public.partners p on p.id=pr.partner_id
left join public.partner_commitments pc on pc.id=pr.commitment_id

union all

select
  e.id,
  e.spent_at,
  'expense',
  coalesce(e.reference,'DEP-' || left(e.id::text,8)),
  e.label,
  0::numeric,
  e.amount,
  e.category_id,
  e.account_id
from public.expenses e;

grant select on public.finance_ledger to authenticated;

do $$
declare t text;
begin
  foreach t in array array['partners','partner_commitments','partner_receipts']
  loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row()',t,t);
  end loop;
end $$;

commit;
