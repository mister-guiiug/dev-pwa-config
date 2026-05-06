# @misterguiiug/dev-wpa-config

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
@misterguiiug:registry=https://npm.pkg.github.com
```

### Étape 2 — Dépendance dans `package.json`

```jsonc
{
  "devDependencies": {
    "@misterguiiug/dev-wpa-config": "^1.0.0"
  }
}
```

### Étape 3 — Authentification

Le paquet est publié sur le registre **GitHub Packages**, qui exige une authentification (même pour les paquets publics).

#### En local (machine de développement)

Créer un [Personal Access Token](https://github.com/settings/tokens/new) avec **`read:packages`** uniquement, puis :

```bash
# Option 1 : npm login
npm login --scope=@misterguiiug --auth-type=legacy --registry=https://npm.pkg.github.com
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
    scope: '@misterguiiug'

- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Exports

| Sous-chemin | Type | Description |
|---|---|---|
| `@misterguiiug/dev-wpa-config/eslint-base` | `.js` | Config ESLint pour projets vanilla TS / Node (sans React) |
| `@misterguiiug/dev-wpa-config/eslint-react` | `.js` | Étend la base avec `react-hooks` flat + `react-refresh` (rules React Compiler désactivées) |
| `@misterguiiug/dev-wpa-config/prettier` | `.js` | Config Prettier 3.6 |
| `@misterguiiug/dev-wpa-config/tsconfig-app` | `.json` | Base app : ES2025 strict, `moduleResolution: bundler`, `noUncheckedSideEffectImports`, `types: ["vite/client"]` |
| `@misterguiiug/dev-wpa-config/tsconfig-app-react` | `.json` | Étend `tsconfig-app` avec `jsx: react-jsx`, `jsxImportSource: react`, `vite-plugin-pwa/client` |
| `@misterguiiug/dev-wpa-config/tsconfig-node` | `.json` | tsconfig pour `vite.config.ts`, `vitest.config.ts`, `scripts/*.mjs` (`types: ["node"]`) |
| `@misterguiiug/dev-wpa-config/vitest-base` | `.js` + `.d.ts` | `baseTestOptions` (jsdom + globals + setupFiles + passWithNoTests) |

## Templates non-importables (à copier-coller)

Le dossier [`templates/`](./templates/) contient des fichiers que les outils (VSCode, GitHub Actions) ne savent pas importer depuis un paquet npm. Ils servent de **référence** au démarrage d'un nouveau projet de la famille — copier dans le projet puis ajuster.

| Template | Cible projet | Personnalisation typique |
|---|---|---|
| [`templates/vscode/extensions.json`](./templates/vscode/extensions.json) | `<projet>/.vscode/extensions.json` | Aucune (à dupliquer tel quel) |
| [`templates/vscode/settings.json`](./templates/vscode/settings.json) | `<projet>/.vscode/settings.json` | Aucune |
| [`templates/vscode/tasks.json`](./templates/vscode/tasks.json) | `<projet>/.vscode/tasks.json` | Ajouter les tasks `test:e2e:critical`, `test:e2e:a11y` etc. selon les scripts du projet |
| [`templates/vscode/launch.json`](./templates/vscode/launch.json) | `<projet>/.vscode/launch.json` | Adapter `url` au base path (`/mister-puzzle/`, etc.) et `sourceMapPathOverrides` |
| [`templates/github-workflows/ci.yml`](./templates/github-workflows/ci.yml) | `<projet>/.github/workflows/ci.yml` | Activer `e2e-critical: if: true`, ajouter secrets/env du build, ajuster les branches |
| [`templates/github-workflows/deploy.yml`](./templates/github-workflows/deploy.yml) | `<projet>/.github/workflows/deploy.yml` | Ajouter migrations backend (Supabase `db push`, Firebase `database deploy`), configurer les `VITE_*` via secrets |

## Utilisation

### `eslint.config.js`

```js
// Projet React
export { default } from '@misterguiiug/dev-wpa-config/eslint-react';

// Projet non-React
export { default } from '@misterguiiug/dev-wpa-config/eslint-base';
```

### `prettier.config.js`

```js
export { default } from '@misterguiiug/dev-wpa-config/prettier';
```

### `tsconfig.app.json`

```jsonc
// Projet React
{
  "extends": "@misterguiiug/dev-wpa-config/tsconfig-app-react",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  },
  "include": ["src"]
}

// Projet non-React
{
  "extends": "@misterguiiug/dev-wpa-config/tsconfig-app",
  "include": ["src"]
}
```

### `tsconfig.node.json`

```jsonc
{
  "extends": "@misterguiiug/dev-wpa-config/tsconfig-node",
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
import { baseTestOptions } from '@misterguiiug/dev-wpa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: baseTestOptions,
});
```

Le projet doit créer `src/test/setup.ts` (chargé par `setupFiles`). Contenu type :

```ts
import '@testing-library/jest-dom/vitest';
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
5. Dans chaque consumer : bumper la dep (`npm install @misterguiiug/dev-wpa-config@latest`) et tester.
6. Documenter le changement dans le `CHANGELOG.md`.
