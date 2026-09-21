begin;

revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;

grant execute on function public.get_public_app_settings() to anon, authenticated;
grant execute on function public.get_membership_application_status(text,text) to anon, authenticated;
grant execute on function public.submit_membership_application(text,text,text,text,text,text,text,boolean) to anon, authenticated;
grant execute on function public.digest(text,text) to anon, authenticated;

revoke all on table public.motion_ballots, public.election_ballots from anon, authenticated;

commit;
