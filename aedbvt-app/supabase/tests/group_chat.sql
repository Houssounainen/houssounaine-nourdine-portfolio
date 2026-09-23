-- Run as the SQL editor's administrative role. Every fixture is rolled back;
-- no test user or message persists and no Realtime message is published.
begin;

do $$
declare
  member_a uuid := gen_random_uuid();
  member_b uuid := gen_random_uuid();
  inactive_member uuid := gen_random_uuid();
  missing_profile uuid := gen_random_uuid();
  message_a uuid := gen_random_uuid();
  message_b uuid := gen_random_uuid();
  affected integer;
  saved public.chat_messages;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (member_a, member_a::text || '@chat-test.invalid', '{"full_name":"Chat test A"}'),
    (member_b, member_b::text || '@chat-test.invalid', '{"full_name":"Chat test B"}'),
    (inactive_member, inactive_member::text || '@chat-test.invalid', '{"full_name":"Chat test inactive"}');
  update public.profiles set active = true, role = 'membre', full_name = 'Chat test A' where id = member_a;
  update public.profiles set active = true, role = 'membre', full_name = 'Chat test B' where id = member_b;
  update public.profiles set active = false where id = inactive_member;

  perform set_config('request.jwt.claim.sub', member_a::text, true);
  execute 'set local role authenticated';
  insert into public.chat_messages(id, body) values (message_a, E'  Bonjour\n ');
  select * into saved from public.chat_messages where id = message_a;
  assert saved.body = 'Bonjour' and saved.author_id = member_a and saved.author_name = 'Chat test A', 'Author and trimmed content must come from the database';
  begin
    insert into public.chat_messages(body) values ('Too soon');
    raise exception 'Rate limit was bypassed';
  exception when raise_exception then
    if sqlerrm <> 'CHAT_RATE_LIMIT' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', member_b::text, true);
  assert exists(select 1 from public.chat_messages where id = message_a), 'Active members must see each other';
  update public.chat_messages set deleted_at = now() where id = message_a;
  get diagnostics affected = row_count;
  assert affected = 0, 'A member must not remove someone else''s message';
  begin
    update public.chat_messages set body = 'Changed' where id = message_a;
    raise exception 'Body modification was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages(body, author_id) values ('Spoofed', member_a);
    raise exception 'Author spoofing was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages(body, created_at) values ('Future message', now() + interval '1 year');
    raise exception 'Timestamp spoofing was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages(body) values (E' \t\r\n ');
    raise exception 'Whitespace-only message was allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.chat_messages(body) values (repeat('a', 2001));
    raise exception 'Oversized message was allowed';
  exception when check_violation then null;
  end;
  insert into public.chat_messages(id, body) values (message_b, 'Bonjour au groupe');
  update public.chat_messages set deleted_at = now() where id = message_b;
  select * into saved from public.chat_messages where id = message_b;
  assert saved.body = '' and saved.deleted_at is not null, 'Removing a message must erase its body';
  begin
    delete from public.chat_messages where id = message_b;
    raise exception 'Direct hard deletion was allowed';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', inactive_member::text, true);
  assert not exists(select 1 from public.chat_messages), 'Inactive members must not read the room';
  begin
    insert into public.chat_messages(body) values ('Inactive');
    raise exception 'Inactive send was allowed';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', missing_profile::text, true);
  assert not exists(select 1 from public.chat_messages), 'An authenticated user without an approved profile must not read the room';
  begin
    insert into public.chat_messages(body) values ('No profile');
    raise exception 'Profile-free send was allowed';
  exception when insufficient_privilege then null;
  end;

  execute 'reset role';
  update public.profiles set role = 'bureau' where id = member_b;
  perform set_config('request.jwt.claim.sub', member_b::text, true);
  execute 'set local role authenticated';
  update public.chat_messages set deleted_at = now() where id = message_a;
  get diagnostics affected = row_count;
  assert affected = 1, 'Bureau moderation must work';
  select * into saved from public.chat_messages where id = message_a;
  assert saved.body = '' and saved.deleted_at is not null, 'Moderation must erase the body';

  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  begin
    perform 1 from public.chat_messages;
    raise exception 'Anonymous reads were allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages(body) values ('Anonymous');
    raise exception 'Anonymous sends were allowed';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
end;
$$;

select 'Chat database tests passed; all fixtures rolled back.' as result;
rollback;
