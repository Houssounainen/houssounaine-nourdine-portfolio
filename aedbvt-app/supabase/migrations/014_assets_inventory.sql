begin;

create sequence if not exists public.asset_number_seq start 1;
create sequence if not exists public.stock_sku_seq start 1;

create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_number text unique,
  name text not null,
  category_id uuid references public.asset_categories(id) on delete set null,
  description text,
  serial_number text,
  acquisition_date date,
  acquisition_value numeric(14,2) check (acquisition_value is null or acquisition_value >= 0),
  expense_id uuid references public.expenses(id) on delete set null,
  location text,
  condition text not null default 'good' check (condition in ('new','good','fair','damaged','unusable')),
  status text not null default 'available' check (status in ('available','assigned','maintenance','retired','lost')),
  custodian_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='assigned' and custodian_id is not null) or status<>'assigned')
);

create table if not exists public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  event_type text not null check (event_type in ('created','assignment','transfer','condition','status','maintenance','note')),
  previous_custodian_id uuid references public.profiles(id) on delete set null,
  new_custodian_id uuid references public.profiles(id) on delete set null,
  previous_location text,
  new_location text,
  details text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_maintenance (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  scheduled_on date,
  completed_on date,
  provider text,
  cost numeric(14,2) check (cost is null or cost >= 0),
  expense_id uuid references public.expenses(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  category text,
  unit text not null default 'unité',
  quantity_on_hand numeric(14,3) not null default 0 check (quantity_on_hand >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  location text,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('in','out','adjust_plus','adjust_minus')),
  quantity numeric(14,3) not null check (quantity > 0),
  reason text not null,
  expense_id uuid references public.expenses(id) on delete set null,
  issued_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists assets_status_idx on public.assets(status,category_id);
create index if not exists assets_custodian_idx on public.assets(custodian_id) where custodian_id is not null;
create index if not exists asset_events_asset_idx on public.asset_events(asset_id,created_at desc);
create index if not exists asset_maintenance_asset_idx on public.asset_maintenance(asset_id,status);
create index if not exists stock_items_active_idx on public.stock_items(active,name);
create index if not exists stock_movements_item_idx on public.stock_movements(stock_item_id,created_at desc);

insert into public.asset_categories(code,name) values
('IT','Informatique & numérique'),
('MOB','Mobilier'),
('EVT','Matériel événementiel'),
('COM','Communication'),
('SPORT','Sport & loisirs'),
('ADM','Administration'),
('AUT','Autres')
on conflict(code) do update set name=excluded.name;

create or replace function public.set_asset_number()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.asset_number is null then
    new.asset_number := 'PAT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.asset_number_seq')::text,4,'0');
  end if;
  return new;
end $$;

drop trigger if exists set_asset_number on public.assets;
create trigger set_asset_number
before insert on public.assets
for each row execute function public.set_asset_number();

create or replace function public.set_stock_sku()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.sku is null then
    new.sku := 'STK-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.stock_sku_seq')::text,4,'0');
  end if;
  return new;
end $$;

drop trigger if exists set_stock_sku on public.stock_items;
create trigger set_stock_sku
before insert on public.stock_items
for each row execute function public.set_stock_sku();

create or replace function public.log_asset_change()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    insert into public.asset_events(asset_id,event_type,new_custodian_id,new_location,details,created_by)
    values(new.id,'created',new.custodian_id,new.location,'Bien enregistré dans le patrimoine.',auth.uid());
    return new;
  end if;

  if old.custodian_id is distinct from new.custodian_id then
    insert into public.asset_events(asset_id,event_type,previous_custodian_id,new_custodian_id,previous_location,new_location,details,created_by)
    values(new.id,'assignment',old.custodian_id,new.custodian_id,old.location,new.location,'Détenteur du bien modifié.',auth.uid());
  end if;

  if old.location is distinct from new.location and old.custodian_id is not distinct from new.custodian_id then
    insert into public.asset_events(asset_id,event_type,previous_location,new_location,details,created_by)
    values(new.id,'transfer',old.location,new.location,'Localisation du bien modifiée.',auth.uid());
  end if;

  if old.condition is distinct from new.condition then
    insert into public.asset_events(asset_id,event_type,details,created_by)
    values(new.id,'condition','État : '||old.condition||' → '||new.condition,auth.uid());
  end if;

  if old.status is distinct from new.status then
    insert into public.asset_events(asset_id,event_type,details,created_by)
    values(new.id,'status','Statut : '||old.status||' → '||new.status,auth.uid());
  end if;

  return new;
end $$;

drop trigger if exists log_asset_change on public.assets;
create trigger log_asset_change
after insert or update of custodian_id,location,condition,status on public.assets
for each row execute function public.log_asset_change();

create or replace function public.guard_asset_consistency()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='assigned' and new.custodian_id is null then
    raise exception 'Un bien affecté doit avoir un détenteur.';
  end if;

  if new.status in ('retired','lost') and new.custodian_id is not null then
    raise exception 'Un bien retiré ou perdu ne peut pas rester affecté.';
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists guard_asset_consistency on public.assets;
create trigger guard_asset_consistency
before update on public.assets
for each row execute function public.guard_asset_consistency();

create or replace function public.record_stock_movement(
  p_stock_item_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_reason text,
  p_expense_id uuid default null,
  p_issued_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item public.stock_items%rowtype;
  v_delta numeric(14,3);
  v_id uuid;
begin
  if not public.is_finance() then
    raise exception 'Accès patrimoine/finance requis.';
  end if;

  if p_movement_type not in ('in','out','adjust_plus','adjust_minus') then
    raise exception 'Type de mouvement invalide.';
  end if;

  if p_quantity is null or p_quantity<=0 then
    raise exception 'Quantité invalide.';
  end if;

  if nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'Motif requis.';
  end if;

  select * into v_item
  from public.stock_items
  where id=p_stock_item_id and active=true
  for update;

  if not found then
    raise exception 'Article de stock introuvable ou inactif.';
  end if;

  v_delta := case
    when p_movement_type in ('in','adjust_plus') then p_quantity
    else -p_quantity
  end;

  if v_item.quantity_on_hand + v_delta < 0 then
    raise exception 'Stock insuffisant.';
  end if;

  update public.stock_items
  set quantity_on_hand=quantity_on_hand+v_delta,
      updated_at=now()
  where id=v_item.id;

  insert into public.stock_movements(
    stock_item_id,movement_type,quantity,reason,expense_id,issued_to,created_by
  )
  values(
    v_item.id,p_movement_type,p_quantity,trim(p_reason),p_expense_id,p_issued_to,auth.uid()
  )
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.record_stock_movement(uuid,text,numeric,text,uuid,uuid) from public;
grant execute on function public.record_stock_movement(uuid,text,numeric,text,uuid,uuid) to authenticated;

create or replace function public.record_asset_maintenance(
  p_asset_id uuid,
  p_status text,
  p_scheduled_on date,
  p_completed_on date,
  p_provider text,
  p_cost numeric,
  p_expense_id uuid,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_asset public.assets%rowtype;
begin
  if not public.is_finance() then
    raise exception 'Accès patrimoine/finance requis.';
  end if;

  if p_status not in ('scheduled','in_progress','completed','cancelled') then
    raise exception 'Statut de maintenance invalide.';
  end if;

  select * into v_asset from public.assets where id=p_asset_id for update;
  if not found then
    raise exception 'Bien introuvable.';
  end if;

  insert into public.asset_maintenance(
    asset_id,status,scheduled_on,completed_on,provider,cost,expense_id,notes,created_by
  )
  values(
    p_asset_id,p_status,p_scheduled_on,p_completed_on,
    nullif(trim(coalesce(p_provider,'')),''),
    p_cost,p_expense_id,nullif(trim(coalesce(p_notes,'')),''),auth.uid()
  )
  returning id into v_id;

  if p_status in ('scheduled','in_progress') then
    update public.assets set status='maintenance',custodian_id=null where id=p_asset_id;
  elsif p_status='completed' and v_asset.status='maintenance' then
    update public.assets set status='available' where id=p_asset_id;
  end if;

  insert into public.asset_events(asset_id,event_type,details,created_by)
  values(
    p_asset_id,'maintenance',
    'Maintenance : '||p_status||coalesce(' · '||nullif(trim(coalesce(p_provider,'')),''),''),
    auth.uid()
  );

  return v_id;
end $$;

revoke all on function public.record_asset_maintenance(uuid,text,date,date,text,numeric,uuid,text) from public;
grant execute on function public.record_asset_maintenance(uuid,text,date,date,text,numeric,uuid,text) to authenticated;

alter table public.asset_categories enable row level security;
alter table public.assets enable row level security;
alter table public.asset_events enable row level security;
alter table public.asset_maintenance enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;

revoke all on table public.asset_categories,public.assets,public.asset_events,public.asset_maintenance,public.stock_items,public.stock_movements from anon,authenticated;

grant select on table public.asset_categories,public.assets,public.asset_events,public.asset_maintenance,public.stock_items,public.stock_movements to authenticated;
grant insert,update on table public.asset_categories,public.assets,public.stock_items to authenticated;

create policy asset_categories_staff_read on public.asset_categories
for select to authenticated using (public.is_staff());

create policy asset_categories_finance_manage on public.asset_categories
for all to authenticated using (public.is_finance()) with check (public.is_finance());

create policy assets_staff_read on public.assets
for select to authenticated using (public.is_staff());

create policy assets_finance_insert on public.assets
for insert to authenticated with check (public.is_finance());

create policy assets_finance_update on public.assets
for update to authenticated using (public.is_finance()) with check (public.is_finance());

create policy asset_events_staff_read on public.asset_events
for select to authenticated using (public.is_staff());

create policy asset_maintenance_staff_read on public.asset_maintenance
for select to authenticated using (public.is_staff());

create policy stock_items_staff_read on public.stock_items
for select to authenticated using (public.is_staff());

create policy stock_items_finance_insert on public.stock_items
for insert to authenticated with check (public.is_finance());

create policy stock_items_finance_update on public.stock_items
for update to authenticated using (public.is_finance()) with check (public.is_finance());

create policy stock_movements_staff_read on public.stock_movements
for select to authenticated using (public.is_staff());

drop trigger if exists audit_asset_categories on public.asset_categories;
create trigger audit_asset_categories after insert or update or delete on public.asset_categories for each row execute function public.audit_row();

drop trigger if exists audit_assets on public.assets;
create trigger audit_assets after insert or update or delete on public.assets for each row execute function public.audit_row();

drop trigger if exists audit_asset_events on public.asset_events;
create trigger audit_asset_events after insert or update or delete on public.asset_events for each row execute function public.audit_row();

drop trigger if exists audit_asset_maintenance on public.asset_maintenance;
create trigger audit_asset_maintenance after insert or update or delete on public.asset_maintenance for each row execute function public.audit_row();

drop trigger if exists audit_stock_items on public.stock_items;
create trigger audit_stock_items after insert or update or delete on public.stock_items for each row execute function public.audit_row();

drop trigger if exists audit_stock_movements on public.stock_movements;
create trigger audit_stock_movements after insert or update or delete on public.stock_movements for each row execute function public.audit_row();

commit;
