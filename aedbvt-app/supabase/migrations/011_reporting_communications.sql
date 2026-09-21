begin;

create table if not exists public.internal_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  priority text not null default 'info' check (priority in ('info','warning','urgent')),
  segment_type text not null default 'all' check (segment_type in ('all','staff','role','village')),
  segment_value text,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists internal_broadcasts_sent_idx
on public.internal_broadcasts(sent_at desc);

alter table public.internal_broadcasts enable row level security;

revoke all on table public.internal_broadcasts from anon, authenticated;
grant select, insert on table public.internal_broadcasts to authenticated;

create policy internal_broadcasts_staff_read
on public.internal_broadcasts
for select to authenticated
using (public.is_staff());

create policy internal_broadcasts_staff_insert
on public.internal_broadcasts
for insert to authenticated
with check (
  public.is_staff()
  and created_by=auth.uid()
);

grant insert on table public.internal_notifications to authenticated;

drop policy if exists notifications_staff_insert on public.internal_notifications;
create policy notifications_staff_insert
on public.internal_notifications
for insert to authenticated
with check (
  public.is_staff()
  and recipient_id is not null
);

drop trigger if exists audit_internal_broadcasts on public.internal_broadcasts;
create trigger audit_internal_broadcasts
after insert or update or delete on public.internal_broadcasts
for each row execute function public.audit_row();

commit;
