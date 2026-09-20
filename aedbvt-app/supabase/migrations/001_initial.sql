begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','bureau','tresorier','secretaire','membre');
create type public.member_status as enum ('pending','active','inactive');
create type public.payment_status as enum ('pending','confirmed','cancelled');
create type public.document_status as enum ('draft','issued','accepted','paid','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'membre',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  member_number text unique,
  full_name text not null,
  village text check (village in ('Darsalama','Bandrani-Vouani')),
  program text,
  study_level text,
  phone text,
  status public.member_status not null default 'pending',
  joined_at date default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create sequence if not exists public.receipt_seq start 1;
create sequence if not exists public.quote_seq start 1;
create sequence if not exists public.invoice_seq start 1;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  method text not null,
  external_reference text,
  receipt_number text unique,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric(14,2) not null check (amount > 0),
  spent_at date not null,
  reference text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default ('DEV-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.quote_seq')::text,4,'0')),
  recipient_name text not null,
  subject text not null,
  total numeric(14,2) not null default 0,
  status public.document_status not null default 'draft',
  issued_at date not null default current_date,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete set null,
  number text unique not null default ('FAC-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text,4,'0')),
  recipient_name text not null,
  subject text not null,
  total numeric(14,2) not null default 0,
  status public.document_status not null default 'issued',
  issued_at date not null default current_date,
  due_at date,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  body text not null,
  category text,
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  location text,
  agenda jsonb not null default '[]'::jsonb,
  minutes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.governance_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  version text not null default '0.1',
  body text,
  file_path text,
  published boolean not null default false,
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  action text not null,
  record_id text,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings(key,value) values
('administrator_display_name','"Houssounaine Nourdine"'::jsonb),
('association_name','"Association des Étudiants de Darsalama et Bandrani-Vouani à Tuléar"'::jsonb),
('annual_dues_ariary','30000'::jsonb)
on conflict do nothing;

insert into public.governance_documents(title,category,version,published) values
('Statuts de l’AEDBVT','Textes fondateurs','0.1',false),
('Règlement intérieur','Textes fondateurs','0.1',false),
('Code d’éthique','Éthique','0.1',false),
('Registre des conflits d’intérêts','Transparence','0.1',false),
('Politique de dons et financements','Finances','0.1',false),
('Manuel de procédures','Organisation','0.1',false),
('Mécanisme de plaintes et signalements','Éthique','0.1',false);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and active=true
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.current_role() in ('admin','bureau','tresorier','secretaire'),false)
$$;

create or replace function public.is_finance()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.current_role() in ('admin','bureau','tresorier'),false)
$$;

create or replace function public.set_receipt_number()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='confirmed' and new.receipt_number is null then
    new.receipt_number := 'REC-' || to_char(coalesce(new.paid_at,now()),'YYYY') || '-' || lpad(nextval('public.receipt_seq')::text,4,'0');
  end if;
  return new;
end $$;

create trigger payments_receipt before insert or update on public.payments
for each row execute function public.set_receipt_number();

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path=public as $$
declare rid text;
begin
  rid := coalesce((to_jsonb(coalesce(new,old))->>'id'),'');
  insert into public.audit_logs(actor_id,table_name,action,record_id)
  values(auth.uid(),tg_table_name,tg_op,rid);
  return coalesce(new,old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['members','payments','expenses','quotes','invoices','articles','events','meetings','governance_documents']
  loop
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row()',t,t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.articles enable row level security;
alter table public.events enable row level security;
alter table public.meetings enable row level security;
alter table public.governance_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

revoke all on table public.profiles, public.members, public.payments, public.expenses,
  public.quotes, public.invoices, public.articles, public.events, public.meetings,
  public.governance_documents, public.audit_logs, public.app_settings from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.members to authenticated;
grant select, insert, update on table public.payments to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.quotes to authenticated;
grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.articles to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.meetings to authenticated;
grant select, insert, update, delete on table public.governance_documents to authenticated;
grant select on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.app_settings to authenticated;
grant usage, select on sequence public.receipt_seq, public.quote_seq, public.invoice_seq to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id=auth.uid() or public.is_staff());
create policy profiles_staff_update on public.profiles for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy members_read on public.members for select to authenticated using (true);
create policy members_staff_insert on public.members for insert to authenticated with check (public.is_staff());
create policy members_staff_update on public.members for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy payments_read on public.payments for select to authenticated using (
  public.is_finance() or exists(select 1 from public.members m where m.id=member_id and m.profile_id=auth.uid())
);
create policy payments_finance_insert on public.payments for insert to authenticated with check (public.is_finance());
create policy payments_finance_update on public.payments for update to authenticated using (public.is_finance()) with check (public.is_finance());

create policy expenses_finance_all on public.expenses for all to authenticated using (public.is_finance()) with check (public.is_finance());
create policy quotes_staff_all on public.quotes for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy invoices_finance_all on public.invoices for all to authenticated using (public.is_finance()) with check (public.is_finance());

create policy articles_read on public.articles for select to authenticated using (published or public.is_staff());
create policy articles_staff_all on public.articles for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy events_read on public.events for select to authenticated using (published or public.is_staff());
create policy events_staff_all on public.events for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy meetings_staff_all on public.meetings for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy governance_read on public.governance_documents for select to authenticated using (published or public.is_staff());
create policy governance_staff_all on public.governance_documents for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy audit_admin_read on public.audit_logs for select to authenticated using (public.current_role()='admin');
create policy settings_read on public.app_settings for select to authenticated using (true);
create policy settings_admin_all on public.app_settings for all to authenticated using (public.current_role()='admin') with check (public.current_role()='admin');

commit;
