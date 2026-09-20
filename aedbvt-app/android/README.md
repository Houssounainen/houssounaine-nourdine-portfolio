# AEDBVT Android — Trusted Web Activity

L’application Android AEDBVT est préparée comme **Trusted Web Activity (TWA)** avec Bubblewrap. Cette approche conserve l’application Next.js/Supabase hébergée sur HTTPS, le service worker PWA et les notifications Web Push, tout en permettant de produire un APK et un App Bundle Android.

## Identité Android

- Nom : AEDBVT
- Package ID : `mg.aedbvt.tulear`
- Version initiale : `1.0.0`
- Version code : `1`
- Écran initial : `/dashboard`
- Orientation : portrait principal

Le package ID doit être considéré comme stable avant la première publication Google Play.

## Pré-requis

- Node.js 22 pour le projet AEDBVT.
- JDK 17 et Android SDK pour Bubblewrap.
- Une origine HTTPS dédiée à l’application AEDBVT.
- Les variables Supabase nécessaires à l’application.
- Une clé de signature Android conservée hors Git.

## Préparer l’origine

Définir l’URL HTTPS publique :

```bash
export AEDBVT_APP_ORIGIN="https://votre-domaine-aedbvt.example"
```

Sous PowerShell :

```powershell
$env:AEDBVT_APP_ORIGIN="https://votre-domaine-aedbvt.example"
```

## Vérifier la PWA

```bash
npm run android:validate
```

Cette commande utilise Bubblewrap pour vérifier la PWA publiée.

## Initialiser le projet natif

```bash
npm run android:init
```

Bubblewrap demande les informations de signature lors de la première initialisation. Le projet généré est placé dans `android-twa/`.

Ne jamais placer le keystore ou ses mots de passe dans Git.

## Digital Asset Links

Après création de la clé de signature, récupérer l’empreinte SHA-256 puis configurer côté hébergement :

```text
AEDBVT_ANDROID_PACKAGE_ID=mg.aedbvt.tulear
ANDROID_SHA256_FINGERPRINTS=AA:BB:CC:...
```

Plusieurs empreintes peuvent être séparées par une virgule, notamment pour gérer une clé locale et la clé de signature Google Play.

L’application expose automatiquement :

```text
/.well-known/assetlinks.json
```

Tant qu’aucune empreinte n’est configurée, cet endpoint renvoie volontairement un tableau vide afin de ne déclarer aucune relation Android non vérifiée.

## Compiler

APK/AAB signé :

```bash
npm run android:build
```

Build de contrôle sans signature :

```bash
npm run android:build:unsigned
```

Bubblewrap utilise les variables suivantes pour un build signé non interactif :

```text
BUBBLEWRAP_KEYSTORE_PASSWORD
BUBBLEWRAP_KEY_PASSWORD
```

Les artefacts Android et les keystores sont exclus de Git.

## Publication Google Play

Avant publication :

1. vérifier l’origine HTTPS ;
2. vérifier le manifest PWA ;
3. vérifier `/.well-known/assetlinks.json` ;
4. tester l’APK sur un appareil Android ;
5. conserver une sauvegarde sécurisée du keystore ;
6. incrémenter `appVersionCode` à chaque nouvelle version ;
7. envoyer le fichier AAB sur une piste de test interne avant production.

Le projet peut ensuite être géré dans Android Studio si une évolution native devient nécessaire.
