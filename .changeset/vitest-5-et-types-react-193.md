---
'@mister-guiiug/dev-pwa-config': minor
---

Ouvrir la porte à Vitest 5, et monter `@types/react` en 19.3.

Les deux peers passent à **`^4.0.0 || ^5.0.0`** — `vitest` et `@vitest/browser`.
Les deux plages, pas seulement la 5 : une app qui reste en 4 continue
d'installer le socle sans rien changer, exactement comme la 4.10.0 l'avait fait
pour ESLint 9 et 10. `@vitest/browser` et `@vitest/coverage-v8` épinglent
`vitest` à la version EXACTE (`5.0.0`) : ces trois-là montent ensemble ou pas
du tout, il n'y a pas de demi-mesure possible côté app.

`@testing-library/jest-dom` acceptait déjà `^6.0.0 || ^7.0.0` ; rien à y faire.

Côté devDependencies : `@types/react` et `@types/react-dom` en 19.3.0,
`eslint-plugin-react-hooks` en 7.1.1. Les 1369 tests passent.

**TypeScript reste en `~6.0.3`, et ce n'est pas un oubli.** `typescript@7.0.2`
est le portage natif : son entrée principale n'exporte plus que
`{ version, versionMajorMinor }`, l'API compilateur est passée sous
`./unstable/*`, et `typescript-eslint@8.70.0` — la dernière publiée — déclare
`typescript: ">=4.8.4 <6.1.0"` puis **refuse la 7.0 par une assertion à
l'import**, ce qui fait échouer le chargement de la config ESLint pour tous les
fichiers. Support amont suivi pour TS ≥ 7.1.
