# Changelog

Historique des versions de `@mister-guiiug/dev-wpa-config`.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnement [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

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
