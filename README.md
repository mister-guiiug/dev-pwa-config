# @mister-guiiug/dev-pwa-config

[![CI](https://github.com/mister-guiiug/dev-pwa-config/actions/workflows/ci.yml/badge.svg)](https://github.com/mister-guiiug/dev-pwa-config/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

Configurations partagées (ESLint, Prettier, TypeScript, Vitest) pour les
projets PWA de la famille `miss-*` et `mister-*`.

> **Distribué via [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)** sur le registre `npm.pkg.github.com`.

## Où lire quoi

Le manuel de ce socle ne tenait plus dans une page : 167 sous-chemins, neuf
binaires, onze workflows réutilisables. Il vit dans `docs/`, découpé par sujet,
et rien n'y a été résumé, seulement déplacé.

| Page                                       | Ce qu'on y trouve                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| [`docs/EXPORTS.md`](docs/EXPORTS.md)       | **La table des sous-chemins publiés** — le point d'entrée quand on cherche « est-ce que le socle sait déjà faire ça ? » |
| [`docs/CONFIGS.md`](docs/CONFIGS.md)       | ESLint, Prettier, TypeScript, Vitest, Playwright, Vite (PWA, CSP, SEO), commitlint, lint-staged, icônes                 |
| [`docs/INTERFACE.md`](docs/INTERFACE.md)   | Composants React, habillage `components.css`, primitives, catalogue famille, Rive, accessibilité                        |
| [`docs/DONNEES.md`](docs/DONNEES.md)       | Persistance, magasin versionné, coffre chiffré, Supabase, file hors-ligne, temps réel, carte, auth, PDF/Excel/iCal      |
| [`docs/BINS.md`](docs/BINS.md)             | Binaires `pwa-*` : `doctor`, `bundle-budget`, `icons`, `pgtap`, `screenshots`, `og-image`, `bindings`, `typecheck-7`    |
| [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) | Ce qu'a demandé chaque majeure                                                                                          |
| [`docs/V7.md`](docs/V7.md)                 | Périmètre de la prochaine majeure (rétrécissement, types, catalogue)                                                    |

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
de suite : `components.css` est repris par **dix-huit dépôts sur vingt**, et
vingt et un sous-chemins n'ont qu'un seul adoptant, dont dix pour le seul
`mister-settle`.

⚠️ **Ce tableau compte des sous-chemins, pas des composants.** Une app qui
importe `FamilyApps` depuis le baril `react` n'y fait pas apparaître
`react/family-apps` : ce sous-chemin semble donc n'avoir que deux adoptants,
alors que seize applications importent le composant. Pour l'adoption d'un export,
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
| [`miss-devises`](https://github.com/mister-guiiug/miss-devises)           | Local-first              | `analytics`, `apps-catalog`, `commitlint`, `components.css`, `download`, `eslint-react`, `format`, `id`, `idb`, `lint-staged`, `logger`, `playwright-a11y`, `playwright-base`, `playwright-entree`, `prettier`, `react/app-footer`, `react/app-shell`, `react/app-updates`, `react/button`, `react/card`, `react/chrome-prefs`, `react/confirm-dialog`, `react/connection-banner`, `react/consent-banner`, `react/consent-section`, `react/empty-state`, `react/error-boundary`, `react/family-about`, `react/field`, `react/i18n`, `react/observability`, `react/segmented-control`, `react/sheet`, `react/stat`, `react/theme-provider`, `react/toast`, `react/use-page-views`, `react/version`, `sparkline`, `tailwind-preset.css`, `testing/posthog`, `tsconfig-app-react`, `tsconfig-node`, `versioned-store`, `vite-csp`, `vite-pwa`, `vite-pwa-base`, `vite-version`, `vitest-base`, `vitest-setup` — **50**                                                                                                                                                  |

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
quinze. `ConfirmDialog` et `ErrorBoundary` étaient alors importés par dix
apps, `EmptyState` par sept, `Sheet` par six.

**Sept postes sont passés à zéro** en deux jours : `UpdatePromptBanner` (8
copies), `links` (7), `applyUpdate` (6), `format` (5), `Toast`, `ThemeToggle`,
`ErrorBoundary`. Le dernier, `applyUpdate`, était le plus coûteux : il ne
supposait pas un import mais de reprendre un enregistrement de service worker,
la désinscription de développement que cinq apps avaient écrite, et — pour trois
d'entre elles — de trancher ce que `registerType: 'autoUpdate'` permet
réellement. Ce qui restait demandait la même chose : `useI18n` (4) un
fournisseur et des dictionnaires, `useTheme` (3) un état à déplacer.

**Le chiffre est passé de 71 à 17, et il faut séparer les causes.** En rejouant
l'ancienne règle sur un état intermédiaire, on obtenait 58 là où la nouvelle
disait 46 : douze doublons étaient donc **invisibles à l'instrument** — neuf
besoins qu'il ne savait pas acquitter, trois façades qu'il comptait comme des
réécritures. Le reste de la baisse est du travail réel. Confondre les deux
attribuerait à la campagne ce que personne n'a fait (voir `CAMPAGNE.md`). Au
relevé du 07/09, il ne restait que trois fichiers (`links` ×2, `Stat` ×1) —
fermé le 04/10/2026. Le tableau ci-dessous doit rester à zéro dans la colonne
« Encore recopié ».

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

`node scripts/probe-sites.mjs` lit les sites PUBLIÉS du catalogue (manifeste, CSP,
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

_Relevé du 2026-10-01 sur 21 dépôts, par `npm run adoption`._

| Export ou module              | Importé par | Encore recopié dans |
| ----------------------------- | ----------- | ------------------- |
| `baseTestOptions`             | 20 / 21     | —                   |
| `pwaSeoPlugin`                | 20 / 21     | —                   |
| `UpdatePromptBanner`          | 20 / 21     | —                   |
| `versionPlugin`               | 20 / 21     | —                   |
| `ConfirmDialog`               | 16 / 21     | —                   |
| `createLogger`                | 16 / 21     | —                   |
| `cspPlugin`                   | 16 / 21     | —                   |
| `FamilyApps`                  | 16 / 21     | —                   |
| `initSentry`                  | 16 / 21     | —                   |
| `installErrorReporter`        | 16 / 21     | —                   |
| `repoUrl`                     | 16 / 21     | —                   |
| `AppFooter`                   | 15 / 21     | —                   |
| `definePwaPlaywrightConfig`   | 15 / 21     | —                   |
| `useTheme`                    | 15 / 21     | —                   |
| `expectNoA11yViolations`      | 14 / 21     | —                   |
| `applyUpdate`                 | 13 / 21     | —                   |
| `createI18n`                  | 13 / 21     | —                   |
| `getDefaultLocale`            | 13 / 21     | —                   |
| `ThemeProvider`               | 13 / 21     | —                   |
| `ConnectionBanner`            | 12 / 21     | —                   |
| `EmptyState`                  | 12 / 21     | —                   |
| `recordError`                 | 12 / 21     | —                   |
| `Sheet`                       | 12 / 21     | —                   |
| `useActionGuard`              | 12 / 21     | —                   |
| `AppUpdates`                  | 11 / 21     | —                   |
| `createVersionedStore`        | 11 / 21     | —                   |
| `dateSlug`                    | 11 / 21     | —                   |
| `ErrorBoundary`               | 11 / 21     | —                   |
| `BottomNav`                   | 10 / 21     | —                   |
| `createStore`                 | 10 / 21     | —                   |
| `downloadText`                | 10 / 21     | —                   |
| `LabelsProvider`              | 10 / 21     | —                   |
| `ToastProvider`               | 10 / 21     | —                   |
| `Button`                      | 9 / 21      | —                   |
| `pwaRegisterAlias`            | 9 / 21      | —                   |
| `useOnline`                   | 9 / 21      | —                   |
| `useToast`                    | 9 / 21      | —                   |
| `coveragePreset`              | 8 / 21      | —                   |
| `shareOrCopy`                 | 8 / 21      | —                   |
| `useThemeContext`             | 8 / 21      | —                   |
| `Badge`                       | 7 / 21      | —                   |
| `Card`                        | 7 / 21      | —                   |
| `IconsProvider`               | 7 / 21      | —                   |
| `SPONSOR_URL`                 | 7 / 21      | —                   |
| `TextField`                   | 7 / 21      | —                   |
| `downloadJson`                | 6 / 21      | —                   |
| `formatNumber`                | 6 / 21      | —                   |
| `SkeletonGroup`               | 6 / 21      | —                   |
| `ThemeToggle`                 | 6 / 21      | —                   |
| `CardHeader`                  | 5 / 21      | —                   |
| `lucideIconSet`               | 5 / 21      | —                   |
| `ObservabilityBoundary`       | 5 / 21      | —                   |
| `SelectField`                 | 5 / 21      | —                   |
| `swStub`                      | 5 / 21      | —                   |
| `ThemePreference`             | 5 / 21      | —                   |
| `unregisterServiceWorkers`    | 5 / 21      | —                   |
| `AppHeader`                   | 4 / 21      | —                   |
| `buildPdf`                    | 4 / 21      | —                   |
| `createIdb`                   | 4 / 21      | —                   |
| `createSupabaseClientFactory` | 4 / 21      | —                   |
| `createSyncQueue`             | 4 / 21      | —                   |
| `createTranslator`            | 4 / 21      | —                   |
| `currentAppUrl`               | 4 / 21      | —                   |
| `currentIssueReportUrl`       | 4 / 21      | —                   |
| `downloadPdf`                 | 4 / 21      | —                   |
| `initWebVitals`               | 4 / 21      | —                   |
| `PAGE`                        | 4 / 21      | —                   |
| `PdfContent`                  | 4 / 21      | —                   |
| `RegisterSW`                  | 4 / 21      | —                   |
| `SegmentedControl`            | 4 / 21      | —                   |
| `setDefaultLocale`            | 4 / 21      | —                   |
| `Stat`                        | 4 / 21      | —                   |
| `SyncQueue`                   | 4 / 21      | —                   |
| `SyncQueueEntry`              | 4 / 21      | —                   |
| `textWidth`                   | 4 / 21      | —                   |
| `validateImageFile`           | 4 / 21      | —                   |
| `AppVersion`                  | 3 / 21      | —                   |
| `BadgeTone`                   | 3 / 21      | —                   |
| `compressImageToMaxBytes`     | 3 / 21      | —                   |
| `formatCurrency`              | 3 / 21      | —                   |
| `formatDate`                  | 3 / 21      | —                   |
| `formatDateTime`              | 3 / 21      | —                   |
| `generateCode`                | 3 / 21      | —                   |
| `I18nPaths`                   | 3 / 21      | —                   |
| `ICAL_MIME`                   | 3 / 21      | —                   |
| `IcalEvent`                   | 3 / 21      | —                   |
| `PageContainer`               | 3 / 21      | —                   |
| `readRaw`                     | 3 / 21      | —                   |
| `removeKey`                   | 3 / 21      | —                   |
| `Skeleton`                    | 3 / 21      | —                   |
| `Sparkline`                   | 3 / 21      | —                   |
| `stripImageMetadata`          | 3 / 21      | —                   |
| `TextAreaField`               | 3 / 21      | —                   |
| `ToastViewport`               | 3 / 21      | —                   |
| `toCsv`                       | 3 / 21      | —                   |
| `toIcalendar`                 | 3 / 21      | —                   |
| `UpdateButton`                | 3 / 21      | —                   |
| `useUpdatePrompt`             | 3 / 21      | —                   |
| `useWakeLock`                 | 3 / 21      | —                   |
| `VersionProvider`             | 3 / 21      | —                   |
| `ActionGuardResult`           | 2 / 21      | —                   |
| `ALPHABETS`                   | 2 / 21      | —                   |
| `buildXlsx`                   | 2 / 21      | —                   |
| `createChannel`               | 2 / 21      | —                   |
| `createId`                    | 2 / 21      | —                   |
| `devPortOf`                   | 2 / 21      | —                   |
| `downloadBlob`                | 2 / 21      | —                   |
| `downloadXlsx`                | 2 / 21      | —                   |
| `ErrorBanner`                 | 2 / 21      | —                   |
| `formatBytes`                 | 2 / 21      | —                   |
| `formatRelativeTime`          | 2 / 21      | —                   |
| `isValidCoordinates`          | 2 / 21      | —                   |
| `LabelOverrides`              | 2 / 21      | —                   |
| `LABELS`                      | 2 / 21      | —                   |
| `normalizeCode`               | 2 / 21      | —                   |
| `pwaBaseOptions`              | 2 / 21      | —                   |
| `qrToDataUrl`                 | 2 / 21      | —                   |
| `readJsonFile`                | 2 / 21      | —                   |
| `registerSW`                  | 2 / 21      | —                   |
| `ShareButton`                 | 2 / 21      | —                   |
| `slugify`                     | 2 / 21      | —                   |
| `spaFallbackPlugin`           | 2 / 21      | —                   |
| `Store`                       | 2 / 21      | —                   |
| `supabaseConfig`              | 2 / 21      | —                   |
| `SyncStatusBadge`             | 2 / 21      | —                   |
| `usePullToRefresh`            | 2 / 21      | —                   |
| `useReducedMotion`            | 2 / 21      | —                   |
| `addDays`                     | 1 / 21      | —                   |
| `appById`                     | 1 / 21      | —                   |
| `AppShell`                    | 1 / 21      | —                   |
| `AuthProvider`                | 1 / 21      | —                   |
| `backendCoverage`             | 1 / 21      | —                   |
| `BackendCoverage`             | 1 / 21      | —                   |
| `BACKUP_FORMAT`               | 1 / 21      | —                   |
| `BACKUP_VERSION`              | 1 / 21      | —                   |
| `BottomNavItem`               | 1 / 21      | —                   |
| `BoundingBox`                 | 1 / 21      | —                   |
| `capitalize`                  | 1 / 21      | —                   |
| `ChannelStatus`               | 1 / 21      | —                   |
| `ChromePrefs`                 | 1 / 21      | —                   |
| `CLE_DE_TEST`                 | 1 / 21      | —                   |
| `clearErrorLog`               | 1 / 21      | —                   |
| `clusterByGrid`               | 1 / 21      | —                   |
| `clustersToMarkers`           | 1 / 21      | —                   |
| `composeBackend`              | 1 / 21      | —                   |
| `ConsentBanner`               | 1 / 21      | —                   |
| `ConsentSection`              | 1 / 21      | —                   |
| `Coordinates`                 | 1 / 21      | —                   |
| `createBackendSelector`       | 1 / 21      | —                   |
| `createBackup`                | 1 / 21      | —                   |
| `createMapLibreMapProvider`   | 1 / 21      | —                   |
| `createPushClient`            | 1 / 21      | —                   |
| `createUuid`                  | 1 / 21      | —                   |
| `distanceKm`                  | 1 / 21      | —                   |
| `dumpAppState`                | 1 / 21      | —                   |
| `endOfDay`                    | 1 / 21      | —                   |
| `escapeInline`                | 1 / 21      | —                   |
| `expectEcranEntreeCable`      | 1 / 21      | —                   |
| `FamilyAbout`                 | 1 / 21      | —                   |
| `FeedbackSpec`                | 1 / 21      | —                   |
| `findSimilar`                 | 1 / 21      | —                   |
| `formatDistance`              | 1 / 21      | —                   |
| `formatDuration`              | 1 / 21      | —                   |
| `formatPercentage`            | 1 / 21      | —                   |
| `formatUsage`                 | 1 / 21      | —                   |
| `getErrorLog`                 | 1 / 21      | —                   |
| `I18nApi`                     | 1 / 21      | —                   |
| `icalDate`                    | 1 / 21      | —                   |
| `IconComponent`               | 1 / 21      | —                   |
| `IdbStore`                    | 1 / 21      | —                   |
| `IMAGE_ACCEPTED_TYPES`        | 1 / 21      | —                   |
| `IMAGE_MAX_BYTES`             | 1 / 21      | —                   |
| `ImageSeams`                  | 1 / 21      | —                   |
| `ImageValidationError`        | 1 / 21      | —                   |
| `installCorrelation`          | 1 / 21      | —                   |
| `installObservability`        | 1 / 21      | —                   |
| `isAnalyticsLoaded`           | 1 / 21      | —                   |
| `isClusterId`                 | 1 / 21      | —                   |
| `isInBoundingBox`             | 1 / 21      | —                   |
| `isValidLatitude`             | 1 / 21      | —                   |
| `isValidLongitude`            | 1 / 21      | —                   |
| `localRealtimeTransport`      | 1 / 21      | —                   |
| `LoginForm`                   | 1 / 21      | —                   |
| `mapCspDirectives`            | 1 / 21      | —                   |
| `mapTileRuntimeCaching`       | 1 / 21      | —                   |
| `osmRasterTiles`              | 1 / 21      | —                   |
| `pagesUrl`                    | 1 / 21      | —                   |
| `PairingAlphabet`             | 1 / 21      | —                   |
| `parseCsv`                    | 1 / 21      | —                   |
| `parseDeepLink`               | 1 / 21      | —                   |
| `permissionState`             | 1 / 21      | —                   |
| `prefetch`                    | 1 / 21      | —                   |
| `project`                     | 1 / 21      | —                   |
| `pushSupport`                 | 1 / 21      | —                   |
| `PushSupport`                 | 1 / 21      | —                   |
| `PushTransport`               | 1 / 21      | —                   |
| `PwaInstallPrompt`            | 1 / 21      | —                   |
| `qrToSvg`                     | 1 / 21      | —                   |
| `readConsentChoice`           | 1 / 21      | —                   |
| `readJson`                    | 1 / 21      | —                   |
| `resetAnalytics`              | 1 / 21      | —                   |
| `resolveBackendKind`          | 1 / 21      | —                   |
| `ResolvedTheme`               | 1 / 21      | —                   |
| `resolveSeoPublicUrls`        | 1 / 21      | —                   |
| `restoreBackup`               | 1 / 21      | —                   |
| `rethrowWithState`            | 1 / 21      | —                   |
| `Rgb`                         | 1 / 21      | —                   |
| `ShareData`                   | 1 / 21      | —                   |
| `ShareResult`                 | 1 / 21      | —                   |
| `startOfDay`                  | 1 / 21      | —                   |
| `STATUS`                      | 1 / 21      | —                   |
| `SUPABASE_ENV_KEYS`           | 1 / 21      | —                   |
| `supabaseAuthAdapter`         | 1 / 21      | —                   |
| `SupabaseChange`              | 1 / 21      | —                   |
| `supabaseRealtimeTransport`   | 1 / 21      | —                   |
| `SyncQueueOptions`            | 1 / 21      | —                   |
| `SyncStatus`                  | 1 / 21      | —                   |
| `themeBootSource`             | 1 / 21      | —                   |
| `toPolyline`                  | 1 / 21      | —                   |
| `unescapeText`                | 1 / 21      | —                   |
| `unfoldLines`                 | 1 / 21      | —                   |
| `useAppUpdates`               | 1 / 21      | —                   |
| `useAuthContext`              | 1 / 21      | —                   |
| `useFeedback`                 | 1 / 21      | —                   |
| `useFocusTrap`                | 1 / 21      | —                   |
| `useInstallPrompt`            | 1 / 21      | —                   |
| `useKeyboardShortcuts`        | 1 / 21      | —                   |
| `useLabels`                   | 1 / 21      | —                   |
| `usePageViews`                | 1 / 21      | —                   |
| `useQrScanner`                | 1 / 21      | —                   |
| `vibrate`                     | 1 / 21      | —                   |
| `writeConsentChoice`          | 1 / 21      | —                   |
| `writeJson`                   | 1 / 21      | —                   |
| `writeRaw`                    | 1 / 21      | —                   |
| `XlsxSheet`                   | 1 / 21      | —                   |
| `XlsxValue`                   | 1 / 21      | —                   |

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
    vraiment quoi ? (`components.css` : dix-huit dépôts sur vingt) ;
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
  hook `useTheme`. La section Démo aligne d’abord **toutes les palettes** :
  chaque tuile est peinte avec celle de l’application, et un clic est le même
  geste que « Habiller la page » ;
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
monochrome ; les palettes des applications sont relevées dans `themes.js`
(sous-chemin `./themes`), dont `showroom/themes.js` est un miroir engendré.

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

`npm run sync` régénère **tout** ce que le dépôt tient en double :
`showroom/apps.js` et `showroom/themes.js` (miroirs du catalogue et des
palettes), la copie `showroom/components.css` et les morceaux publiés
`components/*.css` (tous deux tirés de `components.css`), le bloc JSON-LD du
`<head>` de la page (vingt `SoftwareApplication`, lisibles sans exécuter le
script) et les tableaux « Projets consommateurs » et « Adoption réelle »
ci-dessus. La CI relance `npm run sync` et refuse le moindre écart ;
`test/apps-catalog.test.mjs` compare en outre le catalogue à ses dérivés, et
vérifie que les comptes annoncés par la section « Stack » (« 9 apps » Supabase,
« 3 apps » Firebase, « 5 apps » local-first) collent toujours au champ `backend`.

Deux relevés complètent la vitrine, et ne sont **pas** dans `sync` parce qu'ils
demandent un accès réseau :

```bash
npm run screenshots            # captures des apps déployées → showroom/screenshots/
npm run screenshots -- miss-dice
node scripts/fetch-metrics.mjs # état des dépôts → showroom/metrics.js
```

Le second est rejoué **au moment de publier** par `showroom-pages.yml` :
version publiée, date du dernier push, dépôt archivé. Ce qui part dans
l'artefact est donc frais par construction. La page ne fait toujours aucune
requête — le relevé est posé sur `globalThis` par un `<script src>`, comme
`themes.js`. Un fichier vide est un état valide : la vitrine n'affiche alors
simplement aucune mesure.

Le `showroom/metrics.js` du dépôt sert la lecture **hors ligne**, quand la page
s'ouvre en `file://` ou depuis un clone. Il n'est plus rafraîchi
automatiquement, et la vitrine affiche la date de son relevé pour que personne
ne la prenne pour celle du jour.

> **Le relevé n'est plus commité, et c'est la trace d'une panne.**
> `showroom-metrics.yml` poussait `showroom/metrics.js` directement sur `main`.
> Le ruleset « Protect main », posé le 01/09/2026, refuse ce push. Le job a
> échoué douze nuits de suite sans que rien ne s'arrête : la page s'affichait
> toujours, avec des mesures figées. Produire le fichier à la publication
> supprime le besoin d'écrire sur une branche protégée.
>
> `showroom-metrics.yml` ne garde que la cadence : chaque nuit, il relève,
> compare à **ce que la page en ligne affiche** — pas au dépôt — et ne demande
> la publication que si l'état des dépôts a bougé.

## Stack cible (septembre 2026)

Les configs imposent / supposent les versions suivantes côté projet consommateur :

```
Node ≥22 promis par engines ; le parc épingle 26.10.0 (.nvmrc, setup-pwa, réutilisables) ; CI du socle éprouvée sur 22 ET 26.10.0
TypeScript ~6.0.3 strict + verbatimModuleSyntax + noUncheckedIndexedAccess, cible ES2025 + lib ES2025
ESLint 9 OU 10 (flat config) + typescript-eslint 8.58 — la 10 demande trois gestes côté app (ESLINT-10.md)
eslint-plugin-react-hooks 7.0 (configs.flat.recommended) + eslint-plugin-react-refresh 0.5
Vite 8 (Rolldown) + Vitest 4 ou 5 (jsdom + globals + setupFiles)
Zod 4 (peer)
Prettier 3.6 (singleQuote, tabWidth 2, printWidth 80, trailingComma es5, arrowParens 'avoid')
Tailwind 4 (@tailwindcss/vite) + lucide-react (icônes — standard famille)
```

> **3.0.0 (breaking)** — `tsconfig-app`/`tsconfig-node` activent
> **`verbatimModuleSyntax`** et **`noUncheckedIndexedAccess`** (de nouvelles
> erreurs TS peuvent apparaître au bump — cf. [migration 3.0.0](docs/MIGRATIONS.md#tsconfig-30-verbatimmodulesyntax--nouncheckedindexedaccess)),
> et `engines.node` passe à **`>=22`**.

> **2.0.0 (breaking)** — les peer-dependencies passent en **Vite 8 / Vitest 4 / TypeScript ~6.0.3 / Zod 4**
> (plus de support Vitest 3 ni Zod 3). Voir la [migration](docs/MIGRATIONS.md#zod-3--4-breaking-perfs-50).

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
    "@mister-guiiug/dev-pwa-config": "^6.18.0",
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

Le `secrets.GITHUB_TOKEN` automatique d'Actions suffit à lire le paquet, à condition que le workflow accorde `permissions: packages: read` (c'est ce que font les réutilisables, par la composite `setup-pwa`). Configuration type :

```yaml
- uses: actions/setup-node@v7
  with:
    node-version: '26.10.0'
    cache: npm
    registry-url: 'https://npm.pkg.github.com'
    scope: '@mister-guiiug'

- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Les pairs optionnelles, à déclarer par l’app

**GitHub Packages ne sert pas `peerDependenciesMeta`.** Le tarball du socle le
porte, les métadonnées que lit npm non (relevé du 01/10/2026 ; le support de
GitHub classe ce manque en demande d’évolution depuis 2023, voir
[la discussion #51104](https://github.com/orgs/community/discussions/51104)).
npm tenait donc pour OBLIGATOIRES les pairs que le socle disait optionnelles,
et les installait dans chaque app : chez mister-miss-koh, 125 entrées de
verrou et 228 Mo de `node_modules`, dont Firebase et `@grpc/grpc-js`.

Depuis le 01/10/2026, le socle déclare donc :

- en `peerDependencies`, ses **11 pairs obligatoires** : la chaîne ESLint,
  Prettier, TypeScript, Vitest, et `web-vitals`, que l’observabilité importe ;
- en `optionalPeers`, un champ que npm ignore, ses **22 pairs optionnelles**
  et leur plage, que `scripts/plafonds.mjs` et `migrate-consumers.mjs --peers`
  relisent.

**Une app déclare elle-même ce que ses modules attendent.** Sans le paquet, le
build échoue en le nommant (`failed to resolve import`) ; hors de la plage,
rien ne prévient : la table dit ce qui est éprouvé.

| Paquet                            | Plage                               | Pour                                                                                                     |
| --------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@axe-core/playwright`            | `^4.8.0`                            | `playwright-a11y`, qui reçoit `AxeBuilder` de l’app                                                      |
| `@commitlint/cli`                 | `^19.0.0 \|\| ^20.0.0 \|\| ^21.0.0` | le hook `commit-msg`                                                                                     |
| `@commitlint/config-conventional` | `^19.0.0 \|\| ^20.0.0 \|\| ^21.0.0` | `commitlint`                                                                                             |
| `@playwright/test`                | `^1.49.0`                           | `playwright-base`, `playwright-a11y`, `playwright-entree`, et les bins `pwa-screenshots`, `pwa-og-image` |
| `@rive-app/react-canvas`          | `^4.0.0`                            | `react/rive`                                                                                             |
| `@sentry/react`                   | `^10.75.2 \|\| ^11.0.0`             | `react/observability`, par son `loader`                                                                  |
| `@supabase/supabase-js`           | `^2.0.0`                            | `supabase-client`                                                                                        |
| `@testing-library/jest-dom`       | `^6.0.0 \|\| ^7.0.0`                | `vitest-setup`                                                                                           |
| `@vitest/browser`                 | `^4.0.0 \|\| ^5.0.0`                | `vitest-browser-base`                                                                                    |
| `firebase`                        | `>=9.0.0`                           | `realtime/firebase`, `push/firebase`, qui reçoivent les objets de l’app                                  |
| `leaflet`                         | `^1.9.0`                            | `map/leaflet`                                                                                            |
| `lucide-react`                    | `^1.0.0`                            | les icônes que l’app passe aux composants                                                                |
| `maplibre-gl`                     | `^6.0.0`                            | `map/maplibre`                                                                                           |
| `playwright`                      | `^1.49.0`                           | `pwa-screenshots`, `pwa-og-image`, à défaut de `@playwright/test`                                        |
| `posthog-js`                      | `^1.434.7`                          | `react/consent-banner`, par son `loader`                                                                 |
| `qr-scanner`                      | `^1.4.0`                            | `react/use-qr-scanner`                                                                                   |
| `react`                           | `^19.0.0`                           | `react/*`                                                                                                |
| `sharp`                           | `>=0.33.0`                          | le bin `pwa-icons`                                                                                       |
| `tailwindcss`                     | `^4.0.0`                            | `tailwind-preset.css`, `components.css`                                                                  |
| `uqr`                             | `^0.1.3`                            | `qr`                                                                                                     |
| `vite`                            | `^8.0.0`                            | les greffons `vite-*`, le bin `pwa-screenshots`                                                          |
| `zod`                             | `^4.0.0`                            | `vite-csp`                                                                                               |

## Monter à ESLint 10

ESLint 9 est sorti du support (`npm` le dit à chaque installation). **Le socle
autorise la 10 depuis la 4.10.0** : ses peers `eslint` et `@eslint/js` acceptent
`^9.39.4 || ^10.0.0`, et il tourne lui-même en 10.

**Trois gestes, pas deux** — et c'est la correction que la passe du 10/09/2026 a
apportée au dossier [ESLINT-10.md](ESLINT-10.md) :

```json
"devDependencies": {
  "eslint": "^10.10.0",
  "@eslint/js": "^10.0.1"
},
"overrides": {
  "eslint-plugin-jsx-a11y": { "eslint": "$eslint" }
}
```

L'override lève la déclaration périmée de `eslint-plugin-jsx-a11y`, seul paquet
de la chaîne à s'arrêter à `^9` alors que son code fonctionne sous la 10. Mais
`$eslint` désigne **la plage que le projet racine déclare lui-même** : sans les
deux lignes de `devDependencies`, il ne renvoie à rien et l'override est inerte.
C'est ce qui a fait échouer la première tentative — le squelette ne déclarait pas
`eslint`, le laissant s'installer par la peer du socle.

**Qui doit agir, et quand.** Une app qui déclare déjà `eslint@^9.39.4` n'est
touchée par rien : elle monte quand elle veut. Une app qui s'en remet à la peer
du socle cassera à son prochain `npm install` — pour elle, les trois gestes ne
sont pas optionnels, ils sont la condition d'une installation qui résout. Le
squelette `pwa-starter-kit` les porte, et sert de modèle.

Le coût mesuré reste la seule règle qui morde, `no-useless-assignment` : dix
occurrences dans le socle, toutes corrigées, zéro dans le squelette.

## Secrets et variables — la ligne de partage

**La question n'est pas « est-ce sensible ? », c'est « le navigateur le
voit-il ? ».** Vite copie la valeur de tout `VITE_*` dans le bundle au moment du
build : elle part en clair sur GitHub Pages, lisible par n'importe qui. La
ranger dans un _secret_ GitHub ne la protège donc de rien — ça masque seulement
les journaux de CI (`***`) et donne l'illusion d'une confidentialité qui
n'existe pas.

| Ranger en…                      | Quoi                                                                                                                | Exemples                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`secrets`** (chiffrés)        | Ce qui donne un **pouvoir** : écrire, déployer, administrer. Jamais lu par le navigateur.                           | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`, `FIREBASE_TOKEN`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `CLOUDFLARE_API_TOKEN`, `RENOVATE_TOKEN` |
| **`vars`** (en clair, lisibles) | Ce qui finit **dans le bundle** ou dans une URL publique — donc tout `VITE_*`, et la configuration d'environnement. | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FIREBASE_*`, `VITE_VAPID_PUBLIC_KEY`, `VITE_SENTRY_DSN`, `VITE_BASE_PATH`, `SUPABASE_PROJECT_ID`          |

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
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v6
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

**Ces règles n'étaient pas appliquées, et la raison est instructive** : relevé
du 04/09/2026, douze des seize workflows de déploiement héritaient du trousseau
entier et quinze valeurs publiques dormaient en `secrets`, parce que le gabarit
qu'on copiait disait, en commentaire, d'y ranger les `VITE_*`. Il enseigne
désormais `vars`, et `pwa-doctor` relève les deux écarts là où il tourne
(`secrets-inherit`, `vite-en-secret`). Le modèle qui
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

1. **`.npmrc`** (copier [`templates/.npmrc`](./templates/.npmrc)) + **`.nvmrc`**
   (`26.10.0`, l'épingle du parc ; `engines` promet `>=22`).
2. **Dépendance** : `npm i -D @mister-guiiug/dev-pwa-config@^6` + les peers utilisés
   (cf. `peerDependencies` du [`package.json`](./package.json) : `eslint`, `@eslint/js`,
   `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`,
   `globals`, `prettier`, `typescript`, `vite`, `vitest`, `react`, `tailwindcss`…).
3. **Re-exports** (une ligne chacun, cf. [docs/CONFIGS.md](docs/CONFIGS.md)) : `eslint.config.js`,
   `prettier.config.js`, `commitlint.config.js`, `lint-staged.config.js`.
4. **TypeScript** : `tsconfig.app.json` + `tsconfig.node.json` en `extends`.
5. **Tests** : `vitest.config.ts` (`baseTestOptions`) + `src/test/setup.ts`
   (`import '@mister-guiiug/dev-pwa-config/vitest-setup'`).
6. **CI/CD** (secrets passés NOMMÉMENT — jamais `inherit` — + `permissions` au niveau caller) : `ci.yml` →
   `pwa-ci.yml@v6`, `deploy.yml` → `pwa-deploy.yml@v6`, `lighthouse.yml` →
   `pwa-lighthouse.yml@v6`.
7. **PWA/SEO** : `index.html` depuis le squelette `pwa-starter-kit` (plus depuis
   `templates/`) + `pwaSeoPlugin` + `cspPlugin` dans `vite.config.ts`. Préférer
   `npx create-lg-pwa-app` à une copie manuelle.
8. **Famille** : `<FamilyApps>` (écran Réglages/À propos) + `.github/FUNDING.yml`.
9. **Env** (opt-in) : `config/env.manifest.json` + `pwa-env check` / `sync`.

## Reusable workflows GitHub Actions

Hébergés dans [`.github/workflows/`](.github/workflows/) — utilisables par tous les repos de la famille.

| Workflow                     | Rôle                                                                                                                                                                                                                                              | Exemple d'appel                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pwa-ci.yml`                 | Lockfile · Format · Lint · Type · Test · Build · audit npm de production (actif par défaut, seuil `high`) (+ docteur et E2E optionnels)                                                                                                           | voir [Utilisation](#reusable-workflow-ci)                                                                                                                                                                |
| `pwa-deploy.yml`             | Build + déploiement GitHub Pages (avec `VITE_BASE_PATH` auto et repli SPA `404.html`)                                                                                                                                                             | voir [Utilisation](#reusable-workflow-deploy)                                                                                                                                                            |
| `npm-publish.yml`            | Publication npm sur GitHub Packages avec `--provenance`                                                                                                                                                                                           | voir [Utilisation](#reusable-workflow-publish)                                                                                                                                                           |
| `pwa-lighthouse.yml`         | Build + Lighthouse CI (perf/a11y/bp/seo) sur PR                                                                                                                                                                                                   | `uses: …/pwa-lighthouse.yml@v6` depuis un caller à `pull-requests: write` (requiert `.lighthouserc.json`, cf. template)                                                                                  |
| `pwa-supabase-migrate.yml`   | `supabase link` + `db push` (+ Edge Functions en option), sans annulation d'un run en cours ; quatre copies en une                                                                                                                                | `uses: …/pwa-supabase-migrate.yml@v6` avec trois secrets : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` (ce dernier en `vars`) (cf. en-tête, [PARAMETRAGE.md](PARAMETRAGE.md)) |
| `pwa-supabase-test.yml`      | Tests pgTAP sur une pile Supabase JETABLE du runner : migrations depuis zéro, aucun secret ; promu de miss-lookhouse, seule app à le faire. Complément du bin `pwa-pgtap`, qui joue les mêmes fichiers contre la base liée                        | `uses: …/pwa-supabase-test.yml@v6` depuis un caller sur `supabase/**` (cf. en-tête du fichier ; exige `supabase/config.toml`)                                                                            |
| `pwa-supabase-keepalive.yml` | Ping REST tous les trois jours pour qu'un projet Free ne s'endorme pas ; **à poser avec la migration** : le 02/09/2026 aucune app ne l'appelait, et `miss-carbook` dormait                                                                        | `uses: …/pwa-supabase-keepalive.yml@v6` depuis un caller `schedule` (cf. en-tête du fichier)                                                                                                             |
| `pwa-vice.yml`               | Audit de sécurité [VICE](https://github.com/Webba-Creative-Technologies/vice) en second avis NON bloquant — secrets, `.env`, RLS des migrations, XSS/`eval`, workflows ; constats dans l'onglet Security, sans badge commité ni commentaire de PR | `uses: …/pwa-vice.yml@v6` depuis un caller à `security-events: write` (cf. en-tête du fichier)                                                                                                           |
| `pwa-worker-deploy.yml`      | `wrangler deploy` d'un Cloudflare Worker, sans échec quand le secret manque ; deux copies en une                                                                                                                                                  | `uses: …/pwa-worker-deploy.yml@v6` avec `working-directory`                                                                                                                                              |
| `cleanup-runs.yml`           | Élague l'historique Actions du dépôt APPELANT (N runs par workflow) ; douze copies identiques en une                                                                                                                                              | `uses: …/cleanup-runs.yml@v6` depuis un caller `workflow_dispatch` à `permissions: actions: write` (cf. en-tête du fichier)                                                                              |
| `no-ai-attribution.yml`      | Refuse, sur une PR, les signatures d'assistant dans les messages de commit et les fichiers modifiés (`scripts/check-ai-attribution.mjs`)                                                                                                          | `uses: …/no-ai-attribution.yml@v6` depuis un caller `pull_request` (cf. en-tête du fichier)                                                                                                              |

### Reusable workflow CI

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
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v6
    # PAS de `secrets: inherit` : ce workflow ne déclare aucun secret, et
    # `GITHUB_TOKEN` lui est fourni automatiquement. Hériter enverrait TOUS les
    # secrets du dépôt à un workflow qui n'en demande aucun.
    with:
      run-doctor: true # la checklist du parc, lue sur le dépôt et sur dist/
      # À poser DÈS que `vitest.config.ts` déclare des `thresholds` : sans
      # elle la CI lance `npm run test`, Vitest ne mesure aucune couverture et
      # le plancher n'est jamais comparé. Exige un script `test:coverage`.
      run-coverage: true
      run-e2e: false # passer à true quand Playwright est en place
      # e2e-grep vaut '@critical|@a11y' par défaut ; un filtre qui ne trouve
      # aucun test fait ÉCHOUER le job, au lieu de le laisser vert.
      # e2e-project vaut 'chromium' par défaut et accepte une liste :
      # 'chromium mobile-chrome' couvre aussi le téléphone (Pixel 5), sans
      # navigateur supplémentaire à installer.
```

### Reusable workflow deploy

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
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v6
    # Le workflow DÉCLARE les secrets dont il a besoin : on ne passe que
    # ceux-là. `secrets: inherit` enverrait tout le trousseau du dépôt.
    secrets:
      FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
    with:
      use-base-path: true
      pre-build-script: '' # ex: 'migrate:db' pour Supabase
```

> **Repli SPA.** Après le build, le workflow copie `index.html` en `404.html` s'il manque : GitHub Pages n'a pas de repli SPA, et sans ce fichier rafraîchir un lien profond sert sa page « File not found » — quatre apps de la famille étaient dans ce cas le 02/09/2026. Un déploiement écrit à la main obtient la même chose avec `spaFallbackPlugin()` de `vite-pwa-base`.

> ⚠️ **Ne PAS déclarer `concurrency: pages` au niveau du caller.** Le reusable `pwa-deploy.yml` déclare déjà `concurrency: { group: pages, cancel-in-progress: true }`. Le répéter côté caller provoque le message `Canceling since a deadlock was detected for concurrency group: 'pages' between a top level workflow and 'deploy'` et le job ne démarre jamais. Cette règle vaut pour toutes les paires caller / reusable qui partagent un groupe de concurrence (`pages`, `supabase-migrate`, `cleanup-runs-…`).

> **Cas avancé** (migrations Supabase, règles Firebase, variables nombreuses) : les réutilisables les couvrent. Les migrations passent par `pwa-supabase-migrate.yml`, les règles Firebase par `firebase-project` et `firebase-only`, les variables par `build-env` et `required-env`, et le gabarit `templates/github-workflows/deploy.yml` est un appelant prêt à copier. Écrit à la main, un déploiement Pages se prive de `required-env` et du chemin de base automatique (le repli `404.html` s'obtient alors par `spaFallbackPlugin()`), et `pwa-doctor` le relève (`wf-deploy-maison`). Un workflow maison qui garde l'installation du socle appelle la composite action `setup-pwa` :
>
> ```yaml
> - uses: mister-guiiug/dev-pwa-config/.github/actions/setup-pwa@v6
>   with:
>     github-token: ${{ secrets.GITHUB_TOKEN }}
> ```

### Reusable workflow publish

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
    uses: mister-guiiug/dev-pwa-config/.github/workflows/npm-publish.yml@v6
    # PAS de `secrets: inherit` : ce workflow ne déclare aucun secret, et
    # `GITHUB_TOKEN` lui est fourni automatiquement. Hériter enverrait TOUS les
    # secrets du dépôt à un workflow qui n'en demande aucun.
```

## Composite actions

| Action                                                             | Rôle                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mister-guiiug/dev-pwa-config/.github/actions/setup-pwa@v6`        | Setup Node 26.10.0 + scope `@mister-guiiug` + `npm ci` (auth GitHub Packages)                                                                               |
| `mister-guiiug/dev-pwa-config/.github/actions/supabase-migrate@v6` | Setup CLI Supabase + `link` + `db push` (déploiements custom)                                                                                               |
| `mister-guiiug/dev-pwa-config/.github/actions/firebase-deploy@v6`  | `firebase deploy` ciblé (rules database/firestore, indexes) ; auth `service-account-key` (recommandé) ou `token` (déprécié), firebase-tools épinglé via npx |

## Templates non-importables (à copier-coller)

Le dossier [`templates/`](./templates/) contient des fichiers que les outils
(VSCode, husky, etc.) ne savent pas importer depuis un paquet npm. **La
composition d'une app (CI, `index.html`, Vite) vient du squelette
`pwa-starter-kit`**, pas d'ici — voir [`templates/README.md`](./templates/README.md).

| Template                                                                           | Cible projet                            | Personnalisation typique                                                                |
| ---------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| [`templates/vscode/extensions.json`](./templates/vscode/extensions.json)           | `<projet>/.vscode/extensions.json`      | Aucune (à dupliquer tel quel)                                                           |
| [`templates/vscode/settings.json`](./templates/vscode/settings.json)               | `<projet>/.vscode/settings.json`        | Aucune                                                                                  |
| [`templates/vscode/tasks.json`](./templates/vscode/tasks.json)                     | `<projet>/.vscode/tasks.json`           | Ajouter les tasks `test:e2e:critical`, `test:e2e:a11y` etc. selon les scripts du projet |
| [`templates/vscode/launch.json`](./templates/vscode/launch.json)                   | `<projet>/.vscode/launch.json`          | Adapter `url` au base path (`/mister-puzzle/`, etc.) et `sourceMapPathOverrides`        |
| [`templates/github-workflows/deploy.yml`](./templates/github-workflows/deploy.yml) | `<projet>/.github/workflows/deploy.yml` | Lister les `VITE_*` via `pwa-env sync` si manifeste présent                             |
| [`templates/husky/pre-commit`](./templates/husky/pre-commit)                       | `<projet>/.husky/pre-commit`            | Aucune                                                                                  |
| [`templates/husky/commit-msg`](./templates/husky/commit-msg)                       | `<projet>/.husky/commit-msg`            | Aucune                                                                                  |
| [`templates/.editorconfig`](./templates/.editorconfig)                             | `<projet>/.editorconfig`                | Ou `pwa-doctor --fix`                                                                   |
| [`templates/.nvmrc`](./templates/.nvmrc)                                           | `<projet>/.nvmrc`                       | `26.10.0` (épingle du parc)                                                             |
| [`templates/.npmrc`](./templates/.npmrc)                                           | `<projet>/.npmrc`                       | Aucune (registre scope + `include=optional` — bindings natifs Vite 8)                   |
| [`templates/FUNDING.yml`](./templates/FUNDING.yml)                                 | `<projet>/.github/FUNDING.yml`          | Aucune (handle sponsor famille `mister.guiiug`)                                         |
| [`templates/.lighthouserc.json`](./templates/.lighthouserc.json)                   | `<projet>/.lighthouserc.json`           | Ajuster les seuils (`minScore`) par catégorie                                           |
| [`templates/e2e/a11y.spec.ts`](./templates/e2e/a11y.spec.ts)                       | `<projet>/e2e/a11y.spec.ts`             | Adapter les routes/zones ; `npm i -D @axe-core/playwright`                              |
| [`templates/changesets/config.json`](./templates/changesets/config.json)           | `<projet>/.changeset/config.json`       | Adapter `access` (restricted vs public)                                                 |

## Renovate — hébergé par le socle

Le 02/09/2026, aucun des dix-huit dépôts n'avait jamais reçu une PR de
Renovate : treize `renovate.json` étendaient un préréglage dans un dépôt
`.github` qui n'existe pas, et l'application Mend n'était pas installée. Depuis,
tout vit ici :

| Fichier                          | Rôle                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renovate/default.json`          | Le PRÉRÉGLAGE : `config:recommended`, tableau de bord, samedi avant 7 h (Paris), mineures et patchs npm groupés, actions groupées, le socle dans une PR à part, sans attendre |
| `renovate/self-hosted.json`      | QUELS dépôts : tous ceux du compte qui portent un `renovate.json`, sauf `miss-ticket` ; `mister-family-map` compris                                                           |
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

Le réutilisable [`cleanup-runs.yml`](.github/workflows/cleanup-runs.yml) ne
conserve que les **N runs les plus récents par workflow** (défaut `3`, option
`dry-run`). L'appeler en `@v6` depuis un caller `workflow_dispatch` d'une
dizaine de lignes (exemple en tête du fichier), à `permissions: actions: write` :
c'est ce que recommande `pwa-doctor` (`wf-cleanup`). Le gabarit autonome
[`templates/github-workflows/cleanup-runs.yml`](./templates/github-workflows/cleanup-runs.yml)
reste pour un dépôt hors famille ; il interpole encore ses entrées dans le
script, ce que le réutilisable ne fait plus.

## Inputs notables des reusables

- **`pwa-ci.yml`** — `run-doctor` (`pwa-doctor` après le build ; opt-in en
  4.x et toujours en 6.x, défaut `false`) et `doctor-strict` ; `run-npm-audit`
  (actif par défaut : `npm audit --omit=dev` à la racine et dans `server-dir`,
  seuil `npm-audit-level`, défaut `high`) ; `verify-lockfile` (actif par
  défaut) ; `run-coverage` (joue `npm run test:coverage` au
  lieu de `npm run test`, pour que les `thresholds` de `vitest.config.ts`
  soient **vérifiés** — sans quoi Vitest ne mesure rien, donc ne compare rien,
  et le job sort vert ; exige le script, dont l'absence fait échouer le job) ;
  `e2e-grep` (défaut `@critical|@a11y`, et un
  filtre sans test fait échouer le job) ; `e2e-project` (défaut `chromium`,
  mais accepte une **liste** : `chromium mobile-chrome` joue le bureau et le
  téléphone, et n'installe qu'un navigateur — Pixel 5 tourne sur le chromium
  déjà là) avec `e2e-install` pour les projets maison dont le nom n'est pas
  celui d'un navigateur ; `build-env` (variables `KEY=VALUE`, une par ligne,
  injectées avant build/test pour les apps Firebase/Supabase) ; `server-dir`
  (install + `tsc --noEmit` + **`npm audit`** d'un backend annexe — son
  `package.json` est un second manifeste, que l'audit de la racine ne voit pas :
  au 14/09/2026 les vingt-cinq alertes restantes du parc y vivaient TOUTES, et
  la racine rendait « 0 vulnérabilité » sans se tromper. Le dossier doit porter
  son lockfile).
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
3. Deux valeurs publiques, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
   (anon = publique, jamais la `service_role`) : les ranger en `vars`, comme
   toute `VITE_*`, et les passer dans les emplacements `secrets:` du
   réutilisable, qui acceptent n'importe quelle expression
   (`VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}`). Le gabarit les lit
   encore dans `secrets` : y écrire `vars`, sans quoi `pwa-doctor` relève
   `vite-en-secret`.

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

- **mister-puzzle** ajoute `verbatimModuleSyntax` + `erasableSyntaxOnly` (TS plus strict sur le code legacy converti) sur **`tsconfig.app` ET `tsconfig.node`**. Depuis le durcissement de `tsconfig-node` (v2.1), les options de linting (`allowImportingTsExtensions`, `moduleDetection: force`, `isolatedModules`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) sont **portées par la base** : l'override projet peut être réduit au seul `erasableSyntaxOnly` (`verbatimModuleSyntax` est dans la base depuis 3.0.0).
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

# 3. main est protégé : le commit de version passe par une PR, fusionnée en --merge (pas --squash)
git switch -c chore/release-x.y.z && git commit -am "chore(release): x.y.z"
git push -u origin chore/release-x.y.z && gh pr create

# 4. Publier depuis main : publish.yml lit la version et pose le tag lui-même
gh workflow run publish.yml --ref main
```

[`publish.yml`](.github/workflows/publish.yml) publie alors sur `npm.pkg.github.com`
avec `--provenance`, avance le tag majeur mobile de la version publiée (`v6`
aujourd'hui ; le tag d'un majeur précédent est figé et ne reçoit plus de
correctif) et crée la **GitHub Release** (notes = section correspondante du
`CHANGELOG.md`). Il se déclenche aussi sur un tag `v*` poussé, à condition que
le commit de version soit déjà sur `main`. Versions publiées :
https://github.com/mister-guiiug/dev-pwa-config/packages

## Maintenance

Toute modification de stack famille (bump majeur React, ESLint, etc.) :

1. Mettre à jour les fichiers de config concernés + la « Stack cible » de ce README.
2. `npm run changeset` (choisir patch/minor/major selon l'impact consommateur).
3. `npm run version-packages`, PR fusionnée en `--merge`, puis `gh workflow run publish.yml --ref main` (cf. ci-dessus).
4. Aligner les consommateurs : `node scripts/migrate-consumers.mjs <version> --write`
   (dry-run par défaut sans `--write`), puis tester chaque app.

## Gouvernance

|                                             |                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)        | Comment contribuer, et les quatre règles du dépôt — dont « promouvoir sans migrer, c'est ne pas avoir fini » |
| [`SECURITY.md`](SECURITY.md)                | Signalement privé d'une vulnérabilité, périmètre, et les deux limites connues qui ne sont pas des failles    |
| [`.github/CODEOWNERS`](.github/CODEOWNERS)  | `workflows/`, `actions/` et `scripts/` demandent une relecture : ils s'exécutent dans dix-neuf dépôts        |
| `npm run validate`                          | Ce que la CI exécute : format, lint, types, tests                                                            |
| `node scripts/apply-rulesets.mjs --dry-run` | Protection de `main` sur tous les dépôts publics non archivés, lus sur le compte ; checks exigés par dépôt   |

**Secrets.** Chaque workflow réutilisable **déclare** les secrets dont il a
besoin ; un caller ne passe que ceux-là. `secrets: inherit` enverrait tout le
trousseau du dépôt à un workflow qui n'en demande souvent aucun — c'est le
chemin d'escalade le plus court de la famille, et il ne figure plus nulle part
dans la documentation.
