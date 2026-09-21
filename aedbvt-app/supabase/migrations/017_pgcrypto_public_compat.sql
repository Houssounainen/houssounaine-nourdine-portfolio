begin;

create or replace function public.digest(data text, type text)
returns bytea
language sql
immutable
strict
set search_path=extensions,pg_catalog
as $$ select extensions.digest(data, type) $$;

revoke all on function public.digest(text,text) from public;
grant execute on function public.digest(text,text) to anon, authenticated, service_role;

commit;
