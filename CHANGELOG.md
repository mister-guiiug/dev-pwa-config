# Changelog

Historique des versions de `@mister-guiiug/dev-wpa-config`.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnement [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

## [1.5.0] - 2026-06-03

### Added

- **Workflow `cleanup-runs`** : nettoyage manuel (`workflow_dispatch`) de
  l'historique GitHub Actions — ne conserve que les **N runs les plus récents
  par workflow** (défaut 3), option `dry-run`. Disponible en
  [template](./templates/github-workflows/cleanup-runs.yml) **et** actif dans ce
  dépôt (dogfood).
- **`pwa-ci.yml`** : input **`build-env`** (variables `KEY=VALUE` injectées avant
  build/test, pour les apps dont le build exige des `VITE_*` — Firebase/Supabase)
  et input **`server-dir`** (install + `tsc --noEmit` d'un backend annexe). Permet
  enfin à `mister-puzzle` & co. d'utiliser la CI réutilisable au lieu d'une CI
  custom.
- **`pwa-lighthouse.yml`** : input **`build-env`** (idem) → Lighthouse activable
  sur les apps à secrets.
- **`pwa-deploy.yml`** : input **`build-env`** + **déploiement Firebase optionnel**
  (`firebase-project`, `firebase-only`, secret `FIREBASE_SERVICE_ACCOUNT_KEY`)
  avec auth correcte — évite à chaque app Firebase de réécrire (et mal
  authentifier) son job de déploiement.
- **Auto-tests du paquet** : scripts `test` (node:test — exports/files/parité
  `.d.ts`↔`.js`/chargement), `format:check`/`format` (dogfood `prettier-base`),
  `validate` ; champ `engines.node >= 20` ; jobs `format:check` + `test` ajoutés
  à `ci.yml`.
- **Changesets** câblé (`.changeset/config.json` + scripts `changeset` /
  `version-packages`) pour automatiser bump + CHANGELOG.

### Changed

- **`publish.yml`** fait désormais **avancer automatiquement le tag majeur mobile
  `v1`** vers chaque release stable. Corrige le fait que `v1` était figé sur la
  v1.3.2 : tous les consommateurs en `...@v1` recevaient des workflows périmés.
- **`scripts/migrate-consumers.mjs`** réécrit en **codemod générique** :
  auto-découverte des consommateurs (plus de liste codée en dur), bump vers une
  version cible **et alignement des peers déclarés** (lucide-react, vitest…),
  modes `--write` / `--install`.
- Dépôt **formaté avec sa propre config Prettier** (dogfood).

### Docs

- `npm-publish.yml` : périmètre clarifié (paquets publiables uniquement, pas les
  apps).

## [1.4.0] - 2026-06-02

### Added

- **`lucide-react`** comme **bibliothèque d'icônes standard** de la famille
  React : ajout en `peerDependencies` (optionnelle) + règle documentée dans le
  README (« Icônes — `lucide-react` »). Iconographie fonctionnelle (nav, boutons,
  tendances) en SVG tree-shakés ; emoji réservé au contenu utilisateur et aux
  illustrations mascotte. Premier consommateur : `miss-genius`.
- **Règle « Liens app — code source + sponsor »** : chaque app expose un lien
  vers son **code source** (GitHub) et un lien **sponsor** (Buy Me a Coffee,
  handle famille `mister.guiiug`). Documentée dans le README (pattern
  `src/links.ts` + footer, `target="_blank" rel="noopener noreferrer"`, marque
  GitHub en SVG inline car lucide 1.x n'a plus d'icônes de marque). Template
  `templates/FUNDING.yml` ajouté pour le bouton « Sponsor » du dépôt. Premier
  consommateur : `miss-genius`.

### Changed

- **Template `.lighthouserc.json`** : passage à des assertions **catégorielles
  uniquement** (perf/a11y/bp/seo) au lieu du preset `lighthouse:recommended`.
  Ce dernier assertait chaque audit individuel (dont des insights binaires et
  flaky comme `forced-reflow-insight`), provoquant des faux négatifs en CI.
  Seuls les scores de catégories restent des gates. (Templates non publiés npm —
  pas de bump de version ; à recopier côté consommateurs.)

## [1.3.2] - 2026-05-31

### Changed

- **ESLint `no-unused-vars`** (base + react) : ajout de
  `argsIgnorePattern` / `varsIgnorePattern` / `caughtErrorsIgnorePattern: '^_'`.
  Le préfixe `_` marque un binding intentionnellement inutilisé (convention
  standard, alignée sur TypeScript `noUnusedLocals`/`noUnusedParameters`).
  Évite les divergences eslint↔tsc rencontrées dans les consommateurs
  (ex. `_id` dans mister-footcoach, `_tokenId` dans miss-ticket-pwa).

## [1.3.1] - 2026-05-30

### Fixed

- **peerDep `sharp`** élargie de `^0.33.0` à `>=0.33.0`. La plage `^0.33.0`
  refusait `sharp@0.34.x` (présent côté consommateurs, ex. miss-badminton) et
  provoquait un `ERESOLVE` à l'install, alors que `sharp` n'est qu'un peer
  optionnel utilisé par le bin `pwa-icons` (API resize/png/composite stable).

## [1.3.0] - 2026-05-30

Cette version remonte dans le paquet des patterns qui étaient dupliqués (ou
contournés) dans les consommateurs, après audit de la famille `miss-*` / `mister-*`.

### Added

- **Factory Playwright** (`playwright-base`) : `definePwaPlaywrightConfig({ devices })`
  + helpers `pwaProjects(devices)` / `pwaReporters()`. Centralise la matrice 5
  navigateurs, les reporters multi-format, le `snapshotPathTemplate`, `reducedMotion`
  et le `webServer` que les 7 projets réécrivaient à l'identique (~50 lignes chacun).
  `basePlaywrightOptions` reste exporté (rétro-compat).
- **Bin `pwa-icons`** : générateur d'icônes PWA partagé (`scripts/generate-pwa-icons.mjs`),
  remplace les `generate-*-icons.{mjs,ts}` dupliqués. Options `--source`, `--out`,
  `--sizes`, `--maskable`, `--bg`, `--prefix`. `sharp` ajouté en peerDep optionnelle.
- **Export `vite-pwa-base`** : `pwaSeoPlugin()` (injection GTM/GA4 + sitemap.xml/robots.txt)
  et helpers `parseGtmContainerId` / `parseGaMeasurementId` / `buildAnalyticsHtmlFragments` /
  `resolveSeoPublicUrls`. Généralise `puzzle/vite-plugin-seo.ts` et `carbook` htmlTrackingPlugin.
- **Preset coverage Vitest** : `coveragePreset` (provider v8 + reporters + exclude) dans
  `vitest-base`. Thresholds laissés au projet.
- **Reusable workflow `pwa-lighthouse.yml`** + template `templates/.lighthouserc.json` :
  Lighthouse CI (build base-path `/` puis LHCI). Remplace les workflows inline dupliqués
  (badminton, molkky).
- **Composite actions** pour les déploiements custom récurrents :
  `.github/actions/supabase-migrate` (link + db push) et `.github/actions/firebase-deploy`
  (deploy rules/indexes).
- **Override ESLint `e2e/**`** intégré dans `eslint-base` et `eslint-react`
  (`no-explicit-any` + `no-unused-vars` off sur les specs) — était dupliqué dans
  badminton / contraction / molkky.
- **Tailwind preset** enrichi : typographie/spacing fluides (`--text-fluid-*`,
  `--spacing-fluid-*`) + utilitaires `*-safe` / `*-safe-3` (safe-areas) + `touch-target`,
  pour rendre `tailwind-preset.css` réellement adoptable (0 adoption jusqu'ici).
- **`@commitlint/cli`** ajouté en peerDep optionnelle.

### Changed

- **CI du paquet** : nouveau job `consumer-resolution` qui fait `npm pack` + installe
  le tarball dans un projet jetable et vérifie que **chaque subpath résout via `exports`**
  (`tsconfig extends` + imports JS + assets CSS/JSON). Comble le trou qui avait laissé
  passer la résolution intermittente de `./tsconfig-app-react` en CI (molkky avait dû
  ré-inliner ses tsconfig/vitest). Le job `validate` ne testait que le parsing in-repo.
- **Actions GitHub** bumpées `checkout`/`setup-node` `@v4` → `@v5` (runtime Node 24)
  dans tous les workflows et la composite action. Supprime la nécessité du workaround
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` côté consommateurs (badminton, molkky).

### Migration guide

- **Playwright** : remplacer le bloc `{ ...basePlaywrightOptions, ... }` réécrit par
  `export default defineConfig(definePwaPlaywrightConfig({ devices }))`.
- **Icônes** : remplacer le script local par `"icons": "pwa-icons --source <svg> --maskable"`
  (installer `sharp` en devDep si absent).
- **Node 24** : retirer `env: { FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true' }` des `ci.yml`
  une fois le tag `v1` republié.
- **molkky** : une fois ce paquet publié et le job `consumer-resolution` vert, re-basculer
  `tsconfig.app.json` / `tsconfig.node.json` / `vitest.config.ts` sur les `extends`/imports
  partagés et supprimer le contenu inliné.

## [1.2.0] - 2026-05-07

### Added

- **Vitest Browser Mode** : nouvel export `@mister-guiiug/dev-wpa-config/vitest-browser-base` (`baseBrowserTestOptions`). Tests dans un vrai navigateur via Playwright provider. Convention de nommage `*.browser.test.{ts,tsx}` pour cohabiter avec les tests jsdom (`*.test.{ts,tsx}`). Opt-in : nécessite `@vitest/browser` + `playwright` côté consumer.
- **peerDependencies étendues** : `zod ^3 || ^4` (les deux supportés), `@vitest/browser ^3.2.4`, `playwright ^1.49.0` (optionnels).

### Changed

- **React Compiler rules** dans `eslint-react.js` : passage de `'off'` à `'warn'`. Les 6 règles (`set-state-in-effect`, `purity`, `immutability`, `preserve-manual-memoization`, `refs`, `static-components`) sont désormais visibles en lint mais ne bloquent pas la CI. Mode strict opt-in via override local en `'error'` (exemple dans le commentaire d'en-tête).

### Migration guide

- **React Compiler** : aucune action requise — les règles passent en `warn`. Pour adopter le compiler côté Vite, ajouter `babel-plugin-react-compiler` au `vite.config.ts` puis basculer les règles ESLint en `error` localement.
- **Zod 3 → 4** : breaking changes côté API (`.parse` strict par défaut, `.errors[]` → `.issues[]`, etc.). Procédure recommandée :
  1. `npm install zod@^4`
  2. `npx zod-codemod` (si publié) ou recherche manuelle de `.errors`, `.parse({})`, `.format()`.
  3. Lancer `npm run type-check && npm run test`.
  4. Voir le [migration guide officiel](https://zod.dev/v4/migration).
- **Vitest Browser Mode** : opt-in. Pour activer sur un projet :
  ```bash
  npm install -D @vitest/browser playwright
  npx playwright install chromium
  ```
  Puis créer `vitest.config.ts` avec `baseBrowserTestOptions` ou un fichier dédié `vitest.browser.config.ts` pour cohabiter avec jsdom.

### Documentation

- README : ajout d'un avertissement explicite sur l'obligation de déclarer les `permissions:` au niveau caller des reusable workflows (intersection only — le called ne peut pas élever celles du caller). Sans ça, les jobs deploy/publish échouent en `startup_failure`. Tous les exemples README incluent désormais le bloc `permissions:` requis.
- README : section "Migration guide" pour Zod 3→4, React Compiler opt-in strict, Vitest Browser Mode.

## [1.1.0] - 2026-05-07

### Added

- **Reusable workflows** GitHub Actions :
  - `.github/workflows/pwa-ci.yml` — CI standard (format · lint · type · test · build, + E2E optionnel)
  - `.github/workflows/pwa-deploy.yml` — déploiement GitHub Pages
  - `.github/workflows/npm-publish.yml` — publication npm avec provenance
- **Composite action** `.github/actions/setup-pwa/action.yml` — checkout + Node 22 + scope `@mister-guiiug` + `npm ci`
- **Configs partagées** :
  - `commitlint-base.js` (`@mister-guiiug/dev-wpa-config/commitlint`)
  - `lint-staged-base.js` (`@mister-guiiug/dev-wpa-config/lint-staged`)
  - `playwright-base.js` + `.d.ts` (`basePlaywrightOptions`)
  - `tailwind-preset.js` + `tailwind-preset.css` (design tokens famille)
- **Templates** :
  - `templates/husky/{pre-commit,commit-msg}` + README
  - `templates/changesets/config.json` + README
  - `templates/.editorconfig` + `templates/.nvmrc`
- **Script** `scripts/apply-rulesets.mjs` — applique le ruleset "main protection" via `gh api` sur tous les repos
- **OIDC + provenance** activés dans `publish.yml` (`id-token: write`, `npm publish --provenance`)

### Changed

- `package.json` : exports + files étendus, peerDeps optionnelles ajoutées (commitlint, playwright, tailwindcss).

## [1.0.1] - 2026-05-07

### Fixed

- Le scope npm est désormais `@mister-guiiug` (avec tiret) pour correspondre au compte GitHub. La v1.0.0 ne pouvait pas être publiée sur GitHub Packages à cause d'un mismatch de scope.

## [1.0.0] - 2026-05-07

### Initial

- ESLint base + React (flat config) avec ECMA 2025
- Prettier (singleQuote, tabWidth 2, printWidth 80, trailingComma 'es5', arrowParens 'avoid')
- tsconfig-app + tsconfig-app-react + tsconfig-node (cible ES2025 strict)
- Vitest base (`baseTestOptions` : jsdom + globals + setupFiles + passWithNoTests)
- Templates VSCode (extensions, settings, tasks, launch)
- Templates GitHub Actions (ci, deploy)

[Unreleased]: https://github.com/mister-guiiug/dev-wpa-config/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.2.0
[1.1.0]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.1.0
[1.0.1]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.0.1
[1.0.0]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.0.0
