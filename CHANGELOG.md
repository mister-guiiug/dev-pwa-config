# Changelog

## 3.6.0

### Minor Changes

- da85dcd: Nouvel export opt-in `./components.css` : habillage prêt à l'emploi des
  composants `/react`.

  Les composants ne posent que des attributs `data-dwc` et restent non stylés — en
  pratique, 11 apps sur 13 ont réécrit à la main les mêmes 12 à 23 sélecteurs, et 7
  ont réimplémenté `EmptyState` plutôt que d'habiller celui du paquet.

  `@import '@mister-guiiug/dev-wpa-config/components.css'` donne une base correcte
  en clair comme en sombre sans aucune configuration (replis via les couleurs
  système CSS `Canvas` / `CanvasText` / `GrayText`, qui suivent `color-scheme`, et
  `light-dark()` pour les quatre tons d'état). Pour passer aux couleurs de l'app,
  brancher le contrat `--dwc-*` : treize variables, une fois.

  Aucune couleur de marque n'est imposée et rien n'est verrouillé : tout est en
  `@layer components`, donc les utilitaires Tailwind et le CSS non « layered » de
  l'app l'emportent. Toutes les commandes respectent la cible tactile de 2,75 rem.

  Additif : aucun changement sur les exports existants.

## 3.5.2

### Patch Changes

- `eslint-react` : les règles jsx-a11y que `recommended` désactive restent désactivées.

  Le passage « toutes les règles a11y en `warn` » de la 3.5.0 mappait **toutes** les
  clés de `jsxA11y.flatConfigs.recommended.rules` vers `warn`, y compris les deux que
  le plugin met délibérément à `off` : `label-has-for` (déprécié au profit de
  `label-has-associated-control`) et `anchor-ambiguous-text`.

  Conséquence chez les consommateurs : `label-has-for` exige `nesting` **ET** `id`, donc
  tout `<label>` enveloppant son champ — motif pourtant parfaitement accessible et
  recommandé — remontait en warning. 12 faux positifs sur mister-qowa à lui seul.

  Les niveaux `off` de `recommended` sont désormais préservés ; les autres règles
  restent en `warn` comme prévu.

## 3.5.1

### Patch Changes

- `tailwind-preset` : breakpoints repassés en **rem** (`40/48/64/80rem`) au lieu de px.

  Les valeurs px (`640/768/1024/1280`) écrasaient les défauts rem de Tailwind 4 : une
  fois le preset importé, `sm:` / `md:` / `lg:` / `xl:` compilaient en
  `@media (width>=640px)` au lieu de `@media (width>=40rem)`, et ne suivaient donc plus
  la taille de police par défaut du navigateur (régression d'accessibilité pour qui
  agrandit sa police). Les nouvelles valeurs sont strictement équivalentes aux
  anciennes quand la racine vaut 16 px — aucun changement visuel dans le cas nominal.

  `tailwind-preset.js` (export informationnel) est réaligné sur le `.css`.

## 3.5.0

### Minor Changes

- 35068c5: `eslint-react` : ajout de `eslint-plugin-jsx-a11y` (config `recommended`), toutes
  les règles ramenées à `warn`.

  Capte les violations d'accessibilité au **lint** (en amont du filet e2e axe-core),
  sans bloquer la CI. Trajectoire d'adoption identique aux règles React Compiler :
  remonter en `error` par app une fois les warnings résorbés (cf. README, section
  « Accessibilité »). Le plugin est déclaré en `dependencies` (bundlé) + peer
  optionnelle, comme `react-hooks`/`react-refresh`.

### Patch Changes

- 36527c2: Fiabilisation du cycle de vie (refs, publication, doc) — aucun changement d'API.
  - **Reusables & templates** : toutes les refs internes `@v1` → `@v3`. Les tags
    majeurs `v1`/`v2` sont gelés (publish.yml n'avance que le major courant), donc
    `firebase-deploy@v1`/`supabase-migrate@v1` servaient du code pré-3.0.0. Nouveau
    garde-fou `test/workflow-refs.test.mjs` : échec CI si une ref interne ne suit
    plus le tag majeur de `package.json`.
  - **publish.yml** : crée désormais une **GitHub Release** par tag (notes = section
    correspondante du `CHANGELOG.md`).
  - **pwa-deploy.yml** : secret `FIREBASE_SERVICE_ACCOUNT_KEY` passé via `env:` (plus
    d'interpolation inline dans `run:`) ; actions Pages `upload-pages-artifact@v5` /
    `deploy-pages@v5`.
  - **renovate.json** : configuration autonome — l'ancien préset partagé
    `github>mister-guiiug/.github//renovate/default.json` pointe sur un dépôt
    inexistant (Renovate était inopérant).
  - **tsconfig-strict-plus** : retrait de `noUncheckedIndexedAccess` redondant (déjà
    porté par la base depuis 3.0.0).
  - **README** : refs `@v3`, flux de release changesets, table des 14 consommateurs,
    exports 3.4.0 documentés (`vite-csp`, `react/i18n`, `tsconfig-strict-plus`,
    `react/observability`, `react/update-prompt-banner`), checklist d'adoption, badges.
  - **templates/.npmrc** : ligne `_authToken=${NODE_AUTH_TOKEN}` (aligne le template
    sur les 14 apps consommatrices).

## 3.4.0

### Minor Changes

- Deux nouveaux exports partagés pour l'alignement famille.
  - `./vite-csp` — `cspPlugin(options)` : plugin Vite qui injecte la
    Content-Security-Policy avec `script-src` par hash SHA-256 des scripts inline
    (plus de `'unsafe-inline'` en production), extrait du motif éprouvé de
    mister-doc. `connect-src`/`img-src`/`style-src`/directives arbitraires
    configurables par app ; normalisation CRLF→LF (hash cohérent sur un build
    Windows) ; remplace un `<meta>` CSP statique existant s'il y en a un. À placer
    après `pwaSeoPlugin`/analytics pour hasher aussi les scripts injectés au build.
  - `./react/i18n` — `createI18n({ messages, locales, fallbackLocale, storageKey })` :
    i18n minimal typé (clés dot-notation dérivées du dictionnaire de messages),
    zéro dépendance runtime, avec `I18nProvider` + `useI18n` (détection de langue,
    persistance localStorage, `document.documentElement.lang`, interpolation
    `{param}`, repli sur la locale de secours). Logique pure exposée via
    `createTranslator` (testable sans React).

## 3.3.1

### Patch Changes

- 5e19130: `react/observability` : `initSentry` ne casse plus le build des apps SANS
  `@sentry/react`. Sous Vite 8 / Rolldown, l'import dynamique littéral de la peer
  optionnelle était résolu AU BUILD → « Rolldown failed to resolve import
  "@sentry/react" » pour tout consommateur du module d'observabilité n'ayant pas
  installé Sentry (découvert sur mister-molkky). L'import de repli devient non
  analysable (spécificateur non littéral + `@vite-ignore`), et une nouvelle option
  `loader: () => import('@sentry/react')` permet aux apps équipées de Sentry de
  fournir un import bundlé normalement.

## 3.3.0

### Minor Changes

- c65173d: `apps-catalog` : ajout de **Mister Doc** (beta) — synchronisation du planning de
  gardes des médecins d'un hôpital (vue mensuelle des créneaux, compteurs week-end
  et heures par médecin). `FamilyApps` l'affiche automatiquement dans la grille des
  apps sœurs. Icône par défaut (`favicon.svg` racine) et URL Pages standard, sans
  surcharge.

## 3.2.1

### Patch Changes

- 3534365: fix(family-apps) : corrige les URLs d'icônes du catalogue (404 sur les vignettes « Nos autres applications »)

  Le défaut `${appUrl}icon-192.png` ne correspondait qu'à 2 apps sur 12 — les
  autres servent leur icône sous un autre nom (`pwa-192.png`, `icons/icon-192.png`,
  `logo.svg`, `icon.svg`, `logo.png`) ou seulement `favicon.svg`. Résultat :
  des `GET … 404` (ex. `miss-carbook/icon-192.png`) et des vignettes en repli
  initiale.
  - Défaut d'icône → `favicon.svg` (racine, présent pour la majorité, SVG net).
  - Nouvelle surcharge `icon: 'chemin/relatif'` jointe à `appUrl` pour les apps
    au nommage différent (genius/uwh `icons/icon-192.png`, contraction `icon.svg`,
    footcoach `logo.svg`, molkky `logo.png`).
  - **mister-cim10** : suppression de la surcharge de casse `mister-CIM10`
    (le site Pages est servi en **minuscules** `mister-cim10` ; l'ancienne URL
    donnait un 404 sur le lien ET l'icône).

  Les 12 URLs d'icônes sont vérifiées 200 en production. Aucune API publique
  changée (le composant `FamilyApps` gère déjà le repli si une icône échoue).

## 3.2.0

### Minor Changes

- `apps-catalog` : ajout de **Miss Supaboss** (alpha) — pilotage multi-comptes
  Supabase Free (pause/restore, quotas Free Plan, préparation de démo guidée).
  `FamilyApps` l'affiche automatiquement dans la grille des apps sœurs.

## 3.1.0

### Minor Changes

- Platform layer partagé (anti écran-blanc, observabilité, résilience réseau) + variante TS strict-plus.

  **Nouveaux exports `/react`** (JS + `.d.ts`, sans build) :
  - `ErrorBoundary` — anti écran-blanc, `fallback` render-prop, `onError` (reporting), `onReset`, `onDownloadBackup` (sauvegarde locale).
  - `useOnline`, `retryableQuery` (`/react/net`, backoff exponentiel), `useOfflineMutationQueue` (file persistante rejouée au retour online), `SyncStatusBadge`.
  - `EmptyState` (état vide + CTA), `ErrorBanner` (erreur récupérable + Réessayer).
  - `@mister-guiiug/dev-wpa-config/react/observability` — `installErrorReporter` (ring-buffer localStorage + `setForwarder`), `recordError`, `initSentry({ dsn })` no-op si pas de dsn (lazy `@sentry/react`).
  - `@mister-guiiug/dev-wpa-config/react/update-prompt-banner` — `UpdatePromptBanner` prêt à l'emploi (hors barrel, couplé vite-plugin-pwa).

  **Nouveau `@mister-guiiug/dev-wpa-config/tsconfig-strict-plus`** (opt-in) : `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `exactOptionalPropertyTypes`.

  Tests : `test/platform.test.mjs` (helpers purs + smoke-render des composants).

## 3.0.0

Release majeure : durcissement TypeScript (breaking côté consumer), sécurité CI,
corrections de hooks/plugins et nouvelles capacités. Regroupée par lots.

### ⚠️ Breaking (lot C — durcissement TypeScript)

- `tsconfig-app` / `tsconfig-node` : ajout de **`verbatimModuleSyntax: true`** et
  **`noUncheckedIndexedAccess: true`**. Plus sûr (force `import type`, rend les
  accès indexés `T | undefined`) mais **fait apparaître de nouvelles erreurs**
  dans les apps au bump.
  - `verbatimModuleSyntax` : préfixer en `import type` les imports de types.
    mister-puzzle le déclarait déjà localement → l'override projet peut être
    retiré.
  - `noUncheckedIndexedAccess` : garder/valider les accès `arr[i]` / `record[k]`.
    Migration progressive possible en remettant `"noUncheckedIndexedAccess": false`
    dans le `tsconfig.app.json` du projet le temps d'adapter.
- `engines.node` : **`>=20` → `>=22`** (aligné sur `.nvmrc` et la CI ; le paquet
  n'était jamais testé sous Node 20).
- `eslint-base` : `languageOptions.globals` inclut désormais **`globals.node`** en
  plus de `globals.browser` (la base sert aussi aux scripts Node). Additif —
  supprime des faux positifs `process`/`Buffer`.

### Added (lot B — capacités)

- **`useMediaQuery` / `useReducedMotion` / `usePrefersDark`** (export `/react`) —
  brique partagée (SSR-safe) ; `rive` la réutilise (dédup).
- **Playwright `preview`** : `definePwaPlaywrightConfig({ preview: true })` teste
  un build de prod (`build` + `preview`) au lieu du dev server → service worker,
  minification et cache réels (le comportement PWA qu'on veut valider).
- **`vitest-setup` enrichi** : stubs `ResizeObserver`, `IntersectionObserver`,
  `scrollTo`, `crypto.randomUUID` (installés seulement si absents).
- **`vitest-base` `DEFAULT_SETUP_FILE`** exporté : composer `setupFiles` sans
  écraser celui de la base.
- **`useLocalStorage` sync intra-onglet** : plusieurs instances de la même clé
  dans le même onglet restent synchronisées (le `storage` event ne notifie que
  les autres onglets) ; `initialValue` figé en ref (un défaut inline ne réabonne
  plus les effets).
- **Anti-désync lockfile** : `templates/.npmrc` documenté + job CI
  `verify-lockfile` (reusable `pwa-ci.yml`, input `verify-lockfile`, défaut true)
  qui détecte en PR un `package-lock.json` désynchronisé (ex. bindings natifs
  optionnels Vite 8 / Rolldown / oxc omis hors Linux) avec un message clair.

### Fixed (lot A — corrections)

- `vite-pwa-base` : `closeBundle` n'écrit `sitemap.xml`/`robots.txt`/`llms.txt`
  qu'en **mode build**, **crée le dossier de sortie** (`mkdirSync` — évite ENOENT)
  et respecte un **`build.outDir` personnalisé** (lu via `configResolved`).
- `playwright-base` : `snapshotPathTemplate` inclut **`{projectName}`** — sans lui,
  les 5 navigateurs écrasaient le même snapshot (diffs visuels faux).
- `react/use-theme` : la valeur stockée est **validée** (`light|dark|system`) —
  une valeur corrompue ne se propage plus dans `colorScheme`/`data-theme`.
- `react/use-install-prompt` : garde SSR sur l'effet, `promptInstall` ne propage
  plus de rejet non géré (respecte `Promise<… | null>`), et suit le passage en
  mode standalone (`display-mode`) en plus de `appinstalled`.
- `react/rive` : résolution de l'export lazy en **`mod.Rive ?? mod.default`**
  (`Rive` est l'export nommé du paquet).
- `react/pwa-install-prompt` : `role="dialog"` → **`role="region"`** (bannière
  passive non modale — ne promet plus à tort un piège de focus).
- `eslint-react` **étend `eslint-base`** au lieu de dupliquer ignores /
  `no-unused-vars` / override e2e (plus de risque de dérive).

### Security (lot A — CI/CD)

- Reusables `pwa-ci` / `pwa-deploy` / `pwa-lighthouse` : l'input `build-env`
  (et `pre-build-script`) est passé via `env:` (plus jamais interpolé dans le
  corps du script) — supprime un vecteur d'**injection shell** ; `build-env` est
  validé ligne par ligne (`KEY=VALUE`).
- **`persist-credentials: false`** sur tous les `checkout` sauf le push de tag de
  `publish.yml` (le token n'est plus persisté sur disque pendant les builds).
- Actions tierces **épinglées au SHA** : `treosh/lighthouse-ci-action` (v12),
  `supabase/setup-cli` (v1.7.1) — Renovate met à jour les pins.
- Action `firebase-deploy` : **service account** (`service-account-key`) en plus
  du `token` (déprécié par Google), et **firebase-tools épinglé** via `npx`
  (plus d'install globale non reproductible). `project-id`/inputs passés via env:.
- `prettier` épinglé côté devDependency + formatage normalisé (reproductibilité).

## 2.2.0

### Minor Changes

- Catalogue famille + composant `FamilyApps` (cross-promotion entre apps).
  - Nouveau sous-export `@mister-guiiug/dev-wpa-config/apps-catalog` (données pures,
    sans React) : `FAMILY_APPS` (id, nom, description, `repoUrl`, `appUrl`,
    `iconUrl`, **`maturity`** obligatoire parmi `alpha | beta | stable`), helpers
    `otherApps`, `repoUrl`, `pagesUrl`, et constantes `GITHUB_OWNER` / `SPONSOR_URL`.
    Source unique de la liste des apps de la famille.
  - Nouveau composant `FamilyApps` (export `/react`, non stylé, attributs
    `[data-dwc="…"]`) : met en avant le code source (GitHub), le sponsor (Buy Me a
    Coffee) et la grille des autres applications de la famille avec leur badge de
    maturité (l'app courante est exclue). Props `currentAppId`, `apps`, `repoUrl`,
    `sponsorUrl`, `showSource`, `showSponsor`, `labels` (i18n), `className`.
  - Refactor interne : icônes SVG (GitHub, café, lien externe) extraites dans
    `react/icons.js`, réutilisées par `AppFooter` et `FamilyApps` (rendu d'`AppFooter`
    inchangé).

## 2.1.2

### Patch Changes

- `vitest-setup` : polyfill `localStorage`/`sessionStorage` en mémoire installé
  seulement si l'environnement n'expose pas de Storage fonctionnel. Sous Vitest 4
  - jsdom, `localStorage` peut exister sans `getItem`/`setItem` opérationnels, ce
    qui casse les tests de persistance (`localStorage.getItem is not a function`).
    No-op quand jsdom fournit déjà un Storage correct. Corrige les suites de
    persistance des apps (ex. miss-uwh syncQueue/sync, miss-carbook assistantStorage).

## 2.1.1

### Patch Changes

- `vitest-setup` : ajout d'un `vitest-setup.d.ts` qui réexporte l'augmentation de
  types jest-dom (`declare module 'vitest'`). Sans lui, les apps qui importent
  `@mister-guiiug/dev-wpa-config/vitest-setup` depuis `src/test/setup.ts` perdaient
  les matchers typés (`toBeInTheDocument`, `toHaveTextContent`, …) au `tsc` (le
  `.js` sans types n'était pas suivi). Requiert `@testing-library/jest-dom` côté
  consommateur (déjà peer optionnelle).

## 2.1.0

### Minor Changes

- Helpers React partagés, durcissement des configs et outillage sécurité/SEO/Rive.

  **Nouveau sous-export `@mister-guiiug/dev-wpa-config/react`** (hooks + composants
  PWA, sans étape de build) :
  - `useLocalStorage` — état persistant typé, sync inter-onglets, tolérant au mode privé.
  - `useInstallPrompt` — capture `beforeinstallprompt`, détection standalone.
  - `useTheme` — thème `light|dark|system`, persistant, suit le système.
  - `PwaInstallPrompt` — bandeau d'installation A2HS (non stylé, cibler `[data-dwc]`).
  - `AppFooter` — lien code source (GitHub SVG inline) + sponsor (café), liens externes sécurisés.
  - `useUpdatePrompt` (sous-chemin dédié `…/react/use-update-prompt`, couplé vite-plugin-pwa) — MAJ du service worker, variante snooze.
  - `RiveAnimation` (sous-chemin `…/react/rive`) — wrapper Rive **lazy**, a11y et `prefers-reduced-motion`. Peer optionnelle `@rive-app/react-canvas`.

  **Setup Vitest partagé** `@mister-guiiug/dev-wpa-config/vitest-setup` — jest-dom +
  stub `matchMedia` + mocks `virtual:pwa-register` (à importer depuis `src/test/setup.ts`).

  **Durcissement des configs** (impacte toutes les apps, sans changement applicatif) :
  - `tsconfig-node` aligné sur `tsconfig-app` (`noUnusedLocals`, `noUnusedParameters`,
    `noFallthroughCasesInSwitch`, `moduleDetection: force`, `allowImportingTsExtensions`,
    `isolatedModules`) — mister-puzzle n'a plus besoin de les redéclarer.
  - `vitest-base` : reporters de couverture `lcov` + `json-summary` (upload Codecov en CI) ;
    nouvel export `recommendedThresholds`.
  - `lint-staged` : type-check pré-commit `tsc -b --noEmit`.

  **SEO — `pwaSeoPlugin()` étendu en sur-ensemble** (remplace les plugins maison
  de mister-puzzle `vite-plugin-seo.ts` et miss-carbook `htmlTrackingPlugin()`) :
  nouvelles options `robots`, `basePath`, `logoPath`/`iconQuery` (→ `__SEO_LOGO_URL__`
  / `__PWA_ICON_QS__`), `llms` (génère `llms.txt`), `gtmContainerId`/`gaMeasurementId`
  (IDs explicites, fallback env), `extraReplacements`. `resolveSeoPublicUrls` accepte
  désormais un objet `{ basePath, logoPath, iconQuery }` (rétro-compatible string).

  **Accessibilité — `@mister-guiiug/dev-wpa-config/playwright-a11y`** : helpers
  `analyzeA11y` / `expectNoA11yViolations` / `formatViolations` (axe-core via
  `AxeBuilder` injecté, peer optionnelle `@axe-core/playwright`) +
  `templates/e2e/a11y.spec.ts`.

  **Sécurité** :
  - `pwa-ci.yml` : inputs `run-npm-audit` (opt-in) + `npm-audit-level`.
  - `templates/index.html` : template avec CSP de référence (offline-first +
    variantes Supabase/Firebase/GA4), script anti-FOUC aligné `useTheme`, et
    placeholders SEO/analytics de `pwaSeoPlugin()`.

  Nouvelle peer-dependency **optionnelle** : `@axe-core/playwright`.

  Nouvelles peer-dependencies **optionnelles** : `react`, `@testing-library/jest-dom`,
  `@rive-app/react-canvas`.

## 2.0.0

### Major Changes

- Passe les peer-dependencies de la toolchain sur les nouvelles majeures (breaking) :
  - `vite` ajouté en peer optionnel `^8.0.0`
  - `vitest` et `@vitest/browser` → `^4.0.0` (fin du support Vitest 3)
  - `typescript` → `~6.0.3`
  - `zod` → `^4.0.0` (fin du support Zod 3)

  Les bases Vitest/Vite n'utilisent aucune option supprimée par ces majeures ; les `vite.config.ts`
  existants (forme fonction de `manualChunks`, `build.rollupOptions`) restent fonctionnels sous
  Rolldown. Voir la section migration du README pour les détails Vite 8 / Vitest 4 / Zod 4.

Historique des versions de `@mister-guiiug/dev-wpa-config`.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnement [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

## [1.6.0] - 2026-06-04

### Added

- **Anti-pause Supabase Free** :
  - Reusable `pwa-supabase-keepalive.yml` — `SELECT` REST (anon key) sur une table
    `keep_alive` tous les ~3 j → empêche la pause des projets Free (inactivité 7 j).
  - Template SQL `templates/supabase/keep-alive.sql` (table + policy anon).
  - Template caller `templates/github-workflows/supabase-keepalive.yml`
    (cron planifié, `secrets: inherit`).
  - Section README dédiée (mise en place par projet).

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
  - helpers `pwaProjects(devices)` / `pwaReporters()`. Centralise la matrice 5
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
- **Override ESLint `e2e/**`** intégré dans `eslint-base`et`eslint-react`
(`no-explicit-any`+`no-unused-vars` off sur les specs) — était dupliqué dans
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
