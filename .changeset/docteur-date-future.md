---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-doctor` : une page n'est plus « datée du futur » parce qu'elle est datée du jour à Paris.

La règle `seo-content-date` comparait `date:` et `updated:` à la date UTC. Entre 0 h et 2 h à Paris (1 h l'hiver), la date UTC vaut encore la veille : une page datée du jour sortait en dette, et la CI des dépôts en `doctor-strict` rougissait — relevé le 30/09/2026 sur miss-carbook #123, poussée vers 0 h 30. Une date n'est désormais future que si aucun fuseau ne l'a encore atteinte (UTC+14, `dernierJourCommence`), sans données de fuseaux d'ICU. L'instant du contrôle s'injecte par `diagnose(dir, { maintenant })`.
