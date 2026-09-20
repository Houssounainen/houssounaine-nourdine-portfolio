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
  category_id uuid references public.finance_categories(id) on delete set null,
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

create or replace function public.guard_budget_line_write()
returns trigger language plpgsql set search_path=public as $$
declare target_budget uuid;
declare budget_status text;
begin
  target_budget := coalesce(new.budget_id,old.budget_id);
  select status into budget_status from public.budget_years where id=target_budget;
  if budget_status is distinct from 'draft' then
    raise exception 'Un budget approuvé ou clôturé ne peut plus être modifié.';
  end if;
  return coalesce(new,old);
end $$;

drop trigger if exists guard_budget_line_write on public.budget_lines;
create trigger guard_budget_line_write before insert or update or delete on public.budget_lines
for each row execute function public.guard_budget_line_write();

create or replace function public.guard_quote_item_write()
returns trigger language plpgsql set search_path=public as $$
declare target_quote uuid;
declare quote_status public.document_status;
begin
  target_quote := coalesce(new.quote_id,old.quote_id);
  select status into quote_status from public.quotes where id=target_quote;
  if quote_status not in ('draft','issued') then
    raise exception 'Les lignes de ce devis sont verrouillées.';
  end if;
  return coalesce(new,old);
end $$;

drop trigger if exists guard_quote_item_write on public.quote_items;
create trigger guard_quote_item_write before insert or update or delete on public.quote_items
for each row execute function public.guard_quote_item_write();

create or replace function public.guard_invoice_item_write()
returns trigger language plpgsql set search_path=public as $$
declare target_invoice uuid;
declare invoice_status public.document_status;
begin
  target_invoice := coalesce(new.invoice_id,old.invoice_id);
  select status into invoice_status from public.invoices where id=target_invoice;
  if invoice_status in ('paid','cancelled') or exists(select 1 from public.invoice_payments where invoice_id=target_invoice) then
    raise exception 'Les lignes d’une facture réglée ou partiellement réglée sont verrouillées.';
  end if;
  return coalesce(new,old);
end $$;

drop trigger if exists guard_invoice_item_write on public.invoice_items;
create trigger guard_invoice_item_write before insert or update or delete on public.invoice_items
for each row execute function public.guard_invoice_item_write();

create or replace function public.validate_invoice_payment()
returns trigger language plpgsql set search_path=public as $$
declare invoice_total numeric(14,2);
declare invoice_status public.document_status;
declare already_paid numeric(14,2);
begin
  select total,status into invoice_total,invoice_status from public.invoices where id=new.invoice_id for update;
  if invoice_status='cancelled' then
    raise exception 'Une facture annulée ne peut pas être réglée.';
  end if;
  if invoice_total <= 0 then
    raise exception 'Une facture sans montant ne peut pas être réglée.';
  end if;

  select coalesce(sum(amount),0) into already_paid
  from public.invoice_payments
  where invoice_id=new.invoice_id and id is distinct from new.id;

  if already_paid + new.amount > invoice_total then
    raise exception 'Le règlement dépasse le reste à payer.';
  end if;
  return new;
end $$;

drop trigger if exists validate_invoice_payment on public.invoice_payments;
create trigger validate_invoice_payment before insert or update on public.invoice_payments
for each row execute function public.validate_invoice_payment();

create or replace function public.guard_invoice_status_update()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='cancelled' and old.status is distinct from 'cancelled'
     and exists(select 1 from public.invoice_payments where invoice_id=old.id) then
    raise exception 'Une facture ayant un règlement ne peut pas être annulée.';
  end if;
  if old.status='paid' and new.status is distinct from old.status then
    raise exception 'Une facture payée est verrouillée.';
  end if;
  return new;
end $$;

drop trigger if exists guard_invoice_status_update on public.invoices;
create trigger guard_invoice_status_update before update of status on public.invoices
for each row execute function public.guard_invoice_status_update();

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

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'financial-documents',
  'financial-documents',
  false,
  5242880,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=false,
  file_size_limit=5242880,
  allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'];

drop policy if exists financial_storage_read on storage.objects;
create policy financial_storage_read on storage.objects
for select to authenticated
using (bucket_id='financial-documents' and public.is_finance());

drop policy if exists financial_storage_insert on storage.objects;
create policy financial_storage_insert on storage.objects
for insert to authenticated
with check (bucket_id='financial-documents' and public.is_finance());

drop policy if exists financial_storage_delete on storage.objects;
create policy financial_storage_delete on storage.objects
for delete to authenticated
using (bucket_id='financial-documents' and public.is_finance());

create or replace function public.convert_quote_to_invoice(
  p_quote_id uuid,
  p_due_at date default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  q public.quotes%rowtype;
  new_invoice_id uuid;
begin
  if not public.is_finance() then
    raise exception 'Accès financier requis.';
  end if;

  select * into q from public.quotes where id=p_quote_id for update;
  if not found then
    raise exception 'Devis introuvable.';
  end if;

  if q.status='cancelled' then
    raise exception 'Un devis annulé ne peut pas être facturé.';
  end if;
  if q.total <= 0 or not exists(select 1 from public.quote_items where quote_id=p_quote_id) then
    raise exception 'Le devis doit contenir au moins une ligne avant facturation.';
  end if;

  if exists(select 1 from public.invoices where quote_id=p_quote_id) then
    select id into new_invoice_id from public.invoices where quote_id=p_quote_id limit 1;
    return new_invoice_id;
  end if;

  insert into public.invoices(
    quote_id, recipient_name, subject, total, status, issued_at, due_at,
    payload, created_by, recipient_email, recipient_phone, recipient_address,
    notes, currency
  )
  values(
    q.id, q.recipient_name, q.subject, q.total, 'issued', current_date, p_due_at,
    q.payload, auth.uid(), q.recipient_email, q.recipient_phone, q.recipient_address,
    q.notes, q.currency
  )
  returning id into new_invoice_id;

  insert into public.invoice_items(invoice_id,position,description,quantity,unit_price)
  select new_invoice_id, position, description, quantity, unit_price
  from public.quote_items
  where quote_id=p_quote_id
  order by position,id;

  update public.quotes set status='accepted' where id=p_quote_id;

  return new_invoice_id;
end $$;

revoke all on function public.convert_quote_to_invoice(uuid,date) from public;
grant execute on function public.convert_quote_to_invoice(uuid,date) to authenticated;

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
