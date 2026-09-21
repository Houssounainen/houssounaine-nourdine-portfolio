begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_pending boolean;
begin
  v_pending := coalesce((new.raw_user_meta_data->>'application_pending')::boolean,false);

  insert into public.profiles(id,full_name,active)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    not v_pending
  )
  on conflict (id) do nothing;

  return new;
end $$;

commit;
