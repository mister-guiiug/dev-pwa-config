# @mister-guiiug/dev-pwa-config

[![CI](https://github.com/mister-guiiug/dev-pwa-config/actions/workflows/ci.yml/badge.svg)](https://github.com/mister-guiiug/dev-pwa-config/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

Configurations partagées (ESLint, Prettier, TypeScript, Vitest) pour les
projets PWA de la famille `miss-*` et `mister-*`.

> **Distribué via [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)** sur le registre `npm.pkg.github.com`.

## Projets consommateurs

Tableau **engendré** depuis `apps-catalog.js` (`npm run sync`) : la colonne
« Sous-chemins consommés » est un RELEVÉ — les `import` et les `extends` trouvés
dans le code de chaque dépôt —, pas une intention. Deux choses s'y lisent tout
de suite : `components.css` est repris par **dix-sept dépôts sur dix-neuf**, et
vingt et un sous-chemins n'ont qu'un seul adoptant — dont dix pour le seul
`mister-family-map`.

⚠️ **Ce tableau compte des sous-chemins, pas des composants.** Une app qui
importe `FamilyApps` depuis le baril `react` n'y fait pas apparaître
`react/family-apps` : ce sous-chemin semble donc n'avoir qu'un adoptant, alors
que quinze applications affichent le composant. Pour l'adoption d'un export,
c'est le relevé par symbole du
[showroom](#showroom-du-design-system) qui répond.

<!-- CONSOMMATEURS:DÉBUT — engendré par `npm run sync` depuis apps-catalog.js -->

| Projet                                                                    | Persistance              | Sous-chemins consommés                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`miss-carbook`](https://github.com/mister-guiiug/miss-carbook)           | Supabase                 | `components.css`, `eslint-react`, `image`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/confirm-dialog`, `react/empty-state`, `react/i18n`, `react/observability`, `react/sheet`, `react/toast`, `react/update-prompt-banner`, `react/use-online`, `react/use-update-prompt`, `realtime`, `realtime/supabase`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `web-vitals` — **26**                                                                                                                                                |
| [`miss-contraction`](https://github.com/mister-guiiug/miss-contraction)   | Local-first              | `download`, `eslint-react`, `lint-staged`, `pdf`, `playwright-base`, `prettier`, `react`, `react/observability`, `react/use-wake-lock`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `web-vitals` — **16**                                                                                                                                                                                                                                                                                                                                                           |
| [`miss-genius`](https://github.com/mister-guiiug/miss-genius)             | Local-first              | `apps-catalog`, `components.css`, `download`, `eslint-react`, `format`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/app-footer`, `react/bottom-nav`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/field`, `react/i18n`, `react/observability`, `react/sheet`, `react/update-prompt-banner`, `react/use-update-prompt`, `sw-update`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `versioned-store`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **30**                                                                                  |
| [`miss-uwh`](https://github.com/mister-guiiug/miss-uwh)                   | Supabase                 | `apps-catalog`, `components.css`, `download`, `eslint-react`, `format`, `ical`, `lint-staged`, `playwright-a11y`, `prettier`, `react`, `react/app-footer`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/field`, `react/i18n`, `react/labels`, `react/observability`, `react/sheet`, `react/toast`, `react/update-prompt-banner`, `storage`, `supabase-client`, `sw-update`, `sync-queue`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `versioned-store`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `xlsx` — **34**                                                         |
| [`mister-cim10`](https://github.com/mister-guiiug/mister-cim10)           | Local-first              | `components.css`, `csv`, `download`, `eslint-react`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/bottom-nav`, `react/confirm-dialog`, `react/i18n`, `react/labels`, `react/observability`, `react/theme-toggle`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **21**                                                                                                                                                                                                                                                           |
| [`mister-footcoach`](https://github.com/mister-guiiug/mister-footcoach)   | Supabase                 | `apps-catalog`, `components.css`, `download`, `eslint-react`, `ical`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/badge`, `react/bottom-nav`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/i18n`, `react/icons-context`, `react/icons-lucide`, `react/observability`, `react/sheet`, `react/toast`, `react/update-prompt-banner`, `react/use-update-prompt`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **30**                                                                            |
| [`mister-puzzle`](https://github.com/mister-guiiug/mister-puzzle)         | Firebase                 | `components.css`, `eslint-react`, `image`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/confirm-dialog`, `react/observability`, `react/update-prompt-banner`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `web-vitals` — **19**                                                                                                                                                                                                                                                                                     |
| [`miss-ticket-pwa`](https://github.com/mister-guiiug/miss-ticket-pwa)     | Firebase                 | `apps-catalog`, `components.css`, `eslint-react`, `lint-staged`, `pairing`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/i18n`, `react/icons-lucide`, `react/observability`, `react/use-online`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **19**                                                                                                                                                                                                                                                                                                      |
| [`mister-doc`](https://github.com/mister-guiiug/mister-doc)               | Supabase                 | `components.css`, `eslint-react`, `lint-staged`, `pdf`, `prettier`, `push`, `react`, `react/bottom-nav`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/field`, `react/i18n`, `react/icons-context`, `react/icons-lucide`, `react/labels`, `react/observability`, `react/sheet`, `react/skeleton`, `react/theme-provider`, `react/toast`, `react/update-prompt-banner`, `react/use-update-prompt`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `xlsx` — **30**                                                                                 |
| [`miss-lookhouse`](https://github.com/mister-guiiug/miss-lookhouse)       | Supabase                 | `apps-catalog`, `components.css`, `eslint-react`, `format`, `geo`, `prettier`, `react/app-footer`, `react/badge`, `react/bottom-nav`, `react/icons-context`, `react/sparkline`, `react/theme-provider`, `react/theme-toggle`, `storage`, `supabase-client`, `sync-queue`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vitest-base`, `vitest-setup` — **21**                                                                                                                                                                                                                                                        |
| [`miss-badminton`](https://github.com/mister-guiiug/miss-badminton)       | Local-first              | `apps-catalog`, `components.css`, `download`, `eslint-react`, `idb`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/confirm-dialog`, `react/observability`, `react/sheet`, `react/sparkline`, `react/use-online`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **22**                                                                                                                                                                                                                                                 |
| [`miss-dice`](https://github.com/mister-guiiug/miss-dice)                 | Local-first              | `apps-catalog`, `commitlint`, `download`, `eslint-react`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/observability`, `react/use-wake-lock`, `share`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **16**                                                                                                                                                                                                                                                                                                                                                                        |
| [`miss-supaboss`](https://github.com/mister-guiiug/miss-supaboss)         | API tierce               | `apps-catalog`, `commitlint`, `components.css`, `eslint-react`, `format`, `lint-staged`, `playwright-base`, `prettier`, `react`, `react/badge`, `react/bottom-nav`, `react/confirm-dialog`, `react/empty-state`, `react/error-boundary`, `react/i18n`, `react/icons-context`, `react/observability`, `react/skeleton`, `react/toast`, `react/update-prompt-banner`, `react/use-online`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vitest-base`, `vitest-setup` — **27**                                                                                                                              |
| [`miss-supatool`](https://github.com/mister-guiiug/miss-supatool)         | API tierce               | `components.css`, `download`, `eslint-react`, `format`, `prettier`, `react/app-header`, `react/badge`, `react/bottom-nav`, `react/button`, `react/card`, `react/confirm-dialog`, `react/empty-state`, `react/family-apps`, `react/field`, `react/observability`, `react/page-container`, `react/segmented-control`, `react/stat`, `react/theme-provider`, `react/theme-toggle`, `react/toast`, `react/update-prompt-banner`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **29**                                                                        |
| [`mister-molkky`](https://github.com/mister-guiiug/mister-molkky)         | Supabase                 | `apps-catalog`, `components.css`, `download`, `eslint-react`, `lint-staged`, `pairing`, `playwright-a11y`, `playwright-base`, `prettier`, `qr`, `react`, `react/confirm-dialog`, `react/icons-context`, `react/icons-lucide`, `react/labels`, `react/observability`, `react/sheet`, `react/skeleton`, `react/sparkline`, `react/use-online`, `react/use-qr-scanner`, `react/use-wake-lock`, `share`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **30**                                                                                                |
| [`mister-qowa`](https://github.com/mister-guiiug/mister-qowa)             | Firebase                 | `apps-catalog`, `components.css`, `csv`, `download`, `eslint-react`, `pairing`, `playwright-base`, `qr`, `react/app-footer`, `react/app-updates`, `react/confirm-dialog`, `react/error-boundary`, `react/use-install-prompt`, `share`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vitest-base` — **18**                                                                                                                                                                                                                                                                                                           |
| [`mister-family-map`](https://github.com/mister-guiiug/mister-family-map) | Supabase                 | `commitlint`, `components.css`, `correlation`, `eslint-react`, `geo`, `lint-staged`, `logger`, `map`, `map/maplibre`, `playwright-a11y`, `playwright-base`, `prefetch`, `prettier`, `react`, `react/app-version`, `react/observability`, `react/share-button`, `react/update-prompt-banner`, `react/version`, `realtime`, `realtime/local`, `storage`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vite-version`, `vitest-base`, `vitest-setup` — **30**                                                                                                                              |
| [`mister-miss-koh`](https://github.com/mister-guiiug/mister-miss-koh)     | Supabase                 | `backend`, `commitlint`, `components.css`, `eslint-react`, `format`, `lint-staged`, `prettier`, `react/app-footer`, `react/app-header`, `react/app-updates`, `react/badge`, `react/bottom-nav`, `react/button`, `react/card`, `react/empty-state`, `react/error-boundary`, `react/icons-context`, `react/icons-lucide`, `react/labels`, `react/page-container`, `react/rive`, `react/theme-provider`, `react/use-media-query`, `react/use-online`, `storage`, `supabase-client`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `versioned-store`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **34** |
| [`mister-quota`](https://github.com/mister-guiiug/mister-quota)           | — (non relevé) · desktop | `components.css`, `format`, `prettier`, `react/confirm-dialog`, `react/error-boundary`, `react/toast` — **6**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

<!-- CONSOMMATEURS:FIN -->

### Adoption réelle

Le tableau ci-dessus dit ce que chaque app importe. Celui-ci dit l'inverse — ce
qu'elle **n'importe pas alors que le paquet le fournit**, parce qu'elle en garde
une copie. C'est le seul chiffre qui mesure l'utilité de ce dépôt, et il n'était
écrit nulle part.

Ce qu'il montre, au relevé du 30 août : les deux couches sont adoptées. La
couche **outillage** l'était déjà (`vitest-base`, l'observabilité, Playwright,
les greffons Vite) ; la couche **interface** a suivi quand `components.css` —
son prérequis, longtemps pris par trois apps sur dix-sept — est passé à
quinze. `ConfirmDialog` et `ErrorBoundary` sont maintenant importés par dix
apps, `EmptyState` par sept, `Sheet` par six.

**Sept postes sont passés à zéro** en deux jours : `UpdatePromptBanner` (8
copies), `links` (7), `applyUpdate` (6), `format` (5), `Toast`, `ThemeToggle`,
`ErrorBoundary`. Le dernier, `applyUpdate`, était le plus coûteux : il ne
supposait pas un import mais de reprendre un enregistrement de service worker,
la désinscription de développement que cinq apps avaient écrite, et — pour trois
d'entre elles — de trancher ce que `registerType: 'autoUpdate'` permet
réellement. Ce qui reste demande la même chose : `useI18n` (4) un fournisseur et
des dictionnaires, `useTheme` (3) un état à déplacer.

**Le chiffre est passé de 71 à 17, et il faut séparer les causes.** En rejouant
l'ancienne règle sur un état intermédiaire, on obtenait 58 là où la nouvelle
disait 46 : douze doublons étaient donc **invisibles à l'instrument** — neuf
besoins qu'il ne savait pas acquitter, trois façades qu'il comptait comme des
réécritures. Le reste de la baisse est du travail réel. Confondre les deux
attribuerait à la campagne ce que personne n'a fait (voir `CAMPAGNE.md`).

**Et il SOUS-ESTIME encore la dette.** Il compte les copies d'un catalogue de
besoins **déjà nommés** : une app qui réécrit quelque chose que le catalogue
ignore ne compte pour rien. Treize réécritures à la main ont disparu le même
jour — quatre agendas iCalendar, trois traitements d'image, trois verrous
d'écran, un classeur Excel — **sans peser un point**, parce qu'aucune ne portait
un nom du catalogue. Le relevé mesure la migration de ce qu'on sait déjà
partagé ; il ne découvre rien. Ce qui découvre, c'est de lire les apps — et
c'est ainsi que ces quatre modules sont nés.

**Le sens inverse a son instrument depuis le 02/09/2026.**
`node scripts/promotion-candidates.mjs` sort ce que plusieurs apps écrivent et
que le paquet n'exporte pas, avec pour chaque exemplaire son nombre
d'importateurs (zéro : un cadavre) et pour chaque groupe sa similarité (1,00 :
une copie). Le tri qui en est sorti — dix chantiers classés, et ce qu'on ne
fait pas — est dans `GISEMENTS.md`.

`node scripts/probe-sites.mjs` lit les seize sites PUBLIÉS (manifeste, CSP,
Open Graph, repli 404, poids du JS initial) ; `node scripts/dead-exports.mjs`
relève les exports que personne n'appelle. Ce que ces sondes ont trouvé le
02/09/2026 — Renovate jamais actif, une app non installable, un relevé
d'adoption qui comptait 19 copies pour 34 — est classé dans `PARC.md`.

<!-- ADOPTION:DÉBUT — engendré par `npm run sync` depuis showroom/adoption.js -->

_Relevé du 2026-09-05 sur 19 dépôts, par `npm run adoption`._

> **Dette d'adoption : 4 fichiers recopiés** dans 19 apps, sur 3 besoins distincts. Les pires : `links` (2), `id` (1), `testing/pwa-register` (1).
>
> **Aucun de ces doublons ne manque au socle** : tout est déjà publié. Ce n'est pas un problème de modules, c'en est un de migration — `node scripts/adopt.mjs` en fait l’essai à blanc, app par app.

| Export ou module              | Importé par | Encore recopié dans |
| ----------------------------- | ----------- | ------------------- |
| `baseTestOptions`             | 18 / 19     | —                   |
| `pwaSeoPlugin`                | 18 / 19     | —                   |
| `UpdatePromptBanner`          | 18 / 19     | —                   |
| `FamilyApps`                  | 15 / 19     | —                   |
| `createLogger`                | 14 / 19     | —                   |
| `cspPlugin`                   | 14 / 19     | —                   |
| `initSentry`                  | 14 / 19     | —                   |
| `installErrorReporter`        | 14 / 19     | —                   |
| `testing/pwa-register`        | 13 / 19     | 1 / 19              |
| `ConfirmDialog`               | 13 / 19     | —                   |
| `definePwaPlaywrightConfig`   | 13 / 19     | —                   |
| `expectNoA11yViolations`      | 12 / 19     | —                   |
| `recordError`                 | 12 / 19     | —                   |
| `useTheme`                    | 12 / 19     | —                   |
| `links`                       | 11 / 19     | 2 / 19              |
| `applyUpdate`                 | 11 / 19     | —                   |
| `createI18n`                  | 11 / 19     | —                   |
| `ErrorBoundary`               | 11 / 19     | —                   |
| `getDefaultLocale`            | 11 / 19     | —                   |
| `repoUrl`                     | 11 / 19     | —                   |
| `EmptyState`                  | 10 / 19     | —                   |
| `ThemeProvider`               | 10 / 19     | —                   |
| `useActionGuard`              | 10 / 19     | —                   |
| `AppUpdates`                  | 9 / 19      | —                   |
| `BottomNav`                   | 9 / 19      | —                   |
| `ConnectionBanner`            | 9 / 19      | —                   |
| `LabelsProvider`              | 9 / 19      | —                   |
| `Sheet`                       | 9 / 19      | —                   |
| `useOnline`                   | 9 / 19      | —                   |
| `AppFooter`                   | 8 / 19      | —                   |
| `coveragePreset`              | 8 / 19      | —                   |
| `pwaRegisterAlias`            | 8 / 19      | —                   |
| `useThemeContext`             | 8 / 19      | —                   |
| `Button`                      | 7 / 19      | —                   |
| `IconsProvider`               | 7 / 19      | —                   |
| `SPONSOR_URL`                 | 7 / 19      | —                   |
| `Badge`                       | 6 / 19      | —                   |
| `dateSlug`                    | 6 / 19      | —                   |
| `downloadText`                | 6 / 19      | —                   |
| `Card`                        | 5 / 19      | —                   |
| `createStore`                 | 5 / 19      | —                   |
| `downloadJson`                | 5 / 19      | —                   |
| `formatNumber`                | 5 / 19      | —                   |
| `lucideIconSet`               | 5 / 19      | —                   |
| `swStub`                      | 5 / 19      | —                   |
| `TextField`                   | 5 / 19      | —                   |
| `ThemePreference`             | 5 / 19      | —                   |
| `unregisterServiceWorkers`    | 5 / 19      | —                   |
| `initWebVitals`               | 4 / 19      | —                   |
| `RegisterSW`                  | 4 / 19      | —                   |
| `SelectField`                 | 4 / 19      | —                   |
| `setDefaultLocale`            | 4 / 19      | —                   |
| `shareOrCopy`                 | 4 / 19      | —                   |
| `SkeletonGroup`               | 4 / 19      | —                   |
| `ThemeToggle`                 | 4 / 19      | —                   |
| `ToastProvider`               | 4 / 19      | —                   |
| `AppHeader`                   | 3 / 19      | —                   |
| `BadgeTone`                   | 3 / 19      | —                   |
| `CardHeader`                  | 3 / 19      | —                   |
| `createSupabaseClientFactory` | 3 / 19      | —                   |
| `createTranslator`            | 3 / 19      | —                   |
| `createVersionedStore`        | 3 / 19      | —                   |
| `formatDate`                  | 3 / 19      | —                   |
| `formatDateTime`              | 3 / 19      | —                   |
| `generateCode`                | 3 / 19      | —                   |
| `ObservabilityBoundary`       | 3 / 19      | —                   |
| `Skeleton`                    | 3 / 19      | —                   |
| `Sparkline`                   | 3 / 19      | —                   |
| `ToastViewport`               | 3 / 19      | —                   |
| `useToast`                    | 3 / 19      | —                   |
| `useUpdatePrompt`             | 3 / 19      | —                   |
| `useWakeLock`                 | 3 / 19      | —                   |
| `ActionGuardResult`           | 2 / 19      | —                   |
| `ALPHABETS`                   | 2 / 19      | —                   |
| `buildPdf`                    | 2 / 19      | —                   |
| `buildXlsx`                   | 2 / 19      | —                   |
| `compressImageToMaxBytes`     | 2 / 19      | —                   |
| `createChannel`               | 2 / 19      | —                   |
| `createSyncQueue`             | 2 / 19      | —                   |
| `currentAppUrl`               | 2 / 19      | —                   |
| `downloadPdf`                 | 2 / 19      | —                   |
| `downloadXlsx`                | 2 / 19      | —                   |
| `formatCurrency`              | 2 / 19      | —                   |
| `formatRelativeTime`          | 2 / 19      | —                   |
| `I18nPaths`                   | 2 / 19      | —                   |
| `ICAL_MIME`                   | 2 / 19      | —                   |
| `IcalEvent`                   | 2 / 19      | —                   |
| `isValidCoordinates`          | 2 / 19      | —                   |
| `LabelOverrides`              | 2 / 19      | —                   |
| `LABELS`                      | 2 / 19      | —                   |
| `normalizeCode`               | 2 / 19      | —                   |
| `PAGE`                        | 2 / 19      | —                   |
| `PageContainer`               | 2 / 19      | —                   |
| `PdfContent`                  | 2 / 19      | —                   |
| `readJsonFile`                | 2 / 19      | —                   |
| `registerSW`                  | 2 / 19      | —                   |
| `stripImageMetadata`          | 2 / 19      | —                   |
| `supabaseConfig`              | 2 / 19      | —                   |
| `SyncQueue`                   | 2 / 19      | —                   |
| `SyncQueueEntry`              | 2 / 19      | —                   |
| `TextAreaField`               | 2 / 19      | —                   |
| `textWidth`                   | 2 / 19      | —                   |
| `toCsv`                       | 2 / 19      | —                   |
| `toIcalendar`                 | 2 / 19      | —                   |
| `UpdateButton`                | 2 / 19      | —                   |
| `useReducedMotion`            | 2 / 19      | —                   |
| `validateImageFile`           | 2 / 19      | —                   |
| `appById`                     | 1 / 19      | —                   |
| `AppVersion`                  | 1 / 19      | —                   |
| `backendCoverage`             | 1 / 19      | —                   |
| `BackendCoverage`             | 1 / 19      | —                   |
| `BACKUP_FORMAT`               | 1 / 19      | —                   |
| `BACKUP_VERSION`              | 1 / 19      | —                   |
| `BottomNavItem`               | 1 / 19      | —                   |
| `BoundingBox`                 | 1 / 19      | —                   |
| `ChannelStatus`               | 1 / 19      | —                   |
| `clearErrorLog`               | 1 / 19      | —                   |
| `clusterByGrid`               | 1 / 19      | —                   |
| `clustersToMarkers`           | 1 / 19      | —                   |
| `composeBackend`              | 1 / 19      | —                   |
| `Coordinates`                 | 1 / 19      | —                   |
| `createBackup`                | 1 / 19      | —                   |
| `createIdb`                   | 1 / 19      | —                   |
| `createMapLibreMapProvider`   | 1 / 19      | —                   |
| `createPushClient`            | 1 / 19      | —                   |
| `distanceKm`                  | 1 / 19      | —                   |
| `downloadBlob`                | 1 / 19      | —                   |
| `dumpAppState`                | 1 / 19      | —                   |
| `ErrorBanner`                 | 1 / 19      | —                   |
| `formatBytes`                 | 1 / 19      | —                   |
| `formatDistance`              | 1 / 19      | —                   |
| `formatDuration`              | 1 / 19      | —                   |
| `formatPercentage`            | 1 / 19      | —                   |
| `formatUsage`                 | 1 / 19      | —                   |
| `getErrorLog`                 | 1 / 19      | —                   |
| `I18nApi`                     | 1 / 19      | —                   |
| `IconComponent`               | 1 / 19      | —                   |
| `IMAGE_ACCEPTED_TYPES`        | 1 / 19      | —                   |
| `installCorrelation`          | 1 / 19      | —                   |
| `installObservability`        | 1 / 19      | —                   |
| `isClusterId`                 | 1 / 19      | —                   |
| `isInBoundingBox`             | 1 / 19      | —                   |
| `isValidLatitude`             | 1 / 19      | —                   |
| `isValidLongitude`            | 1 / 19      | —                   |
| `localRealtimeTransport`      | 1 / 19      | —                   |
| `mapCspDirectives`            | 1 / 19      | —                   |
| `mapTileRuntimeCaching`       | 1 / 19      | —                   |
| `osmRasterTiles`              | 1 / 19      | —                   |
| `pagesUrl`                    | 1 / 19      | —                   |
| `PairingAlphabet`             | 1 / 19      | —                   |
| `parseCsv`                    | 1 / 19      | —                   |
| `parseDeepLink`               | 1 / 19      | —                   |
| `permissionState`             | 1 / 19      | —                   |
| `prefetch`                    | 1 / 19      | —                   |
| `pushSupport`                 | 1 / 19      | —                   |
| `PushSupport`                 | 1 / 19      | —                   |
| `PushTransport`               | 1 / 19      | —                   |
| `qrToDataUrl`                 | 1 / 19      | —                   |
| `qrToSvg`                     | 1 / 19      | —                   |
| `readRaw`                     | 1 / 19      | —                   |
| `removeKey`                   | 1 / 19      | —                   |
| `resolveBackendKind`          | 1 / 19      | —                   |
| `ResolvedTheme`               | 1 / 19      | —                   |
| `resolveSeoPublicUrls`        | 1 / 19      | —                   |
| `restoreBackup`               | 1 / 19      | —                   |
| `rethrowWithState`            | 1 / 19      | —                   |
| `Rgb`                         | 1 / 19      | —                   |
| `SegmentedControl`            | 1 / 19      | —                   |
| `ShareButton`                 | 1 / 19      | —                   |
| `ShareResult`                 | 1 / 19      | —                   |
| `Stat`                        | 1 / 19      | —                   |
| `STATUS`                      | 1 / 19      | —                   |
| `SUPABASE_ENV_KEYS`           | 1 / 19      | —                   |
| `SupabaseChange`              | 1 / 19      | —                   |
| `supabaseRealtimeTransport`   | 1 / 19      | —                   |
| `SyncQueueOptions`            | 1 / 19      | —                   |
| `themeBootSource`             | 1 / 19      | —                   |
| `unescapeText`                | 1 / 19      | —                   |
| `unfoldLines`                 | 1 / 19      | —                   |
| `useAppUpdates`               | 1 / 19      | —                   |
| `useFocusTrap`                | 1 / 19      | —                   |
| `useInstallPrompt`            | 1 / 19      | —                   |
| `useKeyboardShortcuts`        | 1 / 19      | —                   |
| `useLabels`                   | 1 / 19      | —                   |
| `usePullToRefresh`            | 1 / 19      | —                   |
| `useQrScanner`                | 1 / 19      | —                   |
| `versionPlugin`               | 1 / 19      | —                   |
| `VersionProvider`             | 1 / 19      | —                   |
| `vibrate`                     | 1 / 19      | —                   |
| `writeRaw`                    | 1 / 19      | —                   |
| `XlsxSheet`                   | 1 / 19      | —                   |
| `XlsxValue`                   | 1 / 19      | —                   |
| `id`                          | 0 / 19      | 1 / 19              |

<!-- ADOPTION:FIN -->

## Showroom du design system

`showroom/` est une page **statique** (HTML + CSS + JS, aucune dépendance,
aucun build, aucune requête réseau) qui présente ce que le paquet partage
réellement :

- les tokens du preset — typographie et espacements fluides, points de rupture,
  safe-areas iOS, cible tactile — avec leurs valeurs **calculées en direct**
  (redimensionner la fenêtre fait jouer les `clamp()`) ;
- le DOM exact de chaque composant `/react` et les sélecteurs
  `[data-dwc="…"]` correspondants ;
- une **vitrine des applications** de la famille — le catalogue, pas une copie —,
  en grille ou en tableau :
  recherche sans diacritiques (les facettes et les sous-chemins y sont
  cherchables : « supabase », « vite-csp »), quatre axes de filtres croisés
  affichant le compte qu'ils donneraient, tri, ancre par application, liens app
  - dépôt, et un bouton qui rhabille la page entière avec la palette de l'app.
    La grille est **engendrée depuis `apps-catalog.js`** — le fichier qu'importent
    les apps pour s'afficher les unes les autres. Le filtre **Consomme** répond à
    la question qu'un design system doit se poser en premier : qui utilise
    vraiment quoi ? (`components.css` : quinze dépôts sur dix-sept) ;
- un **catalogue cherchable** de tout ce que le paquet exporte — composants et
  hooks —, dont `test/showroom-catalogue.test.mjs` vérifie qu'il ne laisse
  échapper aucun export de `react/index.js` ;
- des **pièges par composant**, tirés de défauts constatés et non de principes
  (7 apps sur 13 avaient réimplémenté `EmptyState`, les variantes `sm` locales
  descendaient à 32 px…), et une note d'accessibilité par fiche ;
- des **arbres de décision** pour les cas où deux composants conviennent :
  signaler un problème, occuper une attente, demander une saisie, dire un état ;
- un **sélecteur de thème** qui rhabille toute la page avec l'univers visuel de
  chaque application consommatrice, plus le contrat clair / sombre / système du
  hook `useTheme` ;
- des **contrôles d'accessibilité calculés sur la page** — cible tactile mesurée
  et contraste WCAG par paire —, rejoués à chaque bascule de thème ;
- une section **Stack** relevée dans le code des apps : Supabase / Firebase /
  local-first et leurs fonctionnalités réellement appelées, icônes, cartes,
  outillage de test ;
- une bascule **français / anglais**. Le français est le HTML lui-même, capturé
  au chargement ; `showroom/i18n.js` ne porte que les autres langues, et
  `test/showroom-i18n.test.mjs` refuse qu'un bloc reste sans traduction.

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

Même raison pour le catalogue : chargeable en `file://`, la page ne peut pas
`import` un module ES. `showroom/apps.js` (`globalThis.SHOWROOM_APPS`) et
`showroom/components.css` sont donc **engendrés** depuis la racine :

```bash
npm run sync   # scripts/sync-generated.mjs
```

`npm run sync` régénère **quatre** dérivés du catalogue : `showroom/apps.js`,
`showroom/components.css`, le bloc JSON-LD du `<head>` de la page (seize
`SoftwareApplication`, lisibles sans exécuter le script) et le tableau
« Projets consommateurs » ci-dessus. `test/apps-catalog.test.mjs` les compare
tous au catalogue et refuse une copie périmée ; il vérifie aussi que les comptes
annoncés par la section « Stack » (« 6 apps Supabase », « 3 Firebase »,
« 5 local-first ») collent toujours au champ `backend`.

Deux relevés complètent la vitrine, et ne sont **pas** dans `sync` parce qu'ils
demandent un accès réseau :

```bash
npm run screenshots            # captures des apps déployées → showroom/screenshots/
npm run screenshots -- miss-dice
node scripts/fetch-metrics.mjs # état des dépôts → showroom/metrics.js
```

Le second tourne **une fois par nuit** en CI (`showroom-metrics.yml`) et commite
`showroom/metrics.js` : version publiée, date du dernier push, dépôt archivé.
La page ne fait toujours aucune requête — le relevé est posé sur `globalThis`
par un `<script src>`, comme `themes.js`. Un fichier vide est un état valide :
la vitrine n'affiche alors simplement aucune mesure.

> Le workflow redemande **explicitement** la publication Pages après avoir
> commité. Un push effectué avec le `GITHUB_TOKEN` ne déclenche aucun autre
> workflow — c'est la protection anti-récursion de GitHub Actions — et le
> relevé serait donc commité sans jamais être publié. Un `workflow_dispatch`
> par l'API, lui, s'exécute normalement.

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

> **OÙ — la règle, depuis le 05/09/2026.** Les deux liens sont visibles **sur le
> premier écran** (l'accueil) **et sur À propos / Réglages**. Pas l'un ou
> l'autre : les deux. Qui ouvre l'app doit pouvoir vérifier ce qu'elle fait et
> remercier sans aller les chercher dans un tiroir — et qui vient les chercher
> doit les trouver là où on range ce genre de chose.
>
> **Deux façons de la tenir**, toutes deux acceptées :
>
> 1. **la coquille** — `<AppFooter>` rendu **hors des `<Routes>`**. C'est la
>    réponse du socle : un seul endroit, tous les écrans, y compris ceux à
>    venir ;
> 2. **deux écrans** — le pied de page rendu sur l'accueil **et** sur À propos /
>    Réglages. Trois apps le font ainsi, et n'ont rien à corriger.
>
> `npx pwa-doctor` le vérifie (`liens-famille`). **Relevé du 05/09/2026 : sept
> apps sur dix-neuf tiennent la règle** — quatre par la coquille (`miss-carbook`,
> `miss-lookhouse`, `mister-miss-koh`, le squelette), trois par deux écrans
> (`miss-contraction`, `mister-cim10`, `mister-molkky`). Les douze autres ne
> montrent les liens que sur un seul écran : dix sur les réglages, deux
> (`mister-puzzle`, `mister-qowa`) sur l'accueil.

Deux niveaux, à mettre en place ensemble :

1. **Dans l'app** — un `src/links.ts` centralise les URL, consommé par le pied
   de page de la coquille (ou, à défaut, par les deux écrans) :

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

   **Ou, sans écrire ni URL ni balise** — la forme du squelette, et celle que
   `pwa-doctor` reconnaît sans rien deviner :

   ```tsx
   // src/App.tsx — DANS la coquille, APRÈS <Routes>, jamais dedans.
   <PageContainer as="main">
     <Routes>{/* … */}</Routes>
     {/* Le lien de soutien n'est pas passé : AppFooter le prend au catalogue. */}
     <AppFooter repoUrl={REPO_URL} />
   </PageContainer>
   ```

   Un `<AppFooter>` écrit **dans** un `element={…}` ne vaut que pour cette
   route-là. C'est l'erreur la plus fréquente du parc, et elle est invisible :
   la page où on la teste, c'est justement celle qui a le pied de page.

   **Le lien de soutien n'a pas à être écrit** : `AppFooter` et `FamilyApps`
   prennent déjà celui de la famille. Pour le remplacer, le déclarer **une
   fois** —

   ```tsx
   import { SponsorProvider } from '@mister-guiiug/dev-pwa-config/react/sponsor';

   <SponsorProvider handle="autre.pseudo">        {/* autre pseudo BMC */}
   <SponsorProvider url="https://liberapay.com/…"> {/* autre plateforme */}
   <SponsorProvider url={null}>                    {/* aucun lien */}
   ```

   Trois niveaux, comme `LabelsProvider` : la prop l'emporte, puis le contexte,
   puis la famille. `null` n'est pas `undefined` — c'est « pas de lien », et il
   est respecté : sans quoi un fork ne pourrait pas retirer un appel au don qui
   pointe vers quelqu'un d'autre.

2. **Sur le dépôt** — `.github/FUNDING.yml` active le bouton « Sponsor » de
   GitHub. Template prêt à copier : [`templates/FUNDING.yml`](./templates/FUNDING.yml).

   ```yaml
   buy_me_a_coffee: mister.guiiug
   ```

   Ce fichier est lu par **GitHub**, le fournisseur par **l'app** : les deux se
   règlent séparément. Un fork qui change l'un sans l'autre affiche deux
   destinataires différents.

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
    "@mister-guiiug/dev-pwa-config": "^3.0.0",
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

## Monter à ESLint 10

ESLint 9 est sorti du support (`npm` le dit à chaque installation). La montée
est instruite dans [ESLINT-10.md](ESLINT-10.md) : un seul paquet de la chaîne
refuse la 10 — `eslint-plugin-jsx-a11y`, dont la déclaration s'arrête à `^9` —
et l'essai montre que **le blocage est déclaratif, pas réel**. La recette
éprouvée tient en deux gestes (peers élargis côté socle, `overrides` côté app)
et le seul coût mesuré est la nouvelle règle `no-useless-assignment` :
sept occurrences dans le socle, deux dans miss-uwh, zéro dans miss-dice.

## Secrets et variables — la ligne de partage

**La question n'est pas « est-ce sensible ? », c'est « le navigateur le
voit-il ? ».** Vite copie la valeur de tout `VITE_*` dans le bundle au moment du
build : elle part en clair sur GitHub Pages, lisible par n'importe qui. La
ranger dans un _secret_ GitHub ne la protège donc de rien — ça masque seulement
les journaux de CI (`***`) et donne l'illusion d'une confidentialité qui
n'existe pas.

| Ranger en…                      | Quoi                                                                                                                | Exemples                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`secrets`** (chiffrés)        | Ce qui donne un **pouvoir** : écrire, déployer, administrer. Jamais lu par le navigateur.                           | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`, `FIREBASE_TOKEN`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `CLOUDFLARE_API_TOKEN`, `RENOVATE_TOKEN`, `MIRROR_PUSH_TOKEN` |
| **`vars`** (en clair, lisibles) | Ce qui finit **dans le bundle** ou dans une URL publique — donc tout `VITE_*`, et la configuration d'environnement. | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FIREBASE_*`, `VITE_VAPID_PUBLIC_KEY`, `VITE_SENTRY_DSN`, `VITE_BASE_PATH`, `SUPABASE_PROJECT_ID`                               |

Deux clés méritent un mot, parce qu'elles ressemblent à des secrets :

- **l'`anon key` Supabase** est un JWT de rôle `anon`, conçu pour être publié :
  c'est la RLS qui protège les données, pas la clé. La vérifier plutôt que la
  cacher — `echo "$KEY" | cut -d. -f2 | base64 -d` doit dire `"role":"anon"`,
  **jamais** `"role":"service_role"` ;
- **les `VITE_FIREBASE_*`** sont la configuration publique du projet ; c'est
  App Check et les règles de sécurité qui protègent, pas leur discrétion.

### Comment les injecter

Le build lit les `VITE_*` par l'entrée `build-env` du réutilisable, une par
ligne — jamais par `secrets: inherit`, qui donnerait au workflow appelé **tout
le trousseau du dépôt** alors qu'il n'a besoin de rien :

```yaml
jobs:
  deploy:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v4
    with:
      use-base-path: true
      build-env: |
        VITE_SUPABASE_URL=${{ vars.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY=${{ vars.VITE_SUPABASE_ANON_KEY }}
      # Celles dont l'absence CASSE l'app. Le déploiement s'arrête en les
      # nommant, au lieu de publier un site au backend injoignable.
      required-env: |
        VITE_SUPABASE_URL
        VITE_SUPABASE_ANON_KEY
    # Nommés, jamais hérités : le workflow ne reçoit que ce qu'il déclare.
    # Ne lister que ceux que `pwa-deploy.yml` déclare et que l'app utilise —
    # onze des douze appelants en `inherit` ne lui passaient rien.
    secrets:
      FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
```

**`required-env` est le garde qui manquait.** L'injection ne contrôle que la
forme : quand `vars.VITE_SUPABASE_URL` n'existe pas, la ligne vaut
`VITE_SUPABASE_URL=` — elle passe, et le build reçoit une chaîne vide. C'est
ainsi que mister-qowa a été publié avec `apiKey: undefined`. N'y lister que les
variables **sans repli** : une `VITE_SENTRY_DSN` absente fait taire
l'observabilité, elle ne casse rien, et un garde bruyant finit désactivé.

### Ce qui doit rester vrai

- **Toute `VITE_*` que le code lit figure dans `.env.example`**, avec un
  commentaire disant à quoi elle sert et si elle est facultative. C'est la seule
  documentation qu'un nouveau venu lira.
- **Une app doit démarrer sans configuration.** miss-lookhouse, miss-uwh et
  mister-footcoach retombent sur un backend `local` quand l'URL ou la clé
  manquent — la démo publique fonctionne, hors ligne, sans compte. À l'inverse,
  une app qui construit `apiKey: import.meta.env.VITE_…` sans repli se déploie
  **silencieusement cassée** : le site est en ligne, son backend est
  injoignable, et rien ne le dit.
- `pwa-doctor` relève les écarts : `VITE_*` rangée en secret, `secrets:
inherit`, `.env.example` absent ou incomplet.

**Ces règles ne sont pas appliquées, et la raison est instructive** : relevé du
04/09/2026, douze des seize workflows de déploiement héritent du trousseau
entier et quinze valeurs publiques dorment en `secrets` — parce que le gabarit
qu'on copie dit encore, en commentaire, d'y ranger les `VITE_*`. Le modèle qui
rend la règle mécanique plutôt que documentaire — un manifeste déclaré, un
`.env.example` engendré, un audit qui confronte la déclaration à l'API GitHub,
et trois gardes pour qu'une valeur absente n'atteigne jamais la production en
silence — est instruit dans [CONFIG.md](CONFIG.md).

## Nouveau projet : une commande

```bash
npx github:mister-guiiug/create-lg-pwa-app miss-exemple --publish
```

[`create-lg-pwa-app`](https://github.com/mister-guiiug/create-lg-pwa-app) tire
le squelette [`pwa-starter-kit`](https://github.com/mister-guiiug/pwa-starter-kit),
substitue l'identité, écrit le lockfile avec **npm 10** — celui du runner —,
fait le premier commit, crée le dépôt public et active Pages **par un PUT**.

C'est la voie recommandée depuis le 05/09/2026. Ce que la checklist manuelle
ci-dessous ne pouvait pas donner : le squelette apporte aussi la
**composition** — pile de fournisseurs, routeur, écrans de cadre, i18n,
sélecteur de backend, mise à jour du service worker — qui pesait 22 % des
lignes du parc et se réécrivait à chaque naissance, ainsi que sept décisions
d'architecture déjà prises.

Restent deux gestes, volontairement hors du générateur :
`node scripts/apply-rulesets.mjs <id>` pour protéger la branche, et une PR sur
`apps-catalog.js` sans laquelle l'application n'apparaît pas chez ses sœurs.

## Checklist — à la main, ou pour comprendre ce que fait le générateur

1. **`.npmrc`** (copier [`templates/.npmrc`](./templates/.npmrc)) + **`.nvmrc`** (`22`).
2. **Dépendance** : `npm i -D @mister-guiiug/dev-pwa-config@^4` + les peers utilisés
   (cf. `peerDependencies` du [`package.json`](./package.json) : `eslint`, `@eslint/js`,
   `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`,
   `globals`, `prettier`, `typescript`, `vite`, `vitest`, `react`, `tailwindcss`…).
3. **Re-exports** (une ligne chacun, cf. [Utilisation](#utilisation)) : `eslint.config.js`,
   `prettier.config.js`, `commitlint.config.js`, `lint-staged.config.js`.
4. **TypeScript** : `tsconfig.app.json` + `tsconfig.node.json` en `extends`.
5. **Tests** : `vitest.config.ts` (`baseTestOptions`) + `src/test/setup.ts`
   (`import '@mister-guiiug/dev-pwa-config/vitest-setup'`).
6. **CI/CD** (secrets passés NOMMÉMENT — jamais `inherit` — + `permissions` au niveau caller) : `ci.yml` →
   `pwa-ci.yml@v4`, `deploy.yml` → `pwa-deploy.yml@v4`, `lighthouse.yml` →
   `pwa-lighthouse.yml@v4`.
7. **PWA/SEO** : `index.html` depuis [`templates/index.html`](./templates/index.html) +
   `pwaSeoPlugin` + `cspPlugin` dans `vite.config.ts`.
8. **Famille** : `<FamilyApps>` (écran Réglages/À propos) + `.github/FUNDING.yml`.

## Exports npm

| Sous-chemin                                                  | Type            | Description                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@mister-guiiug/dev-pwa-config/eslint-base`                  | `.js`           | Config ESLint pour projets vanilla TS / Node (sans React)                                                                                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/eslint-react`                 | `.js`           | Étend la base avec `react-hooks` + `react-refresh` + `jsx-a11y` (règles React Compiler & a11y en `warn`)                                                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/prettier`                     | `.js`           | Config Prettier 3.6                                                                                                                                                                                                                                          |
| `@mister-guiiug/dev-pwa-config/commitlint`                   | `.js`           | Config commitlint (Conventional Commits)                                                                                                                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/lint-staged`                  | `.js`           | Config lint-staged (eslint --fix + prettier --write)                                                                                                                                                                                                         |
| `@mister-guiiug/dev-pwa-config/tsconfig-app`                 | `.json`         | Base app : ES2025 strict, `moduleResolution: bundler`, `noUncheckedSideEffectImports`, `types: ["vite/client"]`                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/tsconfig-app-react`           | `.json`         | Étend `tsconfig-app` avec `jsx: react-jsx`, `jsxImportSource: react`, `vite-plugin-pwa/client`                                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/tsconfig-node`                | `.json`         | tsconfig pour `vite.config.ts`, `vitest.config.ts`, `scripts/*.mjs` (`types: ["node"]`)                                                                                                                                                                      |
| `@mister-guiiug/dev-pwa-config/tsconfig-strict-plus`         | `.json`         | Durcissement TS **opt-in** : `noPropertyAccessFromIndexSignature` + `noImplicitOverride` + `exactOptionalPropertyTypes` (par-dessus la base stricte)                                                                                                         |
| `@mister-guiiug/dev-pwa-config/vitest-base`                  | `.js` + `.d.ts` | `baseTestOptions` (jsdom + globals + setupFiles + passWithNoTests) + `coveragePreset` (reporters `lcov`/`json-summary`) + `recommendedThresholds` + **`pwaRegisterAlias`** (l'alias `resolve.alias` que 10 dépôts écrivaient à la main)                      |
| `@mister-guiiug/dev-pwa-config/vitest-setup`                 | `.js`           | Setup Vitest partagé (jest-dom + stub `matchMedia` + mock `virtual:pwa-register/react`) — à importer depuis `src/test/setup.ts`. Ne mocke **pas** `virtual:pwa-register` : pour celui-là, poser `pwaRegisterAlias`                                           |
| `@mister-guiiug/dev-pwa-config/testing/pwa-register`         | `.js` + `.d.ts` | `registerSW` + `swStub` : le double **pilotable** de `virtual:pwa-register`, à désigner via `pwaRegisterAlias` — 12 dépôts l'écrivaient à la main, muet                                                                                                      |
| `@mister-guiiug/dev-pwa-config/apps-catalog`                 | `.js` + `.d.ts` | Catalogue unique de la famille (`FAMILY_APPS`, `otherApps`, `appById`, `sortApps`, `filterApps`, `countBy`, `SPONSOR_URL`, helpers `repoUrl`/`pagesUrl`) — **données pures, sans React**                                                                     |
| `@mister-guiiug/dev-pwa-config/react`                        | `.js` + `.d.ts` | Hooks & composants PWA : `useLocalStorage`, `useInstallPrompt`, `useTheme`, `useMediaQuery`/`useReducedMotion`/`usePrefersDark`, `PwaInstallPrompt`, `AppFooter`, `FamilyApps` (peer `react`)                                                                |
| `@mister-guiiug/dev-pwa-config/react/use-update-prompt`      | `.js` + `.d.ts` | `useUpdatePrompt` (MAJ service worker + report) — `registerSW` injecté, donc importable partout                                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/react/update-button`          | `.js` + `.d.ts` | `UpdateButton` : bouton « Forcer la mise à jour » des réglages, sans dépendance à vite-plugin-pwa                                                                                                                                                            |
| `@mister-guiiug/dev-pwa-config/react/confirm-dialog`         | `.js` + `.d.ts` | `ConfirmDialog` : `role="alertdialog"`, focus initial sur Annuler, `loading` pour une confirmation asynchrone, `cancelLabel={null}` pour une alerte mono-action                                                                                              |
| `@mister-guiiug/dev-pwa-config/react/toast`                  | `.js` + `.d.ts` | `ToastProvider` / `ToastViewport` / `useToast` : pile bornée, deux régions vivantes, rebours suspendu au survol                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/react/bottom-nav`             | `.js` + `.d.ts` | `BottomNav` : barre d'onglets agnostique de routeur, onglet courant jamais distingué par la seule couleur                                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/react/labels`                 | `.js` + `.d.ts` | `LabelsProvider` / `useLabels` : libellés des composants du paquet en sept langues (fr, en, es, de, it, pt, nl — prop > contexte > français)                                                                                                                 |
| `@mister-guiiug/dev-pwa-config/react/sponsor`                | `.js` + `.d.ts` | `SponsorProvider` / `useSponsorUrl` : le lien de soutien déclaré une fois — `handle` pour un autre pseudo Buy Me a Coffee, `url` pour une autre plateforme, `url={null}` pour n'en afficher aucun (prop > contexte > famille)                                |
| `@mister-guiiug/dev-pwa-config/sw-update`                    | `.js` + `.d.ts` | `applyUpdate` / `hardNavigate` / `unregisterServiceWorkers` : appliquer une mise à jour de service worker, ou tout désinscrire en dev — **sans React ni module virtuel**                                                                                     |
| `@mister-guiiug/dev-pwa-config/theme-boot`                   | `.js` + `.d.ts` | `themeBootScript` / `themeBootSource` / `themeColorMetaTags` — le script anti-FOUC **engendré** (13 apps sur 16 le recopient), avec `legacyKeys` pour migrer les **6 clés de stockage** distinctes de la famille                                             |
| `@mister-guiiug/dev-pwa-config/react/theme-provider`         | `.js` + `.d.ts` | `ThemeProvider` / `useThemeContext` — palette du catalogue, état et variables `--dwc-*` en un seul endroit, un seul écrivain de `data-theme`                                                                                                                 |
| `@mister-guiiug/dev-pwa-config/react/app-updates`            | `.js` + `.d.ts` | `AppUpdates` / `useAppUpdates` — `registerSW` donné une fois, bandeau posé seul, `checkEvery` périodique                                                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/react/icons-context`          | `.js` + `.d.ts` | `IconsProvider` / `Icon` / `useIcon` — le paquet demande un **rôle**, l'app fournit le dessin (10 apps sur 16 sont sur `lucide-react`)                                                                                                                       |
| `@mister-guiiug/dev-pwa-config/react/icons-lucide`           | `.js` + `.d.ts` | `lucideIconSet` — le pont vers `lucide-react` en une ligne (`aria-hidden`, `focusable`, poids de trait), **sans ajouter la dépendance** au paquet                                                                                                            |
| `@mister-guiiug/dev-pwa-config/react/a11y`                   | `.js` + `.d.ts` | `useFocusTrap` / `useEscape` / `useScrollLock` / `AnnouncerProvider` / `SkipLink` / `VisuallyHidden` — extraits de `Sheet`, pour les **38 dialogues** que les apps écrivent elles-mêmes                                                                      |
| `@mister-guiiug/dev-pwa-config/analytics`                    | `.js` + `.d.ts` | `initAnalytics` / `trackEvent` / `trackPageView` / `setAnalyticsConsent` — GA4 ou GTM, **rien n'est injecté avant le consentement**                                                                                                                          |
| `@mister-guiiug/dev-pwa-config/react/use-page-views`         | `.js` + `.d.ts` | `usePageViews` — une vue de page par navigation ; GA4 n'en envoie qu'une par chargement de document, donc toute la navigation d'une PWA est invisible sans ce hook                                                                                           |
| `@mister-guiiug/dev-pwa-config/react/use-route-breadcrumbs`  | `.js` + `.d.ts` | `useRouteBreadcrumbs` — le chemin courant dans le fil d'Ariane et le contexte de session, agnostique du routeur                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/download`                     | `.js` + `.d.ts` | `downloadBlob` / `downloadJson` / `downloadText` / `readJsonFile` / `dateSlug` — la danse `createObjectURL` + ancre + `revoke`, recopiée dans **12 apps sur 16**                                                                                             |
| `@mister-guiiug/dev-pwa-config/share`                        | `.js` + `.d.ts` | `shareOrCopy` / `copyToClipboard` / `currentAppUrl` — Web Share avec repli presse-papiers ; l'annulation est distinguée de l'échec                                                                                                                           |
| `@mister-guiiug/dev-pwa-config/pairing`                      | `.js` + `.d.ts` | `ALPHABETS` (`numeric`/`crockford32`/`antiConfusion`) / `generateCode` / `normalizeCode` / `buildDeepLink` / `parseDeepLink` — codes courts d'appairage et liens profonds `schéma:action?clé=valeur`, **purs** (aléa crypto injectable, tirage sans biais)   |
| `@mister-guiiug/dev-pwa-config/qr`                           | `.js` + `.d.ts` | `qrToDataUrl` / `qrToSvg` — génération de QR par la peer **optionnelle** `qrcode`, chargée paresseusement ; absente, l'erreur la nomme                                                                                                                       |
| `@mister-guiiug/dev-pwa-config/react/use-qr-scanner`         | `.js` + `.d.ts` | `useQrScanner` : scan caméra par la peer **optionnelle** `qr-scanner` — câblé dans un effet (la `<video>` n'existe pas encore au clic), arrêt + destruction garantis au nettoyage                                                                            |
| `@mister-guiiug/dev-pwa-config/react/share-button`           | `.js` + `.d.ts` | `ShareButton` : partage natif, repli presse-papiers, retour **annoncé** dans une région `status` posée dès le premier rendu. Une annulation n'affiche rien — ce n'est pas un échec                                                                           |
| `@mister-guiiug/dev-pwa-config/storage`                      | `.js` + `.d.ts` | `createStore(prefix)` / `readJson` / `writeJson` — l'accès `localStorage`/`sessionStorage` qui ne lève **jamais** (recopié dans 7 apps sur 17) ; le préfixe isole les apps servies depuis le même domaine                                                    |
| `@mister-guiiug/dev-pwa-config/versioned-store`              | `.js` + `.d.ts` | `createVersionedStore` — l'instantané versionné d'une app : enveloppe `{ v, data }`, migrations qui montent d'un cran, validation **injectée** (`schema.parse`), copie de côté avant toute perte possible                                                    |
| `@mister-guiiug/dev-pwa-config/idb`                          | `.js` + `.d.ts` | `createIdb(name)` — IndexedDB clé/valeur **best-effort** (stores `kv` + `blobs`), réécrit 5 fois dans le parc ; rien ne lève jamais, le nom isole les apps                                                                                                   |
| `@mister-guiiug/dev-pwa-config/backup`                       | `.js` + `.d.ts` | `createBackup` / `restoreBackup` / `downloadBackup` — sauvegarde et restauration d'un magasin en valeurs **brutes**, validation complète avant la première écriture, identité d'app vérifiée                                                                 |
| `@mister-guiiug/dev-pwa-config/secure-storage`               | `.js` + `.d.ts` | `createVault` — coffre AES-256-GCM, clé dérivée (PBKDF2) gardée en mémoire seule : protège la fuite **passive** du stockage, pas un XSS actif                                                                                                                |
| `@mister-guiiug/dev-pwa-config/web-vitals`                   | `.js` + `.d.ts` | `initWebVitals` / `rate` / `THRESHOLDS` — chaque métrique enregistrée indépendamment, `onINP` au lieu d'`onFID` (sortie des Core Web Vitals en mars 2024 — `onFID` existe encore en v4, il disparaît en v5). Peer **optionnelle** `web-vitals` ^4            |
| `@mister-guiiug/dev-pwa-config/react/theme-toggle`           | `.js` + `.d.ts` | `ThemeToggle` : cycle clair → sombre → **système**, `type="button"`, nom accessible qui dit l'état courant                                                                                                                                                   |
| `@mister-guiiug/dev-pwa-config/react/rive`                   | `.js` + `.d.ts` | `RiveAnimation` — lazy, a11y, `prefers-reduced-motion`, et **repli garanti** si le runtime ou le `.riv` manque (aucun `.riv` n'existe dans les 16 dépôts). Peer optionnelle `@rive-app/react-canvas`                                                         |
| `@mister-guiiug/dev-pwa-config/react/i18n`                   | `.js` + `.d.ts` | `createI18n` : i18n minimal typé (clés dot-notation), `I18nProvider`/`useI18n` — et **`fmt`**, les formateurs déjà liés à la locale courante (78 formatages à locale figée mesurés dans la famille). Pose `LabelsProvider`                                   |
| `@mister-guiiug/dev-pwa-config/react/observability`          | `.js` + `.d.ts` | `installObservability` / `recordError` / `initSentry` + **le contexte** : `setSessionContext`, `breadcrumb`, `captureConsole` (59 `console.error/warn` perdus mesurés). Peer optionnelle `@sentry/react` — hors barrel                                       |
| `@mister-guiiug/dev-pwa-config/react/update-prompt-banner`   | `.js` + `.d.ts` | `UpdatePromptBanner` : bannière MAJ service worker prête à l'emploi (couplée `useUpdatePrompt`) — `secondaryActions="both"` pour deux sorties, `showOfflineReady` pour le message « prêt hors ligne »                                                        |
| `@mister-guiiug/dev-pwa-config/vitest-browser-base`          | `.js` + `.d.ts` | `baseBrowserTestOptions` (Browser Mode Playwright pour `*.browser.test.{ts,tsx}`)                                                                                                                                                                            |
| `@mister-guiiug/dev-pwa-config/playwright-base`              | `.js` + `.d.ts` | `definePwaPlaywrightConfig({ devices })` (factory : 5 navigateurs, reporters multi-format, snapshots/plateforme, webServer) + helpers `pwaProjects`/`pwaReporters` + `basePlaywrightOptions` (legacy)                                                        |
| `@mister-guiiug/dev-pwa-config/playwright-a11y`              | `.js` + `.d.ts` | `expectNoA11yViolations` / `analyzeA11y` / `formatViolations` (axe-core via `AxeBuilder` injecté ; peer optionnelle `@axe-core/playwright`)                                                                                                                  |
| `@mister-guiiug/dev-pwa-config/vite-pwa-base`                | `.js` + `.d.ts` | `pwaSeoPlugin()` : GTM/GA4 **précédés de l'état de consentement**, sitemap/robots, script anti-FOUC (`themeBoot`) et `<meta name="theme-color">` par schéma (`themeColor`) ; `spaFallbackPlugin()` : `404.html` = `index.html`, le repli SPA de GitHub Pages |
| `@mister-guiiug/dev-pwa-config/vite-csp`                     | `.js` + `.d.ts` | `cspPlugin` : injecte la CSP avec `script-src` par hash SHA-256 des scripts inline (pas de `'unsafe-inline'` en prod)                                                                                                                                        |
| `@mister-guiiug/dev-pwa-config/map`                          | `.js` + `.d.ts` | Socle carto **agnostique** : port `MapProvider`, sources de tuiles (`osmRasterTiles`, `vectorTiles`), clustering par grille, helpers CSP (`mapCspDirectives`) et cache workbox (`mapTileRuntimeCaching`) — aucun moteur embarqué                             |
| `@mister-guiiug/dev-pwa-config/map/leaflet`                  | `.js` + `.d.ts` | Adaptateur **Leaflet** (~42 ko gzip, raster uniquement ; peer optionnelle `leaflet`)                                                                                                                                                                         |
| `@mister-guiiug/dev-pwa-config/map/maplibre`                 | `.js` + `.d.ts` | Adaptateur **MapLibre GL** (~253 ko gzip, raster + vectoriel, WebGL ; peer optionnelle `maplibre-gl` ^6)                                                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/correlation`                  | `.js` + `.d.ts` | Identifiant de corrélation de bout en bout : `installCorrelation`, `withCorrelation(fetch)`, `correlationHeaders`, `getSessionId` — relie erreurs, requêtes, télémétrie et écran de crash                                                                    |
| `@mister-guiiug/dev-pwa-config/logger`                       | `.js` + `.d.ts` | Journal à niveaux (`createLogger`, `setLogLevel`) écrivant dans le **même** fil d'Ariane que `breadcrumb`, estampillé de l'identifiant de corrélation                                                                                                        |
| `@mister-guiiug/dev-pwa-config/version`                      | `.js` + `.d.ts` | `readBuildInfo` / `compareVersions` / `rememberVersion` / `fetchAppVersion` — la version côté client, SemVer comparé, changement détecté au démarrage, `version.json` interrogé. Sans React ni module virtuel                                                |
| `@mister-guiiug/dev-pwa-config/vite-version`                 | `.js` + `.d.ts` | `versionPlugin()` : `__APP_VERSION__` & co par `define`, `globalThis.__DWC_BUILD__` dans le `<head>`, `version.json` à la racine du build (et servi en dev). **Avant `cspPlugin`**                                                                           |
| `@mister-guiiug/dev-pwa-config/react/version`                | `.js` + `.d.ts` | `VersionProvider` / `useAppVersion` — version courante, précédente, publiée ; `checkEvery` sonde `version.json` sans attendre le service worker                                                                                                              |
| `@mister-guiiug/dev-pwa-config/react/app-version`            | `.js` + `.d.ts` | `AppVersion` : le numéro affiché, « mis à jour vers X » après une bascule réussie, « version Y disponible » en région `status`                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/format`                       | `.js` + `.d.ts` | `formatDateTime` / `formatNumber` / `formatCurrency` / `formatSigned` (« + », U+2212, un mot pour zéro) / troncature — `decimals`, `{ decimals: 'auto' }` et `{ never }` : les règles que cinq `format.ts` d'apps réécrivaient                               |
| `@mister-guiiug/dev-pwa-config/dates`                        | `.js` + `.d.ts` | Dates **pures** : aucun formatage (voir `/format`), aucune horloge implicite — les fonctions reçoivent leurs `Date`, donc se testent                                                                                                                         |
| `@mister-guiiug/dev-pwa-config/id`                           | `.js` + `.d.ts` | `createId` (court, préfixé), `createUuid` (v4, repli complet), `isUuid` — promus de miss-uwh ; quatre apps, ~250 sites d'appel, et deux copies internes au paquet                                                                                            |
| `@mister-guiiug/dev-pwa-config/cn`                           | `.js` + `.d.ts` | `cn(...)` : joint des classes (chaînes, tableaux, objets `{ classe: condition }`) — genius et uwh en portaient la même copie                                                                                                                                 |
| `@mister-guiiug/dev-pwa-config/geo`                          | `.js` + `.d.ts` | Géographie pure : validation de coordonnées, distance, boîte englobante, affichage — sans moteur de carte                                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/columns`                      | `.js` + `.d.ts` | Le modèle de **colonnes** partagé par tous les exports (`resolveColumns`, `applyColumns`, `toJson`) : une déclaration, quatre formats                                                                                                                        |
| `@mister-guiiug/dev-pwa-config/csv`                          | `.js` + `.d.ts` | `toCsv` — construire le CSV, pas seulement le télécharger ; les trois caractères qui cassent une sérialisation à la main sont traités                                                                                                                        |
| `@mister-guiiug/dev-pwa-config/markdown`                     | `.js` + `.d.ts` | `toMarkdownTable` / `toMarkdownList` — barre verticale et retour à la ligne échappés, colonnes alignées pour que la source reste lisible                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/pdf`                          | `.js` + `.d.ts` | PDF A4 avec tableaux, **zéro dépendance** — promu de `mister-doc` (211 lignes en production)                                                                                                                                                                 |
| `@mister-guiiug/dev-pwa-config/xlsx`                         | `.js` + `.d.ts` | Classeur `.xlsx` multi-feuilles — une archive ZIP et du XML, rien d'autre ; évite d'embarquer SheetJS à l'export                                                                                                                                             |
| `@mister-guiiug/dev-pwa-config/ical`                         | `.js` + `.d.ts` | iCalendar (RFC 5545) : pliage en **octets**, `DTSTAMP` unique, instant UTC / heure flottante / journée entière — quatre apps l'avaient réécrit                                                                                                               |
| `@mister-guiiug/dev-pwa-config/vcard`                        | `.js` + `.d.ts` | vCard 4.0 (RFC 6350) — le format de contact que tout le monde écrit de travers                                                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/similarity`                   | `.js` + `.d.ts` | « Est-ce que ça existe déjà ? » : `findSimilar` rend un verdict **expliqué** (`same-name`, `very-close`…) ; la distance est injectée, donc pas réservée aux cartes                                                                                           |
| `@mister-guiiug/dev-pwa-config/security`                     | `.js` + `.d.ts` | `escapeHtml` (qui échappe, et le dit) / `redact` / `maskEmail` / `isSafeHttpUrl` — sans DOM, donc utilisable en test, SW et SSR                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/image`                        | `.js` + `.d.ts` | `validateImageFile` (pure) / `stripImageMetadata` (le passage par canvas supprime EXIF, GPS, n° de série) / `compressImageToMaxBytes`. Décoder n'est pas accepter : le GIF se compresse, mais reste hors du défaut (`acceptedTypes`)                         |
| `@mister-guiiug/dev-pwa-config/rate-limit`                   | `.js` + `.d.ts` | `createRateLimiter` — anti-double-envoi côté client, horloge injectable (les tests n'attendent pas). L'autorité reste au serveur                                                                                                                             |
| `@mister-guiiug/dev-pwa-config/geocode-ban`                  | `.js` + `.d.ts` | Géocodage par la **Base Adresse Nationale** (service public, gratuit, sans clé) ; le parsing est pur, `fetch` et base injectables                                                                                                                            |
| `@mister-guiiug/dev-pwa-config/themes`                       | `.js` + `.d.ts` | Couleur de marque d'une app par schéma — la valeur qui doit alimenter le `theme_color` du manifest plutôt qu'un littéral recopié                                                                                                                             |
| `@mister-guiiug/dev-pwa-config/backend`                      | `.js` + `.d.ts` | Choisir un backend et y migrer **port par port**, plutôt qu'en une bascule                                                                                                                                                                                   |
| `@mister-guiiug/dev-pwa-config/supabase-client`              | `.js` + `.d.ts` | Fabrique de client Supabase **paresseuse** jusqu'au code du SDK — promue de cinq apps ; un seul client, donc une seule connexion temps réel                                                                                                                  |
| `@mister-guiiug/dev-pwa-config/sync-queue`                   | `.js` + `.d.ts` | File d'écritures hors-ligne (chemin montant), agnostique du transport, avec le backoff que la deuxième copie du parc avait perdu                                                                                                                             |
| `@mister-guiiug/dev-pwa-config/auth`                         | `.js` + `.d.ts` | Authentification — le **port**, agnostique du service ; promu de cinq implémentations toutes en production                                                                                                                                                   |
| `@mister-guiiug/dev-pwa-config/auth/supabase`                | `.js` + `.d.ts` | Adaptateur Supabase Auth (API v2) — client **injecté**, peer optionnelle `@supabase/supabase-js`                                                                                                                                                             |
| `@mister-guiiug/dev-pwa-config/auth/mfa`                     | `.js` + `.d.ts` | MFA TOTP par-dessus un client injecté — promu de `mister-doc`, éprouvé en production                                                                                                                                                                         |
| `@mister-guiiug/dev-pwa-config/auth/errors-fr`               | `.js` + `.d.ts` | Erreurs d'authentification en français : fusion de deux tables écrites indépendamment                                                                                                                                                                        |
| `@mister-guiiug/dev-pwa-config/react/use-auth`               | `.js` + `.d.ts` | `useAuth` — l'état de session dans React, branché sur le port ; quatre apps portaient chacune leur pont                                                                                                                                                      |
| `@mister-guiiug/dev-pwa-config/react/auth-gate`              | `.js` + `.d.ts` | `AuthGate` : garde d'accès **non stylée** — quoi rendre selon l'état de session                                                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/react/auth-provider`          | `.js` + `.d.ts` | `AuthProvider` / `useAuthContext` : le contexte qui tient le client du port et expose `signIn` / `signUp` / `signOut` — ce que quatre `AuthProvider` d'apps recopiaient ; mode local sans adaptateur                                                         |
| `@mister-guiiug/dev-pwa-config/react/login-form`             | `.js` + `.d.ts` | `LoginForm` : e-mail + mot de passe, présentationnel, emplacements `children` / `footer` — quatre écrans de connexion identiques dans les apps                                                                                                               |
| `@mister-guiiug/dev-pwa-config/react/mfa-challenge`          | `.js` + `.d.ts` | `MfaChallenge` : défi TOTP au login, code de secours et déconnexion en option — promu de mister-doc et miss-uwh                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/realtime`                     | `.js` + `.d.ts` | Synchronisation vivante — le **port**, agnostique du service                                                                                                                                                                                                 |
| `@mister-guiiug/dev-pwa-config/realtime/supabase`            | `.js` + `.d.ts` | Transport Supabase Realtime — client injecté ; le canal est nommé **avec son filtre**, sans quoi deux écrans sur la même table se télescopent                                                                                                                |
| `@mister-guiiug/dev-pwa-config/realtime/firebase`            | `.js` + `.d.ts` | Transport Firestore — `onSnapshot` et la requête sont injectés                                                                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/realtime/local`               | `.js` + `.d.ts` | Transport local : les autres **onglets**, sans serveur. Sans dépendance, et pas un bouchon                                                                                                                                                                   |
| `@mister-guiiug/dev-pwa-config/push`                         | `.js` + `.d.ts` | Notifications push — le **port**, agnostique du service de livraison                                                                                                                                                                                         |
| `@mister-guiiug/dev-pwa-config/push/webpush`                 | `.js` + `.d.ts` | Transport HTTP nu : deux appels vers **votre** serveur, sans SDK ni fournisseur — le cas le plus fréquent                                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/push/supabase`                | `.js` + `.d.ts` | Transport Supabase : les abonnements vivent dans une table protégée par RLS (le SQL est donné en commentaire ; ce paquet ne déploie rien)                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/push/firebase`                | `.js` + `.d.ts` | Transport FCM — enregistre un **jeton**, pas un point de terminaison : le SDK gère l'abonnement et la clé VAPID                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/haptics`                      | `.js` + `.d.ts` | `vibrate` / `HAPTIC_PATTERNS` — patterns gradués (`tap`, `confirm`, `success`, `warning`, `error`, `victory`) ; silencieux là où l'API manque                                                                                                                |
| `@mister-guiiug/dev-pwa-config/audio`                        | `.js` + `.d.ts` | `playSound` / `playTone` : sons **synthétisés** (Web Audio), aucun asset à télécharger ; `resume()` tenté pour iOS Safari                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/speech`                       | `.js` + `.d.ts` | `speak` — synthèse vocale tolérante (aucune erreur sans API), l'énoncé précédent annulé pour ne pas empiler                                                                                                                                                  |
| `@mister-guiiug/dev-pwa-config/prefetch`                     | `.js` + `.d.ts` | `prefetch` / `prefetchWhenIdle` / `prefetchWhenVisible` — charger le morceau de route **avant** le clic                                                                                                                                                      |
| `@mister-guiiug/dev-pwa-config/sparkline`                    | `.js` + `.d.ts` | La géométrie des séries, sans React ni librairie de graphiques                                                                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/react/sparkline`              | `.js` + `.d.ts` | `Sparkline` / `Bars` / `Gauge` — trois graphiques minuscules, non stylés                                                                                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/react/use-local-storage`      | `.js` + `.d.ts` | `useLocalStorage` — typé, synchronisé **inter-onglets et intra-onglet** (deux hooks sur la même clé restent d'accord)                                                                                                                                        |
| `@mister-guiiug/dev-pwa-config/react/use-media-query`        | `.js` + `.d.ts` | `useMediaQuery` / `useReducedMotion` / `usePrefersDark` — SSR-safe ; la brique qui évite les `matchMedia` inversés du parc                                                                                                                                   |
| `@mister-guiiug/dev-pwa-config/react/use-theme`              | `.js` + `.d.ts` | `useTheme` — lit la préférence stockée en **migrant depuis les anciennes clés** (six clés distinctes mesurées dans la famille)                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/react/use-online`             | `.js` + `.d.ts` | `useOnline` — connectivité réseau (`navigator.onLine` + évènements)                                                                                                                                                                                          |
| `@mister-guiiug/dev-pwa-config/react/use-install-prompt`     | `.js` + `.d.ts` | `useInstallPrompt` — capture `beforeinstallprompt`, détecte le mode standalone                                                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/react/use-prefetch`           | `.js` + `.d.ts` | `usePrefetch` / `useVisiblePrefetch` / `useIdlePrefetch` — `/prefetch` branché sur le cycle de vie React                                                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/react/use-async`              | `.js` + `.d.ts` | `useAsync` — chargement/erreur explicites, pas de mise à jour après démontage, rechargement manuel ; `key` identifie la requête                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/react/use-undoable-state`     | `.js` + `.d.ts` | `useUndoableState` — annulation + persistance optionnelle ; l'historique n'est pas persisté, il repart propre                                                                                                                                                |
| `@mister-guiiug/dev-pwa-config/react/use-offline-queue`      | `.js` + `.d.ts` | Le **stockage** est la source de vérité, jamais l'état React : `enqueue` et `flush` peuvent se croiser                                                                                                                                                       |
| `@mister-guiiug/dev-pwa-config/react/use-action-guard`       | `.js` + `.d.ts` | Ce bouton doit-il être actif — et sinon, **que dire** à l'utilisateur ?                                                                                                                                                                                      |
| `@mister-guiiug/dev-pwa-config/react/use-long-press`         | `.js` + `.d.ts` | `useLongPress` — souris, tactile et clavier ; annulé au déplacement (c'est un scroll), et le clic qui suit est neutralisé                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/react/use-feedback`           | `.js` + `.d.ts` | `useFeedback` — son + vibration par évènement **nommé par l'app** ; deux interrupteurs de préférence                                                                                                                                                         |
| `@mister-guiiug/dev-pwa-config/react/use-wake-lock`          | `.js` + `.d.ts` | `useWakeLock` — garde l'écran allumé, **ré-acquiert** le verrou au retour au premier plan, silencieux sans API                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/react/use-fullscreen`         | `.js` + `.d.ts` | `useFullscreen` : plein écran natif — `supported`, `active` (suit `fullscreenchange`), `enter` / `exit` / `toggle` qui ne lèvent jamais ; promu des boutons de badminton et molkky                                                                           |
| `@mister-guiiug/dev-pwa-config/react/use-pull-to-refresh`    | `.js` + `.d.ts` | `usePullToRefresh` — borné au composant appelant : activable sur **un** écran sans réactiver le geste natif ailleurs                                                                                                                                         |
| `@mister-guiiug/dev-pwa-config/react/use-keyboard-shortcuts` | `.js` + `.d.ts` | `useKeyboardShortcuts` — inertes dans un champ éditable ou pendant une composition IME                                                                                                                                                                       |
| `@mister-guiiug/dev-pwa-config/react/use-shake`              | `.js` + `.d.ts` | `useShake` / `requestMotionPermission` — secousse (DeviceMotion), avec l'autorisation explicite qu'iOS 13+ exige                                                                                                                                             |
| `@mister-guiiug/dev-pwa-config/react/net`                    | `.js` + `.d.ts` | Le statut HTTP porté par une erreur, quelle que soit la bibliothèque : `fetch`, Supabase, Axios, PostgREST                                                                                                                                                   |
| `@mister-guiiug/dev-pwa-config/react/app-footer`             | `.js` + `.d.ts` | `AppFooter` : code source + sponsor, liens externes sécurisés (`rel="noopener noreferrer"`)                                                                                                                                                                  |
| `@mister-guiiug/dev-pwa-config/react/app-header`             | `.js` + `.d.ts` | `AppHeader` : titre en `h1`, retour (lien ou bouton, nommé en sept langues), `leading`, `actions`, collant sur la zone sûre — la mise en page que neuf en-têtes écrivaient chacun                                                                            |
| `@mister-guiiug/dev-pwa-config/react/page-container`         | `.js` + `.d.ts` | `PageContainer` : conteneur de vue centré, paliers de largeur `sm`→`full`, zones sûres iOS — promu de badminton et molkky                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/react/family-apps`            | `.js` + `.d.ts` | `FamilyApps` : les **autres** apps de la famille, depuis le catalogue                                                                                                                                                                                        |
| `@mister-guiiug/dev-pwa-config/react/pwa-install-prompt`     | `.js` + `.d.ts` | `PwaInstallPrompt` — ne s'affiche que si l'installation est possible et n'a pas été refusée                                                                                                                                                                  |
| `@mister-guiiug/dev-pwa-config/react/button`                 | `.js` + `.d.ts` | `Button` — cinq variantes ; cible tactile de 2,75 rem même en `sm`, et `aria-busy` + `aria-disabled` plutôt que `disabled` (qui perd le focus)                                                                                                               |
| `@mister-guiiug/dev-pwa-config/react/badge`                  | `.js` + `.d.ts` | `Badge` : pastille d'état ou d'étiquette — quatre apps en avaient une ; `size` `xs` / `sm` / `md`                                                                                                                                                            |
| `@mister-guiiug/dev-pwa-config/react/card`                   | `.js` + `.d.ts` | `Card` / `CardHeader` : la surface que dix apps avaient (quatre composants, six feuilles `.card`), sur les jetons `--dwc-surface` / `--dwc-border` / `--dwc-radius`                                                                                          |
| `@mister-guiiug/dev-pwa-config/react/field`                  | `.js` + `.d.ts` | `TextField` / `SelectField` / `TextAreaField` — `aria-describedby` référence l'aide **et** l'erreur, au lieu de faire disparaître l'aide                                                                                                                     |
| `@mister-guiiug/dev-pwa-config/react/empty-state`            | `.js` + `.d.ts` | `EmptyState` : état vide **avec l'action suivante**. Non stylé                                                                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/react/error-banner`           | `.js` + `.d.ts` | `ErrorBanner` : message + Réessayer + fermeture ; `severity` distingue le temporaire du permanent                                                                                                                                                            |
| `@mister-guiiug/dev-pwa-config/react/error-boundary`         | `.js` + `.d.ts` | `ErrorBoundary` **découplé** de tout reporter (Sentry passé par `onError`) : un repli et un bouton, pas un écran blanc                                                                                                                                       |
| `@mister-guiiug/dev-pwa-config/react/sheet`                  | `.js` + `.d.ts` | `Sheet` : feuille modale (bas d'écran sur mobile, boîte centrée au-delà) — piège de focus, `Escape`, verrou de défilement                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/react/skeleton`               | `.js` + `.d.ts` | `Skeleton` : esquisser la **forme** du contenu à venir — la page ne saute pas à l'arrivée des données                                                                                                                                                        |
| `@mister-guiiug/dev-pwa-config/react/stat`                   | `.js` + `.d.ts` | `Stat` : chiffre-clé et variation, avec les deux pièges d'a11y que les tableaux de bord de la famille répétaient                                                                                                                                             |
| `@mister-guiiug/dev-pwa-config/react/sync-status-badge`      | `.js` + `.d.ts` | `SyncStatusBadge` — `synced` / `pending` / `offline` / `error`, non stylé                                                                                                                                                                                    |
| `@mister-guiiug/dev-pwa-config/react/segmented-control`      | `.js` + `.d.ts` | `SegmentedControl` : `role="tablist"` — il change une **vue**, pas une valeur de formulaire (pour une valeur : des radios)                                                                                                                                   |
| `@mister-guiiug/dev-pwa-config/react/connection-banner`      | `.js` + `.d.ts` | `ConnectionBanner` — n'apparaît qu'après 1,5 s hors ligne **continu** : les micro-coupures ne clignotent pas                                                                                                                                                 |
| `@mister-guiiug/dev-pwa-config/vite-pwa`                     | `.js` + `.d.ts` | Options `VitePWA()` partagées — la couche PWA que `vite-pwa-base` ne contient pas                                                                                                                                                                            |
| `@mister-guiiug/dev-pwa-config/vite-seo`                     | `.js` + `.d.ts` | ⚠️ **Nom trompeur conservé pour compatibilité** — helpers Vite partagés, rien de spécifiquement SEO                                                                                                                                                          |
| `@mister-guiiug/dev-pwa-config/tailwind-preset`              | `.js`           | Design tokens famille (fonts, safe-areas, breakpoints)                                                                                                                                                                                                       |
| `@mister-guiiug/dev-pwa-config/tailwind-preset.css`          | `.css`          | Preset CSS Tailwind 4 : `@theme` (typo/spacing fluides) + utilitaires `*-safe` / `touch-target`                                                                                                                                                              |
| `@mister-guiiug/dev-pwa-config/tokens.css`                   | `.css`          | Jeu de tokens **neutre** pour le contrat de couleur `--dwc-*` — à importer quand l'app n'a pas déjà sa palette                                                                                                                                               |
| `@mister-guiiug/dev-pwa-config/components.css`               | `.css`          | Habillage **opt-in** des composants, entièrement dans `@layer components` : le CSS non layered de l'app gagne toujours                                                                                                                                       |

## Bin

| Commande            | Rôle                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pwa-icons`         | Génère les icônes PWA (PNG + maskable) depuis un SVG/PNG source. Requiert `sharp`. Ex. `pwa-icons --source public/favicon.svg --maskable`                                                                                                                                                                                                                 |
| `pwa-bundle-budget` | Refuse un build qui dépasse `bundleBudget` (`totalGzipKb` : tout le JS gzip ; `mainChunkKb` : le chunk principal, brut) lu dans `package.json`. Ex. `"build": "vite build && pwa-bundle-budget"` — promu de miss-uwh et mister-qowa                                                                                                                       |
| `pwa-doctor`        | Lit UN dépôt et dit ce qui manque à la checklist du parc — fichiers du gabarit, workflows, et le build (`dist/` : manifeste lié sous le site, PNG 512, `id`, langue, icône iOS, CSP, `404.html`). Trois verdicts (défaut, dette, info), le geste à chaque ligne, code 1 sur un défaut (`--strict` : aussi sur une dette). Ex. `"postbuild": "pwa-doctor"` |

### À quoi sert `pwa-doctor`

Un lint voit le code ; il ne voit pas qu'un manifeste est lié à la racine de
l'origine (404 en production, l'app ne s'installe pas), qu'un `renovate.json`
étend un préréglage dans un dépôt inexistant (Renovate ne fait rien, en
silence), qu'une app routée par chemin n'a pas de `404.html` (un lien profond
sert la page 404 de GitHub). Ce sont des défauts de CONFORMITÉ AU PARC : ils
vivent entre le dépôt, le build et l'hébergeur, et le 02/09/2026 on les a tous
trouvés à la main ([PARC.md](PARC.md)). `pwa-doctor` les cherche en une
seconde, hors ligne, sur un dépôt :

1. **le dépôt** — `.editorconfig`, `.nvmrc`, `.gitattributes` en LF,
   `renovate.json` sur le préréglage du socle, `.lighthouserc.json`, une spec
   a11y si Playwright est là, un `bundleBudget` ;
2. **les workflows** — Lighthouse, `cleanup-runs`, le keep-alive Supabase si
   l'app en dépend, les e2e en CI, les références au socle en `@v4` ;
3. **le build** (`dist/`, après `vite build`) — `lang`, le lien du manifeste
   sous le site, PNG 192/512 et maskable, `id`, la langue du manifeste égale à
   celle de la page, l'icône iOS, `theme-color` par schéma, CSP, Open Graph,
   canonique, `404.html` quand l'app route par chemin.

Trois verdicts : **défaut** (quelqu'un en souffre aujourd'hui), **dette** (le
socle a la réponse, l'app ne l'a pas prise), **info** (une mesure : locales
figées, `console.*`). Chaque ligne dit le geste qui la fait disparaître, pas un
score. En CI, `pwa-doctor --strict` après le build refuse toute dette ; en
local, `npx pwa-doctor` suffit. Il ne mesure ni le poids (`pwa-bundle-budget`)
ni ce que l'hébergeur sert vraiment (`scripts/probe-sites.mjs`, sur le site
publié).

## Reusable workflows GitHub Actions

Hébergés dans [`.github/workflows/`](.github/workflows/) — utilisables par tous les repos de la famille.

| Workflow                     | Rôle                                                                                                                                                                       | Exemple d'appel                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pwa-ci.yml`                 | Format · Lint · Type · Test · Build (+ E2E optionnel)                                                                                                                      | voir [Utilisation](#reusable-workflow-ci)                                                                                   |
| `pwa-deploy.yml`             | Build + déploiement GitHub Pages (avec `VITE_BASE_PATH` auto et repli SPA `404.html`)                                                                                      | voir [Utilisation](#reusable-workflow-deploy)                                                                               |
| `npm-publish.yml`            | Publication npm sur GitHub Packages avec `--provenance`                                                                                                                    | voir [Utilisation](#reusable-workflow-publish)                                                                              |
| `pwa-lighthouse.yml`         | Build + Lighthouse CI (perf/a11y/bp/seo) sur PR                                                                                                                            | `uses: …/pwa-lighthouse.yml@v4` (requiert `.lighthouserc.json`, cf. template)                                               |
| `pwa-supabase-migrate.yml`   | `supabase link` + `db push` (+ Edge Functions en option), sans annulation d'un run en cours — quatre copies en une                                                         | `uses: …/pwa-supabase-migrate.yml@v4` avec les trois secrets `SUPABASE_*` (cf. en-tête du fichier)                          |
| `pwa-supabase-keepalive.yml` | Ping REST tous les trois jours pour qu'un projet Free ne s'endorme pas — **à poser avec la migration** : le 02/09/2026 aucune app ne l'appelait, et `miss-carbook` dormait | `uses: …/pwa-supabase-keepalive.yml@v4` depuis un caller `schedule` (cf. en-tête du fichier)                                |
| `pwa-worker-deploy.yml`      | `wrangler deploy` d'un Cloudflare Worker, sans échec quand le secret manque — deux copies en une                                                                           | `uses: …/pwa-worker-deploy.yml@v4` avec `working-directory`                                                                 |
| `cleanup-runs.yml`           | Élague l'historique Actions du dépôt APPELANT (N runs par workflow) — douze copies identiques en une                                                                       | `uses: …/cleanup-runs.yml@v4` depuis un caller `workflow_dispatch` à `permissions: actions: write` (cf. en-tête du fichier) |

## Composite actions

| Action                                                             | Rôle                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mister-guiiug/dev-pwa-config/.github/actions/setup-pwa@v4`        | Setup Node 22 + scope `@mister-guiiug` + `npm ci` (auth GitHub Packages)                                                                                    |
| `mister-guiiug/dev-pwa-config/.github/actions/supabase-migrate@v4` | Setup CLI Supabase + `link` + `db push` (déploiements custom)                                                                                               |
| `mister-guiiug/dev-pwa-config/.github/actions/firebase-deploy@v4`  | `firebase deploy` ciblé (rules database/firestore, indexes) — auth `service-account-key` (recommandé) ou `token` (déprécié), firebase-tools épinglé via npx |

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

## Renovate — hébergé par le socle

Le 02/09/2026, aucun des dix-huit dépôts n'avait jamais reçu une PR de
Renovate : treize `renovate.json` étendaient un préréglage dans un dépôt
`.github` qui n'existe pas, et l'application Mend n'était pas installée. Depuis,
tout vit ici :

| Fichier                          | Rôle                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renovate/default.json`          | Le PRÉRÉGLAGE : `config:recommended`, tableau de bord, samedi avant 7 h (Paris), mineures et patchs npm groupés, actions groupées, le socle dans une PR à part, sans attendre |
| `renovate/self-hosted.json`      | QUELS dépôts : tous ceux du compte qui portent un `renovate.json` — jamais le miroir `mister-family-map`                                                                      |
| `.github/workflows/renovate.yml` | QUAND : le samedi 04:00 UTC (dans la fenêtre du préréglage), ou à la main avec `dry-run`. Muet sans le secret                                                                 |

Une app étend le préréglage en une ligne :

```json
{ "extends": ["github>mister-guiiug/dev-pwa-config//renovate/default.json"] }
```

Ce qu'il faut UNE fois, au propriétaire : un secret `RENOVATE_TOKEN` sur ce
dépôt — jeton classique avec `repo`, `workflow` et `read:packages` (le socle est
sur GitHub Packages). Si l'application Mend est installée un jour, désactiver
le workflow : les deux ne doivent pas tourner ensemble.

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
  les apps à secrets ; `public-report` (défaut `false`) pour publier en plus le
  rapport sur le stockage public temporaire de Lighthouse CI. Par défaut le
  rapport n'est **pas** publié : il reste joint en artefact du run.
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

**L'étape 1 conditionne les deux autres, et c'est le piège.** Un caller posé
sans la table répond `HTTP 404` : le ping échoue, le projet continue de
s'endormir, et rien ne distingue ce cas d'une panne réseau. Le 02/09/2026, deux
dépôts avaient le caller et les secrets sans la table — le garde-fou ne gardait
rien. **Vérifier après la mise en place**, sans attendre le cron :

```bash
gh workflow run supabase-keepalive.yml --repo <owner>/<app>
```

Le run doit finir vert avec `Supabase keep-alive OK (SELECT keep_alive → 200)`.

Note : un cron GitHub est désactivé après 60 j sans commit sur le dépôt (les
commits Renovate suffisent ; sinon relancer via `workflow_dispatch`).

## Utilisation

### `eslint.config.js`

```js
// Projet React
export { default } from '@mister-guiiug/dev-pwa-config/eslint-react';

// Projet non-React
export { default } from '@mister-guiiug/dev-pwa-config/eslint-base';
```

### `prettier.config.js`

```js
export { default } from '@mister-guiiug/dev-pwa-config/prettier';
```

### `tsconfig.app.json`

```jsonc
// Projet React
{
  "extends": "@mister-guiiug/dev-pwa-config/tsconfig-app-react",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  },
  "include": ["src"]
}

// Projet non-React
{
  "extends": "@mister-guiiug/dev-pwa-config/tsconfig-app",
  "include": ["src"]
}
```

### `tsconfig.node.json`

```jsonc
{
  "extends": "@mister-guiiug/dev-pwa-config/tsconfig-node",
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
import { baseTestOptions } from '@mister-guiiug/dev-pwa-config/vitest-base';

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
import { baseBrowserTestOptions } from '@mister-guiiug/dev-pwa-config/vitest-browser-base';

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
import { definePwaPlaywrightConfig } from '@mister-guiiug/dev-pwa-config/playwright-base';

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
import { basePlaywrightOptions } from '@mister-guiiug/dev-pwa-config/playwright-base';

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
import { baseTestOptions, coveragePreset } from '@mister-guiiug/dev-pwa-config/vitest-base';

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
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';

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

      // Le script anti-FOUC, injecté en tête de <head>. `legacyKeys` migre la
      // préférence déjà enregistrée : SIX clés distinctes existent dans la
      // famille, et sans elles l'adoption la perd en silence.
      themeBoot: { storageKey: 'dwc_theme', legacyKeys: ['theme'] },

      // Deux <meta name="theme-color"> par schéma, qui remplacent celle de
      // l'index. Dix apps sur quinze gardaient une barre claire en sombre.
      themeColor: { light: '#0f766e', dark: '#0b1220' },
    }),
  ],
});
```

**Le consentement précède le tag.** Les fragments GTM/GA4 sont désormais
précédés d'un `gtag('consent', 'default', …)` où tous les signaux sont `denied`.
C'est la seule position où le mode consentement de Google en tient compte : une
commande postérieure au chargement n'a pas d'effet rétroactif. `consent: false`
restaure le comportement d'avant, pour un déploiement qui gère le consentement
ailleurs (une CMP, GTM).

Placeholders remplacés dans `index.html` : `__ANALYTICS_HEAD__` (dans `<head>`),
`__ANALYTICS_BODY__` (début de `<body>`), `__SEO_HOME_URL__`, `__SEO_LOGO_URL__`,
`__PWA_ICON_QS__`. Génère `sitemap.xml` + `robots.txt` (+ `llms.txt` si `llms`).
Variables d'env de build : `VITE_GTM_CONTAINER_ID`, `VITE_GA_MEASUREMENT_ID`,
`VITE_PUBLIC_SITE_ORIGIN`, `VITE_BASE_PATH`. Le plugin est un **sur-ensemble** des
anciens plugins maison (mister-puzzle `vite-plugin-seo.ts`, miss-carbook
`htmlTrackingPlugin()`), désormais factorisés ici.

### Mesure d'audience (`@mister-guiiug/dev-pwa-config/analytics`)

Le tag était posé, la mesure n'existait pas. Mesure sur les seize apps : neuf
portent les marqueurs `__ANALYTICS_*__`, trois ont recopié un extrait `gtag` en
dur, sept n'ont rien — et **aucune** n'envoie le moindre événement ni la moindre
vue de page après le chargement initial.

```ts
// main.tsx
import {
  initAnalytics,
  setAnalyticsConsent,
} from '@mister-guiiug/dev-pwa-config/analytics';

initAnalytics({ gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID });
// Rien n'est injecté ici : ni script, ni requête, ni cookie.

// …quand l'utilisateur accepte, où que ce soit dans l'app :
setAnalyticsConsent({ analytics: true }); // le tag est chargé à cet instant
```

```tsx
// Une vue de page par navigation — GA4 n'en envoie qu'une par chargement de
// document, donc toute la navigation d'une PWA est invisible sans ce hook.
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';

usePageViews(useLocation().pathname);

// Et les événements métier :
trackEvent('partie_terminee', { score, duree_s });
```

Trois règles que le module tient à votre place :

- **Rien avant l'accord.** `trackEvent` et `trackPageView` renvoient `false`
  tant que `analytics_storage` n'est pas accordé, et le `<script>` n'est même
  pas créé. Les hooks peuvent donc être montés sans condition.
- **GTM l'emporte sur GA4** quand les deux identifiants sont fournis — GA4 se
  configure _dans_ GTM, sinon chaque événement est compté deux fois. C'est déjà
  l'arbitrage des fragments de build ; il est le même ici.
- **Une seule vue par navigation.** GA4 est configuré avec
  `send_page_view: false`, pour que la page d'entrée passe par le même chemin
  que les autres au lieu d'être comptée deux fois.

`cspPlugin({ analytics: true })` autorise déjà les hôtes nécessaires : le script
injecté vient de `googletagmanager.com` et n'ajoute aucun script en ligne à
hacher.

### `vite-pwa` — options `VitePWA()` partagées

```ts
import { pwaBaseOptions } from '@mister-guiiug/dev-pwa-config/vite-pwa';

VitePWA(
  pwaBaseOptions({
    id: 'miss-uwh', // identifiant du dépôt : base, scope, et couleurs du thème
    name: 'Miss UWH — Bilan comptable',
    shortName: 'Miss UWH',
    description: 'Bilan comptable saisonnier d’un club de hockey subaquatique.',
    categories: ['finance', 'productivity', 'sports'],
    shortcuts: [{ name: 'Journal', url: '#/finances/journal' }],
  })
);
```

Relevé du 23/08/2026 sur les seize apps, avant ce module :

|                   |                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `registerType`    | 10 en `prompt`, 4 en `autoUpdate`, 2 sans                                                                              |
| `runtimeCaching`  | 5 apps sur 16 en déclarent un                                                                                          |
| manifest          | 3 apps sans `display` ni `theme_color`                                                                                 |
| mise à jour du SW | **15 apps sur 16** recâblent `virtual:pwa-register` à la main, alors que `react/use-update-prompt` existe (1 adoptant) |

Trois défauts méritent d'être expliqués, parce qu'on pourrait les « améliorer »
à tort :

- **`registerType: 'prompt'`** — seul mode compatible avec `use-update-prompt` +
  `UpdatePromptBanner` que le paquet livre. En `autoUpdate`, l'app se recharge
  sous les doigts de l'utilisateur, parfois au milieu d'une saisie.
- **Aucune mise en cache d'API par défaut** — mettre en cache une réponse
  authentifiée expose les données d'un utilisateur au suivant sur un appareil
  partagé. Les origines à mettre en cache se déclarent (`apiOrigins`), et
  passent en `NetworkFirst` : une donnée périmée servie en ligne est un bug
  fonctionnel, pas une optimisation.
- **`theme_color` et `background_color` sont LUS dans `themes.js`** quand l'app
  y figure, plutôt que recopiés. Cinq manifests sur treize avaient divergé du
  relevé, sans qu'on puisse distinguer le choix délibéré de l'oubli. Une couleur
  passée explicitement l'emporte toujours — le choix reste possible, il devient
  écrit.

Le module n'importe **pas** `vite-plugin-pwa` : il renvoie un objet d'options
ordinaire, que l'app passe à son propre `VitePWA()`.

> **`vite-pwa-base` ne contient rien de PWA** : ni manifest, ni service worker,
> ni stratégie de cache — c'est du SEO et de l'analytics. Il est désormais aussi
> exporté sous `./vite-seo`, qui dit ce qu'il fait. `./vite-pwa-base` reste
> valide tant que des apps l'importent.

### `vite-csp` — Content-Security-Policy par hash

```ts
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    pwaSeoPlugin({ siteName: 'Mister Puzzle' }),
    cspPlugin({
      dev: command === 'serve',
      connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
      analytics: true, // ← si pwaSeoPlugin injecte GTM ou GA4
    }),
    VitePWA({ ... }),
  ],
}));
```

`cspPlugin` doit venir **après** `pwaSeoPlugin` : il hashe le HTML final, donc
les scripts inline injectés en amont.

**`analytics: true` n'est pas cosmétique.** GA4 charge un `<script src>` externe
et GTM un `<iframe>` de repli `noscript` : `default-src 'self'` les bloque tous
les deux, sans la moindre erreur de build. Activer les deux plugins sans cette
option coupe donc l'analytics **en silence**. L'option ajoute exactement les
hôtes que `pwaSeoPlugin` injecte (`script`, `img`, `connect`, `frame`).

**Ce qu'une CSP en `<meta>` ne peut pas faire.** La spécification exclut
`frame-ancestors`, `report-uri` et `sandbox` d'une politique délivrée par
balise : le navigateur les **ignore**. Le template `index.html` de ce paquet
portait `frame-ancestors 'none'` — une protection anti-clickjacking qui n'a
jamais existé, avec toute l'apparence du contraire. Le plugin **retire** désormais
ces trois directives et le signale, plutôt que de les relayer. Huit apps de la
famille en passaient une : échouer aurait cassé huit builds pour retirer
quelque chose que le navigateur ignorait déjà.

Pour protéger réellement du clickjacking, il faut un **en-tête HTTP** :

```jsonc
// firebase.json — pour les apps déployées sur Firebase Hosting
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "frame-ancestors 'none'",
          },
        ],
      },
    ],
  },
}
```

**GitHub Pages ne permet aucun en-tête personnalisé** : les apps qui y sont
déployées n'ont pas de protection anti-clickjacking effective. C'est un fait à
connaître, pas à masquer derrière une directive inerte.

### Tests a11y (axe-core) — `playwright-a11y`

```ts
// e2e/a11y.spec.ts  (cf. templates/e2e/a11y.spec.ts ; npm i -D @axe-core/playwright)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

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
export { default } from '@mister-guiiug/dev-pwa-config/commitlint';
```

### `lint-staged.config.js`

```js
export { default } from '@mister-guiiug/dev-pwa-config/lint-staged';
```

### `src/index.css` (Tailwind 4)

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';

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
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';
@import '@mister-guiiug/dev-pwa-config/components.css'; /* ← opt-in */
```

Ce seul import donne déjà un rendu correct **en clair et en sombre**, sans
configuration : les replis passent par les couleurs système CSS (`Canvas`,
`CanvasText`, `GrayText`), qui suivent `color-scheme`.

**Aucune dépendance à Tailwind, et c'est vérifiable.** La feuille ne contient ni
`@apply`, ni `@tailwind`, ni `theme()` : un `@import` CSS suffit, y compris dans
une app qui n'a pas Tailwind du tout (`mister-quota`, en Electron, l'a prise à
ce titre). Elle lit bien huit variables de l'échelle fluide du preset
(`--text-fluid-*`, `--spacing-fluid-*`) **en plus** des quinze jetons du
contrat, mais toutes portent un repli — sans le preset, les tailles sont figées,
rien ne casse. Et comme tous ses sélecteurs sont portés par `[data-dwc="…"]`,
elle ne peut entrer en collision avec aucun style existant.

**Le plus simple : importer aussi `tokens.css`**, qui livre un jeu de valeurs
neutre pour les quinze variables du contrat, clair et sombre, au contraste
vérifié en CI (`test/tokens.test.mjs`) :

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';
@import '@mister-guiiug/dev-pwa-config/tokens.css'; /* ← valeurs par défaut */
@import '@mister-guiiug/dev-pwa-config/components.css';

/* Puis la teinte de l'app, deux lignes : */
:root {
  --dwc-primary: var(--color-primary);
  --dwc-primary-contrast: #fff;
}
```

`tokens.css` n'impose **aucune couleur de marque** : sa primaire est une ardoise
neutre, faite pour être remplacée. Il traite les trois états de thème — choix
clair, choix sombre, et réglage « système » qui ne pose aucun attribut — et
distingue deux filets : `--dwc-border` sépare (discret), `--dwc-border-strong`
désigne le contour d'un contrôle (3:1, WCAG 1.4.11).

Pour brancher le contrat sur les variables existantes de l'app plutôt que sur
les valeurs par défaut :

```css
:root {
  --dwc-surface: var(--uwh-surface);
  --dwc-surface-2: var(--uwh-surface-2);
  --dwc-text: var(--uwh-text);
  --dwc-text-soft: var(--uwh-text-soft);
  --dwc-border: var(--uwh-border);
  --dwc-border-strong: var(--uwh-border-strong);
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

#### Contraste forcé et impression

Deux rendus que personne ne regarde, et qui remplacent les couleurs sans
prévenir. Le fichier les traite ; les tests empêchent la récidive.

| Mode                                          | Ce qui casse par défaut                                                                                                                                                                                                                            | Ce que le fichier fait                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contraste forcé** (`forced-colors: active`) | `transparent` n'est **pas** remplacé : le bouton primaire perd son aplat et garde un contour invisible. `box-shadow` disparaît, le panneau modal se confond avec son voile. Le squelette et la pastille de synchro n'existaient que par leur fond. | Contour en `currentColor`, `outline` intérieur sur le panneau et le squelette, survol et état désactivé sur les paires système (`Highlight`, `GrayText`). |
| **Impression** (`@media print`)               | Les fonds sont supprimés, la couleur du texte non : un libellé en `--dwc-primary-contrast` s'imprime **blanc sur blanc**.                                                                                                                          | Texte sur aplat repassé en encre système, bannières d'installation et de mise à jour masquées, animations figées.                                         |

Aucun `forced-color-adjust: none` — figer nos teintes reviendrait à passer outre
le réglage de l'utilisateur. Un test le vérifie.

### Persistance locale (`/storage`, `/versioned-store`, `/idb`, `/backup`)

Quatre couches, une par besoin — et les en-têtes des modules se renvoient les
uns aux autres :

- **`/storage`** — une préférence, un réglage : `createStore(prefix)` absorbe
  les quatre façons dont `localStorage` lève, le préfixe isole les apps du
  domaine partagé.
- **`/versioned-store`** — **l'instantané complet d'une app**. Le besoin le
  plus recopié du parc après l'accès au stockage : miss-uwh et miss-genius en
  portaient deux copies jumelles (enveloppe versionnée + migrations + zod), et
  miss-lookhouse montrait le piège inverse — version inconnue, données jetées.
- **`/idb`** — du volume, des `Blob` (avatars, historiques sans plafond),
  réécrit cinq fois dans le parc. Best-effort : rien ne lève jamais.
- **`/backup`** — le filet : tout le magasin dans un fichier, et retour.
  Un coffre (`/secure-storage`) complète pour les secrets.

```ts
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { appDataSchema } from './schema';

const store = createVersionedStore({
  store: 'monapp_', // ou un Store existant de /storage
  version: 2,
  migrations: {
    // Indexées par version SOURCE ; chacune monte d'UN cran, le magasin
    // tient le compte. La 0 reçoit les données d'avant l'enveloppe.
    0: data => ({ ...(data as object), periodes: [] }),
    1: data => remapIds(data),
  },
  validate: data => appDataSchema.parse(data), // injectée — zod reste chez l'app
  seed: () => createInitialData(),
});

const data = store.load(); // migré, validé, persisté — jamais une exception
store.save(next); // false si le stockage a refusé
const json = store.export(); // fichier réimportable par store.import(json)
```

Ce que `load()` promet : **jamais de destruction silencieuse**. Version
d'après, donnée invalide, JSON tronqué — l'original est copié sous
`{clé}.backup-…` (clés déterministes, donc bornées) AVANT le repli sur le
seed. `clear()` efface l'instantané **et** ses copies.

```ts
import { createIdb } from '@mister-guiiug/dev-pwa-config/idb';

const idb = createIdb('mister-molkky'); // le nom EST l'isolation
await idb.set('history', matches); // false si refusé, ne lève jamais
const history = await idb.get('history', []);
await idb.setBlob('avatar:j1', file); // les Blob ne passent pas par JSON
```

### Corrélation, journal et écran de crash (`/correlation`, `/logger`)

Le socle portait déjà quatre canaux d'observabilité — frontière d'erreur,
journal local, relais Sentry, télémétrie — qui décrivaient le même incident
**sans jamais pouvoir être rapprochés**. Le ticket dit « ça a planté », Sentry
montre une trace, GA montre une session, le serveur montre une requête en
erreur : rien ne dit que c'est le même événement. Un identifiant y remédie.

```ts
import { installCorrelation } from '@mister-guiiug/dev-pwa-config/correlation';
import { installObservability } from '@mister-guiiug/dev-pwa-config/react/observability';

await installObservability({ dsn: import.meta.env.VITE_SENTRY_DSN });
const { sessionId, fetch: tracedFetch } = await installCorrelation({
  analytics: true, // opt-in : associe l'identifiant au profil analytique
});
```

Après cet appel, le **même** identifiant apparaît dans :

| Canal              | Ce qu'il porte                                    |
| ------------------ | ------------------------------------------------- |
| Erreurs et Sentry  | `correlationSessionId` en contexte de session     |
| Requêtes sortantes | `X-Correlation-Id` (par requête) + `X-Session-Id` |
| Télémétrie GA4     | propriété `correlation_session_id`                |
| Écran de crash     | la référence que l'utilisateur peut citer         |

`ObservabilityBoundary` affiche la référence automatiquement ; `reference: false`
la retire, `reference: '…'` la remplace.

**Pas de contexte asynchrone implicite.** Le navigateur n'a pas d'équivalent
d'`AsyncLocalStorage` : une « corrélation courante » en variable de module
serait fausse dès deux requêtes concurrentes — un identifiant trompeur est pire
qu'un identifiant absent. L'identifiant de session est donc implicite (il ne
change pas) et celui de requête explicite : `withCorrelation` en produit un par
appel et le rend à ses observateurs.

```ts
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';

const log = createLogger('favoris');
log.warn('quota atteint', { count: 51 });
// → fil d'Ariane : favoris.warn « quota atteint » { count: 51, correlationId }
```

Le journal n'est **pas** un second système : chaque ligne finit dans le fil
d'Ariane de `breadcrumb`, donc dans l'erreur remontée — mêmes masquages, même
transport, rien à vider séparément.

### Export PDF (`@mister-guiiug/dev-pwa-config/pdf`)

Un vrai binaire `application/pdf`, sans bibliothèque — promu de mister-doc, où
il produit les plannings mensuels et les compteurs d'équipe. Page A4 portrait,
Helvetica / Helvetica-Bold (fontes standard, rien à embarquer), repère
**haut-gauche** comme à l'écran, et une table `xref` dont les offsets sont
relevés sur les octets réellement écrits : le fichier s'ouvre dans les
lecteurs stricts, pas seulement dans les tolérants.

```ts
import {
  PAGE,
  PdfContent,
  buildPdf,
  downloadPdf,
} from '@mister-guiiug/dev-pwa-config/pdf';

const page = new PdfContent();
page.fillRect(34, 64, PAGE.w - 68, 20, [0.42, 0.12, 0.42]); // bandeau
page.text(40, 78, 9.5, 'Compteurs — Juillet', { bold: true, color: [1, 1, 1] });
page.line(34, 90, PAGE.w - 34, 90, 0.8, 0.55);
downloadPdf(buildPdf([page]), 'compteurs-juillet.pdf');
```

Une page par `PdfContent` ; `buildPdf([])` rend une page vide plutôt qu'un
binaire invalide. Le texte est encodé WinAnsi (CP1252) : Latin-1, **plus** la
ponctuation typographique et quelques lettres transcodées sur 0x80–0x9F (`€`,
`’`, `“ ”`, `—`, `–`, `…`, `œ`, `™`…). Hors de là (émoji, grec…), le
caractère devient `?`. Pas d'images, pas de compression, pas d'autres
fontes — des tableaux qui s'ouvrent et s'impriment partout.

### Export Excel (`@mister-guiiug/dev-pwa-config/xlsx`)

Là où le dialecte `excel-fr` de `./csv` règle l'**ouverture** en colonnes,
`./xlsx` règle le **type** des cellules : les nombres sont réellement typés —
donc sommables dans le tableur — et l'en-tête est en gras. Promu de
mister-doc : un vrai classeur Office Open XML (archive ZIP « stored », CRC32
calculé, parties XML minimales), sans dépendance — là où charger SheetJS par
CDN fait venir une bibliothèque entière d'un domaine tiers pour écrire un
tableau.

```ts
import { buildXlsx, downloadXlsx } from '@mister-guiiug/dev-pwa-config/xlsx';

const bytes = buildXlsx({
  name: 'Compteurs Juillet', // assaini : ≤ 31 caractères, sans \ / ? * [ ] :
  header: ['Médecin', 'Heures'],
  rows: [
    ['Alice', 12],
    ['Bob', 7],
  ],
});
downloadXlsx(bytes, 'compteurs-juillet.xlsx');
```

**Plusieurs onglets** : passer un tableau. Les noms sont assainis _puis_
dédoublonnés (Excel refuse le classeur entier si deux onglets portent le même
nom, casse comprise), et `header` est facultatif — une feuille de bilan n'a
qu'un titre sur une cellule, des lignes vides et des lignes de deux colonnes.
Chaque ligne porte la longueur qu'elle a ; rien n'est aligné sur l'en-tête.

```ts
const bytes = buildXlsx([
  { name: 'Bilan', rows: [['BILAN 2025-2026'], [], ['Recettes', 1234.5]] },
  { name: 'Compte', header: ['Date', 'Libellé', 'Montant'], rows: journal },
  { name: 'Evolution', header: ['Saison', 'Solde'], rows: parSaison },
]);
```

L'export est **déterministe** (date d'archive figée) : mêmes feuilles, mêmes
octets — et un objet seul rend exactement les mêmes octets que le tableau
d'un élément. Des chaînes et des nombres, un seul style ; pas de formules, pas
de dates typées, pas de largeurs de colonnes, pas de lecture.

### Agenda iCalendar (`@mister-guiiug/dev-pwa-config/ical`)

Un `.ics` (RFC 5545) qui s'importe dans Google Agenda, Outlook et Apple
Calendar — promu de **quatre** générateurs écrits séparément (`bac-sable`,
`mister-footcoach`, `miss-uwh`, `mister-doc`), dont aucun ne pliait ses lignes
correctement et dont deux n'écrivaient pas de `DTSTAMP`.

```ts
import { ICAL_MIME, toIcalendar } from '@mister-guiiug/dev-pwa-config/ical';
import { downloadText } from '@mister-guiiug/dev-pwa-config/download';

const ics = toIcalendar(
  [
    // Une DATE seule → journée entière ; le DTEND part au lendemain.
    { uid: 'ag-2026', summary: 'Assemblée générale', start: '2026-01-31' },
    // Une heure SANS fuseau → flottante : 10 h reste 10 h en déplacement.
    {
      uid: 'match-12',
      summary: 'vs FC Rivale',
      start: '2026-05-10T10:00',
      durationMinutes: 120,
      location: 'Stade, 1 rue X',
      status: 'CONFIRMED',
    },
    // Un `Date` → un INSTANT, écrit en UTC.
    {
      uid: 'sortie-3',
      summary: 'Sortie',
      start: new Date(),
      durationMinutes: 90,
    },
  ],
  { name: 'Saison 2026', uidDomain: 'mon-app' }
);
downloadText(ics, 'saison-2026.ics', ICAL_MIME);
```

**La date choisit sa nature**, et c'est le seul réglage qui compte : une date
ISO donne une journée entière, un horodatage sans décalage une heure
**flottante** (18 h là où on la lit), un `Date` ou un horodatage avec décalage
un **instant** UTC. Les trois se lisent à la longueur de la valeur produite.

Quatre pièges sont traités d'office : le `DTEND` d'une journée entière est
**exclusif** (un événement du 31 janvier finit le 1er février) ; le pliage se
compte en **octets** — c'est `foldLine` de `./vcard`, même texte de RFC, donc
pas de mojibake sur les accents ; `DTSTAMP` est obligatoire, unique pour tout
le fichier et **injectable** (`{ dtstamp }`) pour un export testable ; et
`URL` n'est pas une valeur texte, donc jamais échappée.

Pour un **flux d'abonnement** servi par une fonction serveur, les options
`method: 'PUBLISH'`, `timeZone: 'Europe/Paris'` et `refreshInterval: 'PT1H'`
écrivent l'en-tête attendu (`X-WR-TIMEZONE`, `REFRESH-INTERVAL` **et**
`X-PUBLISHED-TTL`, que les clients n'honorent pas tous pareil) ; les
événements observés portent `transparent: true`, sans quoi un mois
d'abonnement affiche un agenda entièrement occupé. `toIcalEvent` rend un
`VEVENT` seul quand la composition est faite ailleurs.

Pas de `RRULE`, pas de `VALARM`, pas de `VTIMEZONE` : aucune des quatre apps
n'en émet — la récurrence est dépliée en occurrences par le domaine, en
amont. `unfoldLines` et `unescapeText` suffisent à relire ce qu'on a écrit.

### Coffre local chiffré (`/secure-storage`)

`localStorage` part dans les sauvegardes, se synchronise, et se lit d'une
ligne par n'importe quel script de la page : un jeton d'accès y est en clair.
Promu de `miss-supaboss` (184 lignes en production qui chiffrent des PAT),
`createVault()` range des secrets **chiffrés au repos** : AES-256-GCM, clé
dérivée d'une phrase secrète (PBKDF2-SHA-256, 210 000 itérations) et gardée
**en mémoire seule**. Web Crypto suffit — aucune dépendance, navigateurs et
Node ≥ 19.

```ts
import { createVault } from '@mister-guiiug/dev-pwa-config/secure-storage';

const vault = createVault({ prefix: 'app_vault_' });
await vault.enable('phrase choisie par l’utilisateur'); // une fois
await vault.setItem('pat', token); // chiffre, puis range

// …session suivante :
if (await vault.unlock(saisie)) {
  const pat = await vault.getItem<string>('pat');
}
```

`enable` / `unlock` / `lock` / `disable` tiennent le cycle de vie,
`encrypt`/`decrypt` exposent le chiffrement brut, `keys()` liste les entrées.
Le nombre d'itérations est **persisté et relu** : relever la constante dans
une version future ne rend pas illisibles les coffres existants. `createVault`
rend une **instance** — deux coffres peuvent coexister (jetons, brouillon…)
sans partager leur phrase — et le stockage passe par `./storage`, qui absorbe
déjà les quatre façons dont `localStorage` lève.

**Ce que ça protège, et ce que ça ne protège pas** — l'en-tête du module
l'énonce avant l'API, et il faut le redire ici :

- ✔ la fuite **passive** : sauvegarde ou synchronisation du stockage, lecture
  par un script tiers, appareil perdu ou revendu ;
- ✘ un **XSS actif** pendant une session déverrouillée : le script appelle
  `decrypt` comme le ferait l'app. Le chiffrement au repos n'est **pas** une
  parade au XSS, et rien de ce qui vit dans la page ne l'est ;
- ✘ la **phrase oubliée** : les données sont **irrécupérables** — c'est le
  prix d'une clé qui n'est stockée nulle part. Le dire à l'utilisateur avant
  qu'il choisisse sa phrase, pas après.

Autrement dit : ceci élève le coût d'une fuite de stockage ; cela ne remplace
ni une CSP, ni un jeton à courte durée de vie, ni un secret côté serveur.

### Client Supabase (`/supabase-client`)

Cinq apps (miss-uwh, miss-lookhouse, mister-molkky, mister-doc, le bac-sable)
réécrivent la même fabrique : lire `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`,
créer le client une fois, le garder. Et deux apps portent **mot pour mot** le
même commentaire — « l'init au chargement du module tuait l'app avant
`createRoot()` » : variable manquante, exception dans le chunk d'entrée, écran
blanc sans diagnostic, Lighthouse mort en NO_FCP. La fabrique applique donc la
doctrine : **rien ne s'exécute à l'import** — ni lecture bloquante, ni SDK, ni
`createClient`.

```ts
// src/lib/supabase.ts — l'intégralité du fichier qu'une app garde
import { createSupabaseClientFactory } from '@mister-guiiug/dev-pwa-config/supabase-client';

export const supabase = createSupabaseClientFactory({
  env: import.meta.env,
  auth: { flowType: 'pkce' }, // fusionné sur persistSession + autoRefreshToken
  correlated: true, // X-Correlation-Id + X-Session-Id sur chaque requête
});

// …plus tard, au premier usage réel :
const client = await supabase.getClient();
```

| Décision                         | Pourquoi                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getClient()` asynchrone         | `@supabase/supabase-js` (~120 Ko, peer **optionnelle**) est importé dynamiquement au premier appel — hors du bundle initial, le motif de mister-molkky |
| La promesse est gardée           | deux `await` concurrents ne créent qu'**un** client (et une seule connexion realtime, qui compte dans le quota du projet)                              |
| Rejet **nommé** si mal configuré | `getClient()` rejette en citant les variables manquantes — tard, là où une ErrorBoundary sait l'afficher                                               |
| `missingConfig` fait foi         | même juge que `./backend` : `SUPABASE_ENV_KEYS` se passe tel quel au `requires` d'un `createBackendSelector`, qui retombe en local proprement          |
| `correlated`                     | enveloppe le `fetch` du client via `./correlation` : le journal serveur et l'erreur client désignent le même incident                                  |

Le client obtenu s'**injecte** ensuite tel quel dans `realtime/supabase`
(descente) et dans le `process` d'une file `sync-queue` (montée) : une app n'a
besoin que d'un client.

### File d'écritures hors-ligne (`/sync-queue`)

Le chemin **montant** de la synchronisation — `realtime/` est le descendant.
Promu de miss-uwh (la référence : file persistante, drain sérialisé, lettres
mortes) ; la copie « inspirée » de miss-lookhouse avait **perdu le retrait
exponentiel** en route — la preuve qu'une file recopiée diverge — et
mister-puzzle montrait le même besoin côté Firebase : le module est donc
**agnostique du transport**, `process` est injecté.

```ts
import { createSyncQueue } from '@mister-guiiug/dev-pwa-config/sync-queue';
import { createStore } from '@mister-guiiug/dev-pwa-config/storage';

const queue = createSyncQueue({
  store: createStore('uwh_sync_'), // la persistance ET la source de vérité
  process: op => repository.apply(op), // Supabase, Firebase, HTTP — au choix
  keyOf: op => (op.id ? `${op.kind}:${op.id}` : null),
  onChange: ({ pending, dead }) => badge.update(pending, dead),
});

queue.start(); // draine, puis rejoue à chaque retour en ligne
queue.enqueue(op); // → l'entrée, ou `null` si le plafond est atteint
```

Ce que la file garantit — et que les copies rataient :

- **aucune écriture perdue** : le `Store` est relu à chaque tour, l'élément
  traité est retiré **par identifiant** — jamais `slice(1)` sur un instantané ;
  quand le stockage refuse (quota, mode privé), la session continue en mémoire ;
- **pas de tête bloquante** : un rejet durable (RLS, 4xx hors 408/429 — la
  politique est `defaultShouldRetry` de `react/net`) part en **lettre morte**,
  consultable (`deadLetters()`) et rejouable (`requeueDead()`), et la file
  continue ;
- **le rejeu se reprogramme seul** : retrait exponentiel dispersé —
  `backoffDelay` de `./realtime`, le même que la reconnexion — sans attendre un
  évènement `online` qui ne vient jamais quand c'est le serveur qui tousse ;
- **une entité, une opération** : `keyOf` fusionne les écritures en attente sur
  la même entité, seule la dernière part (upsert idempotent) ;
- **pas de croissance sans fin** : au-delà de `maxQueueSize`, `enqueue` rend
  `null` — refuser visiblement vaut mieux que jeter en silence.

`react/use-offline-queue` reste la variante **React** (un composant qui re-rend
au fil de la file) ; `sync-queue` est la version hors-React, plus complète,
pour une couche backend ou un service de synchronisation.

### Temps réel (`/realtime`, `/realtime/supabase`)

Le chemin **descendant** : recevoir ce que les autres ont changé, et savoir
quand on ne le reçoit plus. `createChannel` est le port — reconnexion à retrait
exponentiel dispersé, rattrapage du trou laissé par la coupure, sonde au réveil
de l'onglet ; `realtime/supabase`, `realtime/firebase` et `realtime/local` sont
les adaptateurs, comme `MapProvider` l'est pour Leaflet et MapLibre.

```ts
import { createChannel } from '@mister-guiiug/dev-pwa-config/realtime';
import { supabaseRealtimeTransport } from '@mister-guiiug/dev-pwa-config/realtime/supabase';

const transport = supabaseRealtimeTransport({
  client: supabase, // celui de l'app — jamais un second
  table: 'comments',
  filter: `candidate_id=eq.${id}`,
});

const canal = createChannel({ ...transport, onMessage: apply });
void canal.start();
```

**Deux abonnements à la même table ne se marchent plus dessus.** Le sujet du
canal valait `dwc:<schema>:<table>`, sans le filtre. Or `client.channel(sujet)`
REND le canal déjà enregistré sous ce sujet, `subscribe()` ne fait RIEN sur un
canal qui n'est pas `closed`, et `removeChannel()` est asynchrone. Un fil de
commentaires par candidat et un journal par espace de travail recevaient donc
le même canal : le second restait muet, sans la moindre erreur. Le sujet porte
maintenant le filtre — pour la lisibilité en débogage — et un numéro monotone —
pour l'unicité, y compris entre deux abonnements identiques. `channelName`
renomme la part lisible ; le numéro, lui, ne se retire pas.

**Une tentative qui échoue est refermée.** Avant `SUBSCRIBED`, l'appelant n'a
aucune poignée de fermeture : si le canal n'est pas retiré ici, il reste dans
`client.channels` pour toujours — un canal orphelin par montage, et React en
monte deux en développement. Un `CHANNEL_ERROR`, un `TIMED_OUT`, un `CLOSED`
mort-né ou une levée pendant l'abonnement retirent désormais le canal avant de
rejeter.

> ⚠ **`catchUp` n'applique pas `filter`.** L'abonnement est filtré côté
> serveur, le rattrapage ne l'est pas : il interroge la table sur la seule
> colonne curseur. Là où la RLS laisse passer plusieurs espaces — le cas
> **normal** d'une app multi-espaces —, le rattrapage fait entrer des lignes
> d'un **autre** espace que celui écouté, sans qu'aucune erreur ne le dise. La
> RLS tient : ce n'est pas une fuite, c'est un mélange, et il ne se voit qu'au
> retour d'une veille. Soit l'app refiltre ce que `catchUp` rend, soit elle ne
> câble que `connect` et recharge l'écran avec **sa** requête — déjà filtrée —
> à chaque retour à `live`.

### Carte (`@mister-guiiug/dev-pwa-config/map`)

Deux axes **indépendants**, qu'on confond souvent :

| Axe                  | Choix                                          | Où il se fait                          |
| -------------------- | ---------------------------------------------- | -------------------------------------- |
| **Moteur de rendu**  | Leaflet (DOM) · MapLibre GL (WebGL)            | le sous-chemin importé                 |
| **Source de tuiles** | OpenStreetMap raster · style vectoriel · autre | l'option `tiles` passée à l'adaptateur |

OpenStreetMap n'est pas un moteur : c'est une **source de tuiles**, utilisable
par les deux moteurs. Un seul adaptateur est embarqué dans le bundle : celui
dont on importe le sous-chemin.

> **Avec MapLibre, gardez `pwaSeoPlugin()` dans vos plugins Vite** : il sort
> `/map/maplibre` du pré-bundling, qui ne sait pas interpréter le suffixe
> `?worker&url` par lequel l'adaptateur résout le worker MapLibre. Sans cette
> exclusion, `vite dev` échoue au démarrage — alors que le build de
> production, lui, fonctionne. Rien à ajouter si le plugin est déjà là.

```ts
// 1. Choisir le moteur PAR L'IMPORT (l'autre n'est jamais embarqué)
import { createMapLibreMapProvider } from '@mister-guiiug/dev-pwa-config/map/maplibre';
// import { createLeafletMapProvider } from '@mister-guiiug/dev-pwa-config/map/leaflet';
import { osmRasterTiles } from '@mister-guiiug/dev-pwa-config/map';
import 'maplibre-gl/dist/maplibre-gl.css'; // ou 'leaflet/dist/leaflet.css'

const provider = createMapLibreMapProvider({ tiles: osmRasterTiles() });
await provider.mount(container, { center: { lat: 46.6, lng: 2.4 }, zoom: 6 });
provider.setMarkers([
  { id: 'p1', coordinates: { lat: 45.78, lng: 4.85 }, label: 'Parc' },
]);
```

`mount()` **rejette** si le moteur est indisponible (WebGL absent, style
injoignable) : prévoyez toujours un repli (liste, message). Une tuile en échec
n'est jamais fatale — la carte reste manipulable, seul le fond manque.

Le moteur est chargé **paresseusement, au montage** : les modules restent
importables côté serveur (SSR) et le poids n'est téléchargé que si une carte
s'affiche réellement.

**`onViewportChange` ne dit que les DÉPLACEMENTS ; la vue initiale part par
`onReady`.** Les deux adaptateurs annonçaient d'abord la vue de départ par
`onViewportChange`, et une carte qui finit de s'initialiser n'a rien déplacé.
La confusion faisait de la carte un second écrivain de l'état qu'elle reflète :
un écran qui recopie le centre dans un formulaire voyait la saisie de
l'utilisateur écrasée dès que l'initialisation se terminait après elle — ce qui
n'arrive que sur une machine lente, donc jamais en développement.

```ts
await provider.mount(container, {
  center: { lat: 46.6, lng: 2.4 },
  zoom: 6,
  // Une seule fois, quand la carte est prête : de quoi amorcer un zoom.
  onReady: viewport => setZoom(viewport.zoom),
  // Ensuite, et seulement ensuite : ce que l'utilisateur déplace.
  onViewportChange: viewport => setCenter(viewport.center),
});
```

#### Regroupement de marqueurs

```ts
import {
  clusterByGrid,
  clustersToMarkers,
  isClusterId,
} from '@mister-guiiug/dev-pwa-config/map';

const clusters = clusterByGrid(
  places.map(p => ({ id: p.id, coordinates: p.coordinates, item: p })),
  zoom
);
provider.setMarkers(clustersToMarkers(clusters, input => input.item.name));
// Au clic : un identifiant de groupe n'est pas un identifiant d'élément.
onMarkerClick: id => {
  if (!isClusterId(id)) openPlace(id);
};
```

#### Intégration Vite (CSP + cache) — à ne pas oublier

```ts
import {
  mapCspDirectives,
  mapTileRuntimeCaching,
  osmRasterTiles,
} from '@mister-guiiug/dev-pwa-config/map';

const tiles = osmRasterTiles();
const map = mapCspDirectives(tiles);

cspPlugin({
  dev: command === 'serve',
  // MapLibre charge les tuiles par `fetch` (connect-src), Leaflet par <img>
  // (img-src) : déclarer les DEUX rend la CSP valable quel que soit le moteur.
  connectSrc: ["'self'", ...map.connectSrc, ...autresHotes],
  imgSrc: ["'self'", 'data:', 'blob:', ...map.imgSrc],
});

VitePWA({ workbox: { runtimeCaching: [mapTileRuntimeCaching(tiles)] } });
```

#### Styles des marqueurs

Les adaptateurs posent trois classes, **sans styles imposés** — à habiller côté
app : `.dwc-map-marker` (le bouton, focusable au clavier), `.dwc-map-pin` (point
seul), `.dwc-map-cluster` (groupe, contient le nombre).

#### Pièges pris en charge par le paquet

- **Worker MapLibre introuvable en production.** MapLibre 6 résout son worker
  par une URL calculée à l'exécution, que le bundler n'émet pas : 404 et carte
  morte en prod, alors que tout marche en `dev`. L'adaptateur impose l'URL d'un
  asset réellement empaqueté (`setWorkerUrl` + `?worker&url`).
- **Clé d'API dans le code.** `vectorTiles()` refuse une URL de style portant
  `api_key` / `access_token` : un secret n'a rien à faire dans un client.
- **Tuiles vectorielles avec Leaflet.** Refus explicite plutôt qu'écran vide.

### Authentification (`@mister-guiiug/dev-pwa-config/auth`)

Cinq apps portent chacune leur intégration Supabase Auth — mister-doc (la
référence MFA), miss-uwh, miss-lookhouse, miss-carbook, mister-molkky — et
quatre recopient exactement le même câblage : `getSession()` initial,
ré-hydratation par `onAuthStateChange`, désabonnement au démontage. Le module
promeut ce câblage en **port + adaptateurs**, comme `realtime/` et `push/` :

| Sous-chemin        | Rôle                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| `/auth`            | le PORT : machine d'état `loading` → `signed-out` \| `signed-in` \| `needs-mfa`        |
| `/auth/supabase`   | adaptateur Supabase v2 à **client injecté** (peer optionnelle)                         |
| `/auth/mfa`        | TOTP : enrôlement (QR/secret/uri), défi, facteurs — fidèle à mister-doc                |
| `/auth/errors-fr`  | erreurs Auth en français (fusion doc + carbook, codes **et** sous-chaînes)             |
| `/react/use-auth`  | le hook (`useSyncExternalStore`) — deux composants, un client, aucun Provider          |
| `/react/auth-gate` | la garde non stylée `loading`/`fallback`/`mfa`/`children` (généralise uwh + lookhouse) |

Bout en bout :

```tsx
import { createClient } from '@supabase/supabase-js';
import { createAuthClient } from '@mister-guiiug/dev-pwa-config/auth';
import { supabaseAuthAdapter } from '@mister-guiiug/dev-pwa-config/auth/supabase';
import { frAuthError } from '@mister-guiiug/dev-pwa-config/auth/errors-fr';
import { useAuth } from '@mister-guiiug/dev-pwa-config/react/use-auth';
import { AuthGate } from '@mister-guiiug/dev-pwa-config/react/auth-gate';

const supabase = createClient(url, anonKey); // LE client de l'app — jamais un second
const adapter = supabaseAuthAdapter({ client: supabase });
const auth = createAuthClient({
  adapter,
  // Chaque évènement brut : c'est là que miss-uwh purge les données locales
  // à la déconnexion (appareil partagé).
  onEvent: event => {
    if (event === 'SIGNED_OUT') wipeLocal();
  },
});

function App() {
  return (
    <AuthGate
      client={auth}
      loading={<Spinner />}
      fallback={<LoginPage />}
      mfa={<MfaChallenge />}
      bypass={!IS_SUPABASE} // mode local : on laisse passer, la sécurité réelle est la RLS
    >
      <Routes />
    </AuthGate>
  );
}

function LoginPage() {
  const { status } = useAuth(auth); // { status, session, user }
  const signIn = async () => {
    const res = await adapter.signInWithPassword({ email, password });
    if (!res.ok) setError(frAuthError(res.error)); // « E-mail ou mot de passe incorrect. »
  };
  // Variantes : adapter.signInWithOtp({ email, emailRedirectTo }) — le lien
  // magique de carbook ; adapter.signUp(...) rend `needsConfirmation` quand la
  // confirmation e-mail retient la session ; adapter.signInAnonymously() ne
  // LÈVE jamais quand le projet la désactive (repli de molkky) : `{ ok: false }`.
}
```

Les effets d'une connexion reviennent **par `onAuthStateChange`** : les
variantes `signIn*` restent des méthodes de l'adaptateur, le port n'a pas à
les connaître. Le port ferme trois pièges que les copies géraient à moitié :
la réponse `getSession` **périmée** qui écrase un évènement plus récent
(chaque hydratation porte un numéro, seule la plus récente s'applique), la
lecture MFA **hors-ligne** (un échec vaut « pas de défi », jamais un verrou),
et la déconnexion **sans évènement** (`signOut` relit la session après coup).

MFA TOTP (opt-in, plan gratuit, sans SMS) :

```ts
import { createTotpMfa } from '@mister-guiiug/dev-pwa-config/auth/mfa';

const totp = createTotpMfa({ client: supabase });

// Enrôlement (Réglages) : QR + secret + uri, TELS QUE Supabase les donne.
const { factorId, qrCode, secret } = await totp.enrollTotp();
// <img src={qrCode} /> — data URL SVG : la CSP doit autoriser `img-src data:`
await totp.confirmEnrollment(factorId, code); // facteur vérifié, session aal2

// Au login, quand la garde affiche `mfa` (statut `needs-mfa`) :
await totp.challengeTotp(code); // Supabase émet MFA_CHALLENGE_VERIFIED → signed-in
```

Les erreurs de `/auth/mfa` gardent le **message Supabase d'origine** :
`frAuthError(e)` les traduit à l'affichage. Le nettoyage des enrôlements
abandonnés (facteurs non vérifiés) est fait avant chaque `enrollTotp`,
comme dans mister-doc.

**Les limites, assumées.**

- **Pas de rôles.** La promotion d'`useActionGuard` l'a montré : les rôles ne
  se généralisent pas (fiche médecin chez doc, dix rôles de club chez uwh,
  rôles de démo chez bac-sable). Le port s'arrête à « qui est connecté » ;
  « qui a le droit » reste à l'app, outillé par `react/use-action-guard`.
- **Pas de codes de récupération.** Ceux de mister-doc sont des RPC
  **applicatives** (table + fonctions SQL de l'app), pas une API Supabase
  Auth : les embarquer imposerait un schéma.
- **La garde n'est pas la sécurité.** `AuthGate` ordonne des écrans ; elle se
  contourne dans l'inspecteur. La sécurité réelle est côté serveur, dans les
  politiques **RLS** — uwh et lookhouse l'écrivent en toutes lettres.

### Appairage — codes courts + QR (`/pairing`, `/qr`, `/react/use-qr-scanner`)

Trois apps font « rejoindre un autre appareil » par un code court, chacune
avec son alphabet, son tirage et son parseur : le PIN numérique de
mister-qowa, le code 6 caractères de mister-molkky, l'appairage
`missticket:pair?…` de miss-ticket-pwa. Le socle unifie le tout en pur
(`/pairing`) et isole les deux peers **optionnelles**, chargées
paresseusement : `qrcode` (génération, `/qr`) et `qr-scanner` (scan,
`/react/use-qr-scanner`) — jamais dans le bundle initial, et une erreur
explicite (pas un import cassé) quand la peer manque.

**Rejoindre une partie** (mister-qowa, mister-molkky) — l'hôte affiche un
code et son QR, l'invité tape ou scanne :

```ts
import {
  generateCode,
  normalizeCode,
} from '@mister-guiiug/dev-pwa-config/pairing';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';

// Hôte : 6 caractères sans 0/O ni 1/I (défaut `antiConfusion`) ; un PIN
// chiffré se tire avec { alphabet: 'numeric' }. Aléa crypto, tirage sans
// biais, `random` injectable pour les tests.
const code = generateCode(6);
const qr = await qrToDataUrl(`${location.origin}/join?code=${code}`, {
  width: 240,
});

// Invité : la saisie se normalise au fil de l'eau — majuscules, confusions
// corrigées vers l'alphabet, blancs et séparateurs écartés.
input.value = normalizeCode(input.value, { maxLength: 6 });
```

**Appairer un appareil** (miss-ticket-pwa) — un lien profond
`schéma:action?clé=valeur` porté par le QR, sans schéma codé en dur :

```ts
import {
  buildDeepLink,
  parseDeepLink,
} from '@mister-guiiug/dev-pwa-config/pairing';

const lien = buildDeepLink('missticket', 'pair', { token, id: desktopId });
// → 'missticket:pair?token=…&id=…'

const lu = parseDeepLink(scanné, { scheme: 'missticket', action: 'pair' });
if (lu) pair(lu.params.token, lu.params.id); // sinon null : pas la forme
```

**Scanner** (mister-molkky) — le hook porte le cycle de vie caméra : le
scanner se câble dans un effet une fois la `<video>` montée (au clic, la ref
est encore nulle — le bug d'origine), et l'arrêt + la destruction sont
garantis au nettoyage — pas de caméra ni de lampe torche qui reste allumée.

```tsx
import { useQrScanner } from '@mister-guiiug/dev-pwa-config/react/use-qr-scanner';

const { videoRef, scanning, error, start, stop } = useQrScanner({
  onScan: texte => rejoindre(normalizeCode(texte, { maxLength: 6 })),
});

return scanning ? (
  <video ref={videoRef} playsInline muted />
) : (
  <button type="button" onClick={start}>
    Scanner le QR
  </button>
);
```

Les peers sont déclarées dans `peerDependenciesMeta` : une app qui ne fait
pas d'appairage n'installe rien ; une app qui génère sans scanner n'installe
que `qrcode`.

### Helpers React (`@mister-guiiug/dev-pwa-config/react`)

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
} from '@mister-guiiug/dev-pwa-config/react';
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

#### Cinq façades, pour cesser de recâbler

Cinq domaines avaient leurs pièces mais aucun assemblage — et les apps
réécrivaient la jonction, ou l'oubliaient.

```tsx
// main.tsx — deux lignes que treize apps écrivaient à l'identique
await installObservability({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  webVitals: true, // erreurs ET performance, relayées au même endroit
  redactKeys: ['matricule'], // le contexte est masqué avant d'entrer dans localStorage
  context: { app: 'miss-genius', version: __APP_VERSION__ }, // joint à chaque erreur
  // `console: true` par défaut : les console.error/warn rejoignent le fil d'Ariane
});

<ObservabilityBoundary>
  {' '}
  {/* le câblage de recordError, tenu par le composant */}
  <ThemeProvider appId="miss-genius">
    {' '}
    {/* palette → variables → data-theme */}
    <IconsProvider
      icons={{ close: X, light: Sun, dark: Moon, system: Monitor }}
    >
      <AppUpdates registerSW={registerSW} checkEvery="1h">
        <App /> {/* le bandeau de mise à jour se pose seul */}
      </AppUpdates>
    </IconsProvider>
  </ThemeProvider>
</ObservabilityBoundary>;
```

```ts
// vite.config.ts — le script anti-FOUC cesse d'être recopié dans index.html
// `legacyKeys` migre la préférence déjà enregistrée : sans elles, adopter le
// socle la perd en silence (six clés distinctes existent dans la famille).
pwaSeoPlugin({
  themeBoot: { storageKey: 'dwc_theme', legacyKeys: ['theme'] },
  themeColor: { light: '#0f766e', dark: '#0b1220' },
});
```

#### Le contexte d'observabilité

Treize apps sur seize initialisent Sentry — et `setUser` / `setContext` /
`setTag` n'apparaissent que dans **six**. Les dix autres envoient des exceptions
nues : pas de version, pas de langue, pas de route. Une trace sans contexte se
trie mal et se reproduit encore plus mal.

```tsx
import {
  breadcrumb,
  setSessionContext,
} from '@mister-guiiug/dev-pwa-config/react/observability';
import { useRouteBreadcrumbs } from '@mister-guiiug/dev-pwa-config/react/use-route-breadcrumbs';

setSessionContext({ locale, theme: resolved }); // fusionné, appelable à tout moment
useRouteBreadcrumbs(useLocation().pathname); // « où était l'utilisateur ? »
breadcrumb('sync', 'file rejouée', { entrées: 12 });
```

Trois garanties, dans cet ordre d'importance :

- **Le fil d'Ariane ne quitte pas la mémoire.** Le journal d'erreurs vit dans
  `localStorage` ; un fil enregistre vingt fois plus d'événements, souvent
  porteurs de données saisies. Il est joint aux erreurs, et disparaît avec
  l'onglet.
- **Tout est masqué avant d'être écrit** — y compris les arguments d'un
  `console.warn('échec', { token })`, forme la plus courante des 59 appels
  mesurés : `redact` agit sur les clés, il voit donc l'objet, pas sa chaîne.
- **La console n'est jamais avalée.** `captureConsole` l'enveloppe ; la sortie
  d'origine est appelée dans tous les cas.

Ces trois pièces valent **sans Sentry** : elles enrichissent le journal local,
donc servent aussi aux trois apps sans transport.

#### Le pont vers `lucide-react`

`IconsProvider` prend un rôle à la fois — le bon contrat, mais qui ne dit rien à
une app qui a déjà cinquante-sept icônes (149 symboles distincts dans la
famille, adoption d'`IconsProvider` : **zéro**). `lucideIconSet` normalise le
jeu en une ligne, sans que le paquet dépende de `lucide-react` :

```tsx
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { lucideIconSet } from '@mister-guiiug/dev-pwa-config/react/icons-lucide';

<IconsProvider
  icons={lucideIconSet(
    { close: X, light: Sun, dark: Moon, system: Monitor },
    { strokeWidth: 1.75 }
  )}
>
```

`aria-hidden` (une icône accompagne toujours un texte déjà nommé, sauf si vous
passez un `aria-label`), `focusable="false"`, et un poids de trait commun pour
que la croix du `Sheet` ait le même que ses voisines.

Chaque façade reste **facultative**, et chaque pièce reste utilisable seule :
`ThemeToggle` sans `ThemeProvider` monte son propre état, `UpdateButton` sans
`AppUpdates` s'enregistre lui-même, `Icon` sans `IconsProvider` rend le SVG
maison. Une app qui ne change rien ne voit aucune différence.

#### Mise à jour du service worker

`useUpdatePrompt` **a rejoint le barrel** : il n'importe plus
`virtual:pwa-register/react`, il reçoit `registerSW` en paramètre. Le module
s'importe donc partout — y compris dans un test Node ou un rendu serveur.

```tsx
import { registerSW } from 'virtual:pwa-register';
import { UpdatePromptBanner } from '@mister-guiiug/dev-pwa-config/react';

<UpdatePromptBanner
  registerSW={registerSW}
  snoozeHours={24}
  // Pour reprendre le report d'une bannière écrite à la main : sans elle, la
  // migration oublie tout report en cours et le bandeau revient aussitôt.
  snoozeKey="mon_app_update_snooze_until_ms"
  // Sans ce rappel, un enregistrement raté est indiscernable d'une app à jour.
  onRegisterError={error => log.error('serviceWorker', error)}
/>;
```

**Deux sorties au lieu d'une**, avec `secondaryActions="both"` : le report
persisté ET l'écartement pour la seule session. `mister-puzzle` offrait les deux
et a dû abandonner le second en migrant.

```tsx
<UpdatePromptBanner
  registerSW={registerSW}
  snoozeHours={24}
  secondaryActions="both" // « Recharger » · « Plus tard » · « Ignorer »
/>
```

Le bouton historique ne bouge pas : `[data-dwc="update-banner-dismiss"]` désigne
toujours le même, à la même place, avec la même action — `'both'` ne fait
qu'**ajouter** le suivant, sous `[data-dwc="update-banner-ignore"]`. Un habillage
CSS existant reste donc valable. Sans report à offrir (`snoozeHours` à 0),
`'both'` se comporte exactement comme `'auto'` : deux boutons qui écartent tous
deux pour la session ne diraient rien de plus.

**Le « prêt hors ligne »** — que `useUpdatePrompt` expose depuis toujours sans
que rien ne l'affiche — se rend avec `showOfflineReady`. Il sort sous
`[data-dwc="offline-ready"]`, et **jamais en même temps** que la mise à jour :
tant qu'une version attend, il se tait, y compris une fois le bandeau écarté.

```tsx
<UpdatePromptBanner registerSW={registerSW} showOfflineReady />
```

L'interrupteur ne s'appelle pas `offlineReady` parce que l'état du hook porte
déjà ce nom sur les mêmes props, et l'écraserait à chaque rendu.

**Ne pas enregistrer du tout** ne demande aucune API : `registerSW` est
facultatif, et le hook s'en passe (`needRefresh` reste faux, `update()` et
`forceUpdate()` restent utilisables).

⚠️ **Mais ne posez PAS `registerSW={import.meta.env.PROD ? registerSW : undefined}`** —
ce motif, que cette page recommandait, ne protège de rien et coûte cher. En
développement, `vite-plugin-pwa` sert déjà un patron **entièrement inerte**
(`dist/client/dev/register.js` : `registerSW()` rend une fonction asynchrone
vide, et rien n'est enregistré), sauf si l'app active `devOptions` — ce
qu'aucune app du parc ne fait. Le garde est donc redondant en production comme
en développement.

Et il nuit : **Vitest pose `PROD` à faux**, donc le câblage réel devient
intestable, et deux apps (`miss-badminton`, `miss-dice`) ont dû intercaler un
composant qui reprend `registerSW` en prop pour contourner un garde superflu.
Relevé en migrant `mister-cim10` et `miss-ticket-pwa`. Ne le remettre que si
l'app active vraiment `devOptions`.

En développement, c'est plutôt l'inverse qu'on veut : **désinscrire** le worker
d'une session précédente, qui sert du cache périmé pendant qu'on code. Cinq apps
portaient ces lignes à la main ; la condition reste chez elles, la mécanique
vient du paquet.

```ts
import { unregisterServiceWorkers } from '@mister-guiiug/dev-pwa-config/sw-update';

export function registerServiceWorker(): void {
  if (import.meta.env.DEV) {
    void unregisterServiceWorkers();
    return;
  }
  registerSW({ immediate: true });
}
```

Le **bouton des réglages** — six apps en avaient un, avec six mécaniques
différentes — n'a besoin de rien : il sert justement quand aucune version n'a
encore été signalée.

```tsx
import { UpdateButton } from '@mister-guiiug/dev-pwa-config/react';

<UpdateButton showHint />;
```

Sous les deux, `applyUpdate` (également exporté seul, sans React, par
`@mister-guiiug/dev-pwa-config/sw-update`) : il active le worker en attente et
**attend `controllerchange`** avant de recharger — deux apps rechargeaient dans
la foulée, si bien que la page pouvait encore être servie par l'ancien worker.
Sans worker en attente, il bascule sur la purge du Cache Storage au lieu de ne
rien faire : c'est le « bouton mort » constaté sur mobile, que
`updateServiceWorker(true)` provoque à lui seul. `localStorage`,
`sessionStorage` et IndexedDB ne sont jamais touchés.

```ts
import { applyUpdate } from '@mister-guiiug/dev-pwa-config/sw-update';

await applyUpdate({
  hard: true,
  keepCache: name => name.startsWith('donnees-'),
});
```

> En test (jsdom), importer `@mister-guiiug/dev-pwa-config/vitest-setup` depuis
> `src/test/setup.ts` fournit le stub `matchMedia` et le mock
> `virtual:pwa-register/react`. Pour `virtual:pwa-register` lui-même, c'est
> `pwaRegisterAlias` qu'il faut poser — voir juste en dessous.

##### Prouver que le bandeau PEUT s'afficher

Un `vi.mock` **ne peut pas** servir ici : il agit à l'exécution, quand Vite a
déjà refusé de transformer le module importateur — `virtual:pwa-register`
n'existe que dans un build servi par vite-plugin-pwa. Il faut un fichier,
désigné par `resolve.alias`. Douze dépôts l'écrivaient à la main, et tous les
douze étaient **muets** : un `registerSW` qui n'appelle jamais `onNeedRefresh`
prouve qu'un composant se monte, jamais qu'un bandeau peut apparaître. C'est ce
trou qui a laissé une app vivre des mois avec une bannière montée sans
`registerSW`, donc structurellement incapable de s'afficher.

`vitest-setup` a longtemps posé un `vi.mock('virtual:pwa-register')` muet, qui
ne pouvait rendre aucun de ces services et qui **écrasait** le double une fois
l'alias posé (« No "swStub" export is defined on the "virtual:pwa-register"
mock »). Il est retiré depuis la 3.29.0 : les suites qui portaient un
`vi.unmock('virtual:pwa-register')` de contournement peuvent le supprimer.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import {
  baseTestOptions,
  pwaRegisterAlias,
} from '@mister-guiiug/dev-pwa-config/vitest-base';

export default defineConfig({
  resolve: { alias: { ...pwaRegisterAlias } },
  test: baseTestOptions,
});
```

`pwaRegisterAlias` résout le double **depuis le paquet**, et non depuis le
`vitest.config.ts` de l'app : la forme précédente demandait à l'app de résoudre
un sous-chemin d'export, ce qui échoue sous un gestionnaire de paquets qui
n'aplatit pas `node_modules`, et sous les runtimes où `import.meta.resolve` est
asynchrone.

Deux pièges, une fois pour toutes :

- **Dans `vitest.config.ts`, jamais dans `vite.config.ts`.** Un alias vu par le
  build servirait le double aux navigateurs, et l'app n'enregistrerait plus
  aucun service worker.
- **`virtual:pwa-register/react` n'est pas couvert**, et l'entrée ci-dessus le
  capte quand même : les alias Vite s'appliquent par PRÉFIXE, donc le
  sous-chemin pointerait vers un fichier inexistant. Aucune app du parc ne
  l'importe — toutes passent `registerSW` à `useUpdatePrompt`, la forme
  impérative. Celle qui voudrait `useRegisterSW` doit fournir son propre double,
  sous une entrée plus spécifique placée **avant**.

```tsx
import { swStub } from '@mister-guiiug/dev-pwa-config/testing/pwa-register';

// `reset()` renouvelle l'IDENTITÉ de `registerSW` : `useUpdatePrompt` mémorise
// sa connexion par WeakMap, et un double unique garderait `needRefresh` d'un
// test au suivant.
beforeEach(() => swStub.reset());

it('affiche le bandeau quand une version attend', () => {
  render(<UpdateBanner />);
  expect(screen.queryByRole('status')).toBeNull();

  act(() => swStub.needRefresh()); // lève si personne n'a injecté `registerSW`

  expect(screen.getByRole('status')).toHaveAttribute(
    'data-dwc',
    'update-banner'
  );
});
```

Une app qui enrobe `registerSW` dans une constante de module — pour ajouter un
intervalle ou une journalisation — garde une identité que `reset()` ne peut pas
renouveler : ce cas-là demande un `vi.resetModules()`, ou un second fichier de
test.

#### La version : l'afficher, et savoir qu'elle a bougé

Les cinq modules ci-dessus pilotent une bascule de service worker **sans jamais
nommer une version** : le bandeau dit « Mise à jour disponible », pas laquelle,
et rien ne confirme après coup que la bascule a réussi. Symétriquement,
`installObservability` réclamait `context.version` — que le paquet ne savait pas
produire, faute de rien qui porte le numéro jusqu'au navigateur.

Une ligne dans `vite.config.ts` ferme les deux :

```ts
import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';

export default defineConfig({
  // versionPlugin AVANT cspPlugin : les hash sont calculés sur le HTML final.
  plugins: [react(), versionPlugin(), cspPlugin()],
});
```

Le plugin lit la version du `package.json` de l'app (`VITE_APP_VERSION` la force,
`GITHUB_SHA` fournit le commit) et produit **trois sorties** : les `define`
`__APP_VERSION__` / `__APP_BUILD_TIME__` / `__APP_COMMIT__` pour le code de
l'app, un `globalThis.__DWC_BUILD__` posé dans le `<head>` — le seul chemin
qu'un module de `node_modules` puisse lire, un `define` ne l'atteignant pas — et
un `version.json` à la racine du build, servi aussi par `vite dev`. Il est exclu
du précache workbox : figé, il rendrait éternellement la version qui l'a figé.

Aucun secret n'entre dans le bundle : un numéro de version et un SHA de commit,
publics par construction, et le SHA n'est écrit que s'il existe.

Côté écran, le numéro se pose dans le pied de page :

```tsx
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react';

<AppFooter
  repoUrl="https://github.com/mister-guiiug/mister-family-map"
  version
/>;
```

`version` est **opt-in** : absent, le pied de page rend exactement ce qu'il
rendait. Le `repoUrl` déjà donné sert alors de lien vers la release.

Pour les deux états que seul un fournisseur peut calculer — la confirmation
« mis à jour vers 3.14.0 » au premier démarrage après une bascule, et l'annonce
« version 3.15.0 disponible » quand un déploiement passe :

```tsx
import { VersionProvider } from '@mister-guiiug/dev-pwa-config/react';

<VersionProvider checkEvery="1h">
  <App />
</VersionProvider>;
```

Sans `checkEvery`, **aucune requête n'est émise**. Un rollback de déploiement ne
s'annonce pas comme une nouveauté : `justUpdated` ne se lève que sur une montée.
`VersionProvider` complète `AppUpdates` sans le remplacer — l'un sait qu'une
bascule est possible, l'autre sait vers quoi ; ni l'un ni l'autre ne recharge de
lui-même, c'est le rôle d'`applyUpdate`.

Enfin, `installObservability` n'a plus rien à recevoir : la version, la date de
compilation et le commit rejoignent seuls le contexte de session, et un
`context` explicite garde le dernier mot.

#### Libellés fr/en des composants

Onze libellés étaient codés en dur en français dans six composants. Ils vivent
désormais dans un dictionnaire, avec **trois niveaux** : la prop l'emporte, puis
le contexte, puis le français. Une app qui ne fait rien obtient exactement ce
qu'elle avait avant.

```tsx
import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react';
import { useI18n } from './i18n';

const { locale } = useI18n(); // le i18n de l'app, inchangé
<LabelsProvider locale={locale} overrides={{ sheet: { close: 'Retour' } }}>
  <App />
</LabelsProvider>;
```

Le contexte est **séparé de `createI18n`** à dessein : `createI18n` fabrique un
contexte isolé par app, que le paquet ne peut pas lire et dans lequel il n'a pas
à imposer ses clés. En revanche `I18nProvider` **pose lui-même**
`LabelsProvider` avec sa locale : le câblage manuel ci-dessus n'est plus
nécessaire (`labels: false` pour le désactiver). Il reste utile pour un
`overrides`, ou hors `createI18n`.

Pour l'accord en nombre, `plural` (exporté par `react/i18n`) s'appuie sur
`Intl.PluralRules` — le ternaire `n > 1` des apps donne « 0 éléments » en
français, ce qui est faux.

```ts
import { plural } from '@mister-guiiug/dev-pwa-config/react/i18n';

plural(0, { one: '{count} élément', other: '{count} éléments' }, 'fr');
// → « 0 élément »   (et « 0 items » en anglais)
```

#### Le formatage suit la langue choisie

**78 sites de formatage à locale figée** dans la famille : 27 constructions
`Intl.*('xx-XX', …)` et 51 appels `toLocale*('fr-FR')`. L'utilisateur bascule en
anglais, les libellés changent, les nombres et les dates restent français. La
cause n'était pas la négligence : le contexte rendait `{ locale, setLocale, t,
m, locales }` — la langue, mais aucun formateur. Le pont n'existait pas.

```tsx
const { t, locale, dir, fmt } = useI18n();

fmt.number(1234.5); // suit la locale courante, sans l'écrire
fmt.currency(12.5); // devise par app (`currency` dans createI18n)
fmt.date(d, { weekday: 'long' });
fmt.relative(then); // « il y a 3 jours »
fmt.bytes(1503238); // « 1,4 Mo » / « 1.4 MB »
fmt.list(['a', 'b', 'c']); // « a, b et c » / « a, b, and c »
fmt.plural(n, { one: '{count} but', other: '{count} buts' });
```

```ts
createI18n({
  messages,
  locales: ['fr', 'en'],
  fallbackLocale: 'fr',
  storageKey: 'app_locale',
  localeTags: { en: 'en-GB' }, // quand la région compte ; sinon `Intl` suffit
  currency: 'EUR',
});
```

Le provider pose aussi `<html lang>` **et `dir`** (absent partout : une locale
écrite de droite à gauche rendait la page en LTR), et appelle
`setDefaultLocale` : `format.js` formate alors dans la bonne langue **même
appelé sans locale**, depuis n'importe quel écran et sans qu'un seul appel soit
réécrit. Une app sans i18n garde `'fr-FR'`, exactement comme avant.

> `formatBytes` traduit désormais son unité (`1.4 MB` en anglais, au lieu du
> `1,4 Mo` figé) et sépare le nombre de l'unité par une espace fine insécable —
> le même séparateur que `formatNumber` produit déjà pour les milliers. Une
> comparaison de chaînes écrite avec une espace ordinaire échoue donc.

### Primitives d'interface

Ces neuf composants n'ont pas été inventés : ils ont été **extraits** de ce que
plusieurs apps avaient déjà réécrit chacune de leur côté. L'API reprend leur
convergence ; la version partagée referme les trous d'accessibilité que chaque
copie laissait passer.

| Composant                                      | Réécrit dans                                                      | Ce que la version partagée garantit en plus                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                       | 4 apps, mêmes variantes `primary \| secondary \| ghost \| danger` | cible tactile 2,75 rem **à toutes les tailles**, `aria-busy` + désactivation pendant `loading` (anti double-clic), `type="button"` par défaut                                                                                                                                   |
| `TextField` / `SelectField` / `TextAreaField`  | 3 apps (deux fichiers identiques à la variable près)              | `aria-describedby` référence l'aide **et** l'erreur, au lieu de faire disparaître l'aide                                                                                                                                                                                        |
| `Skeleton` / `SkeletonGroup`                   | 3 apps                                                            | barres `aria-hidden`, `role="status"` + `aria-busy` porté par le conteneur seul                                                                                                                                                                                                 |
| `Sheet`                                        | 4 apps, ~20 écrans consommateurs                                  | piège de focus, focus **restitué** à la fermeture, scroll de fond restauré, safe-area iOS                                                                                                                                                                                       |
| `Stat`                                         | tableaux de bord de 10 apps                                       | `<dl>/<dt>/<dd>` relie le libellé à la valeur ; la tendance a une flèche **et** un libellé lu                                                                                                                                                                                   |
| `Badge`                                        | 4 apps, couleurs ad hoc                                           | axe `tone` sémantique (`brand \| success \| warning \| danger \| info \| muted`) × `variant` (`soft \| outline`)                                                                                                                                                                |
| `ConfirmDialog`                                | 7 apps, sept fichiers différents                                  | `role="alertdialog"` nommé par son titre, focus initial sur **Annuler** (une app le posait sur la suppression), `loading` pour une confirmation asynchrone ; `cancelLabel={null}` bascule en **mono-action** (alerte) : focus sur l'action unique, Échap et voile valent « OK » |
| `ToastProvider` / `ToastViewport` / `useToast` | 6 apps, six mécaniques                                            | régions vivantes montées en permanence et **sans rôle sur le message** (deux apps l'annonçaient deux fois), pile bornée, compte à rebours suspendu au survol                                                                                                                    |
| `BottomNav`                                    | 7 apps                                                            | `<nav>` toujours nommé (3 ne l'étaient pas), onglet courant jamais distingué par la seule couleur (4 le faisaient), bouton « Plus » avec `aria-expanded`                                                                                                                        |

```tsx
import {
  Button,
  TextField,
  Sheet,
  Stat,
  Badge,
  SkeletonGroup,
} from '@mister-guiiug/dev-pwa-config/react';

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

```tsx
import {
  BottomNav,
  ConfirmDialog,
  ToastProvider,
  useToast,
} from '@mister-guiiug/dev-pwa-config/react';

// Une seule fois, au sommet de l'app.
<ToastProvider>…</ToastProvider>;

const toast = useToast();
toast.success('Fiche enregistrée');
toast.error('Envoi impossible'); // ne s'efface pas tout seul

<ConfirmDialog
  open={open}
  title="Supprimer la partie ?"
  message="Cette action est définitive."
  destructive
  loading={suppression}
  onConfirm={supprimer}
  onCancel={fermer}
/>;

// Alerte mono-action, en remplacement de `window.alert` : `cancelLabel={null}`
// (et non `undefined`) retire Annuler. Le focus va sur l'action unique, Échap
// et le voile valent « OK » (`onConfirm`), le défaut du libellé devient « OK ».
// Les détails techniques dépliables (façon miss-carbook) restent applicatifs :
// les passer en `children`.
<ConfirmDialog
  open={erreur !== null}
  title="Sauvegarde impossible"
  message={erreur}
  cancelLabel={null}
  onConfirm={fermer}
/>;

// Agnostique de routeur : `linkComponent` + `hrefProp` branchent react-router.
<BottomNav
  items={[
    { href: '/', label: 'Accueil', icon: <Home aria-hidden /> },
    { href: '/alertes', label: 'Alertes', badge: 3, badgeLabel: '3 non lues' },
  ]}
  currentPath={pathname}
  linkComponent={Link}
  hrefProp="to"
/>;
```

Non stylés par défaut, comme les autres : importer
[`components.css`](#habillage-des-composants-componentscss-opt-in) pour une base
prête à l'emploi, ou cibler `[data-dwc="button"][data-variant][data-size]` &
consorts.

### Graphiques minuscules (`/sparkline` + `/react/sparkline`)

Cinq apps ont des séries à montrer — historique de prix, consommation de
quotas, scénarios de moyennes — et une librairie de graphiques complète pèse
l'ordre de grandeur de MapLibre pour tracer douze points dans une carte de
réglages. Le module calcule des **coordonnées** ; le rendu tient en un
`<polyline>`.

`/sparkline` est la géométrie, sans React : `toPoints` (trois formes d'entrée
acceptées : `[1, 2, 3]`, `[{y}]`, `[{x, y}]`), `extent` (bornes), `project`
(mise à l'échelle dans une boîte), `toPolyline`, `bars` (proportions, la plus
haute à 100 %), et `describeSeries` — l'alternative textuelle.
`/react/sparkline` pose trois composants dessus : `Sparkline` (courbe),
`BarChart` (barres), `Gauge` (jauge, `role="meter"` : un **niveau** — quota,
batterie — pas l'avancement d'une tâche, que les lecteurs d'écran annoncent
autrement).

```tsx
import {
  Sparkline,
  BarChart,
  Gauge,
} from '@mister-guiiug/dev-pwa-config/react/sparkline';

<Sparkline values={[3, 5, null, 8, 6]} label="notes du trimestre" />;
<BarChart values={depensesParMois} label="dépenses" unit="€" />;
<Gauge value={82} max={100} label="quota IA consommé" unit="%" />;
```

Ce qui se calcule faux quand on l'écrit vite est traité dans le module : une
série **constante** donne un trait plat au milieu (pas une division par zéro),
un **trou** (`null`, `NaN`) coupe la ligne au lieu de la faire plonger — une
mesure manquante n'est pas un zéro — et l'axe Y ne part de zéro que si
`baseline: 'zero'` le demande (le zéro forcé est légitime pour un décompte,
mensonger pour un prix).

**`describeSeries` est l'alternative textuelle**, calculée ici parce que,
laissée au composant, elle n'est jamais écrite : « notes du trimestre :
4 points, de 3 à 6, minimum 3, maximum 8, en hausse, 1 mesure manquante. »
Les trois composants la portent d'office dans un élément voisin du SVG
(`aria-hidden` sur le dessin — `<title>` dans un SVG reste inégalement lu).
Elle est rédigée **en français** : une app anglophone la recompose à partir
des mêmes données.

Limites, assumées : pas d'axes, pas de légende, pas d'infobulles, pas de
valeurs négatives dans `bars` (une barre qui descend sous sa ligne de base
demande un axe, donc un autre outil). Couleurs par `currentColor` et jetons —
habillage prêt à l'emploi dans
[`components.css`](#habillage-des-composants-componentscss-opt-in)
(`[data-dwc="sparkline" | "bars" | "gauge"]`).

### Catalogue famille & `FamilyApps`

`apps-catalog` est la **source unique** des applications de la famille (id, nom,
description, `repoUrl`, `appUrl`, `iconUrl`). C'est de la **donnée pure** :
importable depuis une app, un script ou un test Node, sans dépendre de React.

Quatre facettes décrivent chaque app, et elles n'ont **pas le même statut** —
c'est la distinction qui rend le catalogue utilisable comme donnée :

| Champ      | Statut                  | Valeurs                                                |
| ---------- | ----------------------- | ------------------------------------------------------ |
| `maturity` | éditorial, obligatoire  | `alpha \| beta \| stable`                              |
| `category` | éditorial, obligatoire  | `sante \| sport \| jeux \| education \| outils \| dev` |
| `backend`  | **relevé** dans le code | `supabase \| firebase \| local \| api`, ou absent      |
| `platform` | fait                    | `web` (défaut) \| `desktop`                            |

`backend` est **laissé absent** quand la persistance n'a pas été relevée (une
seule app aujourd'hui, l'app Electron) : un filtre qui affiche « non relevé »
vaut mieux qu'une donnée devinée. `category` et `backend` sont des identifiants
ASCII stables — les libellés affichés vivent côté présentation, donc traduisibles.

```ts
import {
  FAMILY_APPS,
  otherApps,
  appById,
  sortApps, // 'curated' (défaut) | 'maturity' | 'name' — ne mute pas
  filterApps, // critères en ET ; tableau = OU à l'intérieur d'un critère
  countBy, // facette → { valeur: nombre }, clé '' pour les absentes
  SPONSOR_URL,
} from '@mister-guiiug/dev-pwa-config/apps-catalog';

// Les apps Supabase encore en bêta ou en alpha :
filterApps({ backend: 'supabase', maturity: ['alpha', 'beta'] });

// La recherche ignore les diacritiques : « molkky » trouve « Mölkky ».
filterApps({ query: 'molkky' });
```

Le composant `FamilyApps` (non stylé, attributs `[data-dwc="…"]`) met en avant,
depuis une app, son **code source** (GitHub), le **sponsor** (Buy Me a Coffee) et
la **grille des autres applications** avec leur badge de maturité (l'app courante
est automatiquement exclue) :

```tsx
import { FamilyApps } from '@mister-guiiug/dev-pwa-config/react';
import { REPO_URL } from './links';

// Carte source + sponsor + grille des autres apps :
<FamilyApps currentAppId="miss-dice" repoUrl={REPO_URL} />;

// Grille seule (si la page affiche déjà source/sponsor par ailleurs) :
<FamilyApps currentAppId="miss-dice" showSource={false} showSponsor={false} />;

// Vitrine : un lien vers le DÉPÔT sur chaque carte, les trois plus mûres
// seulement. `max` coupe APRÈS le tri.
<FamilyApps
  currentAppId="miss-dice"
  repoUrl={REPO_URL}
  showRepoLinks
  sort="maturity"
  max={3}
/>;
```

`showRepoLinks` est **opt-in** : sans lui, le DOM produit est exactement celui
des versions précédentes. Avec lui, chaque carte porte deux ancres **frères** —
l'application et son dépôt — jamais imbriquées : une ancre dans une ancre est
invalide, et un lecteur d'écran n'en annoncerait qu'une.

Chaque `<li data-dwc="family-app-item">` porte les facettes du catalogue
(`data-maturity`, `data-category`, `data-backend`, `data-platform`) : une app
peut teinter ses cartes par domaine, ou masquer une facette, en CSS seul.

Sélecteurs CSS à styliser côté app : `[data-dwc="family-apps"]`, `family-links`,
`family-source`, `family-sponsor`, `family-app-list`, `family-app-item`,
`family-app`, `family-app-repo`, et le badge
`[data-dwc="maturity"][data-maturity="alpha|beta|stable"]` (3 couleurs).

### Animations Rive (`@mister-guiiug/dev-pwa-config/react/rive`)

Wrapper [Rive](https://rive.app) **lazy** (le runtime ~100 ko + WASM reste hors
du bundle initial), respectant `prefers-reduced-motion` et l'accessibilité.
Standardise les animations interactives de la famille (états vides, mascottes,
micro-interactions) tout en gardant les budgets perf/a11y/Lighthouse.

```bash
npm install @rive-app/react-canvas   # peer OPTIONNELLE
```

```tsx
import { RiveAnimation } from '@mister-guiiug/dev-pwa-config/react/rive';

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
statique, `ariaLabel` uniquement si l'animation porte du sens (sinon
décorative).

**Le repli est le cas nominal, pas l'exception.** `find -name '*.riv'` renvoie
**zéro fichier** sur les seize dépôts, alors que trois apps déclarent un
runtime Rive — miss-badminton et mister-molkky (`@rive-app/react-canvas`),
miss-genius (`@rive-app/react-webgl2`) — et pointent vers des dossiers vides.
Le `fallback` s'affiche donc dans quatre situations : pendant le chargement, si
l'utilisateur réduit les animations, si le runtime n'est pas installé, et si le
fichier ou le rendu échoue. `onError` permet de remonter le troisième et le
quatrième cas plutôt que de les découvrir sur un écran vide :

```tsx
<RiveAnimation
  src="/animations/trophy.riv"
  loader={() => import('@rive-app/react-webgl2')}
  fallback={<img src="/animations/trophy.svg" alt="" />}
  onError={error => recordError(error, { animation: 'trophy' })}
/>
```

### Accessibilité (`@mister-guiiug/dev-pwa-config/react/a11y`)

Ces primitives ne sont pas nouvelles : elles étaient **enfermées** dans `Sheet`
et `ConfirmDialog`, via un hook interne. Mesure sur les seize apps : **38
`role="dialog"` / `alertdialog`** dans treize apps, et **trois** pièges de
focus. Les trente-cinq autres dialogues laissent Tab s'échapper derrière le
fond — et ne peuvent pas devenir des `Sheet`. D'où l'extraction.

```tsx
import {
  AnnouncerProvider,
  SkipLink,
  VisuallyHidden,
  useAnnouncer,
  useEscape,
  useFocusTrap,
  useScrollLock,
} from '@mister-guiiug/dev-pwa-config/react/a11y';

function MaModale({ open, onClose }) {
  const panel = useRef(null);
  useEscape(onClose, open);
  useScrollLock(open);
  useFocusTrap(panel, { active: open }); // le conteneur porte tabIndex={-1}
  return (
    <div ref={panel} tabIndex={-1} role="dialog" aria-labelledby="t">
      …
    </div>
  );
}
```

Une seule région d'annonce pour toute l'app, montée en permanence (les seize
apps totalisent **66** attributs `aria-live` posés au fil des écrans ; une
région insérée au moment du message n'est souvent pas annoncée) :

```tsx
<AnnouncerProvider>…</AnnouncerProvider>;

const announce = useAnnouncer();
announce('Fiche enregistrée'); // 'assertive' pour une erreur
```

`tokens.css` fournit désormais `.dwc-sr-only` — redéfini dans **cinq** feuilles
de style de la famille, absent des onze autres — `.dwc-skip-link`, et un bloc
`prefers-reduced-motion` (onze apps l'honorent chacune de leur côté ; le socle
n'en avait aucune trace).

### `src/test/setup.ts` (setup partagé)

```ts
import '@mister-guiiug/dev-pwa-config/vitest-setup';
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
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v4
    # PAS de `secrets: inherit` : ce workflow ne déclare aucun secret, et
    # `GITHUB_TOKEN` lui est fourni automatiquement. Hériter enverrait TOUS les
    # secrets du dépôt à un workflow qui n'en demande aucun.
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
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v4
    # Le workflow DÉCLARE les secrets dont il a besoin : on ne passe que
    # ceux-là. `secrets: inherit` enverrait tout le trousseau du dépôt.
    secrets:
      FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
    with:
      use-base-path: true
      pre-build-script: '' # ex: 'migrate:db' pour Supabase
```

> **Repli SPA.** Après le build, le workflow copie `index.html` en `404.html` s'il manque : GitHub Pages n'a pas de repli SPA, et sans ce fichier rafraîchir un lien profond sert sa page « File not found » — quatre apps de la famille étaient dans ce cas le 02/09/2026. Un déploiement écrit à la main obtient la même chose avec `spaFallbackPlugin()` de `vite-pwa-base`.

> ⚠️ **Ne PAS déclarer `concurrency: pages` au niveau du caller.** Le reusable `pwa-deploy.yml` déclare déjà `concurrency: { group: pages, cancel-in-progress: true }`. Le répéter côté caller provoque le message `Canceling since a deadlock was detected for concurrency group: 'pages' between a top level workflow and 'deploy'` et le job ne démarre jamais. Cette règle vaut pour toutes les paires caller / reusable qui partagent un groupe de concurrence (`pages`, `publish`, etc.).

> **Cas avancé** (besoin de migrations Supabase / Firebase rules / variables d'env complexes) : ne pas utiliser le reusable. Reprendre le template `templates/github-workflows/deploy.yml` et personnaliser, en gardant la composite action `setup-pwa` :
>
> ```yaml
> - uses: mister-guiiug/dev-pwa-config/.github/actions/setup-pwa@v4
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
    uses: mister-guiiug/dev-pwa-config/.github/workflows/npm-publish.yml@v4
    # PAS de `secrets: inherit` : ce workflow ne déclare aucun secret, et
    # `GITHUB_TOKEN` lui est fourni automatiquement. Hériter enverrait TOUS les
    # secrets du dépôt à un workflow qui n'en demande aucun.
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

Même convention dans `fmt.percent` du contexte [`createI18n`](#le-formatage-suit-la-langue-choisie),
qui délègue à `formatPercentage`.

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
`npm.pkg.github.com` avec `--provenance`, avance le tag majeur mobile (`v4`) et crée
la **GitHub Release** (notes = section correspondante du `CHANGELOG.md`). Versions
publiées : https://github.com/mister-guiiug/dev-pwa-config/packages

## Maintenance

Toute modification de stack famille (bump majeur React, ESLint, etc.) :

1. Mettre à jour les fichiers de config concernés + la « Stack cible » de ce README.
2. `npm run changeset` (choisir patch/minor/major selon l'impact consommateur).
3. `npm run version-packages`, committer, taguer, pousser (cf. ci-dessus) → publication auto.
4. Aligner les consommateurs : `node scripts/migrate-consumers.mjs <version> --write`
   (dry-run par défaut sans `--write`), puis tester chaque app.

## Gouvernance

|                                             |                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)        | Comment contribuer, et les quatre règles du dépôt — dont « promouvoir sans migrer, c'est ne pas avoir fini » |
| [`SECURITY.md`](SECURITY.md)                | Signalement privé d'une vulnérabilité, périmètre, et les deux limites connues qui ne sont pas des failles    |
| [`.github/CODEOWNERS`](.github/CODEOWNERS)  | `workflows/`, `actions/` et `scripts/` demandent une relecture : ils s'exécutent dans dix-neuf dépôts        |
| `npm run validate`                          | Ce que la CI exécute : format, lint, types, tests                                                            |
| `node scripts/apply-rulesets.mjs --dry-run` | Protection de `main` sur les dix-huit dépôts — liste lue dans le catalogue, checks exigés par dépôt          |

**Secrets.** Chaque workflow réutilisable **déclare** les secrets dont il a
besoin ; un caller ne passe que ceux-là. `secrets: inherit` enverrait tout le
trousseau du dépôt à un workflow qui n'en demande souvent aucun — c'est le
chemin d'escalade le plus court de la famille, et il ne figure plus nulle part
dans la documentation.
