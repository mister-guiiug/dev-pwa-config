---
'@mister-guiiug/dev-wpa-config': patch
---

Showroom : section **Stack** et bascule **français / anglais**.

La section Stack est relevée dans le `package.json` et le code des applications,
pas dans une note d'intention — Supabase (6 apps) / Firebase (3) / local-first
(5) avec les fonctionnalités réellement appelées, la règle d'icônes
`lucide-react`, Leaflet + OpenStreetMap pour la seule app qui cartographie, et
l'outillage de test (Vitest 4, Playwright, axe-core, Browser Mode inutilisé).

L'internationalisation ne duplique pas le français : il reste dans le HTML, et
`showroom/i18n.js` ne porte que les autres langues. `test/showroom-i18n.test.mjs`
refuse qu'un bloc reste sans traduction ou qu'une clé traîne sans emploi.

Aucun changement du contenu publié sur npm : le showroom n'est pas dans `files`.
