begin;

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  kind text not null check (kind in ('income','expense')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  kind text not null check (kind in ('cash','mobile_money','bank')),
  provider text,
  reference text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_years (
  id uuid primary key default gen_random_uuid(),
  label text unique not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft','approved','closed')),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budget_years(id) on delete cascade,
  category_id uuid not null references public.finance_categories(id) on delete restrict,
  planned_amount numeric(14,2) not null default 0 check (planned_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique(budget_id,category_id)
);

alter table public.payments add column if not exists category_id uuid references public.finance_categories(id) on delete set null;
alter table public.payments add column if not exists account_id uuid references public.cash_accounts(id) on delete set null;
alter table public.payments add column if not exists notes text;

alter table public.expenses add column if not exists category_id uuid references public.finance_categories(id) on delete set null;
alter table public.expenses add column if not exists account_id uuid references public.cash_accounts(id) on delete set null;
alter table public.expenses add column if not exists payment_method text;
alter table public.expenses add column if not exists approved_by uuid references public.profiles(id) on delete set null;
alter table public.expenses add column if not exists approved_at timestamptz;

alter table public.quotes add column if not exists recipient_email text;
alter table public.quotes add column if not exists recipient_phone text;
alter table public.quotes add column if not exists recipient_address text;
alter table public.quotes add column if not exists valid_until date;
alter table public.quotes add column if not exists notes text;
alter table public.quotes add column if not exists currency text not null default 'MGA';

alter table public.invoices add column if not exists recipient_email text;
alter table public.invoices add column if not exists recipient_phone text;
alter table public.invoices add column if not exists recipient_address text;
alter table public.invoices add column if not exists notes text;
alter table public.invoices add column if not exists currency text not null default 'MGA';

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  position integer not null default 1,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position integer not null default 1,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create sequence if not exists public.invoice_payment_receipt_seq start 1;

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  method text not null,
  external_reference text,
  receipt_number text unique,
  paid_at timestamptz not null default now(),
  account_id uuid references public.cash_accounts(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('expense','quote','invoice','invoice_payment','member_payment')),
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.finance_categories(code,name,kind) values
('REC-COT','Cotisations des membres','income'),
('REC-DON','Dons et contributions','income'),
('REC-PART','Partenariats et sponsoring','income'),
('REC-EVT','Recettes d’événements','income'),
('REC-AUT','Autres recettes','income'),
('DEP-EVT','Événements et activités','expense'),
('DEP-SOL','Solidarité et aides','expense'),
('DEP-COM','Communication et impression','expense'),
('DEP-ADM','Administration','expense'),
('DEP-TRP','Transport et déplacement','expense'),
('DEP-EQP','Équipement et matériel','expense'),
('DEP-AUT','Autres dépenses','expense')
on conflict (code) do update set name=excluded.name, kind=excluded.kind;

insert into public.cash_accounts(name,kind,provider) values
('Caisse principale','cash',null),
('MVola AEDBVT','mobile_money','MVola'),
('Orange Money AEDBVT','mobile_money','Orange Money'),
('Airtel Money AEDBVT','mobile_money','Airtel Money')
on conflict (name) do nothing;

create or replace function public.refresh_quote_total()
returns trigger language plpgsql set search_path=public as $$
declare target_id uuid;
begin
  target_id := coalesce(new.quote_id, old.quote_id);
  update public.quotes
  set total = coalesce((
    select sum(quantity * unit_price) from public.quote_items where quote_id=target_id
  ),0)
  where id=target_id;
  return coalesce(new,old);
end $$;

create or replace function public.refresh_invoice_total()
returns trigger language plpgsql set search_path=public as $$
declare target_id uuid;
begin
  target_id := coalesce(new.invoice_id, old.invoice_id);
  update public.invoices
  set total = coalesce((
    select sum(quantity * unit_price) from public.invoice_items where invoice_id=target_id
  ),0)
  where id=target_id;
  return coalesce(new,old);
end $$;

drop trigger if exists quote_items_total on public.quote_items;
create trigger quote_items_total after insert or update or delete on public.quote_items
for each row execute function public.refresh_quote_total();

drop trigger if exists invoice_items_total on public.invoice_items;
create trigger invoice_items_total after insert or update or delete on public.invoice_items
for each row execute function public.refresh_invoice_total();

create or replace function public.set_invoice_payment_receipt()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.receipt_number is null then
    new.receipt_number := 'REC-FAC-' || to_char(coalesce(new.paid_at,now()),'YYYY') || '-' || lpad(nextval('public.invoice_payment_receipt_seq')::text,4,'0');
  end if;
  return new;
end $$;

drop trigger if exists invoice_payment_receipt on public.invoice_payments;
create trigger invoice_payment_receipt before insert on public.invoice_payments
for each row execute function public.set_invoice_payment_receipt();

create or replace function public.refresh_invoice_payment_status()
returns trigger language plpgsql set search_path=public as $$
declare target_id uuid;
declare paid numeric(14,2);
declare due numeric(14,2);
begin
  target_id := coalesce(new.invoice_id, old.invoice_id);
  select total into due from public.invoices where id=target_id;
  select coalesce(sum(amount),0) into paid from public.invoice_payments where invoice_id=target_id;

  update public.invoices
  set status = case
    when status='cancelled' then status
    when paid <= 0 then 'issued'::public.document_status
    when paid >= due and due > 0 then 'paid'::public.document_status
    else 'issued'::public.document_status
  end
  where id=target_id;

  return coalesce(new,old);
end $$;

drop trigger if exists invoice_payment_status on public.invoice_payments;
create trigger invoice_payment_status after insert or update or delete on public.invoice_payments
for each row execute function public.refresh_invoice_payment_status();

alter table public.finance_categories enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.budget_years enable row level security;
alter table public.budget_lines enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.financial_attachments enable row level security;

revoke all on table public.finance_categories, public.cash_accounts, public.budget_years, public.budget_lines,
  public.quote_items, public.invoice_items, public.invoice_payments, public.financial_attachments from anon, authenticated;

grant select, insert, update, delete on table public.finance_categories, public.cash_accounts, public.budget_years,
  public.budget_lines, public.quote_items, public.invoice_items, public.invoice_payments, public.financial_attachments to authenticated;

grant usage, select on sequence public.invoice_payment_receipt_seq to authenticated;

create policy finance_categories_read on public.finance_categories for select to authenticated using (public.is_staff());
create policy finance_categories_manage on public.finance_categories for all to authenticated using (public.is_finance()) with check (public.is_finance());

create policy cash_accounts_read on public.cash_accounts for select to authenticated using (public.is_finance());
create policy cash_accounts_manage on public.cash_accounts for all to authenticated using (public.current_role()='admin') with check (public.current_role()='admin');

create policy budgets_read on public.budget_years for select to authenticated using (public.is_finance());
create policy budgets_manage on public.budget_years for all to authenticated using (public.is_finance()) with check (public.is_finance());
create policy budget_lines_read on public.budget_lines for select to authenticated using (public.is_finance());
create policy budget_lines_manage on public.budget_lines for all to authenticated using (public.is_finance()) with check (public.is_finance());

create policy quote_items_read on public.quote_items for select to authenticated using (public.is_staff());
create policy quote_items_manage on public.quote_items for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy invoice_items_read on public.invoice_items for select to authenticated using (public.is_finance());
create policy invoice_items_manage on public.invoice_items for all to authenticated using (public.is_finance()) with check (public.is_finance());

create policy invoice_payments_read on public.invoice_payments for select to authenticated using (public.is_finance());
create policy invoice_payments_manage on public.invoice_payments for all to authenticated using (public.is_finance()) with check (public.is_finance());

create policy attachments_read on public.financial_attachments for select to authenticated using (public.is_finance());
create policy attachments_manage on public.financial_attachments for all to authenticated using (public.is_finance()) with check (public.is_finance());

drop trigger if exists audit_finance_categories on public.finance_categories;
create trigger audit_finance_categories after insert or update or delete on public.finance_categories for each row execute function public.audit_row();
drop trigger if exists audit_cash_accounts on public.cash_accounts;
create trigger audit_cash_accounts after insert or update or delete on public.cash_accounts for each row execute function public.audit_row();
drop trigger if exists audit_budget_years on public.budget_years;
create trigger audit_budget_years after insert or update or delete on public.budget_years for each row execute function public.audit_row();
drop trigger if exists audit_budget_lines on public.budget_lines;
create trigger audit_budget_lines after insert or update or delete on public.budget_lines for each row execute function public.audit_row();
drop trigger if exists audit_quote_items on public.quote_items;
create trigger audit_quote_items after insert or update or delete on public.quote_items for each row execute function public.audit_row();
drop trigger if exists audit_invoice_items on public.invoice_items;
create trigger audit_invoice_items after insert or update or delete on public.invoice_items for each row execute function public.audit_row();
drop trigger if exists audit_invoice_payments on public.invoice_payments;
create trigger audit_invoice_payments after insert or update or delete on public.invoice_payments for each row execute function public.audit_row();
drop trigger if exists audit_financial_attachments on public.financial_attachments;
create trigger audit_financial_attachments after insert or update or delete on public.financial_attachments for each row execute function public.audit_row();

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
  null::uuid,
  ip.account_id
from public.invoice_payments ip
join public.invoices i on i.id=ip.invoice_id

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

commit;
