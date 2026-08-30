# Portfolio de Houssounaine Nourdine

Portfolio personnel bilingue de Houssounaine Nourdine, Lead Community Manager spécialisé en marketing digital, relationnel et d’influence à Toliara, Madagascar.

## Fonctionnalités

- HTML5 sémantique et CSS3 moderne ;
- responsive design mobile-first ;
- thèmes clair et sombre ;
- version française et anglaise ;
- navigation en écrans distincts avec barre latérale fixe sur ordinateur ;
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
- accessibilité clavier et prise en charge de `prefers-reduced-motion`.

## Fichiers

- `index.html` : structure et contenus ;
- `styles.css` : identité visuelle, responsive design et thèmes ;
- `script.js` : traduction, filtres, dialogues, formulaire et interactions ;
- `vercel.json` : routes propres et en-têtes de sécurité pour Vercel ;
- `assets/` : portraits, créations, logos clients, statistiques et favicon ;
- `robots.txt` et `sitemap.xml` : indexation.

## Modifier le contenu

Les textes statiques se trouvent dans `index.html`. Les traductions, études de cas, créations et clients sont centralisés dans `script.js`.

Pour activer Google Analytics 4, renseigner la constante `GA_MEASUREMENT_ID` au début de `script.js`.

## Hébergement statique

Le formulaire prépare un e-mail dans l’application du visiteur et ne stocke aucune donnée. Une administration en ligne ou un envoi serveur nécessiterait ultérieurement un CMS ou un service externe sécurisé.

## Publication

Le site peut être publié depuis la branche `main` avec GitHub Pages ou importé directement dans Vercel. Sur Vercel, les rubriques utilisent des URL propres (`/projects`, `/works`, `/clients`, etc.).
