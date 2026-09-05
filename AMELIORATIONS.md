# Les trois couches, vues des applications — améliorations proposées (05/09/2026)

_Cinquième analyse du parc, après [CAMPAGNE.md](CAMPAGNE.md) (adoption),
[GISEMENTS.md](GISEMENTS.md) (promotion), [PARC.md](PARC.md) (le parc vu de
dehors) et [STRATEGIE.md](STRATEGIE.md) (bibliothèque, squelette, générateur).
Celle-ci prend les trois couches telles qu'elles existent depuis le 05/09/2026
au soir et pose une seule question : **qu'est-ce qui, dans chacune, ferait le
plus de bien aux applications `miss-*` / `mister-*` — celles qui existent, et
celles qui naîtront ?** Tous les chiffres ont été relevés le 05/09/2026 sur les
copies de travail des vingt-deux dépôts du poste, sur l'API GitHub, et sur les
dix-huit sites publiés par `scripts/probe-sites.mjs`. Ce qui n'a pas pu l'être
est marqué « non vérifié »._

## 0. Le verdict, en dix lignes

Les trois couches sont saines et récentes ; le problème n'est plus la structure,
c'est **ce qui n'atteint pas les applications**. Trois chiffres le disent :

- **`pwa-doctor` tourne sur une application sur vingt** — le squelette. Les
  dix-neuf autres ne l'appellent ni au build ni en CI, et le réutilisable
  `pwa-ci.yml` ne le propose pas.
- **51 des 148 sous-chemins du socle n'ont aucun importateur** dans le parc,
  dont la couche auth entière (neuf sous-chemins, livrée le 02/09), `vite-pwa`
  (le manifeste engendré : zéro app, vingt `vite.config.ts` de 27 à 380 lignes)
  et `react/pwa-install-prompt` (zéro, cinq apps l'ont réécrit).
- **Renovate n'a toujours jamais tourné** : chaque exécution planifiée
  s'arrête sur « `RENOVATE_TOKEN` absent ». Playwright est à 1.49 dans huit
  apps et à 1.62 dans une, `supabase-js` va de 2.45 à 2.115.

D'où l'ordre proposé : **d'abord ce qui rend les gardes effectifs** (le docteur
en CI, les tests qui ne tournent pas, le jeton Renovate), **puis ce que le
squelette doit corriger avant d'être copié** (trois défauts), **puis ce qui
change quelque chose pour l'utilisateur final** (installation, mise à jour,
connexion sans mot de passe, portabilité des données, suppression de compte).
Le reste — rétrécir le socle, engendrer les configurations — est déjà planifié
dans STRATEGIE.md et n'est ici que précisé par la mesure.

## 1. Ce que le relevé mesure

### La bibliothèque — `dev-pwa-config` 4.0.1

| Mesure                                  | Valeur                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Sous-chemins exportés                   | 148, trois binaires (`pwa-icons`, `pwa-bundle-budget`, `pwa-doctor`)                         |
| Workflows                               | 14, dont 6 réutilisables `pwa-*`                                                             |
| Scripts d'outillage                     | 22                                                                                           |
| Tests                                   | ≈ 1 133 dans 97 fichiers ; CI ≈ 1 min                                                        |
| Consommateurs alignés                   | 17 apps en `^4.0.0` ; `mister-family-map` en `^3.21.0` (miroir non régénéré depuis le 29/08) |
| Sous-chemins **sans aucun importateur** | **51** (§ 2.1)                                                                               |
| PR et issues ouvertes                   | 0 / 0                                                                                        |

### Le squelette — `pwa-starter-kit`

19 fichiers source, 6 tests unitaires, 7 e2e (6 `@critical`, 1 `@a11y`),
7 ADR, 3 migrations et **11 assertions pgTAP**, `doctor --strict` à 0/0/0 au
build, port de développement 5240, **0 étiquette** (un `--from` ne peut viser
que `main`). Il est le test de contrat du socle : la CI du socle le construit
sur chaque version candidate.

### Le générateur — `create-lg-pwa-app` 1.0.0

260 lignes de gestes GitHub + 184 lignes pures testées (2 fichiers de tests).
Sa CI engendre une application depuis le squelette **réel** — avec
`--no-install`, donc **sans jamais la construire** : elle vérifie qu'aucune
trace du nom du squelette ne subsiste, pas qu'une application engendrée passe
`doctor --strict`. C'est le squelette qui le prouve, à sa version `main` du
moment.

### Le parc — 19 applications au catalogue, plus `bac-sable`

| Ce qui est mesuré                                   | Résultat                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Routeur                                             | **9** par `#`, 6 `BrowserRouter`, 2 `createBrowserRouter`, 3 sans routeur                                                |
| `components.css`                                    | 17 / 20                                                                                                                  |
| i18n du socle                                       | 11                                                                                                                       |
| `versioned-store`                                   | **3** (genius, uwh, miss-koh) — et **485 appels directs à `localStorage`** ailleurs (jusqu'à 55 dans cim10)              |
| La règle CSS qui colle la barre basse               | recopiée dans **7 apps + le squelette**                                                                                  |
| `pwa-doctor` au build                               | **1 / 20** (le squelette)                                                                                                |
| `pwa-bundle-budget` au build                        | 19 / 20 ; un seul `mainChunkKb` (qowa)                                                                                   |
| e2e joués en CI (`run-e2e: true`)                   | **8 / 19** par le réutilisable, doc par un workflow à part ; trois apps sans aucune spec (lookhouse, supatool, miss-koh) |
| `@a11y` joué en CI                                  | **1** app (`e2e-grep: '@smoke\|@a11y'`) ; ni le squelette ni les autres                                                  |
| Suites pgTAP                                        | lookhouse (2, en CI par Docker), miss-koh (2, contre la base liée), squelette (1, **jamais jouée**)                      |
| Apps Supabase                                       | 8 ; connexion par mot de passe ×5, par lien (`signInWithOtp`) ×2 (carbook, miss-koh), `flowType: 'pkce'` ×3              |
| Couche auth du socle (`AuthProvider`, `LoginForm`…) | **0 adoptant** (hors squelette)                                                                                          |
| `docs/adr/`                                         | 2 / 19 (family-map et son dépôt source)                                                                                  |
| Locale fixée dans `playwright.config.ts`            | 4 / 14                                                                                                                   |
| Port de développement déclaré                       | 5173 par défaut presque partout ; 5204, 5214, 5234, 5236, 5240 choisis à la main, sans registre                          |

### Les sites publiés — sonde du 05/09/2026, 18 sites

| Constat                                    | Sites                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version.json` absent (**404**)            | **17 / 18** — seul family-map le sert ; `vite-version` a un adoptant                                                                                                                  |
| Manifeste sans capture d'écran (`shots=0`) | lookhouse, supatool, qowa, family-map — Chrome propose une ligne au lieu d'une fiche d'installation                                                                                   |
| Lien profond → page 404 de GitHub          | **puzzle, doc** (déploiement écrit à la main, sans le réutilisable donc sans le repli SPA) ; cim10 est un **faux positif de la sonde** (corps identique à `index.html`, 6 216 octets) |
| `og:image` absent                          | family-map                                                                                                                                                                            |
| JS initial transféré                       | puzzle 271 kB, contraction 243, doc 209, carbook 201, family-map 187, uwh 183, badminton 182 … dice 98                                                                                |
| Budgets de poids                           | figés à « poids courant + marge » : bac-sable 675, carbook 505, qowa 435, ticket-pwa 330, puzzle 320                                                                                  |
| Tout le reste                              | `lang=fr`, CSP, `theme-color` par schéma, icône iOS, canonique, `robots`, `sitemap` : **18 / 18**                                                                                     |

## 2. Ce que l'audit trouve, couche par couche

### 2.1 La bibliothèque : beaucoup de bon code qui n'arrive pas

**Cinquante et un sous-chemins sans importateur.** Sept sont consommés par des
fichiers de configuration que le relevé ne lit pas (`prettier`, `commitlint`,
`lint-staged`, `eslint-base`, `tsconfig-app`, `playwright-a11y`, `tokens`) ;
les **quarante-quatre autres sont du code d'exécution que personne n'importe** :

- la **couche auth entière** : `auth`, `auth/supabase`, `auth/mfa`,
  `auth/errors-fr`, `react/auth-provider`, `react/auth-gate`,
  `react/login-form`, `react/mfa-challenge`, `react/use-auth` — livrée le
  02/09 sur la mesure de dix copies dans cinq apps, adoptée par le seul
  squelette ;
- **`vite-pwa`** (`pwaBaseOptions`) : le manifeste engendré, que le squelette
  vante — « zéro application n'importait » — et que zéro application importe
  toujours ;
- `react/pwa-install-prompt` (cinq apps écoutent `beforeinstallprompt` à la
  main), `react/error-banner`, `react/net`, `react/sponsor`,
  `react/sync-status-badge`, onze crochets `react/use-*` (`async`, `feedback`,
  `fullscreen`, `local-storage`, `long-press`, `offline-queue`, `page-views`,
  `prefetch`, `route-breadcrumbs`, `shake`, `undoable-state`) ;
- `push/*` (trois), `analytics`, `secure-storage`, `sparkline`, `speech`,
  `vcard`, `markdown`, `columns`, `geocode-ban`, `map/leaflet`,
  `realtime/firebase`, `version`, `vite-seo`, `vitest-browser-base`.

C'est la liste chiffrée qui manquait au chantier 5 de STRATEGIE.md
(« 148 → ~90 »). Elle dit aussi autre chose : **un module promu après coup
n'est pas adopté après coup** — la couche auth le prouve une seconde fois. Ce
qui atteint les apps, c'est ce que le squelette contient à leur naissance, et
ce que le docteur exige ensuite.

**Le docteur existe, et il ne tourne nulle part.** `pwa-doctor` (590 lignes,
une quarantaine de contrôles) n'est appelé que par le `build` du squelette. Le
réutilisable `pwa-ci.yml` n'a pas d'entrée pour lui. Les dix-neuf autres apps
ne sont donc **jamais diagnostiquées**, sauf à la main lors d'une campagne.

**Trois trous silencieux dans les gardes de CI :**

1. `pwa-ci.yml` ne joue que `--grep @critical`. Une spec taguée `@a11y` seule
   — celle du gabarit `templates/e2e/a11y.spec.ts`, celle du squelette —
   **n'est jamais exécutée**, sans que rien ne le dise.
2. `pwa-lighthouse.yml` : un audit en `NO_FCP` produit un rapport sans
   catégorie accessibilité, et l'assertion `minScore: 0.9` ne s'applique plus
   (trois apps corrigées en août pour cette raison). Aucun garde ne lit
   `runtimeError` dans le rapport.
3. `pwa-supabase-migrate.yml` pousse les migrations et **n'exécute aucun
   test** : les onze assertions du squelette et celles de miss-koh ne
   tournent que là où quelqu'un les lance.

**Les gabarits du socle sont devenus le « troisième endroit ».** Le générateur
tire le squelette ; `templates/github-workflows/ci.yml` (87 lignes, jobs
écrits en clair) et `templates/index.html` (placeholders `__ANALYTICS_*__`)
disent autre chose que le squelette (23 lignes qui délèguent au réutilisable).
Le README du générateur nomme exactement ce risque — « un gabarit cassé ne
fait pas de bruit, il ne fait rien ».

**Deux défauts connus, toujours ouverts** : `definePwaPlaywrightConfig` dont
`overrides` **remplace** `use` et efface `baseURL` (contourné dans le
squelette) ; `pwaBaseOptions` qui ne trouve `theme_color` que pour une app du
catalogue (couleurs passées explicitement).

**Le catalogue ignore le port de développement.** Cinq apps en ont choisi un
à la main pour pouvoir tourner côte à côte ; le gabarit VS Code dit 5173
partout. Rien ne détecte une collision.

**La sonde des sites a un faux positif** : `mister-cim10` est classé
« 404→page GitHub » alors que le lien profond rend le corps de `index.html`
(6 216 octets, statut 404 — c'est le comportement normal de Pages).

### 2.2 Le squelette : exemplaire, à trois défauts près

Il est ce qu'il prétend être — composition courte, décisions écrites, porte
`doctor --strict`. Mais **ce qu'il porte part dans chaque application
suivante**, et trois choses y sont fausses ou muettes :

1. **`useRole` lit `app_metadata.roles` dans le jeton ; rien ne l'y écrit.**
   La migration `0001` crée une table `user_roles` et les fonctions SQL
   `has_role` / `is_admin` ; aucun hook de jeton ne recopie le rôle dans
   `app_metadata`. Le badge « admin » de l'écran de compte ne peut donc jamais
   s'afficher, et aucun test ne le couvre (`useRole` n'apparaît dans aucun
   test). Deux corrections possibles : lire `user_roles` (la politique
   `user_roles_select_self` l'autorise), ou documenter le hook « Custom
   Access Token » qu'il faut activer côté projet.
2. **Sa spec `@a11y` ne tourne pas en CI** (§ 2.1, trou 1) et **ses onze
   assertions pgTAP non plus** (trou 3). Le squelette promet des gardes qu'il
   n'exerce pas.
3. **La connexion n'y existe que par mot de passe**, alors que les deux
   applications vivantes qui ont écrit un écran de compte ce mois-ci (carbook,
   miss-koh) passent par le lien à usage unique, et que `LoginForm` n'a pas de
   mode sans mot de passe. Miss-koh a en outre payé deux pièges que le
   squelette ne transmet pas : `flowType: 'pkce'` est une **nécessité de
   routage** dès qu'on route par `#` (le flux implicite met le jeton dans le
   fragment, là où le routeur lit la route — neuf apps sont dans ce cas), et
   un projet Supabase neuf n'autorise que `http://localhost:3000` comme
   retour de lien.

S'y ajoutent des manques, moindres : pas de `PwaInstallPrompt` ni de lien de
signalement ; l'écran de réglages exporte mais **n'importe pas** (le magasin
versionné sait le faire) ; l'adaptateur Supabase des notes remplace tout à
chaque sauvegarde (`delete` puis `insert` — limite écrite dans le code) ;
aucune étiquette de version ; aucun `.claude/launch.json` ni port réservé.

### 2.3 Le générateur : juste, mais il fait confiance

Il fait exactement ce que STRATEGIE.md demandait, et ses trois décisions
(archive sans historique, npm 10, Pages par PUT) sont bonnes. Ce qui manque
tient en quatre lignes :

- **il ne construit jamais ce qu'il engendre** — ni lui, ni sa CI. La preuve
  « une app engendrée passe `doctor --strict` » est celle du squelette, à sa
  révision `main` du moment ;
- **`--from` ne peut viser qu'une branche**, le squelette n'ayant aucune
  étiquette ; deux naissances à une semaine d'écart partent de deux squelettes
  différents sans que le premier commit le dise autrement que par un SHA ;
- `--publish` ne pose ni `homepage` ni `topics` sur le dépôt, alors que
  l'adresse Pages est connue ;
- il termine par quatre gestes à faire à la main, dont deux pourraient être
  imprimés avec leur commande exacte (le port, les réglages Supabase quand
  l'app en aura un).

## 3. Les propositions

Chaque proposition porte : le constat mesuré, ce qu'elle donne aux
applications, le coût estimé pour une personne connaissant le parc, et ce qui
prouvera qu'elle est faite.

### 3.1 Rendre les gardes effectifs (avant tout le reste)

| #      | Proposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Ce que ça donne aux apps                                                                                                                     | Coût  | Preuve                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| **T1** | **Poser `RENOVATE_TOKEN`** sur le socle (geste du propriétaire ; aucun script ne peut le faire). Puis vérifier la première PR sur un dépôt.                                                                                                                                                                                                                                                                                                                                | Les 18 dépôts reçoivent enfin leurs montées ; la dérive Playwright 1.49→1.62 et supabase-js 2.45→2.115 se résorbe seule                      | 5 min | une PR Renovate fusionnée                               |
| **T2** | **`pwa-ci.yml` : entrée `doctor` (défaut `true` en v5)**, qui exécute `pwa-doctor` après le build ; en 4.x, opt-in et campagne « 18 PR d'une ligne ».                                                                                                                                                                                                                                                                                                                      | Le docteur diagnostique 19 apps à chaque PR au lieu d'une                                                                                    | 0,5 j | `doctor` en CI sur 18 apps                              |
| **T3** | **`pwa-ci.yml` : `e2e-grep` par défaut `@critical\|@a11y`**, et un échec explicite sur « No tests found » (un `run-e2e: true` qui ne trouve rien est un mensonge).                                                                                                                                                                                                                                                                                                         | La spec a11y du gabarit et du squelette tourne enfin                                                                                         | 0,5 j | le job E2E du squelette exécute 7 tests, pas 6          |
| **T4** | **`pwa-lighthouse.yml` : échouer sur `runtimeError`** (NO_FCP) en lisant le rapport, au lieu de laisser l'assertion accessibilité s'évaporer.                                                                                                                                                                                                                                                                                                                              | Plus d'audit vert sans page                                                                                                                  | 0,5 j | un `VITE_BASE_PATH` faux fait rougir le job             |
| **T5** | **Un réutilisable `pwa-supabase-test.yml`** (Postgres jetable du runner, `supabase test db` — le workflow de lookhouse promu) **et un bin `pwa-pgtap`** contre la base liée (le `pgtap-remote.mjs` de miss-koh, 87 lignes, avec ses pièges déjà écrits : colonne `(line)`, grants, plan exact).                                                                                                                                                                            | Les suites pgTAP du squelette, de lookhouse et de miss-koh tournent de la même façon ; toute app Supabase née du squelette a ses tests joués | 1 j   | 11/11 du squelette en CI                                |
| **T6** | **Cinq contrôles `pwa-doctor`** : (a) `deploy.yml` sans le réutilisable → pas de repli SPA (puzzle, doc) ; (b) une spec e2e dont le tag n'est jamais joué par `e2e-grep` ; (c) `e2e/` présent et `run-e2e` absent (8 apps) ; (d) `versionPlugin` absent → `version.json` 404 (17 sites) ; (e) manifeste sans `screenshots` (4 sites). Et deux « info » : `mainChunkKb` absent quand le JS initial dépasse 200 kB ; appels directs à `localStorage` sans `versioned-store`. | Ces défauts cessent d'être trouvés à la main, une fois par trimestre                                                                         | 1 j   | `doctor` rouge sur puzzle et doc, vert sur le squelette |
| **T7** | **Corriger la sonde** (`probe-sites`) : comparer le corps du lien profond à `index.html` avant de conclure « page GitHub ».                                                                                                                                                                                                                                                                                                                                                | Un relevé de production sans faux positif                                                                                                    | 0,5 h | cim10 classé « coquille »                               |

### 3.2 Corriger le squelette avant qu'il soit copié

| #      | Proposition                                                                                                                                                                                                                                                                                                                                                   | Coût  | Preuve                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------- |
| **K1** | **`useRole` lit `user_roles`** (une requête, la RLS autorise déjà la lecture de soi), ou documente le hook de jeton ; un test unitaire et une assertion pgTAP « un admin se voit admin ».                                                                                                                                                                     | 0,5 j | le badge admin s'affiche pour un rôle posé en SQL           |
| **K2** | **Connexion par lien d'abord** : `LoginForm mode="otp"` dans le socle (un champ, « Recevoir un lien »), `AuthProvider.signInWithOtp` existe déjà ; `flowType: 'pkce'` posé et expliqué (inoffensif en `BrowserRouter`, indispensable en `#`) ; `emailRedirectTo` calculé depuis `origin + BASE_URL`. Le mot de passe reste possible, il n'est plus le défaut. | 1 j   | l'e2e « mode local » passe ; un e2e « lien envoyé » simulé  |
| **K3** | **Étiqueter le squelette** (`v1.0.0`, puis à chaque publication du socle) ; le job « Le squelette, construit sur ce paquet » reste sur `main`, mais **`--from` du générateur vise la dernière étiquette par défaut**.                                                                                                                                         | 0,5 j | `npx … --from v1.0.0` reproduit une naissance à l'identique |
| **K4** | **Réglages : importer, pas seulement exporter** (`versioned-store.import()` existe) ; **`PwaInstallPrompt`** dans « À propos » ; **un lien « Signaler un problème »** qui ouvre `issues/new?template=bug.yml` du dépôt `.github` avec version, build, route et navigateur préremplis.                                                                         | 1 j   | trois écrans, trois e2e `@critical`                         |
| **K5** | **Le port des notes gagne `add` / `remove`** ; l'adaptateur Supabase cesse de tout effacer à chaque sauvegarde — la limite que son propre commentaire annonce.                                                                                                                                                                                                | 0,5 j | l'e2e « une note survit au rechargement » inchangé          |
| **K6** | **`.claude/launch.json` et un `devPort` lu dans le catalogue** (§ 3.3, T10) ; `AGENTS.md` du squelette le mentionne.                                                                                                                                                                                                                                          | 0,5 h | deux apps tournent côte à côte sans `--port`                |

### 3.3 Faire circuler ce qui existe déjà

| #       | Proposition                                                                                                                                                                                                                                                                                                   | Constat                                                                                    | Coût                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **T8**  | **`BottomNav placement="fixed"`** (attribut `data-dwc-placement`, la règle CSS dans `components.css`) et **`PageContainer reserveBottomNav`** pour la hauteur réservée.                                                                                                                                       | la même règle recopiée 8 fois, avec la même réserve de hauteur à côté                      | 0,5 j                                          |
| **T9**  | **Un bin `pwa-screenshots`** (Playwright en peer optionnelle) qui produit `narrow` et `wide` du manifeste — à la place des **trois** scripts qui existent (98 lignes dans le squelette, 50 dans miss-koh, celui du showroom dans le socle) ; le docteur vérifie leur présence (T6-e).                         | 4 sites sans fiche d'installation ; trois scripts pour une chose                           | 1 j                                            |
| **T10** | **`FAMILY_APPS[].devPort`** dans le catalogue, unique, lu par le squelette, le générateur et le gabarit VS Code ; le docteur signale une collision.                                                                                                                                                           | cinq ports choisis à la main, 5173 partout ailleurs                                        | 0,5 j                                          |
| **T11** | **`pwa-bundle-budget --ratchet`** : quand un build passe sous le budget d'une marge donnée, proposer (ou écrire, avec `--write`) la nouvelle valeur. Aujourd'hui les budgets figent un poids, ils ne le font jamais descendre.                                                                                | bac-sable 675, carbook 505, qowa 435 ; le JS initial de puzzle à 271 kB sans `mainChunkKb` | 0,5 j                                          |
| **T12** | **Retirer `templates/github-workflows/*` et `templates/index.html`** du socle — ou les faire dériver du squelette par `pwa-doctor --fix` (chantier 3). Garder les gabarits que le squelette ne porte pas (`.lighthouserc.json`, `husky/`, `vscode/`, `changesets/`), en le disant dans `templates/README.md`. | deux copies qui ont déjà divergé                                                           | 0,5 j (retrait) ; 3 j (`--fix`, déjà planifié) |
| **T13** | **`vite-pwa` par codemod** (`scripts/adopt.mjs`, lot « manifeste engendré ») : remplacer le bloc `manifest` écrit à la main par `pwaBaseOptions({ id, themeColor, backgroundColor, manifest: { screenshots } })`. Vérifier par `probe-sites` que le manifeste publié est identique avant/après.               | 20 `vite.config.ts` de 27 à 380 lignes, zéro adoptant du module qui les remplace           | 1 j + 17 PR                                    |
| **T14** | **Corriger `definePwaPlaywrightConfig`** : fusionner `use` au lieu de le remplacer ; et **`pwaBaseOptions`** : accepter `themeColor` sans catalogue **ou** le lire dans `index.css`.                                                                                                                          | deux défauts connus depuis la naissance du squelette                                       | 0,5 j                                          |
| **T15** | **Chantier 5 avec la liste du § 2.1** : `experimental/*` daté pour les 44 modules d'exécution à zéro ; garder la couche auth (le squelette la porte) ; retirer `push/*` sauf si qowa ou molkky l'adopte dans le trimestre ; `vite-pwa` sort de la liste dès T13.                                              | 148 → ≈ 100 sous-chemins, chiffré cette fois                                               | 5 j + une majeure (planifié)                   |

### 3.4 Le générateur

| #      | Proposition                                                                                                                                                                                                                            | Coût  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **G1** | **Construire ce qu'il engendre** : sans `--no-install`, enchaîner `npm run build` (donc budget + `doctor --strict`) et refuser de publier une application qui ne passe pas. Sa CI fait de même avec `npm ci`.                          | 0,5 j |
| **G2** | **`--from` = dernière étiquette du squelette** (K3) ; `main` reste possible.                                                                                                                                                           | 0,5 h |
| **G3** | **`--publish` pose `homepage` et deux `topics`** (`pwa`, `mister-guiiug`) par `gh repo edit` — l'adresse est connue.                                                                                                                   | 0,5 h |
| **G4** | **Écrire `.claude/launch.json`** avec le premier `devPort` libre du catalogue (T10), et **imprimer** la liste Supabase quand l'app en aura un : `site_url`, `uri_allow_list`, table `keep_alive`, les trois secrets — sans rien poser. | 0,5 j |

### 3.5 Pour l'utilisateur final

Ce sont les propositions qui changent quelque chose **dans** les applications,
pas seulement dans leurs dépôts. Elles passent toutes par le squelette (pour
les naissances) et par un lot de campagne (pour les existantes).

| #      | Fonctionnalité                                                                                                                                                                                                                                                                                                                                                                                                                                          | Constat                                                                                                                    | Apps concernées          | Coût                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------ |
| **F1** | **Une vraie fiche d'installation** : captures dans le manifeste (T9) et `PwaInstallPrompt` du socle (K4).                                                                                                                                                                                                                                                                                                                                               | 4 sites sans captures ; 0 adoptant du composant, 5 réécritures                                                             | toutes                   | dans T9 + K4             |
| **F2** | **« Ce qui tourne, et ce qui attend »** : `versionPlugin({ manifest: true })` partout, `AppVersion updates` dans « À propos », `AppUpdates checkEvery` déjà adopté par 9 apps. Sans `version.json`, une PWA installée ne sait pas dire qu'une version l'attend.                                                                                                                                                                                         | `version.json` en 404 sur 17 sites                                                                                         | toutes                   | T6-d + 17 PR d'une ligne |
| **F3** | **Se connecter sans mot de passe** (K2) — le lien à usage unique comme entrée par défaut, le mot de passe en option.                                                                                                                                                                                                                                                                                                                                    | 5 apps à mot de passe seul ; 2 apps ont déjà le lien                                                                       | les 8 apps Supabase      | dans K2 + 5 PR           |
| **F4** | **Supprimer son compte** : une fonction SQL `delete_my_account()` (`security definer`, `delete from auth.users where id = auth.uid()`, la cascade fait le reste) livrée dans les migrations du squelette, une carte « Zone dangereuse » avec confirmation, une assertion pgTAP « après suppression, plus une ligne ». **À prouver** : que le propriétaire des fonctions a le droit d'effacer dans `auth.users` sur un projet hébergé (non vérifié ici). | aucune app ne l'offre ; miss-koh le note comme « demande un appel serveur »                                                | les 8 apps Supabase      | 1 j + preuve pgTAP       |
| **F5** | **Emporter ses données** : importer dans les réglages (K4), sur `versioned-store.import()`, pour changer d'appareil sans compte.                                                                                                                                                                                                                                                                                                                        | export dans ≈ 15 apps, import à l'écran presque nulle part ; `backup` à zéro adoptant parce qu'il vide `localStorage` brut | les 11 apps sans backend | dans K4 + campagne       |
| **F6** | **Signaler un problème avec le contexte** (K4) : version, build, route, navigateur, dans le gabarit `bug.yml` du dépôt `.github`.                                                                                                                                                                                                                                                                                                                       | aucune app n'a de signalement structuré                                                                                    | toutes                   | dans K4                  |
| **F7** | **Écrire hors ligne sur une app Supabase** : promouvoir dans l'adaptateur du squelette le motif file d'attente + badge d'état (`sync-queue` : lookhouse et uwh ; `use-offline-queue` et `sync-status-badge` : zéro).                                                                                                                                                                                                                                    | deux apps l'ont écrit, le socle a les pièces, personne ne les assemble                                                     | apps Supabase            | 2–3 j (optionnel)        |
| **F8** | **« Nouveautés »** après une mise à jour : une feuille alimentée par `version.json` et un extrait du `CHANGELOG`. Le prompt de mise à jour existe (9 apps) ; personne ne dit ce qui a changé.                                                                                                                                                                                                                                                           | zéro app                                                                                                                   | toutes                   | 1 j (optionnel)          |

## 4. Feuille de route proposée

L'ordre suit le même principe que STRATEGIE.md : ce qui répare avant ce qui
construit, ce qui se prouve avant ce qui se publie.

| Étape | Contenu                                                                             | Coût     | Ce qui le prouve                                                                      |
| ----- | ----------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| 1     | **T1** (jeton Renovate — propriétaire), **T7** (sonde)                              | 1 h      | une PR Renovate ; cim10 « coquille »                                                  |
| 2     | **K1, K2, K3** — le squelette corrigé et étiqueté ; **T3, T5** — ses gardes exercés | 3 j      | 7 e2e et 11 pgTAP joués en CI ; badge admin ; lien de connexion                       |
| 3     | **T2, T4, T6** — le docteur et les gardes de CI, puis **18 PR d'une ligne**         | 2,5 j    | `doctor` en CI partout ; puzzle et doc corrigés                                       |
| 4     | **T8, T9, T10, T11, T14** — les briques qui circulent ; **G1–G4**                   | 3 j      | 4 fiches d'installation ; 8 copies de CSS retirées ; une naissance construite         |
| 5     | **K4, K5** puis **F2, F3, F5, F6** en lots de campagne                              | 3 j + PR | `version.json` sur 18 sites ; import dans les réglages ; lien de connexion sur 5 apps |
| 6     | **F4** (suppression de compte), avec sa preuve                                      | 1 j      | pgTAP « plus une ligne »                                                              |
| 7     | **T12, T13, T15** — rétrécir, engendrer, dériver (chantiers 3 et 5, déjà planifiés) | 8 j      | 148 → ≈ 100 ; 17 `vite.config.ts` courts                                              |
| —     | **F7, F8** si un besoin les appelle                                                 | —        | —                                                                                     |

Total des étapes 1 à 6 : **≈ 13 jours**, dont la moitié en petites PR.

## 5. Ce qu'on ne propose pas, et pourquoi

- **Faire passer les neuf apps en `#` au routage par chemin.** L'ADR 0001 du
  squelette le dit : une app qui route déjà par `#` n'a pas de raison de
  changer. Le prix se paierait en liens publiés ; le gain n'est que
  l'indexation.
- **Rétro-écrire sept ADR dans dix-sept apps.** Le coût dépasse la valeur ;
  le docteur peut porter les décisions comme « info » (routeur, mise à jour,
  locale), ce qui suffit à les rendre visibles.
- **Adopter la couche auth par campagne.** Elle a échoué une fois (dix copies,
  zéro migration). Elle entrera par les naissances et par K2 — une app qui
  ajoute la connexion par lien prendra le composant qui l'offre.
- **Un `--backend` dans le générateur, des gabarits dans le générateur, un
  paquet npm public** : déjà écartés dans STRATEGIE.md, pour des raisons qui
  tiennent toujours.
- **Une organisation GitHub, un monodépôt, un portail** : idem.

## 6. Réserves de mesure

- Le relevé d'adoption lit `src/`, `vite.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `eslint.config.js` et les `tsconfig*.json`. Il ne lit
  ni `prettier.config.js`, ni `commitlint.config.js`, ni `e2e/`, ni le CSS
  importé par le CSS : les sept sous-chemins de configuration comptés « à
  zéro » sont probablement utilisés. Le chiffre robuste est **44**, pas 51.
- `miss-ticket-pwa` ressort à **5 kB de JS initial** dans la sonde : trop peu
  pour une app React. Non vérifié ; peut venir d'un chargement différé ou
  d'une erreur de la sonde.
- `miss-carbook` est mesurée à 201 kB de JS initial alors que PARC.md
  rapportait 146 kB après sa PR #31. Non vérifié : la sonde a pu changer de
  méthode, ou l'app a repris du poids.
- Les comptages « export / import / onboarding / favoris » du parc reposent
  sur des mots (`downloadText`, `importer`, `welcome`, `favori`…) : ils
  situent un ordre de grandeur, pas une liste d'écrans.
- F4 suppose qu'une fonction `security definer` appartenant à `postgres` peut
  effacer dans `auth.users` sur un projet hébergé. C'est documenté par
  Supabase, mais **non vérifié ici** ; c'est précisément ce que l'assertion
  pgTAP proposée doit prouver avant toute publication.
- Les coûts sont des estimations pour une personne connaissant le parc, hors
  imprévu de chaîne d'outils.
