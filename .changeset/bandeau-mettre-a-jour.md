---
'@mister-guiiug/dev-pwa-config': minor
---

**Le bandeau de mise à jour dit « Mettre à jour », et son report annonce sa
durée.**

Le relevé des vingt et une applications du parc donnait trois verbes pour le
même bouton — « Recharger » dans le socle, « Mettre à jour » dans quatre apps,
« Actualiser » dans une — et un « Plus tard » qui, selon l'app, écartait pour la
session ou reportait de 4, 6 ou 24 heures sans le dire. Seul mister-puzzle
annonçait la durée, en passant son propre libellé.

- `update.update` vaut « Mettre à jour » dans les sept langues. Le titre
  annonce une mise à jour et l'état transitoire en est une ; le bouton nommait
  le mécanisme là où ses deux voisins nomment l'intention.
- `update.snooze` vaut « Plus tard ({hours} h) » ; le bandeau remplit
  `{hours}` avec `snoozeHours`, dans le libellé du socle comme dans un
  `snoozeLabel` fourni par l'app. Le bouton d'écartement (`snoozeHours` à 0)
  reste « Plus tard ».

Ce que les consommateurs verront : une app qui affiche le texte du socle prend
le nouveau verbe à sa prochaine montée, et un test qui attend « Recharger »
attendra « Mettre à jour » (miss-uwh, mister-molkky). Une app qui passe ses
propres libellés ne change pas.
