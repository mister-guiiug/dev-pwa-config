---
'@mister-guiiug/dev-pwa-config': patch
---

Node 26.9.0 partout dans la CI, et ESLint 10.11.0.

**Node 26.2.0 → 26.9.0**, dans les cinq réutilisables (`pwa-ci`, `pwa-deploy`,
`pwa-lighthouse`, `pwa-worker-deploy`, `npm-publish`), l'action composite
`setup-pwa`, le `.nvmrc`, les six workflows propres à ce dépôt et le gabarit.
Les vingt et une apps héritent du défaut sans rien écrire : aucune ne passe
`node-version`.

**La matrice suit** : `['22', '26.9.0']`. Le plancher promis reste `>=22` et
continue d'être éprouvé — le jour où une API retirée mord, ça rougit ici et non
dans la vingtième app. Le ruleset, lui, n'exige plus qu'un nom stable
(`tout-vert`), donc la matrice bouge sans toucher à une protection de branche :
c'est exactement le cas pour lequel ce portail a été posé.

**Un commentaire disait un fait, il reste vrai** : Node 26.2.0 embarquait npm
11.13.0, le 26.9.0 embarque **11.19.1**. Le chiffre est relu sur l'index de
nodejs.org, pas déduit du remplacement — une substitution en masse avait
tranquillement laissé l'ancien.

**Le conseil `nvmrc` du docteur cesse de pouvoir dériver.** Il nomme un numéro
en dur, et il le doit : il s'exécute depuis le `node_modules` de l'app, où
`.nvmrc` du socle n'est pas — le fichier ne fait pas partie du paquet publié.
Un test l'amarre désormais au `.nvmrc` de ce dépôt : les deux montent ensemble
ou la CI rougit. C'est la leçon de `v4`, figé à trois endroits et resté à
réclamer un majeur périmé pendant toute une version.

**ESLint 10.10.0 → 10.11.0** en développement. La plage des `peerDependencies`
ne bouge pas (`^9.39.4 || ^10.0.0`) : elle acceptait déjà la 10.11.0, et les
dix-huit apps qui l'ont prise la première n'ont rien eu à changer. Lint propre
avant et après, 1 517 tests.
