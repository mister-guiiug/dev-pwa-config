---
'@mister-guiiug/dev-wpa-config': patch
---

Showroom : chaîne d'outils d'accessibilité et galerie de démo par application.

La section Accessibilité expose désormais les quatre filets successifs et ce
que chacun attrape — `eslint-plugin-jsx-a11y` à l'écriture, axe-core en CI dans
11 apps, Lighthouse CI qui bloque la PR sous 0,9 dans 12 apps, et le design
system lui-même pour ce qu'un audit ne rattrape pas. Avec le rappel qu'axe-core
ne détecte que 30 à 50 % des défauts.

La galerie de démo laisse choisir une app : le showroom bascule dans son
univers et un aperçu montre les composants partagés à ses couleurs. Ce sont des
aperçus GÉNÉRÉS, dit explicitement, pas des captures. Une vraie capture déposée
dans `showroom/screenshots/` et déclarée dans `screenshots.js` prend
automatiquement leur place.

Aucun changement du contenu publié sur npm.
