begin;

-- ———————————————————————————————————————————————————————————————
-- Vie communautaire : photos, publications, mentions « J’aime », marché entre membres,
-- bibliothèque partagée et jeux. Toutes les tables sont réservées aux comptes actifs.
-- ———————————————————————————————————————————————————————————————

create schema if not exists aedbvt_social_private;
revoke all on schema aedbvt_social_private from public, anon, authenticated;

create or replace function public.is_active_account()
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_role() is not null
$$;
revoke all on function public.is_active_account() from public, anon;
grant execute on function public.is_active_account() to authenticated;

-- Renseigne l’auteur à partir du compte connecté : un client ne peut pas usurper un nom.
create or replace function aedbvt_social_private.stamp_author()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or public.current_role() is null then
    raise exception 'SOCIAL_ACCESS_DENIED' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    new.author_id := actor;
    select coalesce(nullif(btrim(full_name),''),'Membre AEDBVT') into new.author_name
      from public.profiles where id=actor and active=true;
    new.created_at := clock_timestamp();
  else
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
revoke all on function aedbvt_social_private.stamp_author() from public, anon, authenticated;

-- ——— Stockage ———
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-media','community-media',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'];

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('identity-photos','identity-photos',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('library-files','library-files',false,15728640,array[
  'application/pdf','image/jpeg','image/png','image/webp','text/plain',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do update set public=false,file_size_limit=15728640;

-- Chaque membre écrit uniquement dans son dossier (premier segment = son identifiant).
drop policy if exists community_media_insert on storage.objects;
create policy community_media_insert on storage.objects for insert to authenticated
with check (bucket_id='community-media' and public.is_active_account() and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists community_media_delete on storage.objects;
create policy community_media_delete on storage.objects for delete to authenticated
using (bucket_id='community-media' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_staff()));

drop policy if exists identity_photos_read on storage.objects;
create policy identity_photos_read on storage.objects for select to authenticated
using (bucket_id='identity-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_staff()));
drop policy if exists identity_photos_insert on storage.objects;
create policy identity_photos_insert on storage.objects for insert to authenticated
with check (bucket_id='identity-photos' and public.is_active_account() and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists identity_photos_update on storage.objects;
create policy identity_photos_update on storage.objects for update to authenticated
using (bucket_id='identity-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists identity_photos_delete on storage.objects;
create policy identity_photos_delete on storage.objects for delete to authenticated
using (bucket_id='identity-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_staff()));

drop policy if exists library_files_read on storage.objects;
create policy library_files_read on storage.objects for select to authenticated
using (bucket_id='library-files' and public.is_active_account());
drop policy if exists library_files_insert on storage.objects;
create policy library_files_insert on storage.objects for insert to authenticated
with check (bucket_id='library-files' and public.is_active_account() and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists library_files_delete on storage.objects;
create policy library_files_delete on storage.objects for delete to authenticated
using (bucket_id='library-files' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_staff()));

-- ——— Photo d’identité et couverture d’article ———
alter table public.members add column if not exists photo_path text;
alter table public.articles add column if not exists cover_url text;

create or replace function public.set_my_member_photo(p_path text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or public.current_role() is null then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  if p_path is not null and split_part(p_path,'/',1)<>auth.uid()::text then
    raise exception 'INVALID_PATH' using errcode='22023';
  end if;
  update public.members set photo_path=p_path where profile_id=auth.uid();
  if not found then raise exception 'MEMBER_NOT_LINKED'; end if;
end;
$$;
revoke all on function public.set_my_member_photo(text) from public, anon;
grant execute on function public.set_my_member_photo(text) to authenticated;

-- ——— Publications ———
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  category text not null default 'social' check (category in ('annonce','fete','social','partage','photo')),
  body text not null default '' check (char_length(body)<=3000),
  images text[] not null default '{}' check (cardinality(images)<=6),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint community_post_not_empty check (deleted_at is not null or char_length(btrim(body))>0 or cardinality(images)>0)
);
create index if not exists community_posts_feed_idx on public.community_posts(created_at desc) where deleted_at is null;

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists community_post_comments_post_idx on public.community_post_comments(post_id,created_at);

create table if not exists public.chat_message_likes (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(message_id,user_id)
);

-- ——— Marché entre membres ———
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text not null default '' check (char_length(description)<=2000),
  category text not null default 'autre' check (category in ('livres','electronique','vetements','maison','services','alimentation','autre')),
  price numeric(12,0) check (price is null or price>=0),
  condition text check (condition is null or condition in ('neuf','tres_bon','bon','usage')),
  contact text not null default '' check (char_length(contact)<=120),
  images text[] not null default '{}' check (cardinality(images)<=5),
  status text not null default 'available' check (status in ('available','reserved','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists market_listings_idx on public.market_listings(created_at desc) where deleted_at is null;

-- ——— Bibliothèque ———
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  title text not null check (char_length(btrim(title)) between 2 and 160),
  description text not null default '' check (char_length(description)<=1000),
  category text not null default 'cours' check (category in ('cours','memoire','examen','modele','livre','administratif','autre')),
  url text check (url is null or url ~* '^https?://'),
  file_path text,
  file_name text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint library_item_target check (url is not null or file_path is not null)
);
create index if not exists library_items_idx on public.library_items(created_at desc) where deleted_at is null;

-- ——— Jeux ———
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  game text not null check (game in ('quiz','mot','memoire','calcul')),
  score integer not null check (score between 0 and 100000),
  played_on date not null default (now() at time zone 'Indian/Antananarivo')::date,
  created_at timestamptz not null default now()
);
create index if not exists game_scores_board_idx on public.game_scores(game,played_on,score desc);

-- ——— Déclencheurs d’auteur ———
do $$
declare t text;
begin
  foreach t in array array['community_posts','community_post_comments','market_listings','library_items','game_scores'] loop
    execute format('drop trigger if exists stamp_author on public.%I',t);
    execute format('create trigger stamp_author before insert or update on public.%I for each row execute function aedbvt_social_private.stamp_author()',t);
  end loop;
end $$;

-- ——— Droits & RLS ———
alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.chat_message_likes enable row level security;
alter table public.market_listings enable row level security;
alter table public.library_items enable row level security;
alter table public.game_scores enable row level security;

revoke all on public.community_posts, public.community_post_likes, public.community_post_comments,
  public.chat_message_likes, public.market_listings, public.library_items, public.game_scores from public, anon;

grant select, insert on public.community_posts to authenticated;
grant update (body, category, images, pinned, deleted_at) on public.community_posts to authenticated;
grant select, insert, delete on public.community_post_likes to authenticated;
grant select, insert on public.community_post_comments to authenticated;
grant update (deleted_at) on public.community_post_comments to authenticated;
grant select, insert, delete on public.chat_message_likes to authenticated;
grant select, insert on public.market_listings to authenticated;
grant update (title, description, category, price, condition, contact, images, status, updated_at, deleted_at) on public.market_listings to authenticated;
grant select, insert on public.library_items to authenticated;
grant update (title, description, category, deleted_at) on public.library_items to authenticated;
grant select, insert on public.game_scores to authenticated;

create policy posts_read on public.community_posts for select to authenticated using (public.is_active_account() and (deleted_at is null or author_id=(select auth.uid()) or public.is_staff()));
create policy posts_insert on public.community_posts for insert to authenticated
  with check (public.is_active_account() and author_id=(select auth.uid()) and (pinned=false or public.is_staff()) and (category<>'annonce' or public.is_staff()));
create policy posts_update on public.community_posts for update to authenticated
  using (public.is_active_account() and (author_id=(select auth.uid()) or public.is_staff()))
  with check (public.is_active_account() and (author_id=(select auth.uid()) or public.is_staff()) and (pinned=false or public.is_staff()));

create policy post_likes_read on public.community_post_likes for select to authenticated using (public.is_active_account());
create policy post_likes_insert on public.community_post_likes for insert to authenticated with check (public.is_active_account() and user_id=(select auth.uid()));
create policy post_likes_delete on public.community_post_likes for delete to authenticated using (user_id=(select auth.uid()));

create policy post_comments_read on public.community_post_comments for select to authenticated using (public.is_active_account() and (deleted_at is null or author_id=(select auth.uid()) or public.is_staff()));
create policy post_comments_insert on public.community_post_comments for insert to authenticated with check (public.is_active_account() and author_id=(select auth.uid()));
create policy post_comments_update on public.community_post_comments for update to authenticated
  using (author_id=(select auth.uid()) or public.is_staff()) with check (author_id=(select auth.uid()) or public.is_staff());

create policy chat_likes_read on public.chat_message_likes for select to authenticated using (public.is_active_account());
create policy chat_likes_insert on public.chat_message_likes for insert to authenticated with check (public.is_active_account() and user_id=(select auth.uid()));
create policy chat_likes_delete on public.chat_message_likes for delete to authenticated using (user_id=(select auth.uid()));

create policy market_read on public.market_listings for select to authenticated using (public.is_active_account() and (deleted_at is null or author_id=(select auth.uid()) or public.is_staff()));
create policy market_insert on public.market_listings for insert to authenticated with check (public.is_active_account() and author_id=(select auth.uid()));
create policy market_update on public.market_listings for update to authenticated
  using (public.is_active_account() and (author_id=(select auth.uid()) or public.is_staff()))
  with check (public.is_active_account() and (author_id=(select auth.uid()) or public.is_staff()));

create policy library_read on public.library_items for select to authenticated using (public.is_active_account() and (deleted_at is null or author_id=(select auth.uid()) or public.is_staff()));
create policy library_insert on public.library_items for insert to authenticated
  with check (public.is_active_account() and author_id=(select auth.uid()) and (file_path is null or split_part(file_path,'/',1)=(select auth.uid())::text));
create policy library_update on public.library_items for update to authenticated
  using (public.is_active_account() and (author_id=(select auth.uid()) or public.is_staff()))
  with check (public.is_active_account() and (author_id=(select auth.uid()) or public.is_staff()));

create policy scores_read on public.game_scores for select to authenticated using (public.is_active_account());
create policy scores_insert on public.game_scores for insert to authenticated with check (public.is_active_account() and author_id=(select auth.uid()));

-- Compteurs agrégés pour le fil (une requête au lieu d’une par publication).
create or replace view public.community_post_stats with (security_invoker=true) as
select p.id as post_id,
  (select count(*) from public.community_post_likes l where l.post_id=p.id)::int as likes,
  (select count(*) from public.community_post_comments c where c.post_id=p.id and c.deleted_at is null)::int as comments,
  exists(select 1 from public.community_post_likes l where l.post_id=p.id and l.user_id=auth.uid()) as liked
from public.community_posts p where p.deleted_at is null;
grant select on public.community_post_stats to authenticated;

-- Les RPC publiques exposent désormais l’image de couverture.
drop function if exists public.get_public_articles();
create function public.get_public_articles()
returns table(id uuid,title text,slug text,excerpt text,body text,category text,published_at timestamptz,featured boolean,cover_url text)
language sql stable security definer set search_path=public as $$
  select a.id,a.title,a.slug,a.excerpt,a.body,a.category,a.published_at,a.featured,a.cover_url
  from public.articles a
  where a.published=true and a.status='published'
  order by a.featured desc,a.published_at desc nulls last,a.created_at desc
$$;

drop function if exists public.get_public_article(text);
create function public.get_public_article(p_slug text)
returns table(id uuid,title text,slug text,excerpt text,body text,category text,published_at timestamptz,featured boolean,cover_url text)
language sql stable security definer set search_path=public as $$
  select a.id,a.title,a.slug,a.excerpt,a.body,a.category,a.published_at,a.featured,a.cover_url
  from public.articles a
  where a.slug=p_slug and a.published=true and a.status='published'
  limit 1
$$;
revoke all on function public.get_public_articles() from public;
revoke all on function public.get_public_article(text) from public;
grant execute on function public.get_public_articles() to anon, authenticated;
grant execute on function public.get_public_article(text) to anon, authenticated;

commit;
