---
'@mister-guiiug/dev-wpa-config': minor
---

Lighthouse : ne plus publier le rapport sur un stockage public par défaut.

Le reusable `pwa-lighthouse.yml` passait `temporaryPublicStorage: true` en dur :
chaque run de PR poussait le rapport complet — dont la capture pleine page de
l'application — dans un bucket GCP public, sans que le dépôt consommateur ait
son mot à dire. Le rapport est désormais joint au run en artefact, et
l'exposition publique devient un choix explicite via le nouvel input
`public-report` (défaut `false`).

Le template `.lighthouserc.json` bascule aussi son `upload.target` sur
`filesystem` : l'action ignore ce bloc (elle force ses propres cibles), mais
`lhci autorun` en local le lit, et publiait donc lui aussi sans prévenir.

Aucun changement du contenu publié sur npm.
