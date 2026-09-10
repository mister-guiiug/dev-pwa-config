# @mister-guiiug/dev-pwa-config

[![CI](https://github.com/mister-guiiug/dev-pwa-config/actions/workflows/ci.yml/badge.svg)](https://github.com/mister-guiiug/dev-pwa-config/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

Configurations partagées (ESLint, Prettier, TypeScript, Vitest) pour les
projets PWA de la famille `miss-*` et `mister-*`.

> **Distribué via [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)** sur le registre `npm.pkg.github.com`.

## Où lire quoi

Le manuel de ce socle ne tenait plus dans une page : 151 sous-chemins, six
binaires, dix workflows. Il vit dans `docs/`, découpé par sujet — et rien n'y a
été résumé, seulement déplacé.

| Page                                       | Ce qu'on y trouve                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| [`docs/EXPORTS.md`](docs/EXPORTS.md)       | **La table des sous-chemins publiés** — le point d'entrée quand on cherche « est-ce que le socle sait déjà faire ça ? » |
| [`docs/CONFIGS.md`](docs/CONFIGS.md)       | ESLint, Prettier, TypeScript, Vitest, Playwright, Vite (PWA, CSP, SEO), commitlint, lint-staged, icônes                 |
| [`docs/INTERFACE.md`](docs/INTERFACE.md)   | Composants React, habillage `components.css`, primitives, catalogue famille, Rive, accessibilité                        |
| [`docs/DONNEES.md`](docs/DONNEES.md)       | Persistance, magasin versionné, coffre chiffré, Supabase, file hors-ligne, temps réel, carte, auth, PDF/Excel/iCal      |
| [`docs/BINS.md`](docs/BINS.md)             | `pwa-doctor`, `pwa-bundle-budget`, `pwa-icons`, `pwa-pgtap`, `pwa-screenshots`, `pwa-bindings`                          |
| [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) | Ce qu'a demandé chaque majeure                                                                                          |

Et les dossiers d'analyse, qui ne sont pas des manuels : [`CAMPAGNE.md`](CAMPAGNE.md)
(adoption), [`GISEMENTS.md`](GISEMENTS.md) (promotion), [`PARC.md`](PARC.md) (le
parc vu de dehors), [`STRATEGIE.md`](STRATEGIE.md) (bibliothèque, squelette,
générateur), [`AMELIORATIONS.md`](AMELIORATIONS.md), [`VALEUR.md`](VALEUR.md)
(la valeur vue de l'utilisateur), [`CONFIG.md`](CONFIG.md) et
[`PARAMETRAGE.md`](PARAMETRAGE.md) (secrets et variables),
[`ESLINT-10.md`](ESLINT-10.md).

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

| Projet                                                                    | Persistance              | Sous-chemins consommés                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`miss-carbook`](https://github.com/mister-guiiug/miss-carbook)           | Supabase                 | `components.css`, `eslint-react`, `image`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/confirm-dialog`, `react/empty-state`, `react/i18n`, `react/observability`, `react/sheet`, `react/toast`, `react/update-prompt-banner`, `react/use-online`, `react/use-update-prompt`, `realtime`, `realtime/supabase`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `web-vitals` — **26**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [`miss-contraction`](https://github.com/mister-guiiug/miss-contraction)   | Local-first              | `download`, `eslint-react`, `lint-staged`, `pdf`, `playwright-base`, `prettier`, `react`, `react/observability`, `react/use-wake-lock`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `web-vitals` — **16**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`miss-genius`](https://github.com/mister-guiiug/miss-genius)             | Local-first              | `apps-catalog`, `components.css`, `download`, `eslint-react`, `format`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/app-footer`, `react/bottom-nav`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/field`, `react/i18n`, `react/observability`, `react/sheet`, `react/update-prompt-banner`, `react/use-update-prompt`, `sw-update`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `versioned-store`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **30**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`miss-uwh`](https://github.com/mister-guiiug/miss-uwh)                   | Supabase                 | `apps-catalog`, `components.css`, `download`, `eslint-react`, `format`, `ical`, `lint-staged`, `playwright-a11y`, `prettier`, `react`, `react/app-footer`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/field`, `react/i18n`, `react/labels`, `react/observability`, `react/sheet`, `react/toast`, `react/update-prompt-banner`, `storage`, `supabase-client`, `sw-update`, `sync-queue`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `versioned-store`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `xlsx` — **34**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [`mister-cim10`](https://github.com/mister-guiiug/mister-cim10)           | Local-first              | `components.css`, `csv`, `download`, `eslint-react`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/bottom-nav`, `react/confirm-dialog`, `react/i18n`, `react/labels`, `react/observability`, `react/theme-toggle`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **21**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`mister-footcoach`](https://github.com/mister-guiiug/mister-footcoach)   | Supabase                 | `apps-catalog`, `components.css`, `download`, `eslint-react`, `ical`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/badge`, `react/bottom-nav`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/i18n`, `react/icons-context`, `react/icons-lucide`, `react/observability`, `react/sheet`, `react/toast`, `react/update-prompt-banner`, `react/use-update-prompt`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **30**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [`mister-puzzle`](https://github.com/mister-guiiug/mister-puzzle)         | Firebase                 | `components.css`, `eslint-react`, `image`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/confirm-dialog`, `react/observability`, `react/update-prompt-banner`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `web-vitals` — **19**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [`miss-ticket-pwa`](https://github.com/mister-guiiug/miss-ticket-pwa)     | Firebase                 | `apps-catalog`, `components.css`, `eslint-react`, `lint-staged`, `pairing`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/i18n`, `react/icons-lucide`, `react/observability`, `react/use-online`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **19**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| [`mister-doc`](https://github.com/mister-guiiug/mister-doc)               | Supabase                 | `components.css`, `eslint-react`, `lint-staged`, `pdf`, `prettier`, `push`, `react`, `react/bottom-nav`, `react/button`, `react/confirm-dialog`, `react/empty-state`, `react/field`, `react/i18n`, `react/icons-context`, `react/icons-lucide`, `react/labels`, `react/observability`, `react/sheet`, `react/skeleton`, `react/theme-provider`, `react/toast`, `react/update-prompt-banner`, `react/use-update-prompt`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-pwa-base`, `vitest-base`, `vitest-setup`, `xlsx` — **30**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [`miss-lookhouse`](https://github.com/mister-guiiug/miss-lookhouse)       | Supabase                 | `apps-catalog`, `components.css`, `eslint-react`, `format`, `geo`, `prettier`, `react/app-footer`, `react/badge`, `react/bottom-nav`, `react/icons-context`, `react/sparkline`, `react/theme-provider`, `react/theme-toggle`, `storage`, `supabase-client`, `sync-queue`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vitest-base`, `vitest-setup` — **21**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [`miss-badminton`](https://github.com/mister-guiiug/miss-badminton)       | Local-first              | `apps-catalog`, `components.css`, `download`, `eslint-react`, `idb`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/confirm-dialog`, `react/observability`, `react/sheet`, `react/sparkline`, `react/use-online`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **22**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [`miss-dice`](https://github.com/mister-guiiug/miss-dice)                 | Local-first              | `apps-catalog`, `commitlint`, `download`, `eslint-react`, `lint-staged`, `playwright-a11y`, `playwright-base`, `prettier`, `react`, `react/observability`, `react/use-wake-lock`, `share`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **16**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [`miss-supaboss`](https://github.com/mister-guiiug/miss-supaboss)         | API tierce               | `apps-catalog`, `commitlint`, `components.css`, `eslint-react`, `format`, `lint-staged`, `playwright-base`, `prettier`, `react`, `react/badge`, `react/bottom-nav`, `react/confirm-dialog`, `react/empty-state`, `react/error-boundary`, `react/i18n`, `react/icons-context`, `react/observability`, `react/skeleton`, `react/toast`, `react/update-prompt-banner`, `react/use-online`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vitest-base`, `vitest-setup` — **27**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`miss-supatool`](https://github.com/mister-guiiug/miss-supatool)         | API tierce               | `components.css`, `download`, `eslint-react`, `format`, `prettier`, `react/app-header`, `react/badge`, `react/bottom-nav`, `react/button`, `react/card`, `react/confirm-dialog`, `react/empty-state`, `react/family-apps`, `react/field`, `react/observability`, `react/page-container`, `react/segmented-control`, `react/stat`, `react/theme-provider`, `react/theme-toggle`, `react/toast`, `react/update-prompt-banner`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **29**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [`mister-molkky`](https://github.com/mister-guiiug/mister-molkky)         | Supabase                 | `apps-catalog`, `components.css`, `download`, `eslint-react`, `lint-staged`, `pairing`, `playwright-a11y`, `playwright-base`, `prettier`, `qr`, `react`, `react/confirm-dialog`, `react/icons-context`, `react/icons-lucide`, `react/labels`, `react/observability`, `react/sheet`, `react/skeleton`, `react/sparkline`, `react/use-online`, `react/use-qr-scanner`, `react/use-wake-lock`, `share`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **30**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [`mister-qowa`](https://github.com/mister-guiiug/mister-qowa)             | Firebase                 | `apps-catalog`, `components.css`, `csv`, `download`, `eslint-react`, `pairing`, `playwright-base`, `qr`, `react/app-footer`, `react/app-updates`, `react/confirm-dialog`, `react/error-boundary`, `react/use-install-prompt`, `share`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vitest-base` — **18**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`mister-family-map`](https://github.com/mister-guiiug/mister-family-map) | Supabase                 | `commitlint`, `components.css`, `correlation`, `eslint-react`, `geo`, `lint-staged`, `logger`, `map`, `map/maplibre`, `playwright-a11y`, `playwright-base`, `prefetch`, `prettier`, `react`, `react/app-version`, `react/observability`, `react/share-button`, `react/update-prompt-banner`, `react/version`, `realtime`, `realtime/local`, `storage`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `vite-csp`, `vite-pwa-base`, `vite-version`, `vitest-base`, `vitest-setup` — **30**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`mister-miss-koh`](https://github.com/mister-guiiug/mister-miss-koh)     | Supabase                 | `backend`, `commitlint`, `components.css`, `eslint-react`, `format`, `lint-staged`, `prettier`, `react/app-footer`, `react/app-header`, `react/app-updates`, `react/badge`, `react/bottom-nav`, `react/button`, `react/card`, `react/empty-state`, `react/error-boundary`, `react/icons-context`, `react/icons-lucide`, `react/labels`, `react/page-container`, `react/rive`, `react/theme-provider`, `react/use-media-query`, `react/use-online`, `storage`, `supabase-client`, `tailwind-preset.css`, `tsconfig-app-react`, `tsconfig-node`, `versioned-store`, `vite-csp`, `vite-pwa-base`, `vitest-base`, `vitest-setup` — **34**                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [`mister-quota`](https://github.com/mister-guiiug/mister-quota)           | — (non relevé) · desktop | `components.css`, `format`, `prettier`, `react/confirm-dialog`, `react/error-boundary`, `react/toast` — **6**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [`mister-settle`](https://github.com/mister-guiiug/mister-settle)         | Supabase                 | `apps-catalog`, `auth/supabase`, `backend`, `commitlint`, `components.css`, `csv`, `download`, `eslint-react`, `id`, `idb`, `image`, `logger`, `playwright-base`, `prettier`, `react/app-footer`, `react/app-header`, `react/app-updates`, `react/app-version`, `react/auth-provider`, `react/badge`, `react/bottom-nav`, `react/button`, `react/card`, `react/confirm-dialog`, `react/connection-banner`, `react/empty-state`, `react/error-banner`, `react/error-boundary`, `react/family-apps`, `react/field`, `react/i18n`, `react/login-form`, `react/observability`, `react/page-container`, `react/pwa-install-prompt`, `react/segmented-control`, `react/share-button`, `react/sheet`, `react/skeleton`, `react/stat`, `react/sync-status-badge`, `react/theme-provider`, `react/theme-toggle`, `react/toast`, `react/use-action-guard`, `react/use-online`, `react/version`, `storage`, `supabase-client`, `sync-queue`, `tailwind-preset.css`, `versioned-store`, `vite-csp`, `vite-pwa`, `vite-pwa-base`, `vite-version`, `vitest-setup`, `xlsx` — **58** |

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

**Ce que le socle INTERDIT encore, depuis le 10/09/2026.**
`node scripts/plafonds.mjs` compare chaque plage déclarée (`peerDependencies`,
et `--dev` pour la chaîne de développement) à la version publiée sous
l'étiquette `latest`, et ne retient que les plafonds qui excluent la majeure
courante. Une `peerDependency` est un plafond pour les vingt apps, et un
plafond ne fait aucun bruit : il se découvre le jour où quelqu'un tente de
monter, en conflit de peers, très loin d'ici. Le premier relevé en a trouvé
neuf, dont `eslint@^9` sorti du support ; le workflow `Plafonds` le rejoue
chaque lundi et sur toute PR qui touche `package.json`. Il reste vert : un
plafond assumé n'est pas un défaut — il doit seulement rester une décision.

<!-- ADOPTION:DÉBUT — engendré par `npm run sync` depuis showroom/adoption.js -->

_Relevé du 2026-09-07 sur 20 dépôts, par `npm run adoption`._

> **Dette d'adoption : 3 fichiers recopiés** dans 20 apps, sur 2 besoins distincts. Les pires : `links` (2), `Stat` (1).
>
> **Aucun de ces doublons ne manque au socle** : tout est déjà publié. Ce n'est pas un problème de modules, c'en est un de migration — `node scripts/adopt.mjs` en fait l’essai à blanc, app par app.

| Export ou module              | Importé par | Encore recopié dans |
| ----------------------------- | ----------- | ------------------- |
| `baseTestOptions`             | 19 / 20     | —                   |
| `pwaSeoPlugin`                | 19 / 20     | —                   |
| `UpdatePromptBanner`          | 19 / 20     | —                   |
| `versionPlugin`               | 19 / 20     | —                   |
| `FamilyApps`                  | 16 / 20     | —                   |
| `links`                       | 15 / 20     | 2 / 20              |
| `ConfirmDialog`               | 15 / 20     | —                   |
| `createLogger`                | 15 / 20     | —                   |
| `cspPlugin`                   | 15 / 20     | —                   |
| `initSentry`                  | 15 / 20     | —                   |
| `installErrorReporter`        | 15 / 20     | —                   |
| `repoUrl`                     | 15 / 20     | —                   |
| `AppFooter`                   | 14 / 20     | —                   |
| `definePwaPlaywrightConfig`   | 14 / 20     | —                   |
| `useTheme`                    | 14 / 20     | —                   |
| `expectNoA11yViolations`      | 13 / 20     | —                   |
| `getDefaultLocale`            | 13 / 20     | —                   |
| `applyUpdate`                 | 12 / 20     | —                   |
| `createI18n`                  | 12 / 20     | —                   |
| `recordError`                 | 12 / 20     | —                   |
| `ThemeProvider`               | 12 / 20     | —                   |
| `useActionGuard`              | 12 / 20     | —                   |
| `ConnectionBanner`            | 11 / 20     | —                   |
| `EmptyState`                  | 11 / 20     | —                   |
| `ErrorBoundary`               | 11 / 20     | —                   |
| `Sheet`                       | 11 / 20     | —                   |
| `AppUpdates`                  | 10 / 20     | —                   |
| `BottomNav`                   | 10 / 20     | —                   |
| `createStore`                 | 10 / 20     | —                   |
| `createVersionedStore`        | 10 / 20     | —                   |
| `dateSlug`                    | 10 / 20     | —                   |
| `LabelsProvider`              | 10 / 20     | —                   |
| `downloadText`                | 9 / 20      | —                   |
| `pwaRegisterAlias`            | 9 / 20      | —                   |
| `ToastProvider`               | 9 / 20      | —                   |
| `useOnline`                   | 9 / 20      | —                   |
| `Button`                      | 8 / 20      | —                   |
| `coveragePreset`              | 8 / 20      | —                   |
| `shareOrCopy`                 | 8 / 20      | —                   |
| `useThemeContext`             | 8 / 20      | —                   |
| `useToast`                    | 8 / 20      | —                   |
| `Badge`                       | 7 / 20      | —                   |
| `IconsProvider`               | 7 / 20      | —                   |
| `SPONSOR_URL`                 | 7 / 20      | —                   |
| `Card`                        | 6 / 20      | —                   |
| `downloadJson`                | 6 / 20      | —                   |
| `SkeletonGroup`               | 6 / 20      | —                   |
| `TextField`                   | 6 / 20      | —                   |
| `ThemeToggle`                 | 6 / 20      | —                   |
| `formatNumber`                | 5 / 20      | —                   |
| `lucideIconSet`               | 5 / 20      | —                   |
| `SelectField`                 | 5 / 20      | —                   |
| `swStub`                      | 5 / 20      | —                   |
| `ThemePreference`             | 5 / 20      | —                   |
| `unregisterServiceWorkers`    | 5 / 20      | —                   |
| `AppHeader`                   | 4 / 20      | —                   |
| `buildPdf`                    | 4 / 20      | —                   |
| `CardHeader`                  | 4 / 20      | —                   |
| `createSupabaseClientFactory` | 4 / 20      | —                   |
| `createSyncQueue`             | 4 / 20      | —                   |
| `createTranslator`            | 4 / 20      | —                   |
| `currentAppUrl`               | 4 / 20      | —                   |
| `currentIssueReportUrl`       | 4 / 20      | —                   |
| `downloadPdf`                 | 4 / 20      | —                   |
| `initWebVitals`               | 4 / 20      | —                   |
| `ObservabilityBoundary`       | 4 / 20      | —                   |
| `PAGE`                        | 4 / 20      | —                   |
| `PdfContent`                  | 4 / 20      | —                   |
| `RegisterSW`                  | 4 / 20      | —                   |
| `setDefaultLocale`            | 4 / 20      | —                   |
| `SyncQueue`                   | 4 / 20      | —                   |
| `SyncQueueEntry`              | 4 / 20      | —                   |
| `textWidth`                   | 4 / 20      | —                   |
| `validateImageFile`           | 4 / 20      | —                   |
| `AppVersion`                  | 3 / 20      | —                   |
| `BadgeTone`                   | 3 / 20      | —                   |
| `compressImageToMaxBytes`     | 3 / 20      | —                   |
| `createIdb`                   | 3 / 20      | —                   |
| `formatDate`                  | 3 / 20      | —                   |
| `formatDateTime`              | 3 / 20      | —                   |
| `generateCode`                | 3 / 20      | —                   |
| `I18nPaths`                   | 3 / 20      | —                   |
| `ICAL_MIME`                   | 3 / 20      | —                   |
| `IcalEvent`                   | 3 / 20      | —                   |
| `PageContainer`               | 3 / 20      | —                   |
| `readRaw`                     | 3 / 20      | —                   |
| `removeKey`                   | 3 / 20      | —                   |
| `SegmentedControl`            | 3 / 20      | —                   |
| `Skeleton`                    | 3 / 20      | —                   |
| `Sparkline`                   | 3 / 20      | —                   |
| `stripImageMetadata`          | 3 / 20      | —                   |
| `TextAreaField`               | 3 / 20      | —                   |
| `ToastViewport`               | 3 / 20      | —                   |
| `toCsv`                       | 3 / 20      | —                   |
| `toIcalendar`                 | 3 / 20      | —                   |
| `UpdateButton`                | 3 / 20      | —                   |
| `useUpdatePrompt`             | 3 / 20      | —                   |
| `useWakeLock`                 | 3 / 20      | —                   |
| `Stat`                        | 2 / 20      | 1 / 20              |
| `ActionGuardResult`           | 2 / 20      | —                   |
| `ALPHABETS`                   | 2 / 20      | —                   |
| `buildXlsx`                   | 2 / 20      | —                   |
| `createChannel`               | 2 / 20      | —                   |
| `downloadBlob`                | 2 / 20      | —                   |
| `downloadXlsx`                | 2 / 20      | —                   |
| `ErrorBanner`                 | 2 / 20      | —                   |
| `formatBytes`                 | 2 / 20      | —                   |
| `formatCurrency`              | 2 / 20      | —                   |
| `formatRelativeTime`          | 2 / 20      | —                   |
| `isValidCoordinates`          | 2 / 20      | —                   |
| `LabelOverrides`              | 2 / 20      | —                   |
| `LABELS`                      | 2 / 20      | —                   |
| `normalizeCode`               | 2 / 20      | —                   |
| `qrToDataUrl`                 | 2 / 20      | —                   |
| `readJsonFile`                | 2 / 20      | —                   |
| `registerSW`                  | 2 / 20      | —                   |
| `ShareButton`                 | 2 / 20      | —                   |
| `slugify`                     | 2 / 20      | —                   |
| `Store`                       | 2 / 20      | —                   |
| `supabaseConfig`              | 2 / 20      | —                   |
| `SyncStatusBadge`             | 2 / 20      | —                   |
| `usePullToRefresh`            | 2 / 20      | —                   |
| `useReducedMotion`            | 2 / 20      | —                   |
| `VersionProvider`             | 2 / 20      | —                   |
| `addDays`                     | 1 / 20      | —                   |
| `appById`                     | 1 / 20      | —                   |
| `AuthProvider`                | 1 / 20      | —                   |
| `backendCoverage`             | 1 / 20      | —                   |
| `BackendCoverage`             | 1 / 20      | —                   |
| `BACKUP_FORMAT`               | 1 / 20      | —                   |
| `BACKUP_VERSION`              | 1 / 20      | —                   |
| `BottomNavItem`               | 1 / 20      | —                   |
| `BoundingBox`                 | 1 / 20      | —                   |
| `ChannelStatus`               | 1 / 20      | —                   |
| `clearErrorLog`               | 1 / 20      | —                   |
| `clusterByGrid`               | 1 / 20      | —                   |
| `clustersToMarkers`           | 1 / 20      | —                   |
| `composeBackend`              | 1 / 20      | —                   |
| `Coordinates`                 | 1 / 20      | —                   |
| `createBackendSelector`       | 1 / 20      | —                   |
| `createBackup`                | 1 / 20      | —                   |
| `createId`                    | 1 / 20      | —                   |
| `createMapLibreMapProvider`   | 1 / 20      | —                   |
| `createPushClient`            | 1 / 20      | —                   |
| `createUuid`                  | 1 / 20      | —                   |
| `devPortOf`                   | 1 / 20      | —                   |
| `distanceKm`                  | 1 / 20      | —                   |
| `dumpAppState`                | 1 / 20      | —                   |
| `endOfDay`                    | 1 / 20      | —                   |
| `escapeInline`                | 1 / 20      | —                   |
| `FeedbackSpec`                | 1 / 20      | —                   |
| `findSimilar`                 | 1 / 20      | —                   |
| `formatDistance`              | 1 / 20      | —                   |
| `formatDuration`              | 1 / 20      | —                   |
| `formatPercentage`            | 1 / 20      | —                   |
| `formatUsage`                 | 1 / 20      | —                   |
| `getErrorLog`                 | 1 / 20      | —                   |
| `I18nApi`                     | 1 / 20      | —                   |
| `icalDate`                    | 1 / 20      | —                   |
| `IconComponent`               | 1 / 20      | —                   |
| `IdbStore`                    | 1 / 20      | —                   |
| `IMAGE_ACCEPTED_TYPES`        | 1 / 20      | —                   |
| `IMAGE_MAX_BYTES`             | 1 / 20      | —                   |
| `ImageSeams`                  | 1 / 20      | —                   |
| `ImageValidationError`        | 1 / 20      | —                   |
| `installCorrelation`          | 1 / 20      | —                   |
| `installObservability`        | 1 / 20      | —                   |
| `isClusterId`                 | 1 / 20      | —                   |
| `isInBoundingBox`             | 1 / 20      | —                   |
| `isValidLatitude`             | 1 / 20      | —                   |
| `isValidLongitude`            | 1 / 20      | —                   |
| `localRealtimeTransport`      | 1 / 20      | —                   |
| `LoginForm`                   | 1 / 20      | —                   |
| `mapCspDirectives`            | 1 / 20      | —                   |
| `mapTileRuntimeCaching`       | 1 / 20      | —                   |
| `osmRasterTiles`              | 1 / 20      | —                   |
| `pagesUrl`                    | 1 / 20      | —                   |
| `PairingAlphabet`             | 1 / 20      | —                   |
| `parseCsv`                    | 1 / 20      | —                   |
| `parseDeepLink`               | 1 / 20      | —                   |
| `permissionState`             | 1 / 20      | —                   |
| `prefetch`                    | 1 / 20      | —                   |
| `pushSupport`                 | 1 / 20      | —                   |
| `PushSupport`                 | 1 / 20      | —                   |
| `PushTransport`               | 1 / 20      | —                   |
| `pwaBaseOptions`              | 1 / 20      | —                   |
| `PwaInstallPrompt`            | 1 / 20      | —                   |
| `qrToSvg`                     | 1 / 20      | —                   |
| `readJson`                    | 1 / 20      | —                   |
| `resolveBackendKind`          | 1 / 20      | —                   |
| `ResolvedTheme`               | 1 / 20      | —                   |
| `resolveSeoPublicUrls`        | 1 / 20      | —                   |
| `restoreBackup`               | 1 / 20      | —                   |
| `rethrowWithState`            | 1 / 20      | —                   |
| `Rgb`                         | 1 / 20      | —                   |
| `ShareData`                   | 1 / 20      | —                   |
| `ShareResult`                 | 1 / 20      | —                   |
| `spaFallbackPlugin`           | 1 / 20      | —                   |
| `startOfDay`                  | 1 / 20      | —                   |
| `STATUS`                      | 1 / 20      | —                   |
| `SUPABASE_ENV_KEYS`           | 1 / 20      | —                   |
| `supabaseAuthAdapter`         | 1 / 20      | —                   |
| `SupabaseChange`              | 1 / 20      | —                   |
| `supabaseRealtimeTransport`   | 1 / 20      | —                   |
| `SyncQueueOptions`            | 1 / 20      | —                   |
| `SyncStatus`                  | 1 / 20      | —                   |
| `themeBootSource`             | 1 / 20      | —                   |
| `unescapeText`                | 1 / 20      | —                   |
| `unfoldLines`                 | 1 / 20      | —                   |
| `useAppUpdates`               | 1 / 20      | —                   |
| `useAuthContext`              | 1 / 20      | —                   |
| `useFeedback`                 | 1 / 20      | —                   |
| `useFocusTrap`                | 1 / 20      | —                   |
| `useInstallPrompt`            | 1 / 20      | —                   |
| `useKeyboardShortcuts`        | 1 / 20      | —                   |
| `useLabels`                   | 1 / 20      | —                   |
| `useQrScanner`                | 1 / 20      | —                   |
| `vibrate`                     | 1 / 20      | —                   |
| `writeJson`                   | 1 / 20      | —                   |
| `writeRaw`                    | 1 / 20      | —                   |
| `XlsxSheet`                   | 1 / 20      | —                   |
| `XlsxValue`                   | 1 / 20      | —                   |

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
Node ≥22 (engines + .nvmrc ; CI du socle éprouvée sur 22 ET 24)
TypeScript ~6.0.3 strict + verbatimModuleSyntax + noUncheckedIndexedAccess, cible ES2025 + lib ES2025
ESLint 9 (flat config) + typescript-eslint 8.58 — la 10 est instruite, pas ouverte (ESLINT-10.md)
eslint-plugin-react-hooks 7.0 (configs.flat.recommended) + eslint-plugin-react-refresh 0.5
Vite 8 (Rolldown) + Vitest 4 (jsdom + globals + setupFiles)
Zod 4 (peer)
Prettier 3.6 (singleQuote, tabWidth 2, printWidth 80, trailingComma es5, arrowParens 'avoid')
Tailwind 4 (@tailwindcss/vite) + lucide-react (icônes — standard famille)
```

> **3.0.0 (breaking)** — `tsconfig-app`/`tsconfig-node` activent
> **`verbatimModuleSyntax`** et **`noUncheckedIndexedAccess`** (de nouvelles
> erreurs TS peuvent apparaître au bump — cf. [migration 3.0.0](docs/MIGRATIONS.md#tsconfig-30-verbatimmodulesyntax--nouncheckedindexedaccess)),
> et `engines.node` passe à **`>=22`**.

> **2.0.0 (breaking)** — les peer-dependencies passent en **Vite 8 / Vitest 4 / TypeScript ~6.0.3 / Zod 4**
> (plus de support Vitest 3 ni Zod 3). Voir la [migration](docs/MIGRATIONS.md#zod-3--4-breaking-perfs-50) ci-dessous.

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

### Liens app — code source, sponsor, signalement (règle famille)

Chaque application de la famille **expose trois liens** : son **code source**
(dépôt GitHub), un lien **sponsor** (Buy Me a Coffee) et **« Signaler un
problème »** (`AppFooter issues` : le gabarit `bug.yml` du compte, prérempli
avec la version, le commit, l'écran et le navigateur). Transparence (apps
gratuites, locales, open source), soutien, et retour.

> **OÙ — la règle, depuis le 06/09/2026.** Les trois liens sont visibles **sur
> deux écrans, et deux seulement** : **l'accueil**, et **À propos ou Réglages**.
> Pas l'un ou l'autre : les deux — qui ouvre l'app doit pouvoir vérifier ce
> qu'elle fait et remercier sans aller les chercher dans un tiroir, et qui vient
> les chercher doit les trouver là où on range ce genre de chose. Et **nulle
> part ailleurs** : un pied de page qui suit chaque écran pèse sur un plateau de
> jeu, un formulaire, une carte — trois liens sortants sous une saisie, ce n'est
> pas un pied de page, c'est du bruit.
>
> **La coquille n'est plus une façon de la tenir.** `<AppFooter>` rendu hors des
> `<Routes>` est sur TOUS les écrans : c'était la réponse du socle la veille,
> c'est aujourd'hui un écran de trop. Le pied de page se rend **dans** l'écran
> d'accueil et **dans** À propos / Réglages — deux fichiers, le même composant.
>
> `npx pwa-doctor` le vérifie (`liens-famille`) : il dépouille les routes,
> résout une indirection (`<Footer/>` défini à part, rendu par la coquille ou
> par deux écrans), lit la condition d'une coquille sans routeur, et reconnaît
> l'accueil et les réglages au nom de fichier. **Relevé du 06/09/2026 : une app
> sur vingt tient la règle** — `mister-molkky`, par deux écrans. Seize rendent
> le pied de page par la coquille, donc partout (`miss-badminton`,
> `miss-carbook`, `miss-dice`, `miss-genius`, `miss-lookhouse`, `miss-supaboss`,
> `miss-supatool`, `miss-ticket-pwa`, `miss-uwh`, `mister-doc`,
> `mister-family-map`, `mister-footcoach`, `mister-miss-koh`, `mister-puzzle`,
> `mister-qowa` et le squelette) ; deux sur trois écrans (`miss-contraction` :
> la liste de contrôle en plus ; `mister-cim10` : l'aide ET les réglages) ; une
> sans aucun lien (`mister-quota`).

Deux niveaux, à mettre en place ensemble :

1. **Dans l'app** — un `src/links.ts` centralise les URL, consommé par le pied
   de page des deux écrans :

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
   // src/features/home/HomeScreen.tsx — et la même ligne dans AboutScreen.tsx
   // (ou SettingsScreen.tsx). Jamais dans App.tsx hors des <Routes> : là, il
   // serait sur tous les écrans.
   export function HomeScreen() {
     return (
       <>
         {/* … */}
         {/* Le lien de soutien n'est pas passé : AppFooter le prend au catalogue. */}
         <AppFooter repoUrl={REPO_URL} issues />
       </>
     );
   }
   ```

   Un `<AppFooter>` écrit dans la coquille, **hors** des `<Routes>`, vaut pour
   toutes les routes — celles où il n'a rien à faire comprises. C'était la forme
   de seize apps le 06/09/2026, et elle est invisible : la page où on le
   regarde, c'est justement une de celles qui doivent l'avoir.

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
   `FamilyApps`](docs/INTERFACE.md#catalogue-famille--familyapps).

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
et l'essai montre que **le blocage est déclaratif, pas réel**.

**Le socle ne peut pas ouvrir cette porte seul, et la tentative du 10/09/2026
l'a prouvé.** Élargir ses peers en `^9.39.4 || ^10.0.0` autorise npm à prendre
la 10, qui bute alors sur le plafond de jsx-a11y : `ERESOLVE`, installation
refusée — sur `pwa-starter-kit`, donc sur le modèle de toute application à
naître. Une app qui déclare `eslint` elle-même n'est pas touchée ; celles qui
s'en remettent à la peer du socle le sont. Les peers restent donc en `^9.39.4`
tant que la passe n'est pas décidée : **le socle et le squelette doivent monter
dans la même version**, puis les apps.

Ce qui est déjà fait, et qui vaut dans les deux cas : les **dix**
`no-useless-assignment` du socle sont corrigés (la règle entre dans
`recommended` avec ESLint 10 — le dossier en annonçait sept le 03/09, trois
fichiers écrits depuis s'y étaient ajoutés), les deux autres règles entrantes
sont vérifiées à zéro occurrence, et `scripts/plafonds.mjs` surveille désormais
ce plafond au lieu de l'oublier.

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
silence — est instruit dans [CONFIG.md](CONFIG.md). **La procédure, geste par
geste, avec ses variantes** (Supabase, Firebase, Cloudflare, le socle, le
miroir, déplacer une valeur, retirer) est dans [PARAMETRAGE.md](PARAMETRAGE.md).

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
3. **Re-exports** (une ligne chacun, cf. [docs/CONFIGS.md](docs/CONFIGS.md)) : `eslint.config.js`,
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

## Reusable workflows GitHub Actions

Hébergés dans [`.github/workflows/`](.github/workflows/) — utilisables par tous les repos de la famille.
| Workflow | Rôle | Exemple d'appel |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pwa-ci.yml` | Format · Lint · Type · Test · Build (+ E2E optionnel) | voir [Utilisation](#reusable-workflow-ci) |
| `pwa-deploy.yml` | Build + déploiement GitHub Pages (avec `VITE_BASE_PATH` auto et repli SPA `404.html`) | voir [Utilisation](#reusable-workflow-deploy) |
| `npm-publish.yml` | Publication npm sur GitHub Packages avec `--provenance` | voir [Utilisation](#reusable-workflow-publish) |
| `pwa-lighthouse.yml` | Build + Lighthouse CI (perf/a11y/bp/seo) sur PR | `uses: …/pwa-lighthouse.yml@v4` (requiert `.lighthouserc.json`, cf. template) |
| `pwa-supabase-migrate.yml` | `supabase link` + `db push` (+ Edge Functions en option), sans annulation d'un run en cours — quatre copies en une | `uses: …/pwa-supabase-migrate.yml@v4` avec deux secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`) et la référence du projet en `vars` (cf. en-tête du fichier, [PARAMETRAGE.md](PARAMETRAGE.md)) |
| `pwa-supabase-test.yml` | Tests pgTAP sur une pile Supabase JETABLE du runner — migrations depuis zéro, aucun secret ; promu de miss-lookhouse, seule app à le faire. Complément du bin `pwa-pgtap`, qui joue les mêmes fichiers contre la base liée | `uses: …/pwa-supabase-test.yml@v4` depuis un caller sur `supabase/**` (cf. en-tête du fichier ; exige `supabase/config.toml`) |
| `pwa-supabase-keepalive.yml` | Ping REST tous les trois jours pour qu'un projet Free ne s'endorme pas — **à poser avec la migration** : le 02/09/2026 aucune app ne l'appelait, et `miss-carbook` dormait | `uses: …/pwa-supabase-keepalive.yml@v4` depuis un caller `schedule` (cf. en-tête du fichier) |
| `pwa-worker-deploy.yml` | `wrangler deploy` d'un Cloudflare Worker, sans échec quand le secret manque — deux copies en une | `uses: …/pwa-worker-deploy.yml@v4` avec `working-directory` |
| `cleanup-runs.yml` | Élague l'historique Actions du dépôt APPELANT (N runs par workflow) — douze copies identiques en une | `uses: …/cleanup-runs.yml@v4` depuis un caller `workflow_dispatch` à `permissions: actions: write` (cf. en-tête du fichier) |

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
      run-doctor: true # la checklist du parc, lue sur le dépôt et sur dist/
      run-e2e: false # passer à true quand Playwright est en place
      # e2e-grep vaut '@critical|@a11y' par défaut ; un filtre qui ne trouve
      # aucun test fait ÉCHOUER le job, au lieu de le laisser vert.
      # e2e-project vaut 'chromium' par défaut et accepte une liste :
      # 'chromium mobile-chrome' couvre aussi le téléphone (Pixel 5), sans
      # navigateur supplémentaire à installer.
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

- **`pwa-ci.yml`** — `run-doctor` (`pwa-doctor` après le build ; opt-in en
  4.x) et `doctor-strict` ; `e2e-grep` (défaut `@critical|@a11y`, et un
  filtre sans test fait échouer le job) ; `e2e-project` (défaut `chromium`,
  mais accepte une **liste** : `chromium mobile-chrome` joue le bureau et le
  téléphone, et n'installe qu'un navigateur — Pixel 5 tourne sur le chromium
  déjà là) avec `e2e-install` pour les projets maison dont le nom n'est pas
  celui d'un navigateur ; `build-env` (variables `KEY=VALUE`, une par ligne,
  injectées avant build/test pour les apps Firebase/Supabase) ; `server-dir`
  (install + `tsc --noEmit` d'un backend annexe).
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

## Personnalisation par projet

Chaque projet peut surcharger des options après extension :

- **mister-puzzle** ajoute `verbatimModuleSyntax` + `erasableSyntaxOnly` (TS plus strict sur le code legacy converti) sur **`tsconfig.app` ET `tsconfig.node`**. Depuis le durcissement de `tsconfig-node` (v2.1), les options de linting (`allowImportingTsExtensions`, `moduleDetection: force`, `isolatedModules`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) sont **portées par la base** — l'override projet peut être réduit aux seules `verbatimModuleSyntax`/`erasableSyntaxOnly`.
- **mister-cim10** override `allowJs: true` + `checkJs: false` (le code legacy ICD-10 utilise du JS dans des manipulations DOM ; à durcir progressivement).
- **mister-puzzle** étend `vitest-base.include` pour ajouter `server/**/*.test.ts`.
- **miss-contraction** étend `vitest-base` avec un `exclude: ['**/node_modules/**', '**/e2e/**']` pour éviter que Vitest pioche dans les specs Playwright.

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
