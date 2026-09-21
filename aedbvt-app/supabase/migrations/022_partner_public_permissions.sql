begin;
grant update (is_public,public_description) on table public.partners to authenticated;
commit;
