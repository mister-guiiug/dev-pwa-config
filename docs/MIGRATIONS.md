<!--
  Cette page est une PARTIE du manuel du socle : le README ne pouvait plus la
  porter. Il faisait 3 719 lignes et 252 kB — le plus gros fichier du paquet
  publié, devant `components.css` — et servait à la fois de vitrine, d'index et
  de manuel de 151 sous-chemins. On n'y trouvait plus rien.

  Les pages du manuel vivent dans `docs/`, le README oriente. Chaque page reste
  la SOURCE de ce qu'elle dit : rien n'a été résumé, réécrit ni raccourci au
  passage — les titres et leurs ancres sont ceux d'avant, pour que les liens
  déjà écrits ailleurs continuent de tomber juste.
-->

# Guide de migration

_Manuel du socle `@mister-guiiug/dev-pwa-config` — ce qu’une majeure a demandé, version par version. Retour au
[README](../README.md)._

## Migration guide

### React Compiler (rules en `warn` depuis v1.2.0)

Les 6 règles compiler de `eslint-plugin-react-hooks` (incluses dans `flat.recommended`) sont actives en `warn` famille — visibles en lint sans bloquer la CI. Pour adopter le compiler :

1. **Adapter le code progressivement** : viser 0 warning sur les fichiers touchés.
2. **Activer le compiler côté Vite** :
   ```bash
   npm install -D babel-plugin-react-compiler
   ```
   ```ts
   // vite.config.ts
   import react from '@vitejs/plugin-react';
   export default defineConfig({
     plugins: [
       react({
         babel: { plugins: [['babel-plugin-react-compiler', {}]] },
       }),
     ],
   });
   ```
3. **Forcer le mode strict ESLint** localement (override sur le projet pilote) :
   ```js
   // eslint.config.js
   import base from '@mister-guiiug/dev-pwa-config/eslint-react';
   export default [
     ...base,
     {
       files: ['**/*.{ts,tsx}'],
       rules: {
         'react-hooks/set-state-in-effect': 'error',
         'react-hooks/purity': 'error',
         'react-hooks/immutability': 'error',
         'react-hooks/preserve-manual-memoization': 'error',
         'react-hooks/refs': 'error',
         'react-hooks/static-components': 'error',
       },
     },
   ];
   ```

### Accessibilité (`jsx-a11y` en `warn` depuis 3.5.0)

`eslint-react` inclut `eslint-plugin-jsx-a11y` (config `recommended`) avec **toutes
les règles ramenées à `warn`** : les violations d'accessibilité sont visibles au
lint sans bloquer la CI, en complément du filet e2e axe-core. Trajectoire
d'adoption identique aux règles React Compiler — passer en `error` par app une fois
les warnings résorbés :

```js
// eslint.config.js
import base from '@mister-guiiug/dev-pwa-config/eslint-react';
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      // …ou remonter tout le bloc jsx-a11y/* selon la maturité du projet.
    },
  },
];
```

### Zod 3 → 4 (breaking, perfs ~+50%)

Breaking changes notables :

- `.parse()` strict par défaut (rejette les clés inconnues — utiliser `.passthrough()` pour l'ancien comportement).
- `result.errors[]` → `result.error.issues[]`.
- `.format()` retourne maintenant un `$ZodError` flatten.
- Coercion (`z.coerce.*`) plus strictes.

Procédure :

```bash
npm install zod@^4
npm run type-check
# → repérer les usages cassés, adapter
npm run test
```

Voir : <https://zod.dev/v4/migration>

Concerne dans la famille : `miss-uwh`, `miss-genius`, `miss-badminton`, `mister-molkky`,
`miss-carbook`, `miss-contraction`, `mister-puzzle`. En pratique l'usage est déjà compatible v4
(`z.record(key, val)` en 2-args partout) ; les API restantes (`error.errors`, `.flatten()`,
`z.string().uuid()/.url()`) sont **dépréciées mais fonctionnelles**.

### Vitest Browser Mode (opt-in)

Recommandé pour :

- Tests de composants utilisant beaucoup d'API DOM/CSS réelles.
- Tests visuels / responsive.
- Tests qui nécessitent vrai layout (mesures, focus management complexe).

À garder en jsdom :

- Tests purement logiques (utils, hooks sans DOM).
- Tests de stores Zustand.
- Tests rapides de smoke / régression.

Cohabitation recommandée : 2 fichiers de config (`vitest.config.ts` + `vitest.browser.config.ts`), 2 scripts npm (`test` + `test:browser`).

### Vite 7 → 8 (Rolldown)

- Vite 8 utilise **Rolldown + Oxc** au lieu de Rollup/esbuild.
- `build.rollupOptions` et `output.manualChunks` (forme fonction) restent **fonctionnels (dépréciés)** :
  les `vite.config.ts` existants tournent sans réécriture.
- `@vitejs/plugin-react@6` requiert Vite 8 ; `vite-plugin-pwa@1.3`, `@tailwindcss/vite@4.3` et
  `rollup-plugin-visualizer@7` (peer `rolldown`) sont compatibles.
- `@sentry/vite-plugin` : passer en `^5` pour la compat Rolldown.
- Repli CJS interop si besoin : `legacy.inconsistentCjsInterop: true`.

### Vitest 3 → 4

- Couverture **V8 désormais AST-aware** (chiffres recalibrés, proche d'Istanbul) ; `coverage.include`
  doit être explicite. Recalibrer les `thresholds` si une app casse.
- Aucune option supprimée n'est utilisée par les bases (`workspace`/`poolOptions`/`deps.inline`/`coverage.all`).

### tsconfig 3.0 (`verbatimModuleSyntax` + `noUncheckedIndexedAccess`)

`tsconfig-app` et `tsconfig-node` activent deux options strictes en 3.0. Au bump,
`tsc` peut remonter de nouvelles erreurs (aucune au runtime) :

- **`verbatimModuleSyntax`** — préfixer en `import type { Foo }` les imports
  utilisés uniquement comme types. (mister-puzzle le déclarait déjà → retirer
  l'override local.)
- **`noUncheckedIndexedAccess`** — `arr[i]` / `record[k]` deviennent `T | undefined` ;
  garder/valider avant usage (`const x = arr[i]; if (x) …`).

Adoption progressive possible en remettant l'option à `false` dans le
`tsconfig.app.json` du projet le temps d'adapter le code :

```jsonc
{
  "extends": "@mister-guiiug/dev-pwa-config/tsconfig-app-react",
  "compilerOptions": { "noUncheckedIndexedAccess": false }, // temporaire
  "include": ["src"],
}
```

### Lockfile & bindings natifs (Vite 8 / Rolldown)

Vite 8 (Rolldown/oxc) tire des **dépendances optionnelles** spécifiques à la
plateforme (`@emnapi/*`, `@rolldown/binding-*`, `@oxc-*`). Un `package-lock.json`
**régénéré hors Linux** peut les **omettre** → `npm ci` casse en CI Linux
(`Missing: @emnapi/runtime from lock file`). Pour éviter / détecter ça :

- Copier [`templates/.npmrc`](./templates/.npmrc) (registre scope + `include=optional`).
- **Régénérer le lockfile sous Linux/CI** (ou `npm install` puis committer).
- Vérifier la synchro avant de committer : `npm ci --dry-run`.
- Le reusable `pwa-ci.yml` ajoute un job **`verify-lockfile`** (input
  `verify-lockfile`, défaut `true`) qui échoue en PR avec un message clair si le
  lock est désynchronisé.

### TypeScript / Tailwind

- **TypeScript ~6.0.3** : cible famille — `npm i -D typescript@~6.0.3`.
- **Tailwind 4.3.x** : `@tailwindcss/vite@^4.3.0`.

### Copie locale de `format` → `/format` (piège `formatPercentage`)

Le socle suit la convention d'`Intl` (`style: 'percent'`) : `formatPercentage`
attend une **proportion** — `formatPercentage(0.42)` → « 42 % ». Les copies
locales des apps attendaient l'échelle **0–100** — `formatPercentage(42)` →
« 42 % » (cas réel : la copie de `miss-contraction`). Les deux signatures se
ressemblent trait pour trait : le remplacement à l'identique **compile, puis
affiche « 4 200 % »**.

À la migration, donc :

- repérer chaque point d'appel : `grep -rn "formatPercentage" src/` ;
- passer la proportion telle quelle quand la valeur vient d'un rapport
  (`formatPercentage(fait / total)`), diviser quand elle est historiquement
  stockée en 0–100 (`formatPercentage(note / 100)`) ;
- un « 4 200 % » à l'écran — ou dans un instantané de test — est un appel
  oublié, pas un bug du socle.

Même convention dans `fmt.percent` du contexte [`createI18n`](INTERFACE.md#le-formatage-suit-la-langue-choisie),
qui délègue à `formatPercentage`.
