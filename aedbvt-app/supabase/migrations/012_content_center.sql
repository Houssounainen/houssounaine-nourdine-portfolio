begin;

alter table public.articles
  add column if not exists status text not null default 'draft'
    check (status in ('draft','scheduled','published','archived'));

alter table public.articles
  add column if not exists scheduled_for timestamptz;

alter table public.articles
  add column if not exists featured boolean not null default false;

alter table public.articles
  add column if not exists notify_on_publish boolean not null default true;

alter table public.articles
  add column if not exists published_by uuid references public.profiles(id) on delete set null;

alter table public.articles
  add column if not exists archived_at timestamptz;

update public.articles
set status=case when published then 'published' else 'draft' end
where status='draft';

create index if not exists articles_status_schedule_idx
on public.articles(status,scheduled_for)
where status in ('scheduled','published');

create index if not exists articles_published_idx
on public.articles(published_at desc)
where published=true;

create or replace function public.validate_article_state()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='scheduled' and new.scheduled_for is null then
    raise exception 'Une date de publication est requise pour un article programmé.';
  end if;

  if new.status='scheduled' and new.scheduled_for<=now() then
    raise exception 'La date de programmation doit être future.';
  end if;

  if new.status='published' then
    new.published := true;
    new.published_at := coalesce(new.published_at,now());
    new.published_by := coalesce(new.published_by,auth.uid());
    new.scheduled_for := null;
    new.archived_at := null;
  elsif new.status='archived' then
    new.published := false;
    new.archived_at := coalesce(new.archived_at,now());
  else
    new.published := false;
    new.published_at := null;
    new.published_by := null;
    new.archived_at := null;
  end if;

  if new.status<>'scheduled' then
    new.scheduled_for := null;
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists validate_article_state on public.articles;
create trigger validate_article_state
before insert or update of status,scheduled_for,published,published_at,published_by,archived_at
on public.articles
for each row execute function public.validate_article_state();

create or replace function public.publish_due_articles()
returns table(
  id uuid,
  slug text,
  title text,
  excerpt text,
  notify_on_publish boolean
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with due as (
    update public.articles a
    set status='published',
        published=true,
        published_at=now(),
        published_by=coalesce(a.published_by,a.author_id),
        scheduled_for=null,
        archived_at=null,
        updated_at=now()
    where a.status='scheduled'
      and a.scheduled_for<=now()
    returning a.id,a.slug,a.title,a.excerpt,a.notify_on_publish
  )
  select due.id,due.slug,due.title,due.excerpt,due.notify_on_publish
  from due;
end $$;

revoke all on function public.publish_due_articles() from public;
grant execute on function public.publish_due_articles() to authenticated;

commit;
