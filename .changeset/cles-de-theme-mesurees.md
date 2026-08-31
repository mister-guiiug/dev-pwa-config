---
'@mister-guiiug/dev-wpa-config': patch
---

La liste des clés de thème de la famille était **fausse**, et c'est celle qu'on
recopie dans `legacyKeys`.

`theme-boot` et `react/use-theme` annonçaient tous deux `'mc-theme'` avec un
**tiret**, là où `miss-contraction` écrit `'mc_theme'` avec un **souligné**. Une
migration qui s'y serait fiée aurait posé un `legacyKeys` inopérant et perdu la
préférence de chaque utilisatrice — exactement le bug que ces deux paragraphes
existent pour empêcher.

Il manquait aussi `'mb_theme'` et `'mm_theme'` : la mesure annonçait six clés,
il y en a **huit**.

Relevé en migrant `miss-contraction` (#26), qui a lu son propre code plutôt que
la liste. Une liste de valeurs mesurées se revérifie quand on s'en sert : c'est
de la donnée, pas de la prose.
