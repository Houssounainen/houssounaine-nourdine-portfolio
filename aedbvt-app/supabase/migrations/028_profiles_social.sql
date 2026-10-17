begin;

-- ———————————————————————————————————————————————————————————————
-- Photo de profil publique (entre membres) et fiches de profil.
-- La photo d’identité de la carte reste privée ; l’avatar est une copie réduite
-- stockée dans community-media, affichée dans la discussion, le fil, le marché, etc.
-- Aucune donnée de contact (téléphone, email) n’est exposée par ces fonctions.
-- ———————————————————————————————————————————————————————————————

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 280);

create or replace function public.set_my_avatar(p_url text, p_bio text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or public.current_role() is null then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  if p_url is not null and position('/storage/v1/object/public/community-media/' || auth.uid()::text || '/' in p_url) = 0 then
    raise exception 'INVALID_AVATAR' using errcode='22023';
  end if;
  update public.profiles
     set avatar_url = coalesce(p_url, avatar_url),
         bio = case when p_bio is null then bio else nullif(left(btrim(p_bio),280),'') end,
         updated_at = now()
   where id = auth.uid();
end $$;
revoke all on function public.set_my_avatar(text,text) from public, anon;
grant execute on function public.set_my_avatar(text,text) to authenticated;

-- Noms et photos d’un ensemble de comptes (auteurs du fil, de la discussion, du marché…).
create or replace function public.get_people(p_ids uuid[])
returns table(id uuid, full_name text, avatar_url text, role text)
language sql stable security definer set search_path=public as $$
  select p.id, p.full_name, p.avatar_url, p.role::text
  from public.profiles p
  where public.current_role() is not null and p.id = any(p_ids) and p.active = true
$$;
revoke all on function public.get_people(uuid[]) from public, anon;
grant execute on function public.get_people(uuid[]) to authenticated;

-- Annuaire social : membres actifs avec leur village et leurs études (sans coordonnées).
create or replace function public.list_people(p_query text default null, p_limit integer default 200)
returns table(id uuid, full_name text, avatar_url text, role text, village text, program text, study_level text, member_number text, joined_at date)
language sql stable security definer set search_path=public as $$
  select p.id, p.full_name, p.avatar_url, p.role::text, m.village, m.program, m.study_level, m.member_number, m.joined_at
  from public.profiles p
  left join public.members m on m.profile_id = p.id
  where public.current_role() is not null and p.active = true
    and (p_query is null or p_query = '' or p.full_name ilike '%' || p_query || '%' or m.program ilike '%' || p_query || '%' or m.village ilike '%' || p_query || '%')
  order by p.full_name
  limit least(greatest(coalesce(p_limit,200),1),500)
$$;
revoke all on function public.list_people(text,integer) from public, anon;
grant execute on function public.list_people(text,integer) to authenticated;

create or replace function public.get_person(p_id uuid)
returns table(id uuid, full_name text, avatar_url text, bio text, role text, village text, program text, study_level text, member_number text, joined_at date, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.id, p.full_name, p.avatar_url, p.bio, p.role::text, m.village, m.program, m.study_level, m.member_number, m.joined_at, p.created_at
  from public.profiles p
  left join public.members m on m.profile_id = p.id
  where public.current_role() is not null and p.id = p_id and p.active = true
$$;
revoke all on function public.get_person(uuid) from public, anon;
grant execute on function public.get_person(uuid) to authenticated;

commit;
