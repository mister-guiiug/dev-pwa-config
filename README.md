# @mister-guiiug/dev-wpa-config

[![CI](https://github.com/mister-guiiug/dev-wpa-config/actions/workflows/ci.yml/badge.svg)](https://github.com/mister-guiiug/dev-wpa-config/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

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
| [`miss-lookhouse`](../miss-lookhouse/)     | React + Supabase (opt-in, local-first)      | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, `lucide-react`                                                                      |
| [`miss-supaboss`](../miss-supaboss/)       | React + backend Node + Supabase             | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, playwright-base, `lucide-react`                                                     |
| [`miss-uwh`](../miss-uwh/)                 | React + localStorage                        | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base (coverage)                                                                           |
| [`miss-ticket-pwa`](../miss-ticket-pwa/)   | React + Firebase                            | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, `lucide-react`                                                                      |
| [`mister-cim10`](../mister-cim10/)         | React                                       | eslint-react, prettier, tsconfig-app-react (avec overrides `allowJs`/`strict: false`), tsconfig-node, vitest-base                                           |
| [`mister-doc`](../mister-doc/)             | React + Supabase (planning gardes)          | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base (coverage)                                                                           |
| [`mister-footcoach`](../mister-footcoach/) | React + Supabase                            | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, `lucide-react`                                                                      |
| [`mister-molkky`](../mister-molkky/)       | React + localStorage (sync Supabase opt-in) | eslint-react, prettier, tsconfig-app-react, tsconfig-node, vitest-base, `lucide-react`                                                                      |
| [`mister-puzzle`](../mister-puzzle/)       | React + Firebase                            | eslint-react, prettier, tsconfig-app-react (avec overrides `verbatimModuleSyntax`, `erasableSyntaxOnly`), tsconfig-node (idem), vitest-base, `lucide-react` |

## Showroom du design system

`showroom/` est une page **statique** (HTML + CSS + JS, aucune dépendance,
aucun build, aucune requête réseau) qui présente ce que le paquet partage
réellement :

- les tokens du preset — typographie et espacements fluides, points de rupture,
  safe-areas iOS, cible tactile — avec leurs valeurs **calculées en direct**
  (redimensionner la fenêtre fait jouer les `clamp()`) ;
- le DOM exact de chaque composant `/react` et les sélecteurs
  `[data-dwc="…"]` correspondants ;
- un **sélecteur de thème** qui rhabille toute la page avec l'univers visuel de
  chaque application consommatrice, plus le contrat clair / sombre / système du
  hook `useTheme`.

```bash
npm run showroom
```

→ <http://127.0.0.1:5220>. Le fichier `showroom/index.html` s'ouvre aussi
directement dans un navigateur (double-clic), sans serveur.

Le preset n'expose **aucune couleur** : c'est la part variable, propriété de
chaque app. Le thème « Générique » du showroom est donc volontairement
monochrome ; les palettes des applications sont relevées dans `showroom/themes.js`.

> Sans compilateur Tailwind, une page statique ne peut pas interpréter `@theme`
> ni `@utility` : `showroom/preset.css` rejoue donc le preset en CSS natif.
> `test/showroom.test.mjs` compare les deux fichiers token par token — une
> modification du preset non répercutée fait échouer la CI, pas le navigateur.

## Stack cible (juin 2026)

Les configs imposent / supposent les versions suivantes côté projet consommateur :

```
Node ≥22 (engines + .nvmrc + CI)
TypeScript ~6.0.3 strict + verbatimModuleSyntax + noUncheckedIndexedAccess, cible ES2025 + lib ES2025
ESLint 9 (flat config) + typescript-eslint 8.58
eslint-plugin-react-hooks 7.0 (configs.flat.recommended) + eslint-plugin-react-refresh 0.5
Vite 8 (Rolldown) + Vitest 4 (jsdom + globals + setupFiles)
Zod 4 (peer)
Prettier 3.6 (singleQuote, tabWidth 2, printWidth 80, trailingComma es5, arrowParens 'avoid')
Tailwind 4 (@tailwindcss/vite) + lucide-react (icônes — standard famille)
```

> **3.0.0 (breaking)** — `tsconfig-app`/`tsconfig-node` activent
> **`verbatimModuleSyntax`** et **`noUncheckedIndexedAccess`** (de nouvelles
> erreurs TS peuvent apparaître au bump — cf. [migration 3.0.0](#tsconfig-30-verbatimmodulesyntax--nouncheckedindexedaccess)),
> et `engines.node` passe à **`>=22`**.

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

3. **Entre apps (cross-promotion)** — le sous-export `apps-catalog` est la
   **source unique** de la famille (id, nom, description, URL, maturité), et le
   composant `FamilyApps` (`/react`) met en avant, depuis n'importe quelle app,
   son code source + sponsor **et la grille des autres applications avec leur
   badge de maturité** (l'app courante est exclue). Cf. [Catalogue famille &
   `FamilyApps`](#catalogue-famille--familyapps).

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
    "@mister-guiiug/dev-wpa-config": "^3.0.0",
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

## Checklist — nouveau projet consommateur

1. **`.npmrc`** (copier [`templates/.npmrc`](./templates/.npmrc)) + **`.nvmrc`** (`22`).
2. **Dépendance** : `npm i -D @mister-guiiug/dev-wpa-config@^3` + les peers utilisés
   (cf. `peerDependencies` du [`package.json`](./package.json) : `eslint`, `@eslint/js`,
   `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`,
   `globals`, `prettier`, `typescript`, `vite`, `vitest`, `react`, `tailwindcss`…).
3. **Re-exports** (une ligne chacun, cf. [Utilisation](#utilisation)) : `eslint.config.js`,
   `prettier.config.js`, `commitlint.config.js`, `lint-staged.config.js`.
4. **TypeScript** : `tsconfig.app.json` + `tsconfig.node.json` en `extends`.
5. **Tests** : `vitest.config.ts` (`baseTestOptions`) + `src/test/setup.ts`
   (`import '@mister-guiiug/dev-wpa-config/vitest-setup'`).
6. **CI/CD** (`secrets: inherit` + `permissions` au niveau caller) : `ci.yml` →
   `pwa-ci.yml@v3`, `deploy.yml` → `pwa-deploy.yml@v3`, `lighthouse.yml` →
   `pwa-lighthouse.yml@v3`.
7. **PWA/SEO** : `index.html` depuis [`templates/index.html`](./templates/index.html) +
   `pwaSeoPlugin` + `cspPlugin` dans `vite.config.ts`.
8. **Famille** : `<FamilyApps>` (écran Réglages/À propos) + `.github/FUNDING.yml`.

## Exports npm

| Sous-chemin                                                | Type            | Description                                                                                                                                                                                           |
| ---------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mister-guiiug/dev-wpa-config/eslint-base`                | `.js`           | Config ESLint pour projets vanilla TS / Node (sans React)                                                                                                                                             |
| `@mister-guiiug/dev-wpa-config/eslint-react`               | `.js`           | Étend la base avec `react-hooks` + `react-refresh` + `jsx-a11y` (règles React Compiler & a11y en `warn`)                                                                                              |
| `@mister-guiiug/dev-wpa-config/prettier`                   | `.js`           | Config Prettier 3.6                                                                                                                                                                                   |
| `@mister-guiiug/dev-wpa-config/commitlint`                 | `.js`           | Config commitlint (Conventional Commits)                                                                                                                                                              |
| `@mister-guiiug/dev-wpa-config/lint-staged`                | `.js`           | Config lint-staged (eslint --fix + prettier --write)                                                                                                                                                  |
| `@mister-guiiug/dev-wpa-config/tsconfig-app`               | `.json`         | Base app : ES2025 strict, `moduleResolution: bundler`, `noUncheckedSideEffectImports`, `types: ["vite/client"]`                                                                                       |
| `@mister-guiiug/dev-wpa-config/tsconfig-app-react`         | `.json`         | Étend `tsconfig-app` avec `jsx: react-jsx`, `jsxImportSource: react`, `vite-plugin-pwa/client`                                                                                                        |
| `@mister-guiiug/dev-wpa-config/tsconfig-node`              | `.json`         | tsconfig pour `vite.config.ts`, `vitest.config.ts`, `scripts/*.mjs` (`types: ["node"]`)                                                                                                               |
| `@mister-guiiug/dev-wpa-config/tsconfig-strict-plus`       | `.json`         | Durcissement TS **opt-in** : `noPropertyAccessFromIndexSignature` + `noImplicitOverride` + `exactOptionalPropertyTypes` (par-dessus la base stricte)                                                  |
| `@mister-guiiug/dev-wpa-config/vitest-base`                | `.js` + `.d.ts` | `baseTestOptions` (jsdom + globals + setupFiles + passWithNoTests) + `coveragePreset` (reporters `lcov`/`json-summary`) + `recommendedThresholds`                                                     |
| `@mister-guiiug/dev-wpa-config/vitest-setup`               | `.js`           | Setup Vitest partagé (jest-dom + stub `matchMedia` + mocks `virtual:pwa-register`) — à importer depuis `src/test/setup.ts`                                                                            |
| `@mister-guiiug/dev-wpa-config/apps-catalog`               | `.js` + `.d.ts` | Catalogue unique de la famille (`FAMILY_APPS`, `otherApps`, `SPONSOR_URL`, helpers `repoUrl`/`pagesUrl`) — **données pures, sans React**                                                              |
| `@mister-guiiug/dev-wpa-config/react`                      | `.js` + `.d.ts` | Hooks & composants PWA : `useLocalStorage`, `useInstallPrompt`, `useTheme`, `useMediaQuery`/`useReducedMotion`/`usePrefersDark`, `PwaInstallPrompt`, `AppFooter`, `FamilyApps` (peer `react`)         |
| `@mister-guiiug/dev-wpa-config/react/use-update-prompt`    | `.js` + `.d.ts` | `useUpdatePrompt` (MAJ service worker + snooze) — couplé à vite-plugin-pwa, hors barrel                                                                                                               |
| `@mister-guiiug/dev-wpa-config/react/rive`                 | `.js` + `.d.ts` | `RiveAnimation` — wrapper Rive lazy, a11y, `prefers-reduced-motion` (peer optionnelle `@rive-app/react-canvas`)                                                                                       |
| `@mister-guiiug/dev-wpa-config/react/i18n`                 | `.js` + `.d.ts` | `createI18n` : i18n minimal typé (clés dot-notation dérivées des messages), `I18nProvider`/`useI18n`, zéro dépendance runtime                                                                         |
| `@mister-guiiug/dev-wpa-config/react/observability`        | `.js` + `.d.ts` | `installErrorReporter`/`recordError`/`initSentry` (peer optionnelle `@sentry/react`, `loader` pour bundler l'import) — hors barrel                                                                    |
| `@mister-guiiug/dev-wpa-config/react/update-prompt-banner` | `.js` + `.d.ts` | `UpdatePromptBanner` : bannière MAJ service worker prête à l'emploi (couplée `useUpdatePrompt`)                                                                                                       |
| `@mister-guiiug/dev-wpa-config/vitest-browser-base`        | `.js` + `.d.ts` | `baseBrowserTestOptions` (Browser Mode Playwright pour `*.browser.test.{ts,tsx}`)                                                                                                                     |
| `@mister-guiiug/dev-wpa-config/playwright-base`            | `.js` + `.d.ts` | `definePwaPlaywrightConfig({ devices })` (factory : 5 navigateurs, reporters multi-format, snapshots/plateforme, webServer) + helpers `pwaProjects`/`pwaReporters` + `basePlaywrightOptions` (legacy) |
| `@mister-guiiug/dev-wpa-config/playwright-a11y`            | `.js` + `.d.ts` | `expectNoA11yViolations` / `analyzeA11y` / `formatViolations` (axe-core via `AxeBuilder` injecté ; peer optionnelle `@axe-core/playwright`)                                                           |
| `@mister-guiiug/dev-wpa-config/vite-pwa-base`              | `.js` + `.d.ts` | `pwaSeoPlugin()` (injection GTM/GA4 + sitemap.xml/robots.txt) + helpers analytics                                                                                                                     |
| `@mister-guiiug/dev-wpa-config/vite-csp`                   | `.js` + `.d.ts` | `cspPlugin` : injecte la CSP avec `script-src` par hash SHA-256 des scripts inline (pas de `'unsafe-inline'` en prod)                                                                                 |
| `@mister-guiiug/dev-wpa-config/tailwind-preset`            | `.js`           | Design tokens famille (fonts, safe-areas, breakpoints)                                                                                                                                                |
| `@mister-guiiug/dev-wpa-config/tailwind-preset.css`        | `.css`          | Preset CSS Tailwind 4 : `@theme` (typo/spacing fluides) + utilitaires `*-safe` / `touch-target`                                                                                                       |

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
| `pwa-lighthouse.yml` | Build + Lighthouse CI (perf/a11y/bp/seo) sur PR               | `uses: …/pwa-lighthouse.yml@v3` (requiert `.lighthouserc.json`, cf. template) |

## Composite actions

| Action                                                             | Rôle                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mister-guiiug/dev-wpa-config/.github/actions/setup-pwa@v3`        | Setup Node 22 + scope `@mister-guiiug` + `npm ci` (auth GitHub Packages)                                                                                    |
| `mister-guiiug/dev-wpa-config/.github/actions/supabase-migrate@v3` | Setup CLI Supabase + `link` + `db push` (déploiements custom)                                                                                               |
| `mister-guiiug/dev-wpa-config/.github/actions/firebase-deploy@v3`  | `firebase deploy` ciblé (rules database/firestore, indexes) — auth `service-account-key` (recommandé) ou `token` (déprécié), firebase-tools épinglé via npx |

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
| [`templates/.npmrc`](./templates/.npmrc)                                           | `<projet>/.npmrc`                       | Aucune (registre scope + `include=optional` — bindings natifs Vite 8)                       |
| [`templates/FUNDING.yml`](./templates/FUNDING.yml)                                 | `<projet>/.github/FUNDING.yml`          | Aucune (handle sponsor famille `mister.guiiug`)                                             |
| [`templates/.lighthouserc.json`](./templates/.lighthouserc.json)                   | `<projet>/.lighthouserc.json`           | Ajuster les seuils (`minScore`) par catégorie                                               |
| [`templates/e2e/a11y.spec.ts`](./templates/e2e/a11y.spec.ts)                       | `<projet>/e2e/a11y.spec.ts`             | Adapter les routes/zones ; `npm i -D @axe-core/playwright`                                  |
| [`templates/changesets/config.json`](./templates/changesets/config.json)           | `<projet>/.changeset/config.json`       | Adapter `access` (restricted vs public)                                                     |

## Nettoyage de l'historique Actions

[`templates/github-workflows/cleanup-runs.yml`](./templates/github-workflows/cleanup-runs.yml) —
workflow **manuel** (`workflow_dispatch`) qui ne conserve que les **N runs les
plus récents par workflow** (défaut `3`, option `dry-run`). Copier dans
`<projet>/.github/workflows/cleanup-runs.yml` ; requiert `permissions: actions: write`.

## Inputs notables des reusables

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
    // preview: true,                 // teste un BUILD de prod (build + preview)
    //                                // → service worker, minification, cache réels
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

Ce que l'import apporte exactement (et ce qu'il n'apporte pas) est visible dans
le [showroom](#showroom-du-design-system) : `npm run showroom`.

### Habillage des composants (`components.css`, opt-in)

Les composants `/react` ne posent que des attributs `data-dwc` : non stylés, par
construction. En pratique, **11 apps sur 13 ont fini par réécrire à la main les
mêmes 12 à 23 sélecteurs**, et **7 ont réimplémenté `EmptyState`** plutôt que
d'habiller celui du paquet. `components.css` ferme cet écart :

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-wpa-config/tailwind-preset.css';
@import '@mister-guiiug/dev-wpa-config/components.css'; /* ← opt-in */
```

Ce seul import donne déjà un rendu correct **en clair et en sombre**, sans
configuration : les replis passent par les couleurs système CSS (`Canvas`,
`CanvasText`, `GrayText`), qui suivent `color-scheme`. Pour passer aux couleurs
de l'app, brancher le contrat — treize lignes, une fois :

```css
:root {
  --dwc-surface: var(--uwh-surface);
  --dwc-surface-2: var(--uwh-surface-2);
  --dwc-text: var(--uwh-text);
  --dwc-text-soft: var(--uwh-text-soft);
  --dwc-border: var(--uwh-border);
  --dwc-primary: var(--color-primary);
  --dwc-primary-contrast: #fff;
  --dwc-primary-soft: var(--color-primary-soft);
  --dwc-success: var(--uwh-credit);
  --dwc-warning: var(--uwh-warn);
  --dwc-danger: var(--uwh-debit);
  --dwc-radius: var(--radius-card);
  --dwc-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}
```

Les variables peuvent être définies n'importe où (`:root`, `@theme`,
`[data-theme='dark']`, `.dark`…) : la résolution passe par l'héritage, pas par
les couches.

**Rien n'est verrouillé.** Tout est en `@layer components`, la couche Tailwind
prévue pour ça : les utilitaires (`bg-primary`, `rounded-none`…) et tout CSS non
« layered » de l'app l'emportent. On garde la base, on la teinte, ou on écrase
au sélecteur près.

Trois promesses sont tenues par `test/components-css.test.mjs`, pas par la
bonne volonté : tout est confiné dans `@layer components`, chaque
`var(--dwc-*)` porte un repli, et la liste des variables lues ne dérive pas du
contrat documenté. Un quatrième test impose la **cible tactile de 2,75 rem** à
toutes les commandes — c'est le principal intérêt d'une base partagée, une
taille `sm` locale finissant toujours par passer sous le seuil.

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

### Primitives d'interface

Ces six composants n'ont pas été inventés : ils ont été **extraits** de ce que
plusieurs apps avaient déjà réécrit chacune de leur côté. L'API reprend leur
convergence ; la version partagée referme les trous d'accessibilité que chaque
copie laissait passer.

| Composant                                     | Réécrit dans                                                      | Ce que la version partagée garantit en plus                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                      | 4 apps, mêmes variantes `primary \| secondary \| ghost \| danger` | cible tactile 2,75 rem **à toutes les tailles**, `aria-busy` + désactivation pendant `loading` (anti double-clic), `type="button"` par défaut |
| `TextField` / `SelectField` / `TextAreaField` | 3 apps (deux fichiers identiques à la variable près)              | `aria-describedby` référence l'aide **et** l'erreur, au lieu de faire disparaître l'aide                                                      |
| `Skeleton` / `SkeletonGroup`                  | 3 apps                                                            | barres `aria-hidden`, `role="status"` + `aria-busy` porté par le conteneur seul                                                               |
| `Sheet`                                       | 4 apps, ~20 écrans consommateurs                                  | piège de focus, focus **restitué** à la fermeture, scroll de fond restauré, safe-area iOS                                                     |
| `Stat`                                        | tableaux de bord de 10 apps                                       | `<dl>/<dt>/<dd>` relie le libellé à la valeur ; la tendance a une flèche **et** un libellé lu                                                 |
| `Badge`                                       | 4 apps, couleurs ad hoc                                           | axe `tone` sémantique (`brand \| success \| warning \| danger \| info \| muted`) × `variant` (`soft \| outline`)                              |

```tsx
import {
  Button,
  TextField,
  Sheet,
  Stat,
  Badge,
  SkeletonGroup,
} from '@mister-guiiug/dev-wpa-config/react';

<Button variant="danger" size="sm" loading={saving}>
  Supprimer
</Button>;
<TextField label="Email" hint="nom@domaine" error={errors.email} />;
<Badge tone="success" variant="soft">
  Payé
</Badge>;
<Stat
  label="Adhérents"
  value={128}
  delta="+12"
  trend="up"
  trendLabel="en hausse"
/>;
<SkeletonGroup label="Chargement des scores" lines={4} />;
<Sheet open={open} title="Ajouter une dépense" onClose={close}>
  …
</Sheet>;
```

Non stylés par défaut, comme les autres : importer
[`components.css`](#habillage-des-composants-componentscss-opt-in) pour une base
prête à l'emploi, ou cibler `[data-dwc="button"][data-variant][data-size]` &
consorts.

### Catalogue famille & `FamilyApps`

`apps-catalog` est la **source unique** des applications de la famille (id, nom,
description, `repoUrl`, `appUrl`, `iconUrl`, **`maturity`** saisie à la main parmi
`alpha | beta | stable`). C'est de la **donnée pure** : importable depuis une app,
un script ou un test Node, sans dépendre de React.

```ts
import {
  FAMILY_APPS,
  otherApps,
  SPONSOR_URL,
} from '@mister-guiiug/dev-wpa-config/apps-catalog';
```

Le composant `FamilyApps` (non stylé, attributs `[data-dwc="…"]`) met en avant,
depuis une app, son **code source** (GitHub), le **sponsor** (Buy Me a Coffee) et
la **grille des autres applications** avec leur badge de maturité (l'app courante
est automatiquement exclue) :

```tsx
import { FamilyApps } from '@mister-guiiug/dev-wpa-config/react';
import { REPO_URL } from './links';

// Carte source + sponsor + grille des autres apps :
<FamilyApps currentAppId="miss-dice" repoUrl={REPO_URL} />;

// Grille seule (si la page affiche déjà source/sponsor par ailleurs) :
<FamilyApps currentAppId="miss-dice" showSource={false} showSponsor={false} />;
```

Sélecteurs CSS à styliser côté app : `[data-dwc="family-apps"]`, `family-links`,
`family-source`, `family-sponsor`, `family-app-list`, `family-app`, et le badge
`[data-dwc="maturity"][data-maturity="alpha|beta|stable"]` (3 couleurs).

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
    uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-ci.yml@v3
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
    uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-deploy.yml@v3
    secrets: inherit
    with:
      use-base-path: true
      pre-build-script: '' # ex: 'migrate:db' pour Supabase
```

> ⚠️ **Ne PAS déclarer `concurrency: pages` au niveau du caller.** Le reusable `pwa-deploy.yml` déclare déjà `concurrency: { group: pages, cancel-in-progress: true }`. Le répéter côté caller provoque le message `Canceling since a deadlock was detected for concurrency group: 'pages' between a top level workflow and 'deploy'` et le job ne démarre jamais. Cette règle vaut pour toutes les paires caller / reusable qui partagent un groupe de concurrence (`pages`, `publish`, etc.).

> **Cas avancé** (besoin de migrations Supabase / Firebase rules / variables d'env complexes) : ne pas utiliser le reusable. Reprendre le template `templates/github-workflows/deploy.yml` et personnaliser, en gardant la composite action `setup-pwa` :
>
> ```yaml
> - uses: mister-guiiug/dev-wpa-config/.github/actions/setup-pwa@v3
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
    uses: mister-guiiug/dev-wpa-config/.github/workflows/npm-publish.yml@v3
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

### Accessibilité (`jsx-a11y` en `warn` depuis 3.5.0)

`eslint-react` inclut `eslint-plugin-jsx-a11y` (config `recommended`) avec **toutes
les règles ramenées à `warn`** : les violations d'accessibilité sont visibles au
lint sans bloquer la CI, en complément du filet e2e axe-core. Trajectoire
d'adoption identique aux règles React Compiler — passer en `error` par app une fois
les warnings résorbés :

```js
// eslint.config.js
import base from '@mister-guiiug/dev-wpa-config/eslint-react';
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
  "extends": "@mister-guiiug/dev-wpa-config/tsconfig-app-react",
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

## Publication (changesets)

Le versioning suit [changesets](https://github.com/changesets/changesets). Flux type :

```bash
# 1. Décrire le changement (crée .changeset/*.md ; choisir patch | minor | major)
npm run changeset

# 2. Appliquer : bump package.json + met à jour CHANGELOG.md + consomme les changesets
npm run version-packages

# 3. Committer, taguer, pousser → publish.yml publie
git commit -am "chore: version packages"
git tag "v$(node -p "require('./package.json').version")"
git push --follow-tags
```

À chaque tag `v*` poussé, [`publish.yml`](.github/workflows/publish.yml) publie sur
`npm.pkg.github.com` avec `--provenance`, avance le tag majeur mobile (`v3`) et crée
la **GitHub Release** (notes = section correspondante du `CHANGELOG.md`). Versions
publiées : https://github.com/mister-guiiug/dev-wpa-config/packages

## Maintenance

Toute modification de stack famille (bump majeur React, ESLint, etc.) :

1. Mettre à jour les fichiers de config concernés + la « Stack cible » de ce README.
2. `npm run changeset` (choisir patch/minor/major selon l'impact consommateur).
3. `npm run version-packages`, committer, taguer, pousser (cf. ci-dessus) → publication auto.
4. Aligner les consommateurs : `node scripts/migrate-consumers.mjs <version> --write`
   (dry-run par défaut sans `--write`), puis tester chaque app.
