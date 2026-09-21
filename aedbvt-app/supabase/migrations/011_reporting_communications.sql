begin;

create table if not exists public.internal_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  priority text not null default 'info' check (priority in ('info','warning','urgent')),
  segment_type text not null default 'all' check (segment_type in ('all','staff','role','village')),
  segment_value text,
  recipient_count integer not null default 0 check (recipient_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists internal_broadcasts_sent_idx
on public.internal_broadcasts(sent_at desc);

alter table public.internal_broadcasts enable row level security;

revoke all on table public.internal_broadcasts from anon, authenticated;
grant select, insert on table public.internal_broadcasts to authenticated;

create policy internal_broadcasts_staff_read
on public.internal_broadcasts
for select to authenticated
using (public.is_staff());

create policy internal_broadcasts_staff_insert
on public.internal_broadcasts
for insert to authenticated
with check (
  public.is_staff()
  and created_by=auth.uid()
);

grant insert on table public.internal_notifications to authenticated;

drop policy if exists notifications_staff_insert on public.internal_notifications;
create policy notifications_staff_insert
on public.internal_notifications
for insert to authenticated
with check (
  public.is_staff()
  and recipient_id is not null
);

create or replace function public.create_internal_broadcast(
  p_title text,
  p_message text,
  p_priority text,
  p_segment_type text,
  p_segment_value text default null
)
returns table(broadcast_id uuid, recipient_count integer, recipient_ids uuid[])
language plpgsql
security definer
set search_path=public
as $
declare
  v_broadcast_id uuid;
  v_recipient_ids uuid[];
  v_count integer;
  v_kind text;
begin
  if not public.is_staff() then
    raise exception 'Accès staff requis.';
  end if;

  if nullif(trim(coalesce(p_title,'')),'') is null
     or nullif(trim(coalesce(p_message,'')),'') is null then
    raise exception 'Titre et message requis.';
  end if;

  if p_priority not in ('info','warning','urgent') then
    raise exception 'Priorité invalide.';
  end if;

  if p_segment_type not in ('all','staff','role','village') then
    raise exception 'Segment invalide.';
  end if;

  if p_segment_type='role' and p_segment_value not in ('admin','bureau','tresorier','secretaire','membre') then
    raise exception 'Rôle cible invalide.';
  end if;

  if p_segment_type='village' and p_segment_value not in ('Darsalama','Bandrani-Vouani') then
    raise exception 'Village cible invalide.';
  end if;

  select coalesce(array_agg(distinct target_id),array[]::uuid[])
  into v_recipient_ids
  from (
    select p.id as target_id
    from public.profiles p
    where p.active=true
      and (
        p_segment_type='all'
        or (p_segment_type='staff' and p.role in ('admin','bureau','tresorier','secretaire'))
        or (p_segment_type='role' and p.role::text=p_segment_value)
        or (
          p_segment_type='village'
          and exists(
            select 1 from public.members m
            where m.profile_id=p.id
              and m.status='active'
              and m.village=p_segment_value
          )
        )
      )
  ) targets;

  v_count := coalesce(array_length(v_recipient_ids,1),0);
  if v_count=0 then
    raise exception 'Aucun destinataire actif pour ce segment.';
  end if;

  insert into public.internal_broadcasts(
    title,message,priority,segment_type,segment_value,recipient_count,created_by
  )
  values(
    trim(p_title),trim(p_message),p_priority,p_segment_type,nullif(trim(coalesce(p_segment_value,'')),''),
    v_count,auth.uid()
  )
  returning id into v_broadcast_id;

  v_kind := case when p_priority='info' then 'info' else 'warning' end;

  insert into public.internal_notifications(recipient_id,kind,title,message,href)
  select recipient_id,v_kind,trim(p_title),trim(p_message),'/notifications'
  from unnest(v_recipient_ids) recipient_id;

  return query select v_broadcast_id,v_count,v_recipient_ids;
end $;

revoke all on function public.create_internal_broadcast(text,text,text,text,text) from public;
grant execute on function public.create_internal_broadcast(text,text,text,text,text) to authenticated;

drop trigger if exists audit_internal_broadcasts on public.internal_broadcasts;
create trigger audit_internal_broadcasts
after insert or update or delete on public.internal_broadcasts
for each row execute function public.audit_row();

commit;
