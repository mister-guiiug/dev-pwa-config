---
'@mister-guiiug/dev-wpa-config': minor
---

`eslint-react` : ajout de `eslint-plugin-jsx-a11y` (config `recommended`), toutes
les règles ramenées à `warn`.

Capte les violations d'accessibilité au **lint** (en amont du filet e2e axe-core),
sans bloquer la CI. Trajectoire d'adoption identique aux règles React Compiler :
remonter en `error` par app une fois les warnings résorbés (cf. README, section
« Accessibilité »). Le plugin est déclaré en `dependencies` (bundlé) + peer
optionnelle, comme `react-hooks`/`react-refresh`.
