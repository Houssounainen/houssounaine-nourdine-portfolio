begin;

alter table public.partners
  add column if not exists is_public boolean not null default false;

alter table public.partners
  add column if not exists public_description text;

create or replace function public.get_public_articles()
returns table(
  id uuid,
  title text,
  slug text,
  excerpt text,
  body text,
  category text,
  published_at timestamptz,
  featured boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select a.id,a.title,a.slug,a.excerpt,a.body,a.category,a.published_at,a.featured
  from public.articles a
  where a.published=true and a.status='published'
  order by a.featured desc,a.published_at desc nulls last,a.created_at desc
$$;

create or replace function public.get_public_article(p_slug text)
returns table(
  id uuid,
  title text,
  slug text,
  excerpt text,
  body text,
  category text,
  published_at timestamptz,
  featured boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select a.id,a.title,a.slug,a.excerpt,a.body,a.category,a.published_at,a.featured
  from public.articles a
  where a.slug=p_slug and a.published=true and a.status='published'
  limit 1
$$;

create or replace function public.get_public_events()
returns table(
  id uuid,
  title text,
  description text,
  location text,
  category text,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select e.id,e.title,e.description,e.location,e.category,e.starts_at,e.ends_at
  from public.events e
  where e.published=true
  order by e.starts_at asc
$$;

create or replace function public.get_public_organization()
returns table(
  slug text,
  title text,
  mission text,
  parent_slug text,
  sort_order integer,
  holder_name text
)
language sql
stable
security definer
set search_path=public
as $$
  select o.slug,o.title,o.mission,o.parent_slug,o.sort_order,m.full_name
  from public.organization_positions o
  left join public.members m on m.id=o.member_id and m.status='active'
  where o.active=true
  order by o.sort_order,o.title
$$;

create or replace function public.get_public_governance_documents()
returns table(
  id uuid,
  title text,
  category text,
  version text,
  body text,
  approved_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
  select g.id,g.title,g.category,g.version,g.body,g.approved_at,g.updated_at
  from public.governance_documents g
  where g.published=true
  order by g.category,g.title
$$;

create or replace function public.get_public_partners()
returns table(
  id uuid,
  name text,
  partner_type text,
  website text,
  public_description text
)
language sql
stable
security definer
set search_path=public
as $$
  select p.id,p.name,p.partner_type,p.website,p.public_description
  from public.partners p
  where p.status='active' and p.is_public=true
  order by p.name
$$;

revoke all on function public.get_public_articles() from public;
revoke all on function public.get_public_article(text) from public;
revoke all on function public.get_public_events() from public;
revoke all on function public.get_public_organization() from public;
revoke all on function public.get_public_governance_documents() from public;
revoke all on function public.get_public_partners() from public;

grant execute on function public.get_public_articles() to anon, authenticated;
grant execute on function public.get_public_article(text) to anon, authenticated;
grant execute on function public.get_public_events() to anon, authenticated;
grant execute on function public.get_public_organization() to anon, authenticated;
grant execute on function public.get_public_governance_documents() to anon, authenticated;
grant execute on function public.get_public_partners() to anon, authenticated;

commit;
