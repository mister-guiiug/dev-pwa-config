---
'@mister-guiiug/dev-wpa-config': patch
---

Le barrel `/react` déclare enfin `VersionProvider`, `useAppVersion` et `AppVersion`.

`react/index.js` et `react/index.d.ts` sont deux listes tenues à la main, et rien ne
les comparait. Les trois modules de version ont donc rejoint le barrel d'exécution
sans rejoindre celui des types : l'import fonctionnait, `tsc` le refusait, et la
première app à les consommer a dû passer par les sous-chemins.

`npm run typecheck` ne pouvait pas le voir — il vérifie les fichiers du paquet, pas
la correspondance entre deux listes dont l'une n'est lue que par les consommateurs.
Un test compare désormais les exports d'exécution du barrel aux symboles que ses
types déclarent, en résolvant les `export *` par le compilateur TypeScript lui-même.
