---
'@mister-guiiug/dev-pwa-config': minor
---

SEO : « Dans la même catégorie » lie aussi les guides de chaque app sœur (au plus deux), sur les pages de contenu françaises et dans le contenu servi des accueils. Les guides sont listés dans `APP_GUIDES` (`apps-seo.js`, lu au build seulement), avec `guidesDe(id)`.

Le `<title>` de l'accueil est servi sur une seule ligne (`titreSurUneLigne`) : Prettier coupait les titres longs dans `index.html`, et cinq accueils servaient un titre avec un retour à la ligne.
