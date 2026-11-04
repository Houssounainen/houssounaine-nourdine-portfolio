# Portfolio de Houssounaine Nourdine

Portfolio personnel bilingue de Houssounaine Nourdine, Lead Community Manager spécialisé en marketing digital, relationnel et d’influence à Toliara, Madagascar.

## Fonctionnalités

- HTML5 sémantique et CSS3 moderne ;
- responsive design mobile-first ;
- thèmes clair et sombre ;
- version française et anglaise ;
- navigation en écrans distincts avec barre latérale fixe sur ordinateur et dock inférieur sur mobile ;
- chiffres clés animés ;
- études de cas interactives ;
- galerie éditoriale de 40 créations graphiques, dont 18 mises en avant ;
- filtres de projets, de créations par secteur et de clients ;
- visionneuse plein écran avec navigation clavier ;
- portefeuille de 21 identités clientes dans leurs couleurs originales ;
- logos clients authentiques dans les études de cas et le portefeuille clients ;
- formulaire de contact utilisant l’application e-mail du visiteur ;
- bouton WhatsApp ;
- préférences de confidentialité ;
- métadonnées SEO et données structurées ;
- préchargeur cinématique (une fois par session) et constellation interactive dans l’accueil ;
- bandeau défilant des logos clients ;
- palette de commandes (`Ctrl/⌘ + K` ou `/`) : navigation, thème, langue, copie de l’e-mail ;
- bascule de thème avec transition circulaire (View Transitions API) ;
- accessibilité clavier et prise en charge de `prefers-reduced-motion`.

## Fichiers

- `index.html` : page d’accueil « Édition 2026 » (page unique, style affiche sombre vert / bleu ciel / rouge, typographie Montserrat et manuscrite, grille bento, ruban fixe de raccourcis vers les sections, section « Merci ! » avec QR code) ;
- `assets/qr-portfolio.svg` : QR code vers le portfolio ;
- `v2/` : styles (`v2.css`), interactions (`v2.js`) et contenus bilingues partagés (`data.js`) de la page d’accueil ;
- `v2/features.js` / `features.css` : créations en « stories », visite guidée de 30 s, quiz « Quel service pour vous ? » et mode présentation ;
- `projets/<id>/` : pages dédiées aux études de cas, générées par `node scripts/build-pages.mjs` (ajouter `--images` pour régénérer les images de partage `assets/og/`) — à relancer après toute modification de `v2/data.js` ;
- `classique/` : ancienne version multi-rubriques, accessible sur `/classique`, avec l’espace AEDBVT sur `/classique/association` ;
- `vercel.json` : redirections, routes et en-têtes de sécurité pour Vercel (les anciennes adresses `/projects`, `/works`… mènent à la section correspondante) ;
- `assets/` : portraits, créations (52, dont une vidéo dans `assets/videos/` en WebM et MP4), logos clients, statistiques et favicon ;
- `robots.txt` et `sitemap.xml` : indexation.

## Modifier le contenu

Les textes de la page d’accueil sont dans `index.html` ; les traductions, études de cas, créations et clients dans `v2/data.js`. L’ancienne version garde ses propres données dans `classique/script.js`.

Google Analytics 4 (`GA_MEASUREMENT_ID` dans `v2/v2.js` et `classique/script.js`) ne se charge qu’après acceptation du bandeau de confidentialité ; le choix est partagé entre les deux versions et modifiable via « Confidentialité → Gérer les cookies ».

## Hébergement statique

Le formulaire prépare un e-mail dans l’application du visiteur et ne stocke aucune donnée. Une administration en ligne ou un envoi serveur nécessiterait ultérieurement un CMS ou un service externe sécurisé.

## Publication

Adresse officielle : [houssounainenourdine.vercel.app](https://houssounainenourdine.vercel.app/).

Le site est déployé automatiquement sur Vercel depuis la branche `main`. Les anciennes URL de rubriques (`/projects`, `/works`, `/clients`, etc.) ouvrent la page d’accueil sur la section correspondante ; `/association` redirige vers `/classique/association`.
