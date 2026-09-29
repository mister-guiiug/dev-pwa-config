---
'@mister-guiiug/dev-pwa-config': patch
---

Les langues et les fonctions relevées pour le référencement quittent les fiches du catalogue pour `apps-seo.js`, lu au build seulement.

`apps-catalog.js` est importé à l'exécution (`FamilyApps`, `sponsor`) : tout ce qu'il porte part dans le bundle de chaque app. Posées dans ses fiches par la 6.19.0, ces listes l'ont fait passer de 9,96 à 13,95 kB gzip — relevé sur miss-supaboss, dont le chemin critique est monté de 199,9 à 203,4 kB et a dépassé son budget. Le module retombe à 11,04 kB ; `pwaSeoPlugin` lit les mêmes données dans `apps-seo.js` (`appSeo(id)`), et le `WebApplication` produit est inchangé.

Les fiches de `FAMILY_APPS` ne portent plus `languages` ni `features` (ajoutés en 6.19.0, lus nulle part ailleurs). Un test garde qu'aucun module publié d'exécution n'importe `apps-seo.js`.
