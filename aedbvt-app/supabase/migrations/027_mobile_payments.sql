begin;

-- ———————————————————————————————————————————————————————————————
-- Paiement mobile des cotisations (MVola, Orange Money, Airtel Money).
-- Mode déclaratif : le membre paie sur son téléphone puis déclare l’identifiant de
-- transaction ; la trésorerie valide et le paiement officiel (reçu, cotisation) est créé.
-- Mode API (MVola) : la confirmation arrive du fournisseur et suit le même chemin de validation.
-- ———————————————————————————————————————————————————————————————

create table if not exists public.mobile_payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  dues_cycle_id uuid references public.membership_dues_cycles(id) on delete set null,
  purpose text not null default 'dues' check (purpose in ('dues','donation')),
  operator text not null check (operator in ('mvola','orange_money','airtel_money')),
  channel text not null default 'manual' check (channel in ('manual','api')),
  amount numeric(14,2) not null check (amount > 0),
  payer_phone text not null default '' check (char_length(payer_phone) <= 30),
  transaction_id text check (transaction_id is null or char_length(transaction_id) between 4 and 80),
  proof_path text,
  status text not null default 'initiated' check (status in ('initiated','submitted','pending_provider','confirmed','rejected','cancelled','failed')),
  provider_correlation_id text,
  provider_payload jsonb,
  rejection_reason text,
  payment_id uuid references public.payments(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mobile_payments_transaction_uidx
  on public.mobile_payments(operator, upper(transaction_id))
  where transaction_id is not null and status in ('submitted','pending_provider','confirmed');
create index if not exists mobile_payments_status_idx on public.mobile_payments(status, created_at desc);
create index if not exists mobile_payments_profile_idx on public.mobile_payments(profile_id, created_at desc);

alter table public.mobile_payments enable row level security;
revoke all on public.mobile_payments from public, anon, authenticated;
grant select on public.mobile_payments to authenticated;
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.

create policy mobile_payments_read on public.mobile_payments for select to authenticated
using (profile_id=(select auth.uid()) or public.is_finance());

create trigger audit_mobile_payments after insert or update or delete on public.mobile_payments
for each row execute function public.audit_row();

-- Justificatifs (capture d’écran du SMS de confirmation), privés.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy payment_proofs_read on storage.objects for select to authenticated
using (bucket_id='payment-proofs' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_finance()));
create policy payment_proofs_insert on storage.objects for insert to authenticated
with check (bucket_id='payment-proofs' and public.current_role() is not null and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Numéros marchands affichés aux membres connectés (paramétrés dans Administration › Paramètres).
create or replace function public.get_mobile_money_settings()
returns table(key text, value jsonb)
language sql stable security definer set search_path=public as $$
  select s.key, s.value from public.app_settings s
  where public.current_role() is not null
    and s.key in ('mobile_money_mvola','mobile_money_orange','mobile_money_airtel','mobile_money_holder','mobile_money_instructions')
$$;
revoke all on function public.get_mobile_money_settings() from public, anon;
grant execute on function public.get_mobile_money_settings() to authenticated;

-- 1. Le membre ouvre un paiement : montant borné par le reste dû, référence unique.
create or replace function public.start_mobile_payment(p_operator text, p_cycle_id uuid, p_amount numeric, p_phone text, p_channel text default 'manual')
returns public.mobile_payments
language plpgsql security definer set search_path=public as $$
declare
  v_member public.members%rowtype;
  v_balance numeric(14,2);
  v_row public.mobile_payments;
  v_ref text;
begin
  if auth.uid() is null or public.current_role() is null then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p_operator not in ('mvola','orange_money','airtel_money') then raise exception 'Opérateur inconnu.'; end if;
  if coalesce(p_channel,'manual') not in ('manual','api') then raise exception 'Canal inconnu.'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount) then raise exception 'Montant invalide.'; end if;

  select * into v_member from public.members where profile_id=auth.uid();
  if not found then raise exception 'Votre compte n’est pas encore lié à une fiche membre.'; end if;

  if p_cycle_id is not null then
    select greatest(0, d.amount_due - d.waived_amount - coalesce((
      select sum(p.amount) from public.payments p where p.member_id=d.member_id and p.dues_cycle_id=d.cycle_id and p.status='confirmed'),0))
      into v_balance
    from public.member_dues d join public.membership_dues_cycles c on c.id=d.cycle_id
    where d.cycle_id=p_cycle_id and d.member_id=v_member.id and c.status='open';
    if v_balance is null then raise exception 'Aucune cotisation ouverte pour cet exercice.'; end if;
    if p_amount > v_balance then raise exception 'Le montant dépasse le reste à régler (% Ar).', v_balance; end if;
  end if;

  -- Limite les demandes en double (même exercice, déjà en cours).
  if exists (select 1 from public.mobile_payments where profile_id=auth.uid() and status in ('initiated','pending_provider')
             and created_at > now() - interval '2 minutes') then
    raise exception 'Une demande est déjà en cours. Patientez un instant.';
  end if;

  loop
    v_ref := 'AED-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    exit when not exists (select 1 from public.mobile_payments where reference=v_ref);
  end loop;

  insert into public.mobile_payments(reference, profile_id, member_id, dues_cycle_id, purpose, operator, channel, amount, payer_phone, status)
  values (v_ref, auth.uid(), v_member.id, p_cycle_id, case when p_cycle_id is null then 'donation' else 'dues' end,
          p_operator, coalesce(p_channel,'manual'), p_amount, left(regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g'),30),
          case when p_channel='api' then 'pending_provider' else 'initiated' end)
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.start_mobile_payment(text,uuid,numeric,text,text) from public, anon;
grant execute on function public.start_mobile_payment(text,uuid,numeric,text,text) to authenticated;

-- 2. Le membre déclare la transaction effectuée.
create or replace function public.submit_mobile_payment(p_id uuid, p_transaction_id text, p_proof_path text default null)
returns public.mobile_payments
language plpgsql security definer set search_path=public as $$
declare v_row public.mobile_payments;
begin
  if auth.uid() is null or public.current_role() is null then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p_proof_path is not null and split_part(p_proof_path,'/',1)<>auth.uid()::text then raise exception 'Justificatif invalide.'; end if;
  update public.mobile_payments
     set transaction_id=nullif(upper(btrim(p_transaction_id)),''), proof_path=coalesce(p_proof_path,proof_path),
         status='submitted', submitted_at=now(), updated_at=now(), rejection_reason=null
   where id=p_id and profile_id=auth.uid() and status in ('initiated','rejected') and channel='manual'
  returning * into v_row;
  if not found then raise exception 'Paiement introuvable ou déjà traité.'; end if;
  if v_row.transaction_id is null then raise exception 'Indiquez l’identifiant de la transaction.'; end if;
  return v_row;
exception when unique_violation then
  raise exception 'Cet identifiant de transaction a déjà été déclaré.';
end $$;
revoke all on function public.submit_mobile_payment(uuid,text,text) from public, anon;
grant execute on function public.submit_mobile_payment(uuid,text,text) to authenticated;

create or replace function public.cancel_mobile_payment(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.mobile_payments set status='cancelled', updated_at=now()
   where id=p_id and profile_id=auth.uid() and status in ('initiated','submitted','rejected');
  if not found then raise exception 'Paiement introuvable ou déjà traité.'; end if;
end $$;
revoke all on function public.cancel_mobile_payment(uuid) from public, anon;
grant execute on function public.cancel_mobile_payment(uuid) to authenticated;

-- Création du paiement officiel (reçu numéroté, mise à jour de la cotisation par les déclencheurs existants).
create or replace function aedbvt_social_private.settle_mobile_payment(p_id uuid, p_actor uuid)
returns public.mobile_payments
language plpgsql security definer set search_path=public as $$
declare
  v_row public.mobile_payments;
  v_payment uuid;
  v_label text;
begin
  select * into v_row from public.mobile_payments where id=p_id for update;
  if not found then raise exception 'Paiement introuvable.'; end if;
  if v_row.status='confirmed' then return v_row; end if;
  if v_row.status not in ('submitted','pending_provider') then raise exception 'Ce paiement ne peut pas être validé.'; end if;
  v_label := case v_row.operator when 'mvola' then 'MVola' when 'orange_money' then 'Orange Money' else 'Airtel Money' end;
  insert into public.payments(member_id, amount, method, external_reference, status, paid_at, created_by, dues_cycle_id, notes)
  values (v_row.member_id, v_row.amount, v_label, coalesce(v_row.transaction_id, v_row.provider_correlation_id), 'confirmed', now(), p_actor,
          v_row.dues_cycle_id, 'Paiement mobile ' || v_row.reference)
  returning id into v_payment;
  update public.mobile_payments set status='confirmed', payment_id=v_payment, reviewed_by=p_actor, reviewed_at=now(), updated_at=now()
   where id=p_id returning * into v_row;
  return v_row;
end $$;
revoke all on function aedbvt_social_private.settle_mobile_payment(uuid,uuid) from public, anon, authenticated;

-- 3. La trésorerie valide ou refuse.
create or replace function public.review_mobile_payment(p_id uuid, p_approve boolean, p_reason text default null)
returns public.mobile_payments
language plpgsql security definer set search_path=public as $$
declare v_row public.mobile_payments;
begin
  if not public.is_finance() then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p_approve then
    return aedbvt_social_private.settle_mobile_payment(p_id, auth.uid());
  end if;
  update public.mobile_payments set status='rejected', rejection_reason=left(coalesce(nullif(btrim(p_reason),''),'Transaction introuvable chez l’opérateur.'),300),
         reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
   where id=p_id and status in ('submitted','pending_provider') returning * into v_row;
  if not found then raise exception 'Ce paiement ne peut pas être refusé.'; end if;
  return v_row;
end $$;
revoke all on function public.review_mobile_payment(uuid,boolean,text) from public, anon;
grant execute on function public.review_mobile_payment(uuid,boolean,text) to authenticated;

-- Confirmation automatique par l’API de l’opérateur : réservée au rôle serveur.
create or replace function public.provider_settle_mobile_payment(p_id uuid, p_success boolean, p_transaction_id text, p_payload jsonb)
returns public.mobile_payments
language plpgsql security definer set search_path=public as $$
declare v_row public.mobile_payments;
begin
  update public.mobile_payments set provider_payload=p_payload, transaction_id=coalesce(nullif(p_transaction_id,''),transaction_id), updated_at=now()
   where id=p_id and status='pending_provider' returning * into v_row;
  if not found then select * into v_row from public.mobile_payments where id=p_id; return v_row; end if;
  if p_success then return aedbvt_social_private.settle_mobile_payment(p_id, null); end if;
  update public.mobile_payments set status='failed', updated_at=now() where id=p_id returning * into v_row;
  return v_row;
end $$;
revoke all on function public.provider_settle_mobile_payment(uuid,boolean,text,jsonb) from public, anon, authenticated;
grant execute on function public.provider_settle_mobile_payment(uuid,boolean,text,jsonb) to service_role;

create or replace function public.attach_provider_correlation(p_id uuid, p_correlation text)
returns void language sql security definer set search_path=public as $$
  update public.mobile_payments set provider_correlation_id=p_correlation, updated_at=now() where id=p_id and status='pending_provider'
$$;
revoke all on function public.attach_provider_correlation(uuid,text) from public, anon, authenticated;
grant execute on function public.attach_provider_correlation(uuid,text) to service_role;

commit;
