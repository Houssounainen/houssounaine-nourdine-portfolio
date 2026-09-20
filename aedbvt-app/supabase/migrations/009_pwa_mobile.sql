begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx
on public.push_subscriptions(profile_id)
where enabled=true;

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  announcements boolean not null default true,
  agenda boolean not null default true,
  operations boolean not null default true,
  administration boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

revoke all on table public.push_subscriptions, public.notification_preferences from anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions, public.notification_preferences to authenticated;

create policy push_subscriptions_self_read on public.push_subscriptions
for select to authenticated
using (profile_id=auth.uid());

create policy push_subscriptions_self_insert on public.push_subscriptions
for insert to authenticated
with check (profile_id=auth.uid());

create policy push_subscriptions_self_update on public.push_subscriptions
for update to authenticated
using (profile_id=auth.uid())
with check (profile_id=auth.uid());

create policy push_subscriptions_self_delete on public.push_subscriptions
for delete to authenticated
using (profile_id=auth.uid());

create policy notification_preferences_self_read on public.notification_preferences
for select to authenticated
using (profile_id=auth.uid());

create policy notification_preferences_self_insert on public.notification_preferences
for insert to authenticated
with check (profile_id=auth.uid());

create policy notification_preferences_self_update on public.notification_preferences
for update to authenticated
using (profile_id=auth.uid())
with check (profile_id=auth.uid());

insert into public.notification_preferences(profile_id)
select p.id
from public.profiles p
where not exists(
  select 1 from public.notification_preferences np where np.profile_id=p.id
);

create or replace function public.init_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.notification_preferences(profile_id)
  values(new.id)
  on conflict(profile_id) do nothing;
  return new;
end $$;

drop trigger if exists init_notification_preferences on public.profiles;
create trigger init_notification_preferences
after insert on public.profiles
for each row execute function public.init_notification_preferences();

commit;
