---
'@mister-guiiug/dev-wpa-config': patch
---

`apply-rulesets` : contournement admin, à travers une PR seulement

Le ruleset s'appliquait à tout le monde, administrateurs compris — aucune PR ne
pouvait être fusionnée tant qu'un check restait en attente ou qu'un fil de
discussion ouvert par un robot de relecture n'était pas résolu.

Le rôle admin peut désormais contourner, avec `bypass_mode: 'pull_request'` et
non `'always'`. Les deux ne rendent pas la même chose :

- `always` — le porteur peut aussi **pousser directement sur `main`**. C'est
  précisément le trou que ce ruleset existe pour fermer.
- `pull_request` — tout continue de passer par une PR ; le porteur peut en
  revanche fusionner sans attendre.

Le commentaire de la règle dit ce que le ruleset garantit : « qu'aucun commit
n'atterrit sur `main` sans passer par une PR ». Le mode `pull_request` préserve
exactement cette garantie, et ne lève que la gêne.

Le miroir n'en reçoit pas : sa seule règle est `deletion`, et un contournement
n'y servirait qu'à supprimer `main`.
