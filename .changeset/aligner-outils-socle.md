---
'@mister-guiiug/dev-pwa-config': patch
---

Aligner les outils du socle sur leur dernière version.

`react` et `react-dom` en 19.3.0, `@types/node` en 26.5.1, `typescript-eslint`
en 8.70.0, `globals` en 17.12.0, `eslint-plugin-react-refresh` en 0.5.6 — et
`@changesets/cli` en **3.0.2**, une majeure. Éprouvée avant d'être posée :
`changeset status` lit la configuration existante sans broncher et annonce bien
le mineur en attente. Le pointeur `$schema` de `.changeset/config.json` suit le
paquet installé, passé en 4.0.0.

Rien ne sort du contenu publié : ce sont toutes des devDependencies, et les
1369 tests passent. Le changeset existe pour que la release qui LIVRE
l'élargissement `vitest ^4 || ^5` emporte aussi ces montées — sans publication,
le parc reste bloqué sur Vitest 4.

TypeScript reste en `~6.0.3` : la 7.0.2 est le portage natif, son entrée
principale n'expose plus que `{ version, versionMajorMinor }`, et
typescript-eslint la refuse par une assertion à l'import.
