begin;

create schema if not exists aedbvt_chat_private;
revoke all on schema aedbvt_chat_private from public, anon, authenticated;

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  constraint chat_message_body_length check (
    (deleted_at is null and char_length(body) between 1 and 2000)
    or (deleted_at is not null and body = '')
  )
);

create index chat_messages_history_idx on public.chat_messages (created_at desc, id desc);
create index chat_messages_author_time_idx on public.chat_messages (author_id, created_at desc);

alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from public, anon, authenticated;
grant select on public.chat_messages to authenticated;
grant insert (id, body) on public.chat_messages to authenticated;
grant update (deleted_at) on public.chat_messages to authenticated;

create policy chat_members_read on public.chat_messages for select to authenticated
using ((select public.current_role()) is not null);

create policy chat_members_send on public.chat_messages for insert to authenticated
with check ((select public.current_role()) is not null and author_id = (select auth.uid()) and deleted_at is null);

create policy chat_remove_own_or_moderate on public.chat_messages for update to authenticated
using (
  (select public.current_role()) is not null and deleted_at is null
  and (author_id = (select auth.uid()) or (select public.current_role()) in ('admin', 'bureau'))
)
with check (
  (select public.current_role()) is not null
  and (author_id = (select auth.uid()) or (select public.current_role()) in ('admin', 'bureau'))
);

-- Runs with the caller's privileges and RLS, never as an administrator.
create function aedbvt_chat_private.prepare_message()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or public.current_role() is null then
    raise exception 'CHAT_ACCESS_DENIED' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    -- Serializes concurrent sends by the same person, including multiple tabs.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('aedbvt-chat:' || actor::text, 0));
    if exists (
      select 1 from public.chat_messages
      where author_id = actor and created_at > clock_timestamp() - interval '2 seconds'
    ) then
      raise exception 'CHAT_RATE_LIMIT';
    end if;
    new.author_id := actor;
    select coalesce(nullif(btrim(full_name), ''), 'Membre AEDBVT') into new.author_name
      from public.profiles where id = actor and active = true;
    new.body := btrim(new.body, E' \t\n\r');
    new.created_at := date_trunc('milliseconds', clock_timestamp());
    new.deleted_at := null;
  else
    if new.id is distinct from old.id or new.author_id is distinct from old.author_id
      or new.author_name is distinct from old.author_name or new.created_at is distinct from old.created_at
      or new.body is distinct from old.body or old.deleted_at is not null or new.deleted_at is null then
      raise exception 'CHAT_IMMUTABLE_MESSAGE' using errcode = '42501';
    end if;
    new.body := '';
    new.deleted_at := clock_timestamp();
  end if;
  return new;
end;
$$;

revoke all on function aedbvt_chat_private.prepare_message() from public, anon, authenticated;
create trigger prepare_chat_message before insert or update on public.chat_messages
for each row execute function aedbvt_chat_private.prepare_message();

-- Only the chat table is replicated. INSERT/UPDATE listeners are checked by RLS.
alter publication supabase_realtime add table public.chat_messages;

commit;
