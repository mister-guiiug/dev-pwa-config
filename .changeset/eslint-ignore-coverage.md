---
'@mister-guiiug/dev-pwa-config': patch
---

**ESLint ignore `coverage/`.**

`coverage/` est dans le `.gitignore` des dix-neuf dépôts. ESLint ne lit pas
`.gitignore` : il descend dedans et analyse le rapport engendré par istanbul.
Ses assets (`block-navigation.js`, `prettify.js`, `sorter.js`, à la racine ET
sous `lcov-report/`) s'ouvrent chacun par un commentaire `eslint-disable` qui,
ici, ne désactive rien — aucun bloc `files` de `eslint-base` ne cible le `.js`.
ESLint les déclare « inutilisés » et rend **six avertissements par dépôt**.

Mesuré le 13/09/2026 sur `mister-molkky`, après `npm run test:coverage` :

```
$ npm run lint
✖ 26 problems (0 errors, 26 warnings)
  0 errors and 6 warnings potentially fixable with the `--fix` option.
```

Vingt de ces vingt-six portent sur `src/react/**` — du vrai code, à corriger.
Les six autres viennent de `coverage/`, et ce sont exactement les six que
`--fix` propose de réparer : le lint s'offrait à **réécrire des fichiers
engendrés**. Le bruit ne fait pas que gêner la lecture, il oriente le geste.

La CI ne le voyait pas et ne le verra pas : dans `pwa-ci.yml`, l'étape `Lint`
passe avant `Test`, donc le dossier n'existe pas encore sur le runner. Le
défaut n'apparaît qu'en local, seul endroit où les deux commandes se suivent —
et il se généralise depuis que le réutilisable sait jouer `run-coverage` : six
dépôts produisent désormais ce rapport à chaque exécution.

Le motif est **nu** (`coverage`, comme `dist`) : en flat config les ignores
sont relatifs au dossier de la config, il ne vise donc que la racine. Une app
dont le domaine métier parlerait de couverture garde `src/.../coverage/`
analysé — `test/configs.test.mjs` vérifie les deux sens par
`ESLint.isPathIgnored()`, à travers `eslint-base` **et** `eslint-react` (la
seule des deux que les apps importent), et refuse un `**/coverage` qui
déborderait.

Prettier n'a pas besoin de ce correctif : depuis la 3.x son `--ignore-path`
vaut `.gitignore` **et** `.prettierignore`. Vérifié sur `mister-molkky` avec
Prettier 3.9.6 — `format:check` est vert, et ne rougit sur les six fichiers
qu'en forçant `--ignore-path /dev/null`. La ligne `coverage/` déjà présente
dans les `.gitignore` suffit ; celles qu'on lit dans quelques
`.prettierignore` sont redondantes, pas nécessaires.
