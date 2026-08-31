---
'@mister-guiiug/dev-wpa-config': patch
---

La clé `'mc-theme'` revient dans la liste des clés de thème : elle était
**valide**, et la correction de la 3.29.0 l'avait retirée à tort.

`'mc-theme'` (tiret) est la clé de `miss-carbook` depuis avril 2026
(`const KEY = 'mc-theme'`), et elle figure encore dans son `legacyKeys`.
`'mc_theme'` (souligné) est celle de `miss-contraction`. **Deux apps, deux clés
qui ne diffèrent que d'un caractère** — la première a été prise pour une
coquille de la seconde.

La liste en compte donc neuf, pas huit.

L'erreur mérite d'être gardée parce qu'elle n'a pas la forme qu'on croyait. Le
premier passage avait recopié une valeur sans la vérifier ; le second l'a
« corrigée » sans la vérifier non plus, sur la foi d'un rapport de migration, et
a supprimé une donnée juste. **Une valeur mesurée ne se corrige qu'en relisant
la source.**
