begin;

create or replace function public.enrol_member_in_open_dues()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from new.status) then
    insert into public.member_dues(cycle_id,member_id,amount_due)
    select c.id,new.id,c.amount
    from public.membership_dues_cycles c
    where c.status='open'
      and coalesce(new.joined_at,c.starts_on)<=c.ends_on
    on conflict(cycle_id,member_id) do nothing;
  end if;
  return new;
end $$;

revoke all on function public.enrol_member_in_open_dues() from public, anon, authenticated;
grant execute on function public.enrol_member_in_open_dues() to service_role;

commit;
