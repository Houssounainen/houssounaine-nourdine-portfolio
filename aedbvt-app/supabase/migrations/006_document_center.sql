begin;

create sequence if not exists public.decision_seq start 1;
create sequence if not exists public.amendment_seq start 1;

create table if not exists public.governance_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.governance_documents(id) on delete cascade,
  version_label text not null,
  title text not null,
  body text not null,
  change_summary text,
  status text not null default 'draft' check (status in ('draft','review','approved','published','superseded','rejected')),
  based_on_version_id uuid references public.governance_document_versions(id) on delete set null,
  checksum text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id,version_label)
);

alter table public.governance_documents
  add column if not exists current_version_id uuid references public.governance_document_versions(id) on delete set null;

create table if not exists public.governance_document_approvals (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.governance_document_versions(id) on delete cascade,
  approver_id uuid not null references public.profiles(id) on delete restrict,
  role_at_decision public.app_role not null,
  decision text not null check (decision in ('approved','rejected')),
  note text,
  decided_at timestamptz not null default now()
);

create table if not exists public.governance_amendments (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default ('AMD-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.amendment_seq')::text,4,'0')),
  document_id uuid not null references public.governance_documents(id) on delete cascade,
  target_version_id uuid references public.governance_document_versions(id) on delete set null,
  title text not null,
  rationale text,
  proposed_text text not null,
  status text not null default 'proposed' check (status in ('proposed','review','adopted','rejected','withdrawn')),
  proposed_by uuid references public.profiles(id) on delete set null,
  assembly_id uuid references public.assemblies(id) on delete set null,
  motion_id uuid references public.motions(id) on delete set null,
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decision_register (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default ('DEC-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.decision_seq')::text,4,'0')),
  decision_type text not null check (decision_type in ('motion','election','administrative','document','other')),
  title text not null,
  summary text,
  outcome text not null check (outcome in ('adopted','rejected','noted','elected','cancelled')),
  decision_date date not null default current_date,
  assembly_id uuid references public.assemblies(id) on delete set null,
  motion_id uuid unique references public.motions(id) on delete set null,
  election_id uuid references public.elections(id) on delete set null,
  document_id uuid references public.governance_documents(id) on delete set null,
  document_version_id uuid references public.governance_document_versions(id) on delete set null,
  amendment_id uuid unique references public.governance_amendments(id) on delete set null,
  published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.governance_document_versions enable row level security;
alter table public.governance_document_approvals enable row level security;
alter table public.governance_amendments enable row level security;
alter table public.decision_register enable row level security;

revoke all on table public.governance_document_versions, public.governance_document_approvals,
  public.governance_amendments, public.decision_register from anon, authenticated;

grant select, insert, update on table public.governance_document_versions, public.governance_document_approvals,
  public.governance_amendments, public.decision_register to authenticated;

grant usage, select on sequence public.decision_seq, public.amendment_seq to authenticated;

create policy doc_versions_read on public.governance_document_versions for select to authenticated
using (status in ('published','superseded') or public.is_staff());

create policy doc_versions_staff_insert on public.governance_document_versions for insert to authenticated
with check (public.is_staff());

create policy doc_versions_staff_update on public.governance_document_versions for update to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy doc_approvals_staff_read on public.governance_document_approvals for select to authenticated
using (public.is_staff());

create policy amendments_read on public.governance_amendments for select to authenticated
using (
  status='adopted'
  or public.is_staff()
  or proposed_by=auth.uid()
);

create policy amendments_self_insert on public.governance_amendments for insert to authenticated
with check (
  proposed_by=auth.uid()
  and public.current_member_id() is not null
  and status='proposed'
);

create policy amendments_staff_update on public.governance_amendments for update to authenticated
using (public.is_staff()) with check (public.is_staff());

create policy decisions_read on public.decision_register for select to authenticated
using (published or public.is_staff());

create policy decisions_staff_insert on public.decision_register for insert to authenticated
with check (public.is_staff());

create policy decisions_staff_update on public.decision_register for update to authenticated
using (public.is_staff()) with check (public.is_staff());

create or replace function public.guard_document_version_write()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='UPDATE' and old.status='superseded' then
    raise exception 'Une version remplacée est immuable.';
  end if;
  if tg_op='UPDATE' and old.status='published' then
    if new.status='superseded'
       and new.body is not distinct from old.body
       and new.title is not distinct from old.title
       and new.version_label is not distinct from old.version_label then
      return new;
    end if;
    raise exception 'Une version publiée est immuable, sauf passage en version remplacée.';
  end if;
  if tg_op='UPDATE' and old.status='approved' and (
    new.body is distinct from old.body
    or new.title is distinct from old.title
    or new.version_label is distinct from old.version_label
  ) then
    raise exception 'Une version approuvée doit être clonée avant modification.';
  end if;
  return new;
end $$;

drop trigger if exists guard_document_version_write on public.governance_document_versions;
create trigger guard_document_version_write
before update on public.governance_document_versions
for each row execute function public.guard_document_version_write();

create or replace function public.create_document_version(
  p_document_id uuid,
  p_version_label text,
  p_title text,
  p_body text,
  p_change_summary text default null,
  p_based_on_version_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare result_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Accès Bureau requis.';
  end if;
  if nullif(trim(p_version_label),'') is null or nullif(trim(p_title),'') is null or nullif(trim(p_body),'') is null then
    raise exception 'Version, titre et contenu sont requis.';
  end if;

  insert into public.governance_document_versions(
    document_id,version_label,title,body,change_summary,based_on_version_id,created_by,checksum
  )
  values(
    p_document_id,trim(p_version_label),trim(p_title),p_body,nullif(trim(coalesce(p_change_summary,'')),''),
    p_based_on_version_id,auth.uid(),encode(digest(convert_to(p_body,'UTF8'),'sha256'),'hex')
  )
  returning id into result_id;

  return result_id;
end $$;

revoke all on function public.create_document_version(uuid,text,text,text,text,uuid) from public;
grant execute on function public.create_document_version(uuid,text,text,text,text,uuid) to authenticated;

create or replace function public.submit_document_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_staff() then
    raise exception 'Accès Bureau requis.';
  end if;

  update public.governance_document_versions
  set status='review',updated_at=now()
  where id=p_version_id and status='draft';

  if not found then
    raise exception 'Seul un brouillon peut être soumis en revue.';
  end if;
end $$;

revoke all on function public.submit_document_version(uuid) from public;
grant execute on function public.submit_document_version(uuid) to authenticated;

create or replace function public.review_document_version(
  p_version_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v public.governance_document_versions%rowtype;
declare r public.app_role;
begin
  r := public.current_role();
  if r not in ('admin','bureau','secretaire') then
    raise exception 'Rôle de validation requis.';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'Décision invalide.';
  end if;

  select * into v from public.governance_document_versions where id=p_version_id for update;
  if not found or v.status <> 'review' then
    raise exception 'La version doit être en revue.';
  end if;
  if v.created_by=auth.uid() then
    raise exception 'L’auteur ne peut pas approuver sa propre version.';
  end if;

  insert into public.governance_document_approvals(version_id,approver_id,role_at_decision,decision,note)
  values(p_version_id,auth.uid(),r,p_decision,nullif(trim(coalesce(p_note,'')),''));

  update public.governance_document_versions
  set status=p_decision,
      approved_by=case when p_decision='approved' then auth.uid() else null end,
      approved_at=case when p_decision='approved' then now() else null end,
      updated_at=now()
  where id=p_version_id;
end $$;

revoke all on function public.review_document_version(uuid,text,text) from public;
grant execute on function public.review_document_version(uuid,text,text) to authenticated;

create or replace function public.publish_document_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v public.governance_document_versions%rowtype;
declare r public.app_role;
begin
  r := public.current_role();
  if r not in ('admin','bureau') then
    raise exception 'Seuls l’administrateur ou le Bureau peuvent publier.';
  end if;

  select * into v from public.governance_document_versions where id=p_version_id for update;
  if not found or v.status <> 'approved' then
    raise exception 'La version doit être approuvée avant publication.';
  end if;

  update public.governance_document_versions
  set status='superseded',updated_at=now()
  where document_id=v.document_id and status='published';

  update public.governance_document_versions
  set status='published',published_at=now(),updated_at=now()
  where id=p_version_id;

  update public.governance_documents
  set current_version_id=p_version_id,
      title=v.title,
      version=v.version_label,
      body=v.body,
      published=true,
      approved_at=v.approved_at,
      updated_at=now()
  where id=v.document_id;

  insert into public.decision_register(
    decision_type,title,summary,outcome,decision_date,document_id,document_version_id,published,created_by
  )
  values(
    'document',
    'Publication : ' || v.title,
    coalesce(v.change_summary,'Version ' || v.version_label),
    'noted',
    current_date,
    v.document_id,
    v.id,
    true,
    auth.uid()
  );
end $$;

revoke all on function public.publish_document_version(uuid) from public;
grant execute on function public.publish_document_version(uuid) to authenticated;

create or replace function public.update_draft_document_version(
  p_version_id uuid,
  p_title text,
  p_body text,
  p_change_summary text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_staff() then
    raise exception 'Accès Bureau requis.';
  end if;

  update public.governance_document_versions
  set title=trim(p_title),
      body=p_body,
      change_summary=nullif(trim(coalesce(p_change_summary,'')),''),
      checksum=encode(digest(convert_to(p_body,'UTF8'),'sha256'),'hex'),
      updated_at=now()
  where id=p_version_id and status='draft';

  if not found then
    raise exception 'Seul un brouillon peut être modifié.';
  end if;
end $$;

revoke all on function public.update_draft_document_version(uuid,text,text,text) from public;
grant execute on function public.update_draft_document_version(uuid,text,text,text) to authenticated;

create or replace function public.propose_amendment(
  p_document_id uuid,
  p_title text,
  p_rationale text,
  p_proposed_text text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare result_id uuid;
declare current_version uuid;
begin
  if public.current_member_id() is null then
    raise exception 'Adhésion active requise.';
  end if;

  select current_version_id into current_version from public.governance_documents where id=p_document_id;
  if current_version is null then
    raise exception 'Ce document n’a pas de version publiée.';
  end if;

  insert into public.governance_amendments(
    document_id,target_version_id,title,rationale,proposed_text,status,proposed_by
  )
  values(
    p_document_id,current_version,trim(p_title),nullif(trim(coalesce(p_rationale,'')),''),
    p_proposed_text,'proposed',auth.uid()
  )
  returning id into result_id;

  return result_id;
end $$;

revoke all on function public.propose_amendment(uuid,text,text,text) from public;
grant execute on function public.propose_amendment(uuid,text,text,text) to authenticated;

create or replace function public.review_amendment(
  p_amendment_id uuid,
  p_status text,
  p_notes text default null,
  p_assembly_id uuid default null,
  p_motion_id uuid default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_staff() then
    raise exception 'Accès Bureau requis.';
  end if;
  if p_status not in ('review','adopted','rejected') then
    raise exception 'Statut invalide.';
  end if;

  update public.governance_amendments
  set status=p_status,
      decision_notes=nullif(trim(coalesce(p_notes,'')),''),
      assembly_id=coalesce(p_assembly_id,assembly_id),
      motion_id=coalesce(p_motion_id,motion_id),
      decided_at=case when p_status in ('adopted','rejected') then now() else decided_at end,
      updated_at=now()
  where id=p_amendment_id and status not in ('adopted','rejected','withdrawn');

  if not found then
    raise exception 'Amendement non modifiable.';
  end if;
end $$;

revoke all on function public.review_amendment(uuid,text,text,uuid,uuid) from public;
grant execute on function public.review_amendment(uuid,text,text,uuid,uuid) to authenticated;

create or replace function public.withdraw_my_amendment(p_amendment_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.governance_amendments
  set status='withdrawn',updated_at=now()
  where id=p_amendment_id
    and proposed_by=auth.uid()
    and status in ('proposed','review');

  if not found then
    raise exception 'Amendement non révocable.';
  end if;
end $$;

revoke all on function public.withdraw_my_amendment(uuid) from public;
grant execute on function public.withdraw_my_amendment(uuid) to authenticated;

create or replace function public.register_closed_motion_decision()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare yes_count bigint;
declare no_count bigint;
declare expressed bigint;
declare adopted boolean;
declare assembly_date date;
begin
  if old.status is distinct from 'closed' and new.status='closed' then
    if new.vote_method='secret' then
      select count(*) filter(where choice='yes'),count(*) filter(where choice='no')
      into yes_count,no_count
      from public.motion_ballots where motion_id=new.id;
    else
      select count(*) filter(where choice='yes'),count(*) filter(where choice='no')
      into yes_count,no_count
      from public.recorded_motion_votes where motion_id=new.id;
    end if;

    yes_count := coalesce(yes_count,0);
    no_count := coalesce(no_count,0);
    expressed := yes_count + no_count;
    adopted := case
      when new.majority_rule='two_thirds' then expressed > 0 and yes_count * 3 >= expressed * 2
      else yes_count > no_count
    end;

    select starts_at::date into assembly_date from public.assemblies where id=new.assembly_id;

    insert into public.decision_register(
      decision_type,title,summary,outcome,decision_date,assembly_id,motion_id,published,created_by
    )
    values(
      'motion',
      new.title,
      new.body,
      case when adopted then 'adopted' else 'rejected' end,
      coalesce(assembly_date,current_date),
      new.assembly_id,
      new.id,
      true,
      new.created_by
    )
    on conflict(motion_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists register_closed_motion_decision on public.motions;
create trigger register_closed_motion_decision
after update of status on public.motions
for each row execute function public.register_closed_motion_decision();

create or replace function public.register_amendment_decision()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare doc_title text;
begin
  if old.status is distinct from 'adopted' and new.status='adopted' then
    select title into doc_title from public.governance_documents where id=new.document_id;
    insert into public.decision_register(
      decision_type,title,summary,outcome,decision_date,assembly_id,motion_id,
      document_id,document_version_id,amendment_id,published,created_by
    )
    values(
      'document',
      'Amendement adopté : ' || new.title,
      coalesce(new.decision_notes,new.rationale,new.proposed_text),
      'adopted',
      current_date,
      new.assembly_id,
      new.motion_id,
      new.document_id,
      new.target_version_id,
      new.id,
      true,
      new.proposed_by
    )
    on conflict(amendment_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists register_amendment_decision on public.governance_amendments;
create trigger register_amendment_decision
after update of status on public.governance_amendments
for each row execute function public.register_amendment_decision();

create or replace function public.register_closed_election_decisions()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  pos record;
  top_votes bigint;
  top_count bigint;
  winner record;
begin
  if old.status is distinct from 'closed' and new.status='closed' then
    for pos in
      select id,title from public.election_positions where election_id=new.id order by sort_order,id
    loop
      select max(votes) into top_votes from (
        select candidate_id,count(*)::bigint votes
        from public.election_ballots
        where position_id=pos.id
        group by candidate_id
      ) x;

      if top_votes is null then
        insert into public.decision_register(
          decision_type,title,summary,outcome,decision_date,election_id,published,created_by
        ) values(
          'election','Résultat : ' || pos.title,'Aucun bulletin enregistré.','noted',
          new.ends_at::date,new.id,true,new.created_by
        );
      else
        select count(*) into top_count from (
          select candidate_id,count(*)::bigint votes
          from public.election_ballots
          where position_id=pos.id
          group by candidate_id
          having count(*)=top_votes
        ) ties;

        if top_count=1 then
          select c.id candidate_id,m.full_name,m.member_number
          into winner
          from public.election_ballots b
          join public.election_candidates c on c.id=b.candidate_id
          join public.members m on m.id=c.member_id
          where b.position_id=pos.id
          group by c.id,m.full_name,m.member_number
          having count(*)=top_votes
          limit 1;

          insert into public.decision_register(
            decision_type,title,summary,outcome,decision_date,election_id,published,created_by
          ) values(
            'election',
            'Élection : ' || pos.title,
            winner.full_name || ' (' || coalesce(winner.member_number,'membre') || ') - ' || top_votes || ' voix',
            'elected',
            new.ends_at::date,
            new.id,
            true,
            new.created_by
          );
        else
          insert into public.decision_register(
            decision_type,title,summary,outcome,decision_date,election_id,published,created_by
          ) values(
            'election',
            'Résultat : ' || pos.title,
            'Égalité au résultat le plus élevé (' || top_votes || ' voix). Aucune désignation automatique.',
            'noted',
            new.ends_at::date,
            new.id,
            true,
            new.created_by
          );
        end if;
      end if;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists register_closed_election_decisions on public.elections;
create trigger register_closed_election_decisions
after update of status on public.elections
for each row execute function public.register_closed_election_decisions();

create or replace function public.guard_decision_register()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='UPDATE' and old.motion_id is not null then
    raise exception 'Une décision issue d’une motion est immuable.';
  end if;
  return new;
end $$;

drop trigger if exists guard_decision_register on public.decision_register;
create trigger guard_decision_register
before update on public.decision_register
for each row execute function public.guard_decision_register();

do $$
declare t text;
begin
  foreach t in array array['governance_document_versions','governance_document_approvals','governance_amendments','decision_register']
  loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row()',t,t);
  end loop;
end $$;

commit;
