# Une fondation unique ? Bibliothèque, squelette, générateur — analyse du 05/09/2026

_Quatrième analyse du parc, après [CAMPAGNE.md](CAMPAGNE.md) (adoption),
[GISEMENTS.md](GISEMENTS.md) (promotion) et [PARC.md](PARC.md) (le parc vu de
dehors). Celle-ci répond à une question de structure : le socle peut-il être LA
fondation des prochaines applications, ou faut-il un dépôt squelette et un
générateur à côté ? Tous les chiffres ont été relevés le 05/09/2026 sur les
copies de travail des vingt-sept dépôts du poste, sur l'API GitHub et sur le
paquet 3.34.0. Ce qui n'a pas pu l'être est marqué « non vérifié »._

> Le besoin nommait `dev-pwa-config` ; le dépôt et le paquet s'appelaient alors
> **`dev-wpa-config`**, et ce nom était cité par dix-sept `package.json` et
> dix-sept workflows. Le renommage a été décidé et exécuté le 05/09/2026, dans
> la foulée de cette analyse : dépôt `mister-guiiug/dev-pwa-config`, paquet
> `@mister-guiiug/dev-pwa-config@4.0.0`, étiquette mobile `v4`. Le § 9 dit ce
> que cela a coûté, et le piège rencontré. Les mesures ci-dessous restent
> celles de la 3.34.0.

## 0. Le verdict, en dix lignes

**Option 3, mais pas sous la forme proposée.** Le socle est déjà une bonne
bibliothèque — 148 sous-chemins, 1 134 tests, six workflows réutilisables,
trois binaires, dix-sept consommateurs alignés sur la dernière version. Ce qu'il
ne sait pas faire, et ne saura jamais faire en tant que bibliothèque, c'est
**composer** : `main.tsx`, `vite.config.ts`, la pile de fournisseurs, l'écran
de réglages, le formulaire de connexion. Ce code-là est réécrit dans chaque app
(**22 % des lignes du parc, 52 000 lignes**), il dérive (**17 variantes de
`vitest.config.ts` pour 17 apps**), et les composants promus pour le remplacer
ne sont **pas adoptés en rattrapage** (la couche auth livrée le 02/09 : dix
copies dans cinq apps, zéro migration, dix « gardes »).

D'où trois décisions :

1. **Rétrécir le socle, pas l'enrichir.** 75 sous-chemins sur 148 n'avaient
   aucun importateur au relevé du 31/08. La règle « le socle promeut, il
   n'invente pas » n'a pas tenu ; la remplacer par « un module entre s'il est
   utilisé par le squelette ou par deux apps ».
2. **Un dépôt `pwa-starter-kit`** : une application complète, déployée, testée
   dans la CI du socle à chaque commit — le dix-huitième consommateur, et le
   seul toujours à jour. C'est lui qui porte la composition.
3. **Un générateur mince**, `create-lg-pwa-app`, qui ne contient AUCUN gabarit :
   il tire le squelette à l'étiquette de la version du socle, substitue
   l'identité, et fait les gestes GitHub qu'on refait aujourd'hui à la main
   (Pages, ruleset, variables, catalogue). Publié sur npmjs.org, parce que
   GitHub Packages exige un jeton même pour un paquet public.

Et une **couche 0** que le besoin ne nomme pas mais que le parc réclame : les
neuf dépôts hors PWA (Rust, C#, Kotlin, Electron, extension VS Code) ne
partagent **rien** avec la famille — ni ruleset, ni Renovate, ni convention de
commit. Un dépôt `mister-guiiug/.github` (aujourd'hui **404**, alors que treize
`renovate.json` l'ont visé pendant des mois) est l'endroit de ce qui vaut pour
tous.

---

## 1. Ce que le relevé mesure

### Le socle, en chiffres

| Mesure            | Valeur                                                                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Version / cadence | 3.34.0 ; 63 étiquettes ; 335 commits depuis le 07/05/2026 ; **226 en août** ; 174 PR fusionnées                                          |
| Surface publiée   | **148 sous-chemins**, 292 fichiers, 1,4 Mo décompressés, 3 binaires, 0 dépendance de production, 33 peers (22 optionnelles)              |
| Code              | 22 683 lignes de JS (11 807 racine, 8 308 `react/`) + **6 188 lignes de `.d.ts` écrites à la main** + 2 012 lignes de `components.css`   |
| Tests             | 97 fichiers, 23 085 lignes, **1 134 tests en 5,9 s** (`node --test`, jsdom, fake-indexeddb)                                              |
| CI/CD partagée    | 15 workflows dont **6 réutilisables**, 3 actions composites, 21 fichiers de gabarit à copier                                             |
| Outillage de parc | 22 scripts (4 847 lignes) : adoption, promotion, sondes des sites, exports morts, rulesets, migration des consommateurs, doctor          |
| Documentation     | README **3 349 lignes** (223 Ko, un seul fichier), CHANGELOG 3 244, quatre dossiers d'analyse (~2 100 lignes), showroom statique déployé |

### Ce que les apps en prennent

Relevé `configs` du catalogue (31/08/2026, par sous-chemin importé, 17 dépôts) :

| Consommateurs par sous-chemin | Sous-chemins | Exemples                                                                                                                                                                                                              |
| ----------------------------- | -----------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10 et plus                    |       **17** | `eslint-react` 16, `prettier` 16, `vitest-base` 16, `components.css` 15, `react` 14, `react/observability` 14, `vite-pwa-base` 13, `react/confirm-dialog` 12, `vite-csp` 10                                           |
| 5 à 9                         |           10 | `download` 9, `react/i18n` 8, `react/sheet` 7, `react/bottom-nav` 6, `format` 5                                                                                                                                       |
| 2 à 4                         |           30 | `react/button` 4, `storage` 3, `sync-queue` 2, `supabase-client` 2, `xlsx` 2                                                                                                                                          |
| 1                             |           16 | `map`, `map/maplibre`, `logger`, `correlation`, `prefetch`, `vite-version`… (dix pour la seule `mister-family-map`)                                                                                                   |
| **0**                         |       **75** | `vite-pwa`, `auth`, `auth/supabase`, `auth/mfa`, `push/*`, `analytics`, `backup`, `secure-storage`, `markdown`, `vcard`, `similarity`, `audio`, `speech`, `haptics`, `react/rive`, `react/a11y`, douze `react/use-*`… |

Le barrel `react` (14 apps) masque une partie du zéro : `useActionGuard` ou
`useTheme` sont importés via lui par dix apps. Mais `vite-pwa` — `pwaManifest()`,
`pwaBaseOptions()` — n'a **aucun** importateur, et pourtant chaque
`vite.config.ts` du parc fait de 83 à 380 lignes (médiane ~180), dont une
centaine pour écrire à la main le manifeste que ce module engendre. La
bibliothèque a la pièce ; les apps ne la posent pas. **C'est le motif de toute
cette analyse.**

### Ce qui est recopié, et ce qui dérive

Empreinte MD5 des fichiers de coquille sur les 17 dépôts (`bac-sable` compte
pour `mister-family-map`) :

| Fichier                                         | Présent | Variantes | Plus grand groupe identique |
| ----------------------------------------------- | ------: | --------: | --------------------------: |
| `.nvmrc`, `renovate.json`, `.lighthouserc.json` |      17 |     **1** |                          17 |
| `prettier.config.js`                            |      16 |     **1** |                          16 |
| `tsconfig.json`                                 |      17 |         2 |                          16 |
| `lint-staged.config.js`                         |      14 |         2 |                          13 |
| `.github/workflows/cleanup-runs.yml`            |      16 |         3 |                          12 |
| `.github/workflows/lighthouse.yml`              |      17 |         7 |                          11 |
| `eslint.config.js`                              |      17 |         9 |                           6 |
| `tsconfig.app.json`                             |      17 |         9 |                           5 |
| `.gitattributes`                                |      17 |         9 |                           6 |
| `tsconfig.node.json`                            |      17 |        10 |                           3 |
| `src/test/setup.ts`                             |      17 |        10 |                           8 |
| `.github/workflows/ci.yml`                      |      17 |        11 |                           7 |
| `playwright.config.ts`                          |      14 |        11 |                           3 |
| `.github/workflows/deploy.yml`                  |      17 |        13 |                           5 |
| `vitest.config.ts`                              |      17 |    **17** |                           1 |
| `index.html`                                    |      17 |    **17** |                           1 |

Deux lectures. Les fichiers qui devraient être des re-exports d'une ligne le
sont quand le socle les a **rendus triviaux** (`prettier.config.js`) et ne le
sont pas quand il laisse un choix (`vitest.config.ts` : `exclude`, plugins,
`include` serveur — dix-sept réponses). Et `index.html`, que le gabarit
demande de « copier puis personnaliser », a dix-sept versions parce que
personnaliser un gabarit, c'est le forker.

### La coquille contre le métier

Sur 232 171 lignes de source (`ts`, `tsx`, `css`) dans les 17 apps, la
**coquille** — `main.tsx`, `App.tsx`, `index.css`, `src/pwa`, `src/test`,
`src/i18n`, `src/config`, `src/backend`, `src/components/ui`, `src/shared`,
`src/lib`, `src/auth` — pèse **52 029 lignes, 22 %**, de 0 % (`miss-contraction`,
design maison, tout en `features/`) à 42 % (`mister-qowa`). S'y ajoutent
**3 122 lignes de YAML** dans `.github/workflows`, pour appeler des workflows
réutilisables qui en font l'essentiel (`miss-supatool`, la plus récente, en a
59 ; la moyenne est à 184).

### Ce qu'une naissance coûte aujourd'hui

| App               | Née le     | Premier commit         | Ce qui a suivi                                                                                          |
| ----------------- | ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `miss-genius`     | 02/06/2026 | 68 fichiers, 16 884 l. | 5 commits de conformité famille dans l'heure (Prettier, lucide, liens, FUNDING)                         |
| `miss-lookhouse`  | 21/06/2026 | 87 fichiers, 19 302 l. | née hors gabarit ; remise sur les workflows réutilisables le 02/09 (PARC § 8)                           |
| `miss-supatool`   | 02/09/2026 | 74 fichiers, 21 287 l. | **deux minutes plus tard** : « régénérer le lockfile avec npm 10, comme le runner »                     |
| `mister-miss-koh` | 05/09/2026 | 14 fichiers, 2 077 l.  | un audit du socle de 132 lignes avant toute ligne d'app ; « l'application n'est pas encore échafaudée » |

Et derrière le premier commit, la liste que la mémoire de travail du parc
tient à la main parce qu'aucun outil ne la tient : `gh repo create`, Pages en
`build_type: workflow` **par un PUT, pas un POST** (le POST laisse le
constructeur Jekyll écraser le site), lockfile écrit par npm 10 et non 11 (144
lignes de `libc` en trop sinon), ruleset « Protect main », entrée dans
`apps-catalog.js` + `themes.js` **puis publication du socle** pour que l'app
apparaisse chez ses sœurs, variables et secrets de dépôt, `FUNDING.yml`. Six
gestes, quatre pièges documentés, zéro automatisation. `pwa-doctor` sait
constater le manque ; il ne sait pas le combler, et **aucune app ne l'exécute
en CI** (deux `package.json` le déclarent : le socle et `mister-miss-koh`).

---

## 2. Audit de l'existant, domaine par domaine

Le besoin liste seize domaines. Pour chacun : ce que le socle fournit, ce que
les apps font réellement, et ce qui manque à une nouvelle app.

| Domaine               | Dans le socle                                                                                                                                                                          | Dans les apps (relevé)                                                                                                                    | Ce qui manque pour une nouvelle app                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Architecture globale  | Bibliothèque ESM servie **sans build**, JS + JSDoc + `.d.ts` manuels, modules purs / `react/*` / presets Vite / workflows                                                              | `features/` + `store/` + `domain                                                                                                          | engine/`dans 12 apps sur 17 ;`components/ui` locaux dans 3                                                       | Une **structure de référence exécutable** ; le socle n'en impose aucune et ne peut pas |
| Organisation dossiers | `templates/` (21 fichiers à copier), checklist README en 8 étapes                                                                                                                      | 12 à 19 fichiers de config à la racine, 3 à 8 workflows                                                                                   | Un dépôt à cloner plutôt qu'une checklist à suivre                                                               |
| Routes                | **Aucune abstraction** (voulu) ; `BottomNav` prend `linkComponent`/`hrefProp` ; `useRouteBreadcrumbs` ; repli SPA 404                                                                  | `react-router-dom` 7 partout ; **9 apps en `HashRouter`, 6 en `BrowserRouter`, 3 sans routes**                                            | Une décision écrite (ADR) et un `App.tsx` de référence                                                           |
| Gestion d'état        | `versioned-store`, `storage`, `idb`, `sync-queue`, `useLocalStorage`, `useUndoableState` — aucun lien à Zustand                                                                        | Zustand dans 13 apps (+ React Query dans `supaboss`)                                                                                      | Le patron « store Zustand + `versioned-store` + `sync-queue` » n'existe qu'en prose                              |
| Services API          | `backend.js` (choix de backend + repli local + migration port par port), `supabase-client` paresseux, `realtime/*`, `push/*`, `retryableQuery`                                         | `backend.js` : **0** importateur ; `getSupabase` recopié dans 4 apps malgré `supabase-client`                                             | Un dossier `backend/` de référence avec les ports et le repli local déjà câblés                                  |
| Authentification      | Port `auth/*` (Supabase, MFA, erreurs fr) ; `AuthProvider`, `LoginForm`, `MfaChallenge`, `AuthGate` (3.33)                                                                             | 5 apps ont leur fournisseur, formulaire, défi — **dix copies, dix gardes, zéro migration**                                                | Des écrans **livrés à la naissance**, pas proposés en rattrapage                                                 |
| Internationalisation  | `createI18n` (typé, `fmt.*` lié à la locale), `react/labels` 7 langues, `getDefaultLocale`                                                                                             | `react/i18n` : 8 apps ; 5 en i18n local ; 88 `'fr-FR'` en dur ramenés à 71 appels `getDefaultLocale()`                                    | Le câblage (`src/i18n/index.ts` + dictionnaires + `LabelsProvider`) : 4 fichiers identiques à écrire             |
| Gestion des erreurs   | `ErrorBoundary`/`ObservabilityBoundary`, `recordError`, journal circulaire local, `ErrorBanner`, `ConfirmDialog`                                                                       | `ErrorBoundary` 10/17 ; 3 copies gardées                                                                                                  | Rien de structurel                                                                                               |
| Logs                  | `createLogger`, `correlation` (identifiant de corrélation + `dumpAppState`), `console-audit.mjs`                                                                                       | `createLogger` **1/17 → 13/17** après la campagne du 02/09 ; `correlation` 1/17                                                           | Le journal posé d'office dans `main.tsx`                                                                         |
| Monitoring            | `installErrorReporter`, `initSentry` (chargement paresseux, no-op sans DSN), `web-vitals`, `analytics` GTM/GA4 avec consentement                                                       | Sentry câblé dans 13 apps mais **DSN présent dans 3 `package.json`** ; `analytics` : 0 importateur                                        | La décision « Sentry ou non » à la naissance, et un DSN posé en variable si oui                                  |
| Gestion des droits    | **Rien** : aucun `role` dans `auth/*` ni `use-action-guard` (qui garde des ACTIONS : en ligne, confirmé, etc.)                                                                         | RLS Supabase par app ; `profiles` + `is_admin` + `handle_new_user` recopiés dans 3 apps (GISEMENTS)                                       | Un gabarit SQL `profiles`/rôles/RLS et un `useRole()` — « à écrire quand la prochaine naît » : elle est née hier |
| Thèmes                | `tokens.css`, `themes.js` (**17 palettes d'apps DANS la bibliothèque**), `ThemeProvider`, `theme-boot` anti-FOUC, `theme-color` par schéma                                             | `ThemeProvider` 8/17 ; palettes en `@theme` + variables `--app-*` recopiées sur les jetons `--dwc-*`                                      | Un `index.css` de référence qui peint les jetons depuis UNE palette                                              |
| Design system         | 30 composants `react/*` nus (`data-dwc`) + `components.css` opt-in, showroom déployé, `lucide-react` règle famille                                                                     | `components.css` 15/17 ; `Card` promu de 10 copies ; `Modal` refusé (c'est `Sheet`)                                                       | Rien de structurel — la couche est mûre                                                                          |
| Tests                 | `vitest-base`, `vitest-setup` (mocks SW/IDB), `playwright-base`, `playwright-a11y`, Browser Mode opt-in, `pwa-register` stub                                                           | 6 fichiers de test (`ticket-pwa`) à 56 (`footcoach`) ; densité de 5,1 à 46,8 tests/kloc                                                   | Un socle de tests LIVRÉ (setup, a11y spec, e2e `@critical`, un test de store) plutôt que possible                |
| Documentation         | README monolithique 3 349 l., 4 dossiers d'analyse, showroom, en-têtes de modules qui citent leur origine                                                                              | README par app ; `docs/` dans 6 apps ; `AGENTS.md` de workspace périmé (« six apps », `@^1.2.0`)                                          | Une doc **développeur d'app** (« comment on fait X ici ») distincte de la doc **de bibliothèque**                |
| CI/CD                 | `pwa-ci`, `pwa-deploy` (`build-env`, `required-env`, 404), `pwa-lighthouse`, `supabase-migrate`, `keepalive`, `worker-deploy`, `cleanup-runs`, Renovate auto-hébergé, `apply-rulesets` | 17/17 sur `@v3` ; **12/16 en `secrets: inherit`** (le gabarit l'enseignait jusqu'au 04/09) ; keep-alive : 2 appelants sur 8 apps Supabase | Les appelants ENGENDRÉS depuis un manifeste d'env (CONFIG.md, phase 2), pas copiés                               |

### 2.1 Réellement réutilisable

La couche **outillage** est adoptée à saturation (16/17 sur les trois configs,
15/17 sur `vitest-setup`, 13/17 sur Playwright et les presets Vite) et la
couche **interface** l'est depuis que son prérequis `components.css` est passé
de 3 à 15 apps (`ConfirmDialog` 12, `Sheet` 7, `BottomNav` 6, `Toast` 6). Les
modules purs adoptés par au moins deux apps (`format`, `download`, `storage`,
`sync-queue`, `supabase-client`, `pairing`, `qr`, `xlsx`, `pdf`, `ical`,
`csv`, `image`, `geo`) ont chacun leurs tests et leur fiche README. Les six
workflows réutilisables portent la CI de seize dépôts. **Tout cela reste dans la
bibliothèque.**

### 2.2 Trop spécifique — ou trop tôt

- **Les données d'apps dans la bibliothèque.** `apps-catalog.js` (842 lignes)
  et `themes.js` (788 lignes, dix-sept palettes relevées) décrivent les apps,
  pas un besoin partagé. Conséquence mesurable : **créer une app exige une
  publication du socle** pour qu'elle apparaisse dans `FamilyApps` (14 apps) —
  et chaque app embarque le catalogue des dix-sept autres dans son bundle.
- **Les modules à un seul adoptant** (16), dont dix pour `mister-family-map`
  (`map`, `map/maplibre`, `correlation`, `prefetch`, `vite-version`,
  `react/version`…) : promus d'une app, jamais repris par une autre.
- **Les modules sans adoptant** (75 sous-chemins). Une partie est de la
  plomberie masquée par le barrel ; le reste — `analytics` (284 l.), `backup`
  (170 l., « la réponse est `versioned-store` »), `secure-storage` (268 l.),
  `markdown`, `vcard`, `similarity`, `audio`, `speech`, `haptics`,
  `rate-limit`, `geocode-ban`, `push/webpush`, `map/leaflet`,
  `realtime/firebase` — a été écrit avant le besoin. `CONTRIBUTING.md` dit
  « le socle promeut, il n'invente pas » ; le relevé dit que la règle est
  arrivée après la moitié du contenu.
- **La couche auth de la 3.33.** Promue de cinq apps à coût « élevé » (~1 200
  lignes, trois composants, libellés, tests) : les dix copies sont **toutes
  gardées**, avec leur raison. Ce n'est pas un échec de qualité — c'est la
  démonstration qu'une composition d'écrans ne se migre pas : elle se donne à
  la naissance ou jamais.

### 2.3 Dépendances inutiles et couplages

- **33 peers, dont 22 optionnelles** : la bibliothèque est correctement
  découplée (Sentry, Supabase, Firebase, Leaflet, MapLibre, Rive, QR chargés à
  la demande). Zéro dépendance de production. C'est un point fort rare.
- **Le couplage est à la CHAÎNE de version, pas au code** : peers `react ^19`,
  `vite ^8`, `vitest ^4`, `typescript ~6.0.3`. `mister-quota` (Electron, React
  18, Vite 5, ESLint 8) consomme six sous-chemins **en `legacy-peer-deps`** —
  le seul usage hors stack cible, et il vit hors contrat.
- **GitHub Packages** : un jeton est exigé **même pour un paquet public**
  (README § Authentification, `NODE_AUTH_TOKEN` en CI comme en local). Ce
  n'est pas un couplage de code mais c'est celui qui bloque tout `npx` sans
  `.npmrc` — voir § 6.
- **`react-router`** n'est cité que par `bottom-nav` et
  `use-route-breadcrumbs`, en commentaires ou en injection ; **Zustand**
  nulle part. L'agnosticisme est réel — et c'est précisément pourquoi la
  bibliothèque ne peut pas livrer un `App.tsx`.

### 2.4 Risques de dette technique

| Risque                                | Mesure                                                                                                                                                                    | Gravité |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Facteur bus = 1, vélocité d'août      | 226 commits, ~80 PR en un mois, sur un dépôt que seize autres consomment                                                                                                  | élevée  |
| Surface trop large pour un mainteneur | 148 sous-chemins, 75 sans importateur, `package-surface.test.mjs` vérifie la forme, pas l'usage                                                                           | élevée  |
| `.d.ts` écrits à la main              | 6 188 lignes ; `checkJs` vérifie le JS contre lui-même, pas la concordance JS ↔ `.d.ts` (le job « consumer-resolution » vérifie que ça s'importe, pas que ça type juste) | moyenne |
| Données d'apps dans la bibliothèque   | catalogue + palettes ⇒ une publication par naissance ; `FamilyApps` embarque tout                                                                                         | moyenne |
| Dette de sécurité de configuration    | 12/16 `secrets: inherit`, 15 valeurs publiques en `secrets`, phases 2–4 de CONFIG.md à faire                                                                              | moyenne |
| Chaîne d'outils                       | ESLint 9 hors support (ESLINT-10.md), 29 paquets en retard dont 5 majeures, Renovate attend `RENOVATE_TOKEN`                                                              | moyenne |
| Doc monolithique                      | un README de 223 Ko ; la « checklist nouveau projet » est un texte, pas un programme                                                                                      | faible  |
| Gabarits non testés                   | `templates/` n'est couvert que par une lecture dans `workflows.test.mjs` ; le gabarit `deploy.yml` a enseigné `secrets: inherit` pendant des mois sans qu'un test le voie | faible  |

### 2.5 Les manques qui ralentissent une naissance

Dans l'ordre où une nouvelle app les rencontre :

1. **Pas de point de départ exécutable.** La checklist a huit étapes ; le
   premier commit d'une app fait 70 à 90 fichiers, copiés d'une sœur choisie
   « au plus proche » (`miss-contraction` pour du local-first, disait la
   mémoire ; `miss-supatool` aujourd'hui). Chaque copie emporte les défauts de
   sa source — `lookhouse` est née hors gabarit et l'est restée deux mois.
2. **Pas de décision écrite** sur le routeur (9 hash / 6 browser), l'état,
   l'i18n locale ou socle, `autoUpdate` ou `prompt` (trois apps rechargeaient
   en pleine saisie jusqu'au 02/09).
3. **Les gestes GitHub** (Pages, ruleset, variables, catalogue) ne sont ni
   outillés ni vérifiés — `pwa-doctor` lit le dépôt, pas le compte.
4. **Rôles et droits** : rien, ni SQL, ni hook, alors que huit apps sont sur
   Supabase et trois ont recopié le même `profiles`/`is_admin`.
5. **Le manifeste de configuration** (CONFIG.md, phase 2) n'existe pas encore :
   `.env.example`, `build-env`, `required-env` et la liste des secrets
   s'écrivent quatre fois à la main.
6. **Docker** : `supabase start` a échoué sur le poste le 05/09 (démon non
   démarré) ; les migrations de `mister-miss-koh` n'ont jamais été appliquées.
   Un squelette Supabase doit documenter le chemin **sans** Docker
   (`--linked`, cf. mémoire `miss-uwh`).

---

## 3. Réutilisabilité : le découpage mesuré

### 80 / 15 / 5, confronté au parc

L'hypothèse « 80 % communs, 15 % métier, 5 % app » n'est vraie que si l'on
compte la bibliothèque dans chaque app. Mesurée sur **ce qu'une équipe écrit
dans son dépôt**, la répartition du parc est inverse :

| Tranche                                                                                                                      | Où elle vit aujourd'hui                              |             Part des lignes d'une app | Où elle devrait vivre                           |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------: | ----------------------------------------------- |
| **Conventions et outillage** (lint, format, TS, tests, CI, hooks)                                                            | socle, re-exporté en 1 ligne + 12–19 fichiers racine | ~2 % (mais 100 % des fichiers racine) | socle ; fichiers **figés** et resynchronisés    |
| **Coquille** (main, fournisseurs, App/routes, index.html, manifeste, MàJ SW, i18n, réglages, à-propos, auth, setup de tests) | **chaque app**, réécrite                             |             **15–25 %** (22 % mesuré) | **squelette engendré**, puis propriété de l'app |
| **Composants, hooks, services**                                                                                              | socle (22,7 kloc, `react/*`, modules purs)           |                         hors de l'app | socle                                           |
| **Métier** (`features/`, `domain/`, `store/`, `engine/`, RLS)                                                                | app                                                  |                           **70–80 %** | app                                             |
| **Spécifique app** (identité, palette, catalogue, secrets, budget)                                                           | app + **socle** (catalogue, palettes)                |                                  ~5 % | app, engendré ; le socle ne doit plus le porter |

Autrement dit : les 80 % communs **existent déjà** et sont dans le socle. Ce
qui n'est pas mutualisé, c'est la **composition** — 22 % des lignes du parc —
et aucune bibliothèque ne peut l'absorber, parce qu'elle est faite de choix
(routeur, backend, écrans) qu'un paquet agnostique refuse à juste titre de
prendre. La seule forme sous laquelle une composition se partage est **un
programme qui la produit** : un squelette, tenu à jour, dont on part.

### Un découpage plus juste : quatre couches

```
couche 0  CONVENTIONS TRANSVERSES     tous les dépôts (PWA, Rust, C#, Kotlin, Electron, ext. VS Code)
          rulesets, Renovate, commits, .editorconfig, .gitattributes, SECURITY, CODEOWNERS,
          cleanup-runs, FUNDING, gabarit de PR — dépôt `mister-guiiug/.github`

couche 1  BIBLIOTHÈQUE `dev-pwa-config`  la famille PWA React/Vite/TS
          configs, presets Vite, composants + components.css, modules purs, workflows pwa-*,
          bins (icons, budget, doctor, env) — publiée, versionnée, testée

couche 2  SQUELETTE `pwa-starter-kit`    une app complète, déployée, le 18e consommateur
          la composition : main, fournisseurs, routes, écrans réglages/à-propos/compte,
          backend local + Supabase, i18n, tests, workflows, manifeste d'env, docs dev
          + GÉNÉRATEUR `create-lg-pwa-app` : squelette@tag + identité + gestes GitHub

couche 3  MÉTIER                          chaque app
          features, domaine, store, RLS, e2e critiques, onboarding, réglages composés
```

### Conserver, déplacer, engendrer, laisser

| Conserver dans la bibliothèque                                                                                    | Déplacer dans le squelette                                                                                                 | Engendrer                                                                                                        | Laisser aux équipes                                                            |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| configs re-exportées, presets Vite (`vite-pwa-base`, `vite-pwa`, `vite-csp`)                                      | `templates/` (21 fichiers : `index.html`, husky, vscode, e2e a11y, lighthouserc, appelants de workflows, `keep-alive.sql`) | identité : nom, id, description, palette → `index.html`, manifeste, `tokens`, `.env.example`                     | domaine, modèle de données, RLS métier                                         |
| composants `react/*` + `components.css`, hooks, modules purs à ≥ 2 adoptants                                      | la composition : `main.tsx`, pile de fournisseurs, `App.tsx`, `src/pwa`, `src/i18n`, écrans réglages / à-propos / compte   | choix de backend (`local`/`supabase`/`firebase`) → `backend/`, workflows, secrets nommés, keep-alive, migrations | e2e `@critical` du métier, budget de bundle (la valeur)                        |
| workflows réutilisables, actions composites, Renovate, rulesets (élargis)                                         | la « fixture » du job `consumer-resolution` de la CI du socle (elle échafaude déjà un consommateur jetable dans `/tmp`)    | le côté GitHub : dépôt, Pages (PUT), ruleset, variables, `FUNDING`, PR sur le catalogue                          | composition de l'écran de réglages (GISEMENTS : « la composition est métier ») |
| `pwa-doctor`, `pwa-bundle-budget`, `pwa-icons`, futur `pwa-env`                                                   | la « Checklist nouveau projet » (8 étapes) devenue code                                                                    | lockfile npm 10, icônes depuis le SVG, premier `doctor --strict`                                                 | onboarding, notifications (trois formes de table)                              |
| catalogue et palettes : **à sortir** (fichier de données que les apps tirent, ou entrée écrite par le générateur) | ADR : routeur, état, i18n, `registerType`, backend                                                                         | `AGENTS.md`/`CLAUDE.md` de l'app avec les règles de la famille                                                   | —                                                                              |

---

## 4. Benchmark

Aucun de ces modèles n'a été conçu pour **dix-huit dépôts distincts tenus par
une personne, déployés sur GitHub Pages sous un chemin par app**. C'est la
contrainte qui tranche : un monodépôt casserait les URL de toutes les PWA
installées (CONFIG.md, « l'organisation GitHub casserait les URL de Pages » —
même mécanisme).

| Modèle                                                                        | Ce qu'il fait bien                                                                                                                                                                                                              | Ses limites ici                                                                                               | Ce qu'on en retient                                                                                                                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backstage Software Templates**                                              | `template.yaml` = paramètres + actions (fetch, publish, register) ; catalogue d'entités ; TechDocs ; scorecards ; « golden path » = la voie facile est la voie juste                                                            | Un portail à héberger et à maintenir ; « ongoing engineering investment » ; surdimensionné pour un mainteneur | La **triade** template + catalogue + scorecard existe déjà en miniature : `apps-catalog.js`, showroom, `pwa-doctor`. Pas de portail ; un `create` en ligne de commande |
| **Create React App** (déprécié le 14/02/2025)                                 | Une commande, zéro décision, dix ans d'usage                                                                                                                                                                                    | Chaîne d'outils opaque, `eject` irréversible, plus de mainteneurs : la « perfect storm » avec React 19        | Ne jamais **cacher** la configuration : les re-exports d'une ligne du socle sont la bonne réponse (`eject` = supprimer la ligne)                                       |
| **Vite templates** (`create-vite`, `create-vite-extra`, `vp create` de Vite+) | Minimal, non opinionné, gabarits distants GitHub, `--no-interactive`                                                                                                                                                            | Aucune opinion : tout reste à décider après                                                                   | La **couche de base** du générateur : partir de `react-ts` + surcouche famille, ou d'un dépôt distant à une étiquette                                                  |
| **Nx**                                                                        | Générateurs Devkit (AST, graphe), **`nx migrate` = codemods livrés avec la version**, plugins .NET/Gradle                                                                                                                       | Monodépôt d'abord ; `nx.json`, `project.json` ; « Nx wants to manage your workspace its way »                 | La seule idée à voler : **une montée de version livre ses codemods**. Le parc l'a déjà écrit à la main (`adopt.mjs`, `migrate-consumers.mjs`)                          |
| **Turborepo**                                                                 | `create-turbo -e <url-github>`, `turbo gen` (Plop), simple                                                                                                                                                                      | Monodépôt ; générateurs sans conscience du graphe                                                             | La forme du générateur : **un exemple distant à une étiquette**, pas des gabarits embarqués                                                                            |
| **« Microsoft Developer Accelerator »**                                       | Aucun produit de ce nom (non vérifié au-delà d'une recherche). Les plus proches : gabarits `azd init --template` (code + infra + CI/CD), `dotnet new` (paquets de gabarits versionnés, `dotnet new install`), `dotnet scaffold` | Écosystème Azure/.NET ; n'apporte rien aux PWA                                                                | Pour `mister-gphotos` (C#), le modèle `dotnet new` **est** le générateur naturel — le jour où un second projet .NET existe                                             |
| **IDP / Golden Path Engineering**                                             | « Half the value lives in CI integration » (workflows réutilisables) ; « manual secret setup is where golden paths become hollow » ; sécurité par défaut ; « start small »                                                      | Un IDP est une plateforme ; ici la plateforme, c'est GitHub                                                   | Les deux diagnostics sont **exactement** ceux de CONFIG.md : le chemin recommandé était le chemin fautif, et les secrets se posaient à la main                         |
| **Copier / Cookiecutter** (hors liste, mais pertinent)                        | Copier sait **mettre à jour un projet engendré** depuis une nouvelle version du gabarit (diff à trois voies) ; Cookiecutter ne sait pas                                                                                         | Python ; pas de gestes GitHub                                                                                 | Le vrai problème d'un squelette, c'est **après** : la dérive. `pwa-doctor` + fichiers figés + codemods sont l'équivalent maison de `copier update`                     |
| **Dépôts modèles GitHub** (`gh repo create --template`)                       | Zéro outil, l'historique repart de zéro, `gh` déjà authentifié                                                                                                                                                                  | Pas de substitution, pas de gestes après création                                                             | Le repli sans générateur : `pwa-starter-kit` **doit** être un dépôt modèle, générateur ou pas                                                                          |

---

## 5. Un dépôt squelette dédié : `pwa-starter-kit`

### Ce que c'est

Une application **complète et vide de métier**, publiée sur Pages, qui est à
la fois : la démonstration vivante du socle (ce que le showroom montre
composant par composant, le squelette le montre assemblé), le **dix-huitième
consommateur** (testé dans la CI du socle contre `HEAD`, en remplacement de la
fixture jetable), et la source de tout ce que le générateur produit.

```
pwa-starter-kit/
├── .github/workflows/        ci · deploy · lighthouse · cleanup-runs (+ supabase-migrate, keepalive si backend)
├── .vscode/  .husky/  .editorconfig  .gitattributes  .nvmrc  .npmrc  renovate.json  .lighthouserc.json
├── config/env.manifest.json  ← CONFIG.md phase 2 : la vérité, dont dérivent .env.example et deploy.yml
├── docs/
│   ├── adr/                  0001-routeur · 0002-état · 0003-i18n · 0004-backend · 0005-auth-et-rôles · 0006-mise-à-jour-sw
│   ├── DEVELOPPEUR.md        « comment on fait X ici » (pas la doc du socle)
│   └── CONVENTIONS.md        nommage (miss-/mister-, dwc_*, data-dwc, VITE_*), commits, branches, PR
├── e2e/                      a11y.spec.ts · smoke.spec.ts (@critical)
├── supabase/                 (option) migrations 0001 profiles + rôles + RLS deny-by-default · keep_alive · tests d'isolation
├── src/
│   ├── main.tsx              installErrorReporter → initSentry → Version → Theme → I18n → Toast → Auth → App
│   ├── App.tsx               routeur (ADR 0001) · AppHeader + PageContainer + BottomNav · UpdatePromptBanner · ConnectionBanner
│   ├── app/config/           env.ts (schéma + configReport) · backend.ts (resolveBackendKind + repli local)
│   ├── backend/              ports · adaptateur local · adaptateur Supabase (option)
│   ├── auth/                 AuthProvider + LoginForm + MfaChallenge du socle, câblés ; useRole()
│   ├── features/
│   │   ├── home/             un écran d'exemple avec un store Zustand + versioned-store + son test
│   │   ├── settings/         thème · langue · export/import · MàJ forcée · version · FamilyApps · diagnostic (configReport)
│   │   └── about/            source, sponsor, licences, attribution
│   ├── i18n/                 createI18n + messages fr/en + LabelsProvider
│   ├── pwa/                  enregistrement SW en `prompt`, install prompt
│   └── test/setup.ts
├── index.html                sans __PLACEHOLDERS__ : rempli par pwaSeoPlugin et par le générateur
├── vite.config.ts            ~40 lignes : pwaBaseOptions({ id }) · pwaSeoPlugin · cspPlugin · spaFallbackPlugin
├── AGENTS.md                 règles de la famille, pour les agents qui y travailleront
└── package.json              scripts figés : build = tsc -b && vite build && pwa-bundle-budget && pwa-doctor --strict
```

Ce que le squelette **décide** (et écrit en ADR, parce que le parc a montré
que ce qui n'est pas décidé se décide dix-sept fois) :

| Décision       | Recommandation                                                                                                   | Pourquoi                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Routeur        | `react-router-dom` 7, **`BrowserRouter`**                                                                        | liens profonds partageables et canoniques ; le repli 404 est dans `pwa-deploy` et `spaFallbackPlugin` depuis 3.33 |
| État           | Zustand + `versioned-store` (persistance versionnée) + `sync-queue` si backend                                   | 13 apps sur 17 ; `versioned-store` remplace les sept `storage.ts`                                                 |
| i18n           | `createI18n` du socle, `fr` + `en` livrés, `fmt.*` obligatoire (jamais `'fr-FR'` en dur)                         | 88 locales figées trouvées le 02/09                                                                               |
| Backend        | `backend.js` : `local` par défaut, `supabase` par option ; **l'app démarre sans configuration**                  | règle du README, treize apps la respectent, `mister-qowa` a été publié avec `apiKey: undefined`                   |
| Auth et rôles  | `AuthProvider`/`LoginForm`/`MfaChallenge` du socle ; SQL `profiles` + `role` + RLS deny-by-default ; `useRole()` | dix copies gardées : la couche ne sera adoptée qu'à la naissance                                                  |
| Mise à jour SW | `registerType: 'prompt'` + `UpdatePromptBanner`                                                                  | `autoUpdate` recharge en pleine saisie (PARC § 13)                                                                |
| Observabilité  | `installErrorReporter` + `createLogger` toujours ; Sentry **si** `VITE_SENTRY_DSN` (variable, pas secret)        | no-op sans DSN, bundle intact                                                                                     |
| Qualité en CI  | `pwa-doctor --strict` et `pwa-bundle-budget` **dans `build`** ; e2e `@critical` activé ; a11y axe                | aucune app ne le fait aujourd'hui                                                                                 |

### Gains attendus, et ce qu'ils valent

| Gain                  | Aujourd'hui (mesuré)                                                                                                                  | Avec le squelette                                                                                               | Confiance                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Time to market        | premier commit de 70–90 fichiers copiés d'une sœur ; six gestes GitHub à la main ; quatre pièges connus                               | un `create` : dépôt, CI verte, Pages en ligne, ruleset, `doctor` propre — **avant la première ligne de métier** | élevée : chaque geste est déjà écrit quelque part (mémoire, scripts, README)                              |
| Coût de développement | 22 % des lignes du parc sont de la coquille réécrite ; 3 122 lignes de YAML                                                           | la coquille est engendrée (~2 000 lignes par app) ; YAML ≈ 60 lignes par app                                    | moyenne : la coquille reste **propriété de l'app** après génération                                       |
| Erreurs               | `secrets: inherit` 12/16, `lang: en` ×3, manifeste 404, `autoUpdate` ×3, keep-alive 2/8 — tous des défauts de **gabarit ou de copie** | le gabarit est **une app testée**, `doctor --strict` en CI refuse la dérive                                     | élevée : c'est la leçon de CONFIG.md (« une règle que ne porte pas l'artefact qu'on copie n'existe pas ») |
| Qualité               | densité de tests de 5 à 47 tests/kloc ; a11y spec absente de 4 apps ; e2e hors CI (puzzle jusqu'au 02/09)                             | un plancher livré : setup, a11y, smoke, un test de store, couverture activée                                    | moyenne : un plancher n'est pas une culture                                                               |
| Standardisation       | 17 `vitest.config.ts`, 17 `index.html`, 13 `deploy.yml`                                                                               | fichiers figés resynchronisés ; un seul `index.html` rempli à la build                                          | élevée sur les fichiers figés, faible sur `App.tsx` (il DOIT diverger)                                    |

### Coût et risques

- **Le squelette est une dix-huitième app à maintenir.** C'est le prix, et
  il est faible si — et seulement si — sa CI tourne dans le socle à chaque
  PR : il devient alors le **test de contrat** de la bibliothèque, celui que
  la fixture de `/tmp` fait aujourd'hui à moitié (elle vérifie que les
  sous-chemins s'importent, pas qu'une app se construit et se déploie).
- **Un squelette qui vieillit est pire qu'aucun** (`lookhouse`, née d'un
  gabarit périmé). D'où : version du squelette = version du socle, étiquette
  pour étiquette ; Renovate dessus en premier.
- **Deux variantes maximum** (`local`, `supabase`) au départ. Firebase compte
  trois apps ; une variante `firebase` se justifiera au premier `create` qui
  la demande, pas avant. `mister-quota` (Electron) et les deux Tauri n'ont
  pas de squelette : deux apps de bureau sur trois piles différentes, rien à
  factoriser.
- **Le squelette ne remplace pas la bibliothèque** : il l'assemble. Le
  chantier de rétrécissement du § 7 vient avec, sinon la dette de surface
  reste entière.

---

## 6. Le générateur : `npx create-lg-pwa-app`

### Pertinent, à trois conditions

**1. Il ne contient aucun gabarit.** Il tire `pwa-starter-kit` à l'étiquette
qui correspond au socle demandé (`degit mister-guiiug/pwa-starter-kit#v3.34.0`
ou l'API des archives GitHub), comme `create-turbo -e <url>`. Un générateur
qui embarque ses gabarits est un troisième endroit où la même chose vieillit.

**2. Sa valeur est du côté GitHub, pas du côté fichiers.** Substituer
`__APP_ID__` prend dix lignes. Ce que personne n'a automatisé, et qui coûte
une demi-journée avec ses pièges, ce sont les gestes que la mémoire du parc
consigne :

```
create-lg-pwa-app miss-exemple --backend supabase --publish
  1. degit pwa-starter-kit@v4.0.0 → substitutions (id, nom, description, palette, catégorie)
  2. npm install (lockfile écrit par npm 10 : `npx npm@10 install --package-lock-only`)
  3. pwa-icons depuis public/favicon.svg
  4. git init, commit conventionnel, `npx prettier --check`
  5. --publish : gh repo create --public · Pages en build_type=workflow par PUT · ruleset « Protect main »
     · variables de dépôt lues dans config/env.manifest.json (jamais de secret saisi : le générateur
       IMPRIME la liste des secrets à poser) · FUNDING · Renovate
  6. PR ouverte sur dev-pwa-config : entrée apps-catalog.js + themes.js (tant que le catalogue y vit)
  7. pwa-doctor --strict, puis `gh run watch` sur la première CI
```

Chacun de ces gestes exige la session `gh` du mainteneur. Un générateur
`npx` **devra donc appeler `gh`**, ou n'être qu'un `degit` amélioré.

**3. Il doit s'installer sans `.npmrc`.** GitHub Packages exige un jeton pour
tout paquet, public compris : un `npx create-lg-pwa-app` ne résoudra rien sur
un poste vierge. Deux voies :

| Voie                                                                                     | Pour                                                                                               | Contre                                                                  |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Publier **le générateur seul** sur npmjs.org (public, MIT, quelques centaines de lignes) | `npx` marche partout ; il écrit ensuite le `.npmrc` et lit `gh auth token` pour installer le socle | un second registre à gérer ; le nom `create-lg-pwa-app` doit être libre |
| Une **extension `gh`** (`gh lg-pwa create`)                                              | `gh` est déjà authentifié et déjà requis pour les gestes 5–7 ; pas de registre                     | moins « standard » ; extension à installer une fois                     |

Recommandation : les deux à terme, **l'extension `gh` d'abord** — c'est là que
vit la moitié utile — et le paquet npm comme enveloppe quand le nom est pris.

### Ce que le générateur ne doit pas faire

- Poser un secret. Il imprime la liste (`CONFIG.md` § 5) ; l'humain pose.
- Décider à la place des ADR : les options sont `--backend` et `--name`, pas
  vingt questions. « Developers shouldn't have to make 47 security-adjacent
  decisions before writing their first line » vaut aussi pour un générateur.
- Vivre seul : il est testé de bout en bout dans la CI du socle (générer →
  installer → `build` → `doctor --strict` → e2e smoke), chaque nuit et à
  chaque étiquette.

### Après la génération : la dérive

C'est ce que Backstage ne résout pas et que Copier résout. Ici, trois
mécanismes existent déjà à moitié et n'ont qu'à être nommés :

| Ce qui bouge dans le socle        | Ce qui le porte dans l'app                                                                                                                | Existe ?                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| une version                       | `migrate-consumers.mjs` (dépendance + peers)                                                                                              | oui                                           |
| un fichier figé (re-export, YAML) | **`pwa-doctor --fix`** : réécrit les fichiers qui doivent être identiques à ceux du squelette (mesurés identiques à 16–17/17 aujourd'hui) | non — c'est le complément à écrire            |
| une API                           | codemods d'adoption (`adopt.mjs`) + `GARDES` pour les refus                                                                               | oui, à généraliser en `pwa-migrate <version>` |
| une règle                         | `pwa-doctor --strict` en CI                                                                                                               | oui, adopté par 0 app                         |

---

## 7. La stratégie en trois couches — et la quatrième

### Responsabilités

| Couche                          | Dépôt                                                      | Contient                                                                                                                                                                                                                                                                                        | Ne contient pas                                                                                                             | Versionné par                                 |
| ------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **0 · Conventions transverses** | `mister-guiiug/.github` (à créer)                          | fichiers communautaires par défaut (SECURITY, FUNDING, gabarit de PR, CODEOWNERS modèle), `cleanup-runs`, Renovate auto-hébergé + préréglages npm / cargo / nuget / gradle, `apply-rulesets` étendu à **tous** les dépôts, convention de commits, `.editorconfig`/`.gitattributes` de référence | tout ce qui suppose Node ou React                                                                                           | branche `main`, pas de release                |
| **1 · Bibliothèque**            | `dev-pwa-config`                                           | configs, presets Vite, composants + `components.css`, modules purs à ≥ 2 adoptants, workflows `pwa-*`, bins                                                                                                                                                                                     | catalogue et palettes d'apps (à sortir), gabarits à copier (vers le squelette), modules sans adoptant (à retirer ou isoler) | changesets, étiquettes `vX.Y.Z` + `v4` mobile |
| **2 · Squelette + générateur**  | `pwa-starter-kit`, `create-lg-pwa-app` (ou extension `gh`) | la composition (§ 5), les ADR, la doc développeur, le manifeste d'env, le SQL rôles/RLS ; le générateur : substitutions + gestes GitHub                                                                                                                                                         | des composants (ils sont en 1) ; des gabarits dans le générateur                                                            | **même étiquette que le socle**               |
| **3 · Applications**            | `miss-*`, `mister-*`                                       | le métier ; la coquille engendrée, qu'elles possèdent                                                                                                                                                                                                                                           | des copies de 1 (mesurées par `measure-adoption`, refusées par `GARDES`)                                                    | leur cycle                                    |

### Le flux d'une version

```
socle 4.1.0 étiqueté
  → CI du socle : validate · **starter-kit construit, diagnostiqué, e2e** (il A REMPLACÉ consumer-resolution)
  → publish.yml : GitHub Packages · release · v4 avance
  → pwa-starter-kit étiqueté v4.1.0 (même PR ou PR liée : le squelette est la preuve de la version)
  → générateur : rien à publier (il tire l'étiquette)
  → apps : Renovate ouvre la montée ; `pwa-doctor --fix` resynchronise les fichiers figés ; codemods s'il y a lieu
```

### Les dépôts qui ne sont pas des PWA

| Dépôt                  | Pile                                 | Partage aujourd'hui avec la famille                                                          | Ce que la couche 0 lui apporte                                                                                                  |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `mister-commitia`      | Rust + Tauri 2, crate `mc-core`      | rien — mais la CI la plus mûre du parc (multi-OS, cargo-deny, SBOM, couverture ≥ 80 %, SLSA) | ruleset, Renovate cargo, `cleanup-runs`, SECURITY ; **et sa CI est le gabarit Tauri du jour où un troisième projet Tauri naît** |
| `miss-ticket` (privé)  | Rust + Tauri 2, pnpm, Firebase, SOPS | rien                                                                                         | idem (rulesets impossibles sur un privé sans GitHub Pro : vérifié, 403)                                                         |
| `mister-gphotos`       | C# / .NET 8 WPF                      | rien ; commits libres, CI `dotnet build/test` sur Windows                                    | ruleset, Renovate nuget, SECURITY, convention de commits                                                                        |
| `mister-tv-gui`        | Kotlin, Compose for TV, Gradle       | `.editorconfig`                                                                              | ruleset, Renovate gradle                                                                                                        |
| `mister-tv-webos`      | TS, npm workspaces, Enact            | rien                                                                                         | ruleset, Renovate npm ; `eslint-base`/`prettier` du socle sont importables (sans React)                                         |
| `vscode-sops-diff`     | TS, extension VS Code                | rien                                                                                         | idem                                                                                                                            |
| `mister-quota`         | Electron, React 18, Vite 5           | 6 sous-chemins du socle, en `legacy-peer-deps`                                               | rien de plus ; **sortir du contrat de peers** en n'important que les modules purs, ou monter la pile                            |
| `mister-claude-skills` | Python, skills                       | rien                                                                                         | ruleset, SECURITY                                                                                                               |
| `TestHome`             | Node, non publié                     | rien                                                                                         | —                                                                                                                               |

Le constat est net : **neuf dépôts, zéro convention partagée**, et un script
`apply-rulesets.mjs` qui lit le catalogue des PWA — donc ne les voit pas.
Aucun générateur multi-piles n'est justifié (une app par pile, ou deux qui ne
se ressemblent pas). La couche 0 l'est : deux jours, et « Protect main »,
Renovate et `SECURITY.md` cessent d'être des privilèges de PWA.

---

## 8. Feuille de route

L'ordre suit le rendement : ce qui répare avant ce qui construit, ce qui se
teste avant ce qui se publie.

| #   | Chantier                                                                                                                                                                                                                                                                                                                                                                    | Coût              | Ce qui le prouve                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | ✅ **Couche 0 — faite le 05/09/2026** (voir le bilan sous ce tableau)                                                                                                                                                                                                                                                                                                       | 2 j               | **25 dépôts publics sur 25 protégés** ; `renovate.json` posé sur les quatre dépôts hors PWA                  |
| 2   | ✅ **`pwa-starter-kit` — fait le 05/09/2026** (voir le bilan sous ce tableau)                                                                                                                                                                                                                                                                                               | 4–5 j             | **fait** : `consumer-resolution` remplacé par le squelette, qui se construit et se diagnostique à chaque PR  |
| 3   | **`pwa-doctor --fix`** et `pwa-env` (CONFIG.md phase 2) : fichiers figés resynchronisés depuis le squelette, manifeste d'env → `.env.example` + `deploy.yml` engendrés                                                                                                                                                                                                      | 3 j               | `secrets: inherit` = 0/16 ; 17 `vitest.config.ts` → 1 ; `doctor` en CI sur 17 apps                           |
| 4   | ✅ **Générateur — fait le 05/09/2026** (voir le bilan sous ce tableau)                                                                                                                                                                                                                                                                                                      | 3 j               | **fait** : une application engendrée se construit et passe `doctor --strict` à 0/0/0                         |
| 5   | **Socle 4.0 — rétrécir** : sortir catalogue et palettes (fichier de données tiré à la build, ou entrée écrite par le générateur) ; isoler les 0-adoptant en `experimental/*` avec date de retrait ; `.d.ts` engendrés depuis JSDoc (`tsc --declaration --allowJs`) ou source TS ; ESLint 10 ; amender `CONTRIBUTING.md` : « entre ce qu'utilise le squelette ou deux apps » | 5 j + une majeure | 148 → ~90 sous-chemins ; 0 ligne de `.d.ts` à la main ; aucune publication du socle exigée par une naissance |
| 6   | Le squelette **Tauri** — seulement si un troisième projet Tauri naît ; source : la CI de `mister-commitia`                                                                                                                                                                                                                                                                  | —                 | —                                                                                                            |

### Bilan du chantier 1, exécuté le 05/09/2026

Six PR, et deux découvertes qui n'étaient pas dans le plan.

| Livré                                                                        | Où                                                                                                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `apply-rulesets` lit le compte, plus le catalogue                            | socle [#177](https://github.com/mister-guiiug/dev-pwa-config/pull/177)                                                       |
| Préréglage Renovate étendu à cargo, nuget, gradle, maven, pip, gomod         | socle [#178](https://github.com/mister-guiiug/dev-pwa-config/pull/178)                                                       |
| Garde-fou : un contexte inexistant est refusé, pas appliqué                  | socle [#179](https://github.com/mister-guiiug/dev-pwa-config/pull/179)                                                       |
| `renovate.json` sur les quatre dépôts hors PWA                               | commitia #16, gphotos #1, sops-diff #1, claude-skills #4                                                                     |
| Dépôt `mister-guiiug/.github` : SECURITY, gabarits d'issue et de PR, FUNDING | [le dépôt](https://github.com/mister-guiiug/.github) — héritage vérifié : le gabarit de PR de `miss-dice` y pointe désormais |

**Le trou était plus large que mesuré.** L'analyse comptait les neuf dépôts hors
PWA comme démunis. En réalité **six dépôts publics sur vingt-quatre n'avaient
aucune règle sur `main`** — et deux étaient des PWA, `miss-supatool` et
`mister-miss-koh`, nées après la dernière mise à jour du catalogue. La cause
n'était donc pas « le catalogue ne couvre pas tout », mais « une liste, quelle
qu'elle soit, prend du retard sans le dire ». D'où la lecture du compte.

**Automatiser la liste a ouvert une panne, qu'il a fallu refermer aussitôt.** Un
dépôt neuf hérite de `CHECKS.default`, la convention des PWA. Appliquée au
dépôt `.github` créé le jour même — qui n'a aucune CI — elle aurait exigé un
contexte qui n'arrive jamais, et gelé chacune de ses PR sans message lisible.
C'est exactement la panne que l'en-tête du script raconte depuis le début : une
énumération automatique doit venir avec sa vérification, sinon elle industrialise
le défaut au lieu de le corriger.

Deux pièges de détail, chacun à un aller-retour près : le nom de job de
`mister-commitia` porte une apostrophe **droite** (`U+0027`) et non
typographique — écrite autrement, la chaîne ne correspond à aucun check ; et les
check-runs de `main` incluent des contextes venus d'un `release.yml` sur tag,
qui ne s'exécutent jamais en PR. Les noms exigés se relèvent sur une **PR
réelle**, pas sur `main`.

### Les licences, réglées dans la foulée

Le chantier a révélé que **cinq dépôts publics n'avaient pas de `LICENSE`**.
GitHub n'hérite pas les licences — ni depuis le dépôt `.github` créé le matin
même, ni depuis le champ `"license"` d'un `package.json` : sans fichier à la
racine, un dépôt public est « tous droits réservés », et c'est cette lecture-là
qui fait foi.

Le traitement n'a pas été le même pour tous, parce que le cas ne l'était pas :

| Dépôt                                           | Situation                                         | Traitement                                            |
| ----------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `miss-lookhouse`, `mister-qowa`, `mister-quota` | `"license": "MIT"` dans le paquet, fichier absent | mise en cohérence, sans rien choisir                  |
| `mister-gphotos`                                | aucune déclaration, nulle part                    | licence **demandée** avant d'être posée               |
| `mister-family-map`                             | idem, et c'est un miroir                          | fichier + champ dans `bac-sable`, puis republié       |
| `.github`                                       | créé le jour même, ne porte que des gabarits      | MIT : des gabarits hérités doivent être réutilisables |

La distinction compte : rendre explicite ce qu'un paquet déclare déjà est une
correction, tandis que **choisir une licence à la place de l'auteur n'en est
pas une**. Les deux dépôts sans aucune déclaration ont donc fait l'objet d'une
question, pas d'une décision.

Résultat vérifié sur l'API : **vingt-cinq dépôts publics sur vingt-cinq en MIT
reconnu par GitHub.** Détail d'outillage à connaître : `prettier --check .`
ignore `LICENSE` lors d'un balayage de répertoire, mais échoue si on le lui
passe explicitement — ne jamais le nommer dans une commande de vérification.

### Bilan du chantier 2, exécuté le 05/09/2026

[`mister-guiiug/pwa-starter-kit`](https://github.com/mister-guiiug/pwa-starter-kit)
existe, est déployé, et son `build` enchaîne le budget de poids puis
`pwa-doctor --strict` à **zéro défaut, zéro dette, zéro info**. Sept décisions
sont écrites dans `docs/adr/`, six tests unitaires et sept e2e le tiennent.

**La variante Supabase n'est pas un fork.** C'est un adaptateur qui s'active
quand `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont posées ; sans elles
l'application reste entière, et l'écran de compte **dit** le mode local au lieu
de disparaître. Un fork aurait eu deux CI et aurait divergé en quelques
semaines. Elle apporte les trois migrations que trois dépôts recopient
(`profiles`, rôles, RLS deny-by-default à double verrou), onze assertions pgTAP
d'isolation, et les workflows de migration et de keep-alive.

**Le squelette a remplacé la fixture jetable du socle**, mais pas ce qu'elle
vérifiait. Le job `consumer-resolution` échafaudait un faux consommateur dans
`/tmp` ; le squelette est un vrai consommateur, tenu vert, et prouve ce que la
fixture ne pouvait pas — qu'une application se compile, se construit et reste
conforme au parc avec la version candidate. Mais il n'importe que **51
sous-chemins sur 148** : le balayage exhaustif est donc conservé, simplement
rejoué depuis son `node_modules`, qui porte déjà toutes les peers.

**Quatre défauts du socle sont sortis de son écriture**, ce qui est très
exactement sa raison d'être :

| Défaut                                                                       | Suite                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------ |
| `pwa-doctor` comptait les COMMENTAIRES qui mettent en garde contre un défaut | corrigé, socle #182, publié en 4.0.1             |
| `definePwaPlaywrightConfig` : `overrides` REMPLACE `use` et efface `baseURL` | contourné dans le squelette, à corriger en amont |
| Le socle habille la barre basse mais ne la PLACE pas (`position: relative`)  | c'est délibéré ; le squelette le documente       |
| `pwaBaseOptions` ne trouve `theme_color` que pour une app du catalogue       | couleurs passées explicitement                   |

Et une leçon de conception qui n'appartient qu'au squelette : **un port
dessiné sur l'implémentation locale est inimplémentable à distance.** Le port
des notes était synchrone parce que `localStorage` l'est ; l'adaptateur
Supabase ne pouvait pas le satisfaire, et cela n'est apparu qu'en l'écrivant.
Découvert plus tard, ce sont les écrans qu'il aurait fallu reprendre.

### Bilan du chantier 4, exécuté le 05/09/2026

[`create-lg-pwa-app`](https://github.com/mister-guiiug/create-lg-pwa-app)
existe. Une application naît en une commande :

```bash
npx github:mister-guiiug/create-lg-pwa-app miss-exemple --publish
```

**`npx github:` plutôt qu'un paquet publié, et c'est la décision qui compte.**
L'analyse proposait npmjs.org ou une extension `gh` ; les deux sont inutiles.
Tiré depuis GitHub, le générateur n'a **aucune dépendance** et ne touche aucun
registre — il fonctionne avant que le moindre `.npmrc` n'existe, ce qui est
précisément le seul cas où on l'appelle. C'est aussi pourquoi sa configuration
Prettier est une copie assumée de celle du socle, avec un test qui compare au
fichier publié à chaque exécution.

**Il ne contient aucun gabarit.** Il tire le squelette, dépôt vivant dont la CI
du socle vérifie à chaque commit qu'il se construit. Embarquer des gabarits
créerait un troisième endroit où la même chose vieillit — et le parc sait ce
que cela coûte : treize dépôts ont étendu pendant des mois un préréglage logé
dans un dépôt inexistant.

**Il n'y a pas de `--backend`**, contrairement à l'esquisse ci-dessus. Le
squelette livre les deux adaptateurs derrière un port, et le choix se fait à
l'exécution : un drapeau qui supprimerait des fichiers rendrait le second
chemin non construit, donc mort en quelques semaines. Ce que le générateur
prend, ce sont l'identité et `--from <ref>`.

Ce qu'il fait vraiment tient dans deux pièges que personne n'avait automatisés :
le lockfile écrit par **npm 10**, la version du runner, sans quoi la CI rougit
au premier push sur un message parlant de bindings natifs ; et Pages activées
par un **PUT**, sans quoi Jekyll republie le README rendu à la place de
l'application.

**Trois défauts de portabilité sont sortis de son écriture**, tous invisibles
sur le poste de développement :

| Défaut                                                       | Cause                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `tar` refuse un chemin Windows absolu                        | le deux-points y désigne une machine distante                    |
| `rename` échoue entre `%TEMP%` sur `C:` et un dépôt sur `D:` | `EXDEV` — il faut copier, pas déplacer                           |
| `git commit` échoue sur un runner sans `user.name`           | « empty ident name » ; le commit est un confort, pas le livrable |

Ce qu'il ne fait **pas**, et qui est délibéré : poser un secret — un générateur
qui écrit des secrets est un générateur qui les connaît —, protéger la branche,
et inscrire l'application au catalogue. Les deux derniers vivent dans le socle,
sous relecture.

Ce qu'on **ne fait pas**, et pourquoi :

- **Pas de monodépôt** (Nx, Turborepo) : les PWA installées sont liées à
  `mister-guiiug.github.io/<app>/`, et un déplacement casse le service worker,
  `start_url` et tous les liens publiés. Le parc est polydépôt par nécessité.
- **Pas de Backstage** : un portail pour un mainteneur est une charge, pas un
  outil. Le catalogue, le showroom et `pwa-doctor` en tiennent lieu.
- **Pas de générateur multi-piles** : une app par pile, rien à factoriser.
- Le **renommage du paquet** a été fait à part, le jour même, en une majeure
  (§ 9) : c'était le seul chantier qui ne pouvait pas attendre le squelette
  sans que dix-sept apps le refassent ensuite.
- **Pas de gabarits dans le générateur**, pas de secret saisi par lui, pas de
  `secrets: inherit` — trois façons de recréer la dette qu'on répare.

---

## 9. Sur le nom — fait le 05/09/2026

Jusqu'à la 3.34.0, `dev-wpa-config` était le nom du dépôt et du paquet ; « PWA »
celui du produit. Un nom npm ne se renomme pas : il se republie sous un autre
nom, et se migre dans chaque consommateur. C'est ce qui a été fait, en une
majeure, dans cet ordre :

1. **Le socle d'abord.** Réécriture de toutes les auto-références (workflows
   réutilisables, actions composites, scripts, préréglage Renovate, showroom,
   README), changeset majeur, `4.0.0` ; la CI du dépôt encore nommé
   `dev-wpa-config` valide le tout, la PR est fusionnée.
2. **Le dépôt ensuite** (`gh repo rename`), **puis la publication** : le tag
   `v4.0.0` publie `@mister-guiiug/dev-pwa-config@4.0.0` avec provenance, et
   fait naître l'étiquette mobile `v4`. L'ordre n'est pas libre :
   `npm publish --provenance` refuse un `repository.url` qui ne correspond pas
   au dépôt d'où il s'exécute.
3. **Les apps, une PR chacune** : dépendance, imports, `extends`, `@import`,
   `uses:` en `@v4`, `renovate.json`, lockfile régénéré par npm 10.

**Le piège, vérifié dans la documentation GitHub avant d'agir :** un dépôt
renommé redirige le web, `git clone` et `git push`, mais **pas les `uses:` des
workflows** — « repository not found ». Renommer le dépôt casse donc, à
l'instant même, la CI et le déploiement de tout appelant encore sur l'ancien
chemin, jusqu'à la fusion de sa PR. D'où les PR préparées avant le renommage et
fusionnées aussitôt après. L'ancien paquet reste publié en 3.34.0 et n'évolue
plus ; l'étiquette `v3` reste posée, inutile pour quiconque référence l'ancien
chemin.

Ce que le renommage n'a pas fait : les couches nouvelles (`pwa-starter-kit`,
`create-lg-pwa-app`) naîtront avec le bon nom, mais elles n'existent pas
encore ; le dossier local peut garder l'ancien nom tant qu'une session y
travaille — seul `git remote set-url` est nécessaire.

---

## 10. Réserves de mesure

- Le relevé `configs` du catalogue date du **31/08** : les modules promus le
  02/09 (`card`, `id`, `app-header`, `page-container`, la couche auth) y sont
  forcément à zéro. Le tableau d'adoption du README (02/09) les corrige en
  partie : `Card` 3/17, `AppHeader` 1/17, couche auth absente.
- La « coquille » est une heuristique par nom de dossier : elle sous-compte
  les apps qui mettent leur plomberie dans `features/` (`miss-contraction`,
  0 %) et sur-compte celles dont `components/ui` porte du métier
  (`mister-doc`, 38 %). L'ordre de grandeur — un cinquième — est robuste, le
  chiffre par app ne l'est pas.
- L'identité des fichiers est mesurée à l'octet : un commentaire change, c'est
  une variante. `vitest.config.ts` à 17 variantes reflète aussi cela.
- Les dépôts `mister-gphotos` et `vscode-sops-diff` n'existent pas sur le
  poste ; lus par l'API. `TestHome` n'est pas sur GitHub.
- « Microsoft Developer Accelerator » n'a pas de correspondance identifiable ;
  l'interprétation retenue (gabarits `azd`, `dotnet new`, `dotnet scaffold`)
  est la plus proche, pas certaine.
- Les coûts en jours sont des estimations pour une personne connaissant le
  parc, sans imprévu de chaîne d'outils — et août a montré ce qu'un imprévu
  de lockfile coûte.
