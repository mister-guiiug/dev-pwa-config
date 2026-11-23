---
'@mister-guiiug/dev-pwa-config': patch
---

Catalogue : les icônes des deux extensions Firefox (`mister-no-noise`, `mister-no-prices`) sont servies par le hub, sous `https://mister-guiiug.github.io/icones/<id>.svg`. Elles étaient désignées sur `raw.githubusercontent.com`, que la CSP des apps n'admet pas en `img-src` : « Nos autres applications » les montrait cassées dans toutes les apps, et la vérification en ligne de mister-puzzle échouait (23/11/2026). L'adresse de mister-no-noise était en plus périmée (404). Un test exige désormais que toute icône du catalogue soit sur l'origine de la famille.
