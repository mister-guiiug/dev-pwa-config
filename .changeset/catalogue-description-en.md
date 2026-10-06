---
'@mister-guiiug/dev-pwa-config': minor
---

Chaque entrée de `FAMILY_APPS` porte désormais `descriptionEn`, la traduction anglaise de sa `description`. Le champ est obligatoire : un test du catalogue refuse une app qui n'en a pas, ou dont la traduction recopie le français.

Ces traductions vivaient dans le hub (`scripts/descriptions-en.mjs` de `mister-guiiug.github.io`), loin de l'entrée qu'elles traduisent. Une app ajoutée au catalogue n'y laissait qu'un avertissement de construction, et paraissait en français sur la page anglaise. Le hub les lira ici, et sa construction échouera sans elles.

Rien à changer dans les apps : le champ s'ajoute, aucun n'est retiré. `FamilyApps` peut s'en servir pour une app servie en anglais.
