# AEDBVT App

Application de gestion de l’Association des Étudiants de Darsalama et Bandrani-Vouani à Tuléar.

## Socle
- Next.js 16.3, React 19 et TypeScript
- Supabase Auth, PostgreSQL et Row Level Security
- rôles : admin, bureau, trésorier, secrétaire, membre
- journal d’audit SQL
- membres, paiements, dépenses, devis, factures, articles, événements, réunions et gouvernance

## Mise en route
1. Créer un projet Supabase.
2. Exécuter le fichier supabase/migrations/001_initial.sql dans le SQL Editor.
3. Copier .env.example vers .env.local.
4. Ajouter l’URL et la publishable key Supabase.
5. Ajouter SUPABASE_SERVICE_ROLE_KEY uniquement côté serveur.
6. Mettre dans AEDBVT_ADMIN_EMAIL l’adresse du compte de Houssounaine Nourdine.
7. Dans Supabase Auth, créer ou inviter ce compte. À sa première connexion, l’application le promeut en rôle admin.
8. Lancer npm install puis npm run dev.

## Déploiement Vercel séparé
Créer un nouveau projet Vercel depuis ce dépôt et définir Root Directory sur aedbvt-app. Ajouter les variables d’environnement du fichier .env.example.

## Sécurité
- ne jamais exposer SUPABASE_SERVICE_ROLE_KEY au navigateur ;
- conserver RLS activé ;
- activer MFA pour l’administrateur avant ouverture publique ;
- ne pas importer les membres réels tant que les finalités, accès et durées de conservation des données n’ont pas été approuvés ;
- l’inscription publique n’est pas prévue dans ce premier jalon.

## Statut juridique
Le code prépare une application de production, mais ne constitue pas une preuve de déclaration, d’autorisation ou de reconnaissance officielle de l’association. La qualification juridique applicable à l’AEDBVT à Madagascar doit être confirmée avant communication institutionnelle définitive.
