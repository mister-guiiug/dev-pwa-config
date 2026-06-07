# @mister-guiiug/dev-wpa-config

Configurations partagées (ESLint, Prettier, TypeScript, Vitest) pour les
projets PWA de la famille `miss-*` et `mister-*`.

> **Distribué via [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)** sur le registre `npm.pkg.github.com`.

## Projets consommateurs

| Projet                                     | Type                                        | Configs utilisées                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`miss-badminton`](../miss-badminton/)     | React + localStorage                        | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base (icônes : SVG inline, pas de `lucide-react`)                                         |
| [`miss-carbook`](../miss-carbook/)         | React + Supabase                            | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base                                                                                      |
| [`miss-contraction`](../miss-contraction/) | React + localStorage                        | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base                                                                                      |
| [`miss-dice`](../miss-dice/)               | React + localStorage                        | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base                                                                                      |
| [`miss-genius`](../miss-genius/)           | React + localStorage                        | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, vite-pwa-base, `lucide-react`                                                       |
| [`miss-ticket-pwa`](../miss-ticket-pwa/)   | React + Firebase                            | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, `lucide-react`                                                                      |
| [`mister-cim10`](../mister-cim10/)         | React                                       | eslint-react, prettier, tsconfig-app-react (avec overrides `allowJs`/`strict: false`), tsconfig-node, vitest-base                                           |
| [`mister-footcoach`](../mister-footcoach/) | React + Supabase                            | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, `lucide-react`                                                                      |
| [`mister-molkky`](../mister-molkky/)       | React + localStorage (sync Supabase opt-in) | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, `lucide-react`                                                                      |
| [`mister-puzzle`](../mister-puzzle/)       | React + Firebase                            | eslint-react, prettier, tsconfig-app-react (avec overrides `verbatimModuleSyntax`, `erasableSyntaxOnly`), tsconfig-node (idem), vitest-base, `lucide-react` |

## Stack cible (juin 2026)

Les configs imposent / supposent les versions suivantes côté projet consommateur :

```
TypeScript ~6.0.3 strict, cible ES2025 + lib ES2025
ESLint 9 (flat config) + typescript-eslint 8.58
eslint-plugin-react-hooks 7.0 (configs.flat.recommended) + eslint-plugin-react-refresh 0.5
Vite 8 (Rolldown) + Vitest 4 (jsdom + globals + setupFiles)
Zod 4 (peer)
Prettier 3.6 (singleQuote, tabWidth 2, printWidth 80, trailingComma es5, arrowParens 'avoid')
Tailwind 4 (@tailwindcss/vite) + lucide-react (icônes — standard famille)
```

> **2.0.0 (breaking)** — les peer-dependencies passent en **Vite 8 / Vitest 4 / TypeScript ~6.0.3 / Zod 4**
> (plus de support Vitest 3 ni Zod 3). Voir la [migration](#zod-3--4-breaking-perfs-50) ci-dessous.

### Icônes — `lucide-react` (règle famille)

Les projets React de la famille **utilisent `lucide-react`** comme bibliothèque
d'icônes d'interface (navigation, boutons d'action, tendances, en-têtes). C'est
le standard partagé : cohérence visuelle entre `miss-*` / `mister-*`, icônes
SVG tree-shakées (on n'embarque que celles importées), `strokeWidth`/`size`
ajustables, et `currentColor` qui suit les tokens du thème.

```bash
npm install lucide-react
```

```tsx
import { Plus, Trash2 } from 'lucide-react';

// Icône décorative -> aria-hidden ; le libellé accessible vit sur le bouton.
<button aria-label="Supprimer">
  <Trash2 size={18} aria-hidden="true" />
</button>;
```

Conventions :

- **Décoratives** : `aria-hidden="true"` + un libellé porté par le parent
  (`aria-label`, texte visible…). Ne jamais s'appuyer sur la seule icône.
- **Tailles** : `size={18}` (boutons/inline), `size={22}` (nav), `size={13}`
  (pastilles). Couleur via `className` (`text-primary`, `currentColor`).
- **Emoji autorisé uniquement** pour le contenu utilisateur (ex. icône de
  matière choisie) et les illustrations « mascotte » (états vides, onboarding),
  **pas** pour l'iconographie fonctionnelle.

> **Alternative SVG inline (assumée).** `lucide-react` est le **standard** quand
> une app a des icônes fonctionnelles, mais il n'est **pas obligatoire** : une app
> peut inliner ses SVG (cf. `miss-badminton`, `src/react/components/icons.tsx`)
> pour garder un bundle minimal. Dans ce cas, **ne pas** déclarer `lucide-react`
> dans `package.json`. La règle ferme reste : pas d'icône de marque via `lucide`
> (la 1.x ne les fournit plus) → logo GitHub en SVG inline, `Coffee` pour le sponsor.

### Liens app — code source + sponsor (règle famille)

Chaque application de la famille **expose deux liens** : son **code source**
(dépôt GitHub) et un lien **sponsor** (Buy Me a Coffee). C'est à la fois une
question de transparence (apps gratuites, locales, open source) et de soutien.

Deux niveaux, à mettre en place ensemble :

1. **Dans l'app** — un `src/links.ts` centralise les URL, consommé par un footer
   ou un écran « À propos » / « Réglages » :

   ```ts
   // src/links.ts
   export const REPO_URL = 'https://github.com/mister-guiiug/<projet>';
   export const SPONSOR_URL = 'https://buymeacoffee.com/mister.guiiug';
   ```

   ```tsx
   // Footer : lien source + sponsor (cibles externes sécurisées).
   <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Code source</a>
   <a href={SPONSOR_URL} target="_blank" rel="noopener noreferrer">
     <Coffee size={16} aria-hidden="true" /> M'offrir un café
   </a>
   ```

2. **Sur le dépôt** — `.github/FUNDING.yml` active le bouton « Sponsor » de
   GitHub. Template prêt à copier : [`templates/FUNDING.yml`](./templates/FUNDING.yml).

   ```yaml
   buy_me_a_coffee: mister.guiiug
   ```

Conventions :

- **Liens externes** : toujours `target="_blank"` + `rel="noopener noreferrer"`.
- **Marque GitHub** : `lucide-react` 1.x ne fournit plus d'icônes de marque —
  utiliser un **SVG inline** pour le logo GitHub ; `Coffee` (lucide) pour le
  sponsor. Handle sponsor unique de la famille : **`mister.guiiug`**.

## Installation (GitHub Packages)

### Étape 1 — `.npmrc` à la racine du projet consommateur

```ini
@mister-guiiug:registry=https://npm.pkg.github.com
```

### Étape 2 — Dépendance dans `package.json`

```jsonc
{
  "devDependencies": {
    "@mister-guiiug/dev-wpa-config": "^1.4.0",
  },
}
```

### Étape 3 — Authentification

Le paquet est publié sur le registre **GitHub Packages**, qui exige une authentification (même pour les paquets publics).

#### En local (machine de développement)

Créer un [Personal Access Token](https://github.com/settings/tokens/new) avec **`read:packages`** uniquement, puis :

```bash
# Option 1 : npm login
npm login --scope=@mister-guiiug --auth-type=legacy --registry=https://npm.pkg.github.com
# Username = votre login GitHub
# Password = le PAT

# Option 2 : variable d'environnement
echo "//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxx" >> ~/.npmrc
```

#### En CI (GitHub Actions)

Le `secrets.GITHUB_TOKEN` automatique d'Actions a la permission `read:packages` par défaut sur les paquets de l'organisation. Configuration type :

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: npm
    registry-url: 'https://npm.pkg.github.com'
    scope: '@mister-guiiug'

- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Exports npm

| Sous-chemin                                             | Type            | Description                                                                                                                                                                                           |
| ------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mister-guiiug/dev-wpa-config/eslint-base`             | `.js`           | Config ESLint pour projets vanilla TS / Node (sans React)                                                                                                                                             |
| `@mister-guiiug/dev-wpa-config/eslint-react`            | `.js`           | Étend la base avec `react-hooks` flat + `react-refresh` (rules React Compiler désactivées)                                                                                                            |
| `@mister-guiiug/dev-wpa-config/prettier`                | `.js`           | Config Prettier 3.6                                                                                                                                                                                   |
| `@mister-guiiug/dev-wpa-config/commitlint`              | `.js`           | Config commitlint (Conventional Commits)                                                                                                                                                              |
| `@mister-guiiug/dev-wpa-config/lint-staged`             | `.js`           | Config lint-staged (eslint --fix + prettier --write)                                                                                                                                                  |
| `@mister-guiiug/dev-wpa-config/tsconfig-app`            | `.json`         | Base app : ES2025 strict, `moduleResolution: bundler`, `noUncheckedSideEffectImports`, `types: ["vite/client"]`                                                                                       |
| `@mister-guiiug/dev-wpa-config/tsconfig-app-react`      | `.json`         | Étend `tsconfig-app` avec `jsx: react-jsx`, `jsxImportSource: react`, `vite-plugin-pwa/client`                                                                                                        |
| `@mister-guiiug/dev-wpa-config/tsconfig-node`           | `.json`         | tsconfig pour `vite.config.ts`, `vitest.config.ts`, `scripts/*.mjs` (`types: ["node"]`)                                                                                                               |
| `@mister-guiiug/dev-wpa-config/vitest-base`             | `.js` + `.d.ts` | `baseTestOptions` (jsdom + globals + setupFiles + passWithNoTests) + `coveragePreset` (reporters `lcov`/`json-summary`) + `recommendedThresholds`                                                     |
| `@mister-guiiug/dev-wpa-config/vitest-setup`            | `.js`           | Setup Vitest partagé (jest-dom + stub `matchMedia` + mocks `virtual:pwa-register`) — à importer depuis `src/test/setup.ts`                                                                            |
| `@mister-guiiug/dev-wpa-config/react`                   | `.js` + `.d.ts` | Hooks & composants PWA : `useLocalStorage`, `useInstallPrompt`, `useTheme`, `PwaInstallPrompt`, `AppFooter` (peer `react`)                                                                            |
| `@mister-guiiug/dev-wpa-config/react/use-update-prompt` | `.js` + `.d.ts` | `useUpdatePrompt` (MAJ service worker + snooze) — couplé à vite-plugin-pwa, hors barrel                                                                                                               |
| `@mister-guiiug/dev-wpa-config/react/rive`              | `.js` + `.d.ts` | `RiveAnimation` — wrapper Rive lazy, a11y, `prefers-reduced-motion` (peer optionnelle `@rive-app/react-canvas`)                                                                                       |
| `@mister-guiiug/dev-wpa-config/vitest-browser-base`     | `.js` + `.d.ts` | `baseBrowserTestOptions` (Browser Mode Playwright pour `*.browser.test.{ts,tsx}`)                                                                                                                     |
| `@mister-guiiug/dev-wpa-config/playwright-base`         | `.js` + `.d.ts` | `definePwaPlaywrightConfig({ devices })` (factory : 5 navigateurs, reporters multi-format, snapshots/plateforme, webServer) + helpers `pwaProjects`/`pwaReporters` + `basePlaywrightOptions` (legacy) |
| `@mister-guiiug/dev-wpa-config/playwright-a11y`         | `.js` + `.d.ts` | `expectNoA11yViolations` / `analyzeA11y` / `formatViolations` (axe-core via `AxeBuilder` injecté ; peer optionnelle `@axe-core/playwright`)                                                           |
| `@mister-guiiug/dev-wpa-config/vite-pwa-base`           | `.js` + `.d.ts` | `pwaSeoPlugin()` (injection GTM/GA4 + sitemap.xml/robots.txt) + helpers analytics                                                                                                                     |
| `@mister-guiiug/dev-wpa-config/tailwind-preset`         | `.js`           | Design tokens famille (fonts, safe-areas, breakpoints)                                                                                                                                                |
| `@mister-guiiug/dev-wpa-config/tailwind-preset.css`     | `.css`          | Preset CSS Tailwind 4 : `@theme` (typo/spacing fluides) + utilitaires `*-safe` / `touch-target`                                                                                                       |

## Bin

| Commande    | Rôle                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pwa-icons` | Génère les icônes PWA (PNG + maskable) depuis un SVG/PNG source. Requiert `sharp`. Ex. `pwa-icons --source public/favicon.svg --maskable` |

## Reusable workflows GitHub Actions

Hébergés dans [`.github/workflows/`](.github/workflows/) — utilisables par tous les repos de la famille.

| Workflow             | Rôle                                                          | Exemple d'appel                                                               |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pwa-ci.yml`         | Format · Lint · Type · Test · Build (+ E2E optionnel)         | voir [Utilisation](#reusable-workflow-ci)                                     |
| `pwa-deploy.yml`     | Build + déploiement GitHub Pages (avec `VITE_BASE_PATH` auto) | voir [Utilisation](#reusable-workflow-deploy)                                 |
| `npm-publish.yml`    | Publication npm sur GitHub Packages avec `--provenance`       | voir [Utilisation](#reusable-workflow-publish)                                |
| `pwa-lighthouse.yml` | Build + Lighthouse CI (perf/a11y/bp/seo) sur PR               | `uses: …/pwa-lighthouse.yml@v1` (requiert `.lighthouserc.json`, cf. template) |

## Composite actions

| Action                                                             | Rôle                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `mister-guiiug/dev-wpa-config/.github/actions/setup-pwa@v1`        | Setup Node 22 + scope `@mister-guiiug` + `npm ci` (auth GitHub Packages) |
| `mister-guiiug/dev-wpa-config/.github/actions/supabase-migrate@v1` | Setup CLI Supabase + `link` + `db push` (déploiements custom)            |
| `mister-guiiug/dev-wpa-config/.github/actions/firebase-deploy@v1`  | `firebase deploy` ciblé (rules database/firestore, indexes)              |

## Templates non-importables (à copier-coller)

Le dossier [`templates/`](./templates/) contient des fichiers que les outils (VSCode, husky, etc.) ne savent pas importer depuis un paquet npm. Ils servent de **référence** au démarrage d'un nouveau projet — copier dans le projet puis ajuster.

| Template                                                                           | Cible projet                            | Personnalisation typique                                                                    |
| ---------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`templates/vscode/extensions.json`](./templates/vscode/extensions.json)           | `<projet>/.vscode/extensions.json`      | Aucune (à dupliquer tel quel)                                                               |
| [`templates/vscode/settings.json`](./templates/vscode/settings.json)               | `<projet>/.vscode/settings.json`        | Aucune                                                                                      |
| [`templates/vscode/tasks.json`](./templates/vscode/tasks.json)                     | `<projet>/.vscode/tasks.json`           | Ajouter les tasks `test:e2e:critical`, `test:e2e:a11y` etc. selon les scripts du projet     |
| [`templates/vscode/launch.json`](./templates/vscode/launch.json)                   | `<projet>/.vscode/launch.json`          | Adapter `url` au base path (`/mister-puzzle/`, etc.) et `sourceMapPathOverrides`            |
| [`templates/github-workflows/ci.yml`](./templates/github-workflows/ci.yml)         | `<projet>/.github/workflows/ci.yml`     | **Préférer le reusable `pwa-ci.yml`** (template déprécié, conservé pour cas hors-stack)     |
| [`templates/github-workflows/deploy.yml`](./templates/github-workflows/deploy.yml) | `<projet>/.github/workflows/deploy.yml` | **Préférer le reusable `pwa-deploy.yml`** (template déprécié, conservé pour cas hors-stack) |
| [`templates/husky/pre-commit`](./templates/husky/pre-commit)                       | `<projet>/.husky/pre-commit`            | Aucune                                                                                      |
| [`templates/husky/commit-msg`](./templates/husky/commit-msg)                       | `<projet>/.husky/commit-msg`            | Aucune                                                                                      |
| [`templates/.editorconfig`](./templates/.editorconfig)                             | `<projet>/.editorconfig`                | Aucune                                                                                      |
| [`templates/index.html`](./templates/index.html)                                   | `<projet>/index.html`                   | CSP (offline-first vs Supabase/Firebase/GA4), titre/desc/theme-color, placeholders SEO      |
| [`templates/.nvmrc`](./templates/.nvmrc)                                           | `<projet>/.nvmrc`                       | Aucune                                                                                      |
| [`templates/FUNDING.yml`](./templates/FUNDING.yml)                                 | `<projet>/.github/FUNDING.yml`          | Aucune (handle sponsor famille `mister.guiiug`)                                             |
| [`templates/.lighthouserc.json`](./templates/.lighthouserc.json)                   | `<projet>/.lighthouserc.json`           | Ajuster les seuils (`minScore`) par catégorie                                               |
| [`templates/e2e/a11y.spec.ts`](./templates/e2e/a11y.spec.ts)                       | `<projet>/e2e/a11y.spec.ts`             | Adapter les routes/zones ; `npm i -D @axe-core/playwright`                                  |
| [`templates/changesets/config.json`](./templates/changesets/config.json)           | `<projet>/.changeset/config.json`       | Adapter `access` (restricted vs public)                                                     |

## Nettoyage de l'historique Actions

[`templates/github-workflows/cleanup-runs.yml`](./templates/github-workflows/cleanup-runs.yml) —
workflow **manuel** (`workflow_dispatch`) qui ne conserve que les **N runs les
plus récents par workflow** (défaut `3`, option `dry-run`). Copier dans
`<projet>/.github/workflows/cleanup-runs.yml` ; requiert `permissions: actions: write`.

## Inputs récents des reusables (v1.5.0)

- **`pwa-ci.yml`** — `build-env` (variables `KEY=VALUE`, une par ligne, injectées
  avant build/test pour les apps Firebase/Supabase) ; `server-dir` (install +
  `tsc --noEmit` d'un backend annexe).
- **`pwa-lighthouse.yml`** — `build-env` (même usage) → Lighthouse activable sur
  les apps à secrets.
- **`pwa-deploy.yml`** — `build-env` ; déploiement **Firebase optionnel**
  (`firebase-project`, `firebase-only`, secret `FIREBASE_SERVICE_ACCOUNT_KEY`)
  avec auth intégrée.

## Supabase keep-alive (anti-pause Free)

Le plan **Free** de Supabase met un projet en **pause après 7 jours sans vraie
requête DB**. Le reusable
[`pwa-supabase-keepalive.yml`](.github/workflows/pwa-supabase-keepalive.yml) fait
un `SELECT` REST (anon key) sur une petite table `keep_alive` → requête réelle →
compteur d'inactivité réinitialisé.

Mise en place (**un caller par projet Supabase**) :

1. Appliquer [`templates/supabase/keep-alive.sql`](./templates/supabase/keep-alive.sql)
   au projet (SQL editor ou migration) — crée `public.keep_alive` + policy `anon`.
2. Copier
   [`templates/github-workflows/supabase-keepalive.yml`](./templates/github-workflows/supabase-keepalive.yml)
   dans `<projet>/.github/workflows/` (décaler le `cron` entre dépôts).
3. Secrets requis : `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (anon =
   publique, jamais la `service_role`).

Note : un cron GitHub est désactivé après 60 j sans commit sur le dépôt (les
commits Renovate suffisent ; sinon relancer via `workflow_dispatch`).

## Utilisation

### `eslint.config.js`

```js
// Projet React
export { default } from '@mister-guiiug/dev-wpa-config/eslint-react';

// Projet non-React
export { default } from '@mister-guiiug/dev-wpa-config/eslint-base';
```

### `prettier.config.js`

```js
export { default } from '@mister-guiiug/dev-wpa-config/prettier';
```

### `tsconfig.app.json`

```jsonc
// Projet React
{
  "extends": "@mister-guiiug/dev-wpa-config/tsconfig-app-react",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  },
  "include": ["src"]
}

// Projet non-React
{
  "extends": "@mister-guiiug/dev-wpa-config/tsconfig-app",
  "include": ["src"]
}
```

### `tsconfig.node.json`

```jsonc
{
  "extends": "@mister-guiiug/dev-wpa-config/tsconfig-node",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
  },
  "include": ["vite.config.ts", "vitest.config.ts", "scripts/**/*.mjs"],
}
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseTestOptions } from '@mister-guiiug/dev-wpa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: baseTestOptions,
});
```

Le projet doit créer `src/test/setup.ts` (chargé par `setupFiles`). Contenu type :

```ts
import '@testing-library/jest-dom/vitest';
```

### `vitest.browser.config.ts` (Browser Mode opt-in)

Alternative à jsdom — exécute les tests dans un vrai navigateur via Playwright. Plus fidèle (vraies API DOM, pas de polyfills) mais plus lourd. Cohabite avec jsdom :

- `*.test.{ts,tsx}` → jsdom (rapide, isolation)
- `*.browser.test.{ts,tsx}` → vrai Chromium (fidélité visuelle/DOM)

```bash
npm install -D @vitest/browser playwright
npx playwright install chromium
```

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseBrowserTestOptions } from '@mister-guiiug/dev-wpa-config/vitest-browser-base';

export default defineConfig({
  plugins: [react()],
  test: baseBrowserTestOptions,
});
```

Lancer : `vitest --config vitest.browser.config.ts`

### `playwright.config.ts`

Recommandé — la factory (matrice 5 navigateurs, reporters multi-format,
snapshots par plateforme, `reducedMotion`, `webServer` déjà inclus) :

```ts
import { defineConfig, devices } from '@playwright/test';
import { definePwaPlaywrightConfig } from '@mister-guiiug/dev-wpa-config/playwright-base';

// devices est passé à la factory (le paquet n'importe pas @playwright/test).
export default defineConfig(
  definePwaPlaywrightConfig({
    devices,
    port: 5173, // optionnel
    // testMatch: /.*\.spec\.ts$/,    // si convention .spec
    // extraProjects: [...],          // navigateurs additionnels
  })
);
```

Cas simple / legacy — spread de `basePlaywrightOptions` :

```ts
import { defineConfig, devices } from '@playwright/test';
import { basePlaywrightOptions } from '@mister-guiiug/dev-wpa-config/playwright-base';

export default defineConfig({
  ...basePlaywrightOptions,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

### `vitest.config.ts` (coverage)

```ts
import { baseTestOptions, coveragePreset } from '@mister-guiiug/dev-wpa-config/vitest-base';

test: {
  ...baseTestOptions,
  coverage: {
    ...coveragePreset,
    include: ['src/domain/**'],        // scope au domaine critique
    thresholds: { statements: 65, branches: 80, functions: 70, lines: 65 },
  },
}
```

### `vite.config.ts` (SEO + analytics)

```ts
import { pwaSeoPlugin } from '@mister-guiiug/dev-wpa-config/vite-pwa-base';

export default defineConfig({
  plugins: [
    react(),
    pwaSeoPlugin({
      siteName: 'Mister Puzzle',
      basePath: '/mister-puzzle/', // sinon VITE_BASE_PATH
      logoPath: '/logo.svg', // → __SEO_LOGO_URL__ (OG/Twitter/JSON-LD)
      iconQuery: '?v=1.0.1', // → __PWA_ICON_QS__ (cache-busting)
      gtmContainerId: 'GTM-XXXXXXX', // ID explicite (sinon VITE_GTM_CONTAINER_ID)
      llms: '# Mon app\n…', // génère dist/llms.txt
    }),
  ],
});
```

Placeholders remplacés dans `index.html` : `__ANALYTICS_HEAD__` (dans `<head>`),
`__ANALYTICS_BODY__` (début de `<body>`), `__SEO_HOME_URL__`, `__SEO_LOGO_URL__`,
`__PWA_ICON_QS__`. Génère `sitemap.xml` + `robots.txt` (+ `llms.txt` si `llms`).
Variables d'env de build : `VITE_GTM_CONTAINER_ID`, `VITE_GA_MEASUREMENT_ID`,
`VITE_PUBLIC_SITE_ORIGIN`, `VITE_BASE_PATH`. Le plugin est un **sur-ensemble** des
anciens plugins maison (mister-puzzle `vite-plugin-seo.ts`, miss-carbook
`htmlTrackingPlugin()`), désormais factorisés ici.

### Tests a11y (axe-core) — `playwright-a11y`

```ts
// e2e/a11y.spec.ts  (cf. templates/e2e/a11y.spec.ts ; npm i -D @axe-core/playwright)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-wpa-config/playwright-a11y';

test('@a11y accueil sans violation WCAG A/AA', async ({ page }) => {
  await page.goto('/');
  await expectNoA11yViolations(page, AxeBuilder, expect);
});
```

### `package.json` (icônes PWA)

```jsonc
{
  "scripts": {
    "icons": "pwa-icons --source public/favicon.svg --out public --maskable",
  },
}
```

### `commitlint.config.js`

```js
export { default } from '@mister-guiiug/dev-wpa-config/commitlint';
```

### `lint-staged.config.js`

```js
export { default } from '@mister-guiiug/dev-wpa-config/lint-staged';
```

### `src/index.css` (Tailwind 4)

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-wpa-config/tailwind-preset.css';

/* Tokens spécifiques au projet ici */
@theme {
  --color-brand: oklch(...);
}
```

### Helpers React (`@mister-guiiug/dev-wpa-config/react`)

Hooks et composants PWA partagés (auparavant recopiés app par app). Livrés en
**JS + `.d.ts` sans build** (composants en `createElement`) : consommables tels
quels par Vite. Les composants sont **non stylés** — cibler les attributs
`[data-dwc="…"]` dans le CSS du projet.

```tsx
import {
  useLocalStorage,
  useInstallPrompt,
  useTheme,
  PwaInstallPrompt,
  AppFooter,
} from '@mister-guiiug/dev-wpa-config/react';
import { REPO_URL, SPONSOR_URL } from './links';

function Settings() {
  const { theme, setTheme, toggle } = useTheme(); // light | dark | system
  const [name, setName] = useLocalStorage('player', '');
  return (
    <>
      <button onClick={toggle}>Thème : {theme}</button>
      <PwaInstallPrompt className="install-banner" />
      <AppFooter repoUrl={REPO_URL} sponsorUrl={SPONSOR_URL} />
    </>
  );
}
```

`useUpdatePrompt` est **hors barrel** (il importe `virtual:pwa-register/react` de
vite-plugin-pwa) — l'importer par son sous-chemin :

```tsx
import { useUpdatePrompt } from '@mister-guiiug/dev-wpa-config/react/use-update-prompt';

const { visible, update, snooze } = useUpdatePrompt({ snoozeHours: 24 });
if (visible)
  return (
    <div role="status">
      Mise à jour disponible. <button onClick={update}>Recharger</button>
      <button onClick={snooze}>Plus tard</button>
    </div>
  );
```

> En test (jsdom), importer `@mister-guiiug/dev-wpa-config/vitest-setup` depuis
> `src/test/setup.ts` fournit les mocks `virtual:pwa-register` + `matchMedia`.

### Animations Rive (`@mister-guiiug/dev-wpa-config/react/rive`)

Wrapper [Rive](https://rive.app) **lazy** (le runtime ~100 ko + WASM reste hors
du bundle initial), respectant `prefers-reduced-motion` et l'accessibilité.
Standardise les animations interactives de la famille (états vides, mascottes,
micro-interactions) tout en gardant les budgets perf/a11y/Lighthouse.

```bash
npm install @rive-app/react-canvas   # peer OPTIONNELLE
```

```tsx
import { RiveAnimation } from '@mister-guiiug/dev-wpa-config/react/rive';

// Décorative (aria-hidden auto) + repli statique si mouvement réduit.
<RiveAnimation
  src="/animations/empty-state.riv"
  stateMachines="State Machine 1"
  fallback={<img src="/animations/empty-state.svg" alt="" />}
/>;

// Significative : fournir `ariaLabel` (rend role="img" + libellé).
<RiveAnimation src="/animations/trophy.riv" ariaLabel="Victoire !" />;
```

Conventions : `.riv` dans `public/animations/`, toujours prévoir un `fallback`
statique (mouvement réduit + temps de chargement), `ariaLabel` uniquement si
l'animation porte du sens (sinon décorative).

### `src/test/setup.ts` (setup partagé)

```ts
import '@mister-guiiug/dev-wpa-config/vitest-setup';
// puis les mocks spécifiques au projet si besoin…
```

> ⚠️ **Permissions caller obligatoires.** Les reusable workflows héritent des permissions du caller (intersection only — le called ne peut pas en élever). Le bloc `permissions:` doit être déclaré au **niveau du caller**, sinon `pages: write` / `id-token: write` / `packages: read` manqueront et le job échouera en `startup_failure` ou se bloquera sur les actions publish/deploy.

### Reusable workflow CI {#reusable-workflow-ci}

`<projet>/.github/workflows/ci.yml` :

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  packages: read

jobs:
  ci:
    uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-ci.yml@v1
    secrets: inherit
    with:
      run-e2e: false # passer à true quand Playwright est en place
      e2e-grep: '@critical'
```

### Reusable workflow deploy {#reusable-workflow-deploy}

`<projet>/.github/workflows/deploy.yml` :

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write
  packages: read

jobs:
  deploy:
    uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-deploy.yml@v1
    secrets: inherit
    with:
      use-base-path: true
      pre-build-script: '' # ex: 'migrate:db' pour Supabase
```

> ⚠️ **Ne PAS déclarer `concurrency: pages` au niveau du caller.** Le reusable `pwa-deploy.yml` déclare déjà `concurrency: { group: pages, cancel-in-progress: true }`. Le répéter côté caller provoque le message `Canceling since a deadlock was detected for concurrency group: 'pages' between a top level workflow and 'deploy'` et le job ne démarre jamais. Cette règle vaut pour toutes les paires caller / reusable qui partagent un groupe de concurrence (`pages`, `publish`, etc.).

> **Cas avancé** (besoin de migrations Supabase / Firebase rules / variables d'env complexes) : ne pas utiliser le reusable. Reprendre le template `templates/github-workflows/deploy.yml` et personnaliser, en gardant la composite action `setup-pwa` :
>
> ```yaml
> - uses: mister-guiiug/dev-wpa-config/.github/actions/setup-pwa@v1
>   with:
>     github-token: ${{ secrets.GITHUB_TOKEN }}
> ```

### Reusable workflow publish {#reusable-workflow-publish}

`<projet>/.github/workflows/publish.yml` (pour un nouveau paquet npm) :

```yaml
name: Publish
on:
  push:
    tags: ['v*']

permissions:
  contents: read
  packages: write
  id-token: write # requis pour npm --provenance

jobs:
  publish:
    uses: mister-guiiug/dev-wpa-config/.github/workflows/npm-publish.yml@v1
    secrets: inherit
```

## Personnalisation par projet

Chaque projet peut surcharger des options après extension :

- **mister-puzzle** ajoute `verbatimModuleSyntax` + `erasableSyntaxOnly` (TS plus strict sur le code legacy converti) sur **`tsconfig.app` ET `tsconfig.node`**. Depuis le durcissement de `tsconfig-node` (v2.1), les options de linting (`allowImportingTsExtensions`, `moduleDetection: force`, `isolatedModules`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) sont **portées par la base** — l'override projet peut être réduit aux seules `verbatimModuleSyntax`/`erasableSyntaxOnly`.
- **mister-cim10** override `allowJs: true` + `checkJs: false` (le code legacy ICD-10 utilise du JS dans des manipulations DOM ; à durcir progressivement).
- **mister-puzzle** étend `vitest-base.include` pour ajouter `server/**/*.test.ts`.
- **miss-contraction** étend `vitest-base` avec un `exclude: ['**/node_modules/**', '**/e2e/**']` pour éviter que Vitest pioche dans les specs Playwright.

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
   import base from '@mister-guiiug/dev-wpa-config/eslint-react';
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

### TypeScript / Tailwind

- **TypeScript ~6.0.3** : cible famille — `npm i -D typescript@~6.0.3`.
- **Tailwind 4.3.x** : `@tailwindcss/vite@^4.3.0`.

## Publication

À chaque tag `v*` poussé sur GitHub, le workflow [`.github/workflows/publish.yml`](.github/workflows/publish.yml) publie automatiquement la nouvelle version sur `npm.pkg.github.com`.

```bash
# Bumper la version + créer le tag
npm version patch  # ou minor / major
git push --follow-tags
# → workflow publish.yml démarre, le paquet est publié
```

Vérifier la liste des versions publiées : https://github.com/mister-guiiug/dev-wpa-config/packages

## Maintenance

Toute modification de stack famille (bump majeur React, ESLint, etc.) :

1. Mettre à jour la version cible dans ce README + le `package.json` du paquet.
2. Mettre à jour les fichiers de config concernés.
3. Bumper la version (`npm version patch|minor|major`) — le tag est créé automatiquement.
4. `git push --follow-tags` → publication auto sur GitHub Packages.
5. Dans chaque consumer : bumper la dep (`npm install @mister-guiiug/dev-wpa-config@latest`) et tester.
6. Documenter le changement dans le `CHANGELOG.md`.
