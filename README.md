# @mister-guiiug/dev-wpa-config

Configurations partagées (ESLint, Prettier, TypeScript, Vitest) pour les
projets PWA de la famille `miss-*` et `mister-*`.

> **Distribué via [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)** sur le registre `npm.pkg.github.com`.

## Projets consommateurs

| Projet | Type | Configs utilisées |
|---|---|---|
| [`miss-carbook`](../miss-carbook/) | React + Supabase | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base |
| [`miss-contraction`](../miss-contraction/) | React + localStorage | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base |
| [`mister-cim10`](../mister-cim10/) | React | eslint-react, prettier, tsconfig-app-react (avec overrides `allowJs`/`strict: false`), tsconfig-node, vitest-base |
| [`mister-puzzle`](../mister-puzzle/) | React + Firebase | eslint-react, prettier, tsconfig-app-react (avec overrides `verbatimModuleSyntax`, `erasableSyntaxOnly`), tsconfig-node (idem), vitest-base |

## Stack cible (mai 2026)

Les configs imposent / supposent les versions suivantes côté projet consommateur :

```
TypeScript ~6.0.2 strict, cible ES2025 + lib ES2025
ESLint 9 (flat config) + typescript-eslint 8.58
eslint-plugin-react-hooks 7.0 (configs.flat.recommended) + eslint-plugin-react-refresh 0.5
Vitest 3 (jsdom + globals + setupFiles)
Prettier 3.6 (singleQuote, tabWidth 2, printWidth 80, trailingComma es5, arrowParens 'avoid')
```

## Installation (GitHub Packages)

### Étape 1 — `.npmrc` à la racine du projet consommateur

```ini
@mister-guiiug:registry=https://npm.pkg.github.com
```

### Étape 2 — Dépendance dans `package.json`

```jsonc
{
  "devDependencies": {
    "@mister-guiiug/dev-wpa-config": "^1.0.0"
  }
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

| Sous-chemin | Type | Description |
|---|---|---|
| `@mister-guiiug/dev-wpa-config/eslint-base` | `.js` | Config ESLint pour projets vanilla TS / Node (sans React) |
| `@mister-guiiug/dev-wpa-config/eslint-react` | `.js` | Étend la base avec `react-hooks` flat + `react-refresh` (rules React Compiler désactivées) |
| `@mister-guiiug/dev-wpa-config/prettier` | `.js` | Config Prettier 3.6 |
| `@mister-guiiug/dev-wpa-config/commitlint` | `.js` | Config commitlint (Conventional Commits) |
| `@mister-guiiug/dev-wpa-config/lint-staged` | `.js` | Config lint-staged (eslint --fix + prettier --write) |
| `@mister-guiiug/dev-wpa-config/tsconfig-app` | `.json` | Base app : ES2025 strict, `moduleResolution: bundler`, `noUncheckedSideEffectImports`, `types: ["vite/client"]` |
| `@mister-guiiug/dev-wpa-config/tsconfig-app-react` | `.json` | Étend `tsconfig-app` avec `jsx: react-jsx`, `jsxImportSource: react`, `vite-plugin-pwa/client` |
| `@mister-guiiug/dev-wpa-config/tsconfig-node` | `.json` | tsconfig pour `vite.config.ts`, `vitest.config.ts`, `scripts/*.mjs` (`types: ["node"]`) |
| `@mister-guiiug/dev-wpa-config/vitest-base` | `.js` + `.d.ts` | `baseTestOptions` (jsdom + globals + setupFiles + passWithNoTests) |
| `@mister-guiiug/dev-wpa-config/playwright-base` | `.js` + `.d.ts` | `basePlaywrightOptions` (testDir, retries CI, traces, screenshots) |
| `@mister-guiiug/dev-wpa-config/tailwind-preset` | `.js` | Design tokens famille (fonts, safe-areas, breakpoints) |
| `@mister-guiiug/dev-wpa-config/tailwind-preset.css` | `.css` | Preset CSS Tailwind 4 (`@theme` + `@layer base`) |

## Reusable workflows GitHub Actions

Hébergés dans [`.github/workflows/`](.github/workflows/) — utilisables par tous les repos de la famille.

| Workflow | Rôle | Exemple d'appel |
|---|---|---|
| `pwa-ci.yml` | Format · Lint · Type · Test · Build (+ E2E optionnel) | voir [Utilisation](#reusable-workflow-ci) |
| `pwa-deploy.yml` | Build + déploiement GitHub Pages (avec `VITE_BASE_PATH` auto) | voir [Utilisation](#reusable-workflow-deploy) |
| `npm-publish.yml` | Publication npm sur GitHub Packages avec `--provenance` | voir [Utilisation](#reusable-workflow-publish) |

## Composite action

| Action | Rôle |
|---|---|
| `mister-guiiug/dev-wpa-config/.github/actions/setup-pwa@v1` | Setup Node 22 + scope `@mister-guiiug` + `npm ci` (auth GitHub Packages) |

## Templates non-importables (à copier-coller)

Le dossier [`templates/`](./templates/) contient des fichiers que les outils (VSCode, husky, etc.) ne savent pas importer depuis un paquet npm. Ils servent de **référence** au démarrage d'un nouveau projet — copier dans le projet puis ajuster.

| Template | Cible projet | Personnalisation typique |
|---|---|---|
| [`templates/vscode/extensions.json`](./templates/vscode/extensions.json) | `<projet>/.vscode/extensions.json` | Aucune (à dupliquer tel quel) |
| [`templates/vscode/settings.json`](./templates/vscode/settings.json) | `<projet>/.vscode/settings.json` | Aucune |
| [`templates/vscode/tasks.json`](./templates/vscode/tasks.json) | `<projet>/.vscode/tasks.json` | Ajouter les tasks `test:e2e:critical`, `test:e2e:a11y` etc. selon les scripts du projet |
| [`templates/vscode/launch.json`](./templates/vscode/launch.json) | `<projet>/.vscode/launch.json` | Adapter `url` au base path (`/mister-puzzle/`, etc.) et `sourceMapPathOverrides` |
| [`templates/github-workflows/ci.yml`](./templates/github-workflows/ci.yml) | `<projet>/.github/workflows/ci.yml` | **Préférer le reusable `pwa-ci.yml`** (template déprécié, conservé pour cas hors-stack) |
| [`templates/github-workflows/deploy.yml`](./templates/github-workflows/deploy.yml) | `<projet>/.github/workflows/deploy.yml` | **Préférer le reusable `pwa-deploy.yml`** (template déprécié, conservé pour cas hors-stack) |
| [`templates/husky/pre-commit`](./templates/husky/pre-commit) | `<projet>/.husky/pre-commit` | Aucune |
| [`templates/husky/commit-msg`](./templates/husky/commit-msg) | `<projet>/.husky/commit-msg` | Aucune |
| [`templates/.editorconfig`](./templates/.editorconfig) | `<projet>/.editorconfig` | Aucune |
| [`templates/.nvmrc`](./templates/.nvmrc) | `<projet>/.nvmrc` | Aucune |
| [`templates/changesets/config.json`](./templates/changesets/config.json) | `<projet>/.changeset/config.json` | Adapter `access` (restricted vs public) |

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
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo"
  },
  "include": ["vite.config.ts", "vitest.config.ts", "scripts/**/*.mjs"]
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

### `playwright.config.ts`

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
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
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

- **mister-puzzle** ajoute `verbatimModuleSyntax` + `erasableSyntaxOnly` (TS plus strict sur le code legacy converti).
- **mister-cim10** override `allowJs: true` + `strict: false` temporairement (le code legacy ICD-10 utilise encore quelques `any` dans des manipulations DOM ; à durcir progressivement).
- **mister-puzzle** étend `vitest-base.include` pour ajouter `server/**/*.test.ts`.

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
