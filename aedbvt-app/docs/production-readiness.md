# AEDBVT — checklist de recette production

Cette checklist complète les contrôles automatiques du CI. Elle doit être rejouée avant l’ouverture officielle aux membres et après une modification importante des permissions.

## 1. Comptes et rôles

### Administrateur
- accès au tableau de bord ;
- accès Membres, Finances, Pilotage, Secrétariat, Demandes, Documents et Paramètres ;
- invitation d’un utilisateur ;
- modification d’un rôle ;
- suspension/réactivation d’un compte ;
- impossibilité de retirer son propre rôle administrateur principal.

### Bureau
- accès aux espaces opérationnels ;
- accès aux Finances ;
- aucun accès aux Paramètres administrateur ;
- création et suivi des actions, commissions et mandats ;
- validation institutionnelle selon les règles configurées.

### Trésorier
- accès aux Finances ;
- accès aux espaces staff généraux ;
- aucun accès aux Paramètres administrateur ;
- enregistrement recette/dépense et consultation du grand livre.

### Secrétaire
- accès Membres, Demandes, Documents, Pilotage et Secrétariat ;
- aucun accès aux Finances ;
- aucun accès aux Paramètres administrateur ;
- préparation et première validation des courriers/documents.

### Membre
- accès uniquement aux espaces communs : tableau de bord, Mon espace, Notifications, Actualités, Agenda, Annonces, Organigramme et Gouvernance ;
- aucun accès direct à /members, /finance, /operations, /administration, /requests, /documents ou /admin ;
- accès uniquement à ses données autorisées par les RLS Supabase.

## 2. Compte suspendu

- suspendre un compte de test ;
- vérifier que toute route protégée renvoie vers l’écran Compte suspendu ;
- vérifier que la déconnexion reste possible ;
- réactiver le compte et confirmer le retour normal.

## 3. Membre sans profil

- utiliser un compte Auth sans profil applicatif ;
- vérifier l’écran Compte non rattaché ;
- vérifier qu’aucune donnée privée n’est affichée.

## 4. Membres

- recherche par nom ;
- recherche par numéro membre ;
- recherche par filière/téléphone ;
- filtre village ;
- filtre statut ;
- cas sans résultat ;
- ajout d’un membre par rôle autorisé ;
- refus côté serveur pour un rôle non autorisé.

## 5. Demandes

- filtre par statut ;
- filtre par type ;
- recherche membre/objet ;
- transformation d’une demande d’attestation en document ;
- clôture et réponse ;
- cas sans résultat.

## 6. Finances

- cotisation valide ;
- rejet d’un montant nul/négatif ;
- dépense valide ;
- justificatif privé ;
- budget et lignes budgétaires ;
- grand livre ;
- téléchargement de reçu ;
- test avec Secrétaire et Membre : accès refusé.

## 7. Secrétariat

- courrier entrant : enregistré → traitement → clôturé ;
- courrier sortant : brouillon → validations → envoyé → clôturé ;
- deux validations réalisées par deux comptes distincts ;
- attestation membre ;
- PDF ;
- vérification publique ;
- pièce jointe privée.

## 8. Gouvernance

- AG ;
- quorum ;
- présence ;
- procuration ;
- motion et vote ;
- élection et résultat ;
- document versionné ;
- amendement ;
- registre des décisions ;
- génération automatique de l’action de suivi.

## 9. PWA / mobile

- installation Android/desktop ;
- installation iOS via Ajouter à l’écran d’accueil ;
- barre mobile ;
- déconnexion ;
- compteur de notifications ;
- écran hors ligne ;
- confirmer qu’aucune page privée n’est disponible depuis le cache hors ligne.

## 10. Notifications

- activation/désactivation d’un appareil ;
- test push ;
- annonce ;
- agenda ;
- attribution de tâche ;
- document délivré ;
- respect des préférences utilisateur ;
- suppression d’un endpoint expiré.

## 11. Déploiement

- `GET /api/health` retourne 200 ;
- `/.well-known/assetlinks.json` cohérent avec le package Android ;
- `/manifest.webmanifest` accessible ;
- `/sw.js` accessible et sans cache long ;
- environnement Supabase de production correct ;
- variables VAPID présentes ;
- sauvegarde du keystore Android hors Git.

## Contrôles automatisés CI

Le workflow AEDBVT vérifie notamment :

- audit npm critique ;
- migrations SQL ;
- configuration Vercel ;
- sécurité PWA ;
- configuration Android ;
- matrice de rôles et gardes serveur ;
- TypeScript ;
- build Next.js.


## 12. Authentification email Supabase

Avant l’ouverture officielle aux membres :

- Site URL Supabase Auth : `https://aedbvt.vercel.app` ;
- ajouter `https://aedbvt.vercel.app/auth/complete` aux Redirect URLs ;
- ajouter `https://aedbvt.vercel.app/auth/recovery` aux Redirect URLs ;
- tester une invitation membre complète ;
- tester « Mot de passe oublié » ;
- vérifier qu’un lien expiré revient vers la récupération sans créer de session.

L’application accepte les retours PKCE (`code`) et les sessions standards en fragment via `/auth/complete`. Pour un flux SSR encore plus strict, les templates email Supabase peuvent pointer vers `/auth/recovery` avec `token_hash` et `type`.

Exemple de lien d’invitation SSR dans le template :

```text
{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&type=invite&next=/update-password?mode=invite
```

Exemple de lien de récupération SSR :

```text
{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
```

## 13. Paramètres institutionnels

Dans `Administration → Paramètres`, renseigner avant communication publique officielle :

- email général ;
- email support ;
- email confidentialité ;
- téléphone ;
- adresse officielle ;
- note de statut juridique mise à jour ;
- nom officiel et nom court.

## 14. Diagnostic production

Dans `Administration → État du système`, vérifier :

- Supabase URL et publishable key ;
- service role serveur ;
- URL officielle ;
- VAPID ;
- origine Android/TWA ;
- empreintes Digital Asset Links ;
- contact public.
