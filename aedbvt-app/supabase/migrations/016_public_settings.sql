begin;

insert into public.app_settings(key,value) values
  ('association_short_name','"AEDBVT"'::jsonb),
  ('association_city','"Tuléar"'::jsonb),
  ('association_country','"Madagascar"'::jsonb),
  ('contact_email','""'::jsonb),
  ('contact_phone','""'::jsonb),
  ('official_address','""'::jsonb),
  ('support_email','""'::jsonb),
  ('privacy_email','""'::jsonb),
  ('homepage_message','"Une application séparée pour gérer les membres, la vie associative, la trésorerie, les documents et la gouvernance avec des accès sécurisés."'::jsonb),
  ('legal_status_note','"Le statut juridique et les formalités réglementaires de l’association restent à valider avant toute présentation institutionnelle définitive."'::jsonb)
on conflict do nothing;

create or replace function public.get_public_app_settings()
returns table(key text,value jsonb)
language sql
stable
security definer
set search_path=public
as $$
  select s.key,s.value
  from public.app_settings s
  where s.key in (
    'association_name',
    'association_short_name',
    'association_city',
    'association_country',
    'contact_email',
    'contact_phone',
    'official_address',
    'support_email',
    'privacy_email',
    'homepage_message',
    'legal_status_note'
  )
$$;

revoke all on function public.get_public_app_settings() from public;
grant execute on function public.get_public_app_settings() to anon, authenticated;

drop trigger if exists audit_app_settings on public.app_settings;
create trigger audit_app_settings
after insert or update or delete on public.app_settings
for each row execute function public.audit_row();

commit;
