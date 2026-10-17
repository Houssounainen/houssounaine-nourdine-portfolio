begin;

-- Remplace le texte d’accueil par défaut (description technique) par une présentation factuelle.
-- Un texte déjà personnalisé par l’administration n’est pas modifié.
update public.app_settings
set value = to_jsonb('L’association rassemble les étudiants originaires de Darsalama et de Bandrani-Vouani inscrits à Tuléar. Elle publie ici ses actualités, son agenda, la composition de son Bureau et ses documents officiels.'::text)
where key = 'homepage_message'
  and value = '"Une application séparée pour gérer les membres, la vie associative, la trésorerie, les documents et la gouvernance avec des accès sécurisés."'::jsonb;

commit;
