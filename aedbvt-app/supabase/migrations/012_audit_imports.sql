begin;

alter table public.audit_logs
  add column if not exists old_data jsonb;

alter table public.audit_logs
  add column if not exists new_data jsonb;

alter table public.audit_logs
  add column if not exists changed_fields text[];

create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_table_idx on public.audit_logs(table_name,created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id,created_at desc);

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  rid text;
  old_payload jsonb;
  new_payload jsonb;
  changed text[];
begin
  old_payload := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_payload := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;

  rid := coalesce(
    new_payload->>'id',
    old_payload->>'id',
    ''
  );

  if tg_op='UPDATE' then
    select coalesce(array_agg(key order by key),array[]::text[])
    into changed
    from (
      select key
      from jsonb_each(old_payload) old_entry(key,value)
      full join jsonb_each(new_payload) new_entry using(key)
      where old_entry.value is distinct from new_entry.value
        and key not in ('updated_at')
    ) differences;
  elsif tg_op='INSERT' then
    changed := array['created'];
  else
    changed := array['deleted'];
  end if;

  insert into public.audit_logs(
    actor_id,
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    changed_fields
  )
  values(
    auth.uid(),
    tg_table_name,
    tg_op,
    rid,
    old_payload,
    new_payload,
    changed
  );

  return coalesce(new,old);
end $$;

commit;
