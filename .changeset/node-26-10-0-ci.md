---
'@mister-guiiug/dev-pwa-config': patch
---

Node 26.10.0 dans toute la CI, comme le `.nvmrc`

**Le `.nvmrc` du socle était passé à 26.10.0 le 22/09/2026 — la CI, non.** Le
conseil `nvmrc` du docteur avait suivi, puisqu'un test l'y amarre ; pas les
dix-huit épingles qui décident de ce que la CI installe : l'action `setup-pwa`,
les cinq réutilisables (`pwa-ci`, `pwa-deploy`, `pwa-lighthouse`,
`pwa-worker-deploy`, `npm-publish`), les workflows propres à ce dépôt et le
gabarit. Le parc développait en 26.10.0 et s'éprouvait en 26.9.0, sans que rien
ne le dise. Les apps héritent du défaut sans rien écrire : aucune ne passe
`node-version`.

**npm ne change pas** : 26.10.0 embarque le même 11.19.1 que 26.9.0 (relu sur
l'index de nodejs.org). Aucun lockfile n'a donc à bouger, et « Lockfile in
sync » juge avec le même npm qu'avant.

**Un test amarre désormais chaque épingle au `.nvmrc`** (`node-epingle.test.mjs`) :
toute version complète du majeur épinglé, dans un workflow, une action ou le
gabarit, doit valoir le `.nvmrc` — les deux montent ensemble, ou la CI rougit.
Un second test vérifie que `setup-pwa` et les cinq réutilisables portent bien
l'épingle, pour que le premier ne puisse pas passer à vide. Seul le plancher
`'22'` de la matrice y échappe : il éprouve la promesse `engines: >=22`, pas
l'épingle.
