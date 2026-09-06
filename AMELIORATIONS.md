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

| Étape | Contenu                                                                                                                                | Coût     | Ce qui le prouve                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | ✅ **T7** (sonde) — fait le 06/09/2026 ; **T1** (jeton Renovate) reste au propriétaire                                                 | 1 h      | cim10 « coquille » ✅ ; une PR Renovate — en attente du secret                                                                          |
| 2     | ✅ **K1, K2, K3** — le squelette corrigé et étiqueté `v1.0.0` ; **T3, T5** — ses gardes exercés (fait le 06/09/2026, bilan ci-dessous) | 3 j      | 7 e2e et **13** pgTAP joués en CI ✅ ; badge admin ✅ ; lien de connexion ✅                                                            |
| 3     | ✅ **T2, T4, T6** — le docteur et les gardes de CI, puis **18 PR** (fait le 06/09/2026, bilan ci-dessous)                              | 2,5 j    | `doctor` en CI sur 18 dépôts ✅ ; doc et puzzle servent la coquille sur un lien profond ✅                                              |
| 4     | ✅ **T8, T9, T10, T11, T14** — les briques qui circulent ; **G1–G4** (fait le 06/09/2026, bilan ci-dessous)                            | 3 j      | 4 fiches d'installation ✅ ; **4** copies de CSS retirées (le relevé n'en trouvait pas 8) ; une naissance construite ✅                 |
| 5     | ✅ **K4, K5** puis **F2, F3, F5, F6** en lots de campagne (fait le 06/09/2026, bilan ci-dessous)                                       | 3 j + PR | `version.json` sur **19** sites ✅ ; import dans les réglages (squelette) ✅ ; lien de connexion sur **4** apps (la 5ᵉ l'avait déjà) ✅ |
| 6     | **F4** (suppression de compte), avec sa preuve                                                                                         | 1 j      | pgTAP « plus une ligne »                                                                                                                |
| 7     | **T12, T13, T15** — rétrécir, engendrer, dériver (chantiers 3 et 5, déjà planifiés)                                                    | 8 j      | 148 → ≈ 100 ; 17 `vite.config.ts` courts                                                                                                |
| —     | **F7, F8** si un besoin les appelle                                                                                                    | —        | —                                                                                                                                       |

Total des étapes 1 à 6 : **≈ 13 jours**, dont la moitié en petites PR.

### Bilan des étapes 1 à 3, exécutées le 06/09/2026

**Socle : 4.2.0** (PR #193, release #194). Une 4.1.0 avait été publiée entre
l'analyse et l'exécution par une autre session (catalogue à dix-neuf
applications, règle des liens de la famille) ; ce bilan s'y ajoute.

| Livré                                                                                                                                                                                                                                   | Où                                 | Ce qui le prouve                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| T7 — la sonde compare le corps du lien profond à `index.html`                                                                                                                                                                           | `scripts/probe-sites.mjs` + test   | cim10 monte sur `id="react-root"` : classé « coquille »                                                               |
| T3 — `e2e-grep` par défaut `@critical\|@a11y`, échec sur « No tests found » (Playwright rend 0), artefact renommé (`\|` interdit)                                                                                                       | `pwa-ci.yml`                       | `E2E (@critical\|@a11y)` vert sur le squelette et sur puzzle ; les specs a11y de puzzle, qowa et du squelette passent |
| T2 — `run-doctor` et `doctor-strict`                                                                                                                                                                                                    | `pwa-ci.yml`                       | le docteur tourne sur **18 dépôts** (17 apps + bac-sable) au lieu d'un                                                |
| T4 — un audit sans page est refusé                                                                                                                                                                                                      | `pwa-lighthouse.yml`               | le rapport est relu, `runtimeError` ou score a11y absent = échec                                                      |
| T5 — réutilisable `pwa-supabase-test.yml` (pile jetable, promu de lookhouse) et bin `pwa-pgtap` (promu de miss-koh)                                                                                                                     | socle + squelette                  | **13 / 13** en CI sur le squelette — voir la découverte ci-dessous                                                    |
| T6 — quatre lectures docteur (`wf-deploy-maison`, `e2e-hors-filtre`, `version-manifest`, infos `main-chunk-budget` et `local-storage-direct`) ; `spa-404` ne compte plus ce que `pwa-deploy@v4` pose au déploiement ; (e) existait déjà | `scripts/pwa-doctor.mjs` + 6 tests | badminton et contraction perdent leur faux défaut ; **0 défaut** sur les seize applications relues                    |
| K2 (socle) — `LoginForm mode="otp"`, sept langues                                                                                                                                                                                       | `react/login-form.js`, `labels.js` | test : un champ, « Recevoir un lien », `password: ''`                                                                 |

**Squelette : v1.0.0** (PR #5, première étiquette).

| Livré                                                                                                                                                                                                                  | Ce qui le prouve                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| K1 — hook « Custom Access Token » (`0004`) qui recopie `user_roles` dans le jeton, `supabase/config.toml` qui l'active en local, test unitaire de `useRole`                                                            | deux assertions pgTAP (rôle présent → `["admin"]`, absent → `[]`) ; le README dit qu'il faut l'activer sur le projet hébergé |
| K2 — le lien d'abord, le mot de passe en option, `flowType: 'pkce'`, ADR 0007 amendé (dont la nuance sur les politiques permissives)                                                                                   | e2e « mode local » inchangé ; lint, types, 8 tests, build 184,3 kB et `doctor --strict` 0/0/0                                |
| K3 — étiquette `v1.0.0` ; le générateur tire la **dernière étiquette** par défaut (`create-lg-pwa-app` #1), et **lit** le dossier de l'archive au lieu de le calculer — GitHub retire le `v` (`pwa-starter-kit-1.0.0`) | 9 tests du générateur ; `--help`                                                                                             |

**La découverte qui justifie T5 à elle seule.** La première exécution réelle
des assertions du squelette a montré que **trois d'entre elles n'avaient
jamais pu passer** : « anon ne lit aucune note / profil / rôle » attendait un
zéro ; le premier verrou de `0003` (`revoke all … from anon`) refuse la
requête en **42501** avant que les politiques ne filtrent. Elles étaient
vertes et fausses, parce que jamais jouées — exactement ce que l'analyse
reprochait au parc. Réécrites en `throws_ok`, plus fortes que ce qu'elles
attendaient.

**Campagne : 18 PR ouvertes et fusionnées en une passe** — les dix-sept
applications au catalogue plus `bac-sable` (#40, fusionnée par son
propriétaire) : socle `^4.2.0` (lockfile écrit par npm 10) et
`run-doctor: true`. Toutes vertes ; **0 défaut partout**. Le script
(`D:/tmp/campagne-run-doctor.mjs`) travaille dans un worktree lié et
`--package-lock-only`, sans toucher aux copies de travail — une autre session
en occupait trois. Deux pièges lui ont coûté une PR partie sans son `ci.yml`,
complétée ensuite : sous Windows, `spawnSync` avec `shell: true` concatène les
arguments sans les échapper ; et un `trim()` sur la sortie de `git status
--porcelain` mange l'espace de tête de la première ligne.

**Les deux déploiements écrits à la main.** `mister-doc` appelle désormais le
réutilisable, et un lien profond rend la coquille (vérifié en production :
même corps que `index.html`, 4 885 octets). `mister-puzzle` a d'abord **cassé**
: le bloc `with:` d'un job `uses:` n'a pas accès au contexte `secrets`, et
ses sept `VITE_FIREBASE_*` y vivent — GitHub a refusé le fichier entier sur
`main`, sans que la PR l'ait vu. Retour au déploiement écrit à la main (#37),
mais avec `VITE_BASE_PATH` et le repli SPA que la version d'avant n'avait pas
; vérifié en production (7 656 octets, règles Firebase déployées). La
conversion complète attend que ces sept valeurs, publiques par construction,
passent en `vars` — un geste sur le dépôt, pas dans un fichier.

**Ce qui reste de ces trois étapes :** T1, le secret `RENOVATE_TOKEN`, que
seul le propriétaire peut poser ; l'activation du hook de rôle sur les projets
Supabase hébergés le jour où une application née du squelette en a un ; et
`doctor-strict`, que chaque application adoptera quand son relevé sera à zéro.

### Bilan de l'étape 4, exécutée le 06/09/2026

**Socle : 4.3.0, puis 4.3.1 et 4.3.2 le même jour** (PR #202, release #203 ;
correctifs #205/#206 et #207/#208). Les deux correctifs ont été révélés par la
première exécution réelle de `pwa-screenshots` sur le squelette, alors que
1 183 tests étaient verts.

| Livré                                                                                                                                                                                                                                       | Où                                                                                                                   | Ce qui le prouve                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T8 — `BottomNav placement="fixed"` (`data-placement`) et `PageContainer reserve="bottom-nav"` (`data-reserve`), les deux règles dans `components.css`                                                                                       | socle 4.3.0 ; squelette v1.1.0 ; supatool #12, lookhouse #67, miss-koh #10                                           | **4 copies retirées, pas 8** : le relevé sur `origin/main` ne trouve que quatre règles `[data-dwc='bottom-nav']` dans le parc (genius, lookhouse, supatool, miss-koh). genius est en `sticky`, pas en `fixed`, et garde la sienne ; contraction, cim10, doc, footcoach et supaboss importent le composant mais le placent autrement (classe utilitaire, coquille flex). La capture `wide` de supatool montre la barre collée sur un vrai build |
| T9 — bin `pwa-screenshots` (`--url`, `--prepare`, `--base`, `--dist`, `--only`) ; `pwaBaseOptions` lit `public/screenshots`, tailles lues dans le PNG                                                                                       | socle ; squelette (`npm run screenshots`, script maison de 98 lignes retiré) ; qowa #42, lookhouse #67, supatool #12 | **4 fiches d'installation** : squelette, qowa, lookhouse, supatool — chaque image ouverte. quota n'a pas de manifeste (Electron), hors champ. Les captures du squelette du 05/09 étaient **blanches** : voir ci-dessous                                                                                                                                                                                                                        |
| T10 — `devPort` au catalogue (`DEV_PORTS`, `devPortOf`, `freeDevPort`, `STARTER_KIT_DEV_PORT = 5240`), info `dev-port` du docteur                                                                                                           | socle ; squelette (`server.port = devPortOf(APP_ID, 5240)`, `.claude/launch.json`) ; générateur                      | une naissance reçoit 5241 (`choisirPort`) ; le docteur du squelette reste à 0/0/0                                                                                                                                                                                                                                                                                                                                                              |
| T11 — `pwa-bundle-budget --ratchet [--write]`                                                                                                                                                                                               | socle                                                                                                                | tests (`proposeBudget` : mesure + 10 %, arrondi au kilo-octet) ; aucun budget du parc resserré à cette étape                                                                                                                                                                                                                                                                                                                                   |
| T14 — `definePwaPlaywrightConfig` fusionne `use` ; `pwaBaseOptions` lit `--dwc-primary` et `--dwc-bg` dans `src/index.css`, et avertit sans `theme_color`                                                                                   | socle ; squelette (`pwaBaseOptions({ id })` seul)                                                                    | le manifeste construit du squelette porte `#3b6ea5` et `#f7f8fa` sans les deux lignes de couleur                                                                                                                                                                                                                                                                                                                                               |
| G1–G4 — le générateur construit ce qu'il engendre (`npm run build`, `--no-build`), choisit un port libre, écrit `.claude/launch.json`, pose la fiche du dépôt (`--publish` : homepage, topics) et imprime la liste Supabase sans rien poser | create-lg-pwa-app #2                                                                                                 | le job « Engendrer » de sa CI construit l'app engendrée ; naissance locale `miss-essai-build` : build sous budget, doctor 0/0/0, port 5241                                                                                                                                                                                                                                                                                                     |

**Ce que la première exécution réelle a trouvé.** (1) `require.resolve('vite/bin/vite.js')`
sort en `ERR_PACKAGE_PATH_NOT_EXPORTED` : vite ferme ses `exports` ; 4.3.1 lit
`vite/package.json` et son champ `bin`. (2) Les captures du squelette étaient
**deux rectangles blancs** de 4 ko : un build fait pour `/pwa-starter-kit/`
servi sous `/` demande ses actifs à `/pwa-starter-kit/assets/…` et reçoit des 404. L'ancien script du squelette avait le même défaut, et personne n'avait
ouvert les images ; 4.3.2 lit la base dans `dist/index.html`, compte les 404 et
refuse d'écrire une page sans texte. Un test unitaire ne voit ni le navigateur
ni le serveur : la preuve d'une capture, c'est son ouverture.

**Le Lighthouse du squelette n'avait jamais démarré.** Neuf runs en
`startup_failure` depuis le 05/09 : l'appelant accordait `contents` et
`packages`, le réutilisable demande `pull-requests: write` — « requesting
'pull-requests: write', but is only allowed 'pull-requests: none' ». Sans job,
sans journal, sans bloquer une fusion. Corrigé dans le squelette (#9) : premier
Lighthouse vert du dépôt le 06/09. Un check du docteur sur les appelants
(comparer leur bloc `permissions:` à celui du réutilisable) est à écrire :
c'est le seul moyen de voir un workflow qui ne démarre pas.

**Squelette v1.1.0** (PR #8 et #9) : les briques adoptées, `lighthouse.yml`
réparé, e2e chromium 14/14 en local, CI et Lighthouse verts.

**Ce qui reste de l'étape 4 :** genius (`sticky`) et les cinq apps qui placent
la barre autrement ne changent pas — le « 8 copies » de l'analyse était un
comptage large, le chiffre vérifié est 4. Les captures de lookhouse montrent
l'écran de connexion, ce qu'un nouvel utilisateur voit : un compte de
démonstration joué par `--prepare` est une décision du propriétaire. Aucun
port d'app n'a été aligné sur le catalogue (le docteur le signale en info), et
`--ratchet` n'a été joué sur aucun budget du parc.

### Bilan de l'étape 5, exécutée le 06/09/2026

**Socle : 4.4.0 puis 4.4.1** (PR #211/#212, #213/#214). **Squelette v1.2.0** (PR #10, #11). Dix-sept PR de campagne fusionnées (`version.json`), quatre PR de connexion par lien fusionnées.

| Livré                                                                                                                                                                                                                                                     | Où                                                       | Ce qui le prouve                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K4 — importer dans les réglages (`versioned-store.import()`, schéma, confirmation quand des notes existent), `PwaInstallPrompt` dans « À propos », « Signaler un problème » au pied de page                                                               | squelette #10                                            | trois e2e `@critical` de plus (import qui remplace et survit au rechargement, fiche d'installation sur `beforeinstallprompt` simulé, lien qui porte version et écran) ; e2e 20/20 en local, CI et Lighthouse verts                                                                                                      |
| K5 — le port des notes gagne `add` / `remove` / `import` ; l'adaptateur Supabase touche UNE ligne au lieu de tout effacer ; le fichier exporté est l'enveloppe `{ v, data }` du magasin versionné, partagée par les deux adaptateurs (`notes-file.ts`)    | squelette #10                                            | l'e2e « une note ajoutée survit au rechargement » inchangé ; 11 tests unitaires dont l'aller-retour export → import                                                                                                                                                                                                     |
| F6 — module `issue-report` (`issueReportUrl`, `currentIssueReportUrl`, `describeEnvironment`, sans regex) et `AppFooter issues` : le gabarit `bug.yml` du compte prérempli avec version, commit, écran, navigateur, système, app installée ; sept langues | socle 4.4.0 ; squelette ; 9 apps par la campagne         | 9 tests socle ; le lien vérifié dans l'e2e du squelette                                                                                                                                                                                                                                                                 |
| F2 — `versionPlugin({ manifest: true })` en tête des plugins, `AppFooter version` ; `vite-version` injecte la base du build, `versionManifestUrl` en dérive l'URL, `AppVersion updates` sonde `version.json` au montage SANS `VersionProvider`            | socle 4.4.1 ; 17 PR (`D:/tmp/campagne-version-json.mjs`) | **`version.json` répond sur 19 sites** (17 apps de la campagne, family-map qui l'avait, le squelette), avec la base ; `pwa-doctor` ne compte plus la dette `version-manifest`                                                                                                                                           |
| F3 — le lien de connexion d'abord, le mot de passe en option (`signInWithOtp`, retour calculé depuis l'origine servie, `flowType: 'pkce'` là où il manquait)                                                                                              | lookhouse #69, uwh #80, doc #64, footcoach #52 + #53     | lint, types, tests et build par app ; e2e de la page de connexion de doc adapté et vert ; tests hors ligne de lookhouse sur les deux chemins ; 7 tests footcoach. **4 apps, pas 5** : carbook avait déjà le lien, molkky, dice et ticket-pwa n'ont pas de connexion                                                     |
| F5 — emporter ses données                                                                                                                                                                                                                                 | squelette (K4)                                           | l'import est dans les réglages du squelette ; genius l'avait, et badminton, cim10, puzzle, qowa, quota portaient déjà un `<input type=file>` pour leur cas. **Pas de campagne** : contraction, supaboss et ticket-pwa n'ont ni export ni import, dice et supatool exportent des extraits (CSV, rapport), pas un magasin |

**Ce que la première exécution réelle a trouvé.** (1) `AppVersion updates` ne sondait rien sans `VersionProvider`, que dix-sept apps n'avaient pas posé, et un `version.json` relatif partait à côté de la page depuis un lien profond (404 muet) : la 4.4.1 corrige les deux avant la campagne. (2) Ce sondage au montage est une requête `fetch` de plus : le test hors ligne de cim10, qui comptait les appels réseau de l'écran, l'a vu passer — les tests qui espionnent `fetch` doivent ignorer `version.json`. (3) **Dix-sept PR sont parties sans lockfile** : le script relisait `git status --porcelain` à travers un `trim()`, qui mange l'espace de tête de la première ligne — ` M package-lock.json`, la première par ordre alphabétique. Le piège était écrit en mémoire depuis la campagne précédente, et réintroduit par une fonction utilitaire ; une passe `--completer-lock` a poussé les seize lockfiles manquants. (4) Le lockfile de footcoach est fait pour Linux : construire sous Windows demande quatre liaisons natives (`rolldown`, `lightningcss`, `@tailwindcss/oxide`, `rollup`) installées sans les enregistrer. (5) Le propriétaire a fusionné footcoach #52 alors que sa CI était rouge — la couverture passait sous les seuils de 0,4 point — d'où #53, sept tests. (6) quota charge son `vite.config.ts` en CommonJS : le plugin ESM du socle ne s'y charge pas, et l'app n'a pas de site ; elle est hors campagne.

**Ce qui reste, et à qui.** Ajouter l'adresse de chaque app à la liste d'URL autorisées de son projet Supabase (Authentication → URL Configuration) pour lookhouse, uwh, doc (`lgbuytinzukaxrqjwxme`) et footcoach : sans cela le lien part et n'arrive nulle part ; le jeton disponible ne voit que les projets de miss-koh et molkky — décision et geste du propriétaire. qowa n'a pas reçu `version` / `issues` au pied de page (son import est en guillemets doubles, le codemod ne l'a pas vu) ; contraction garde son propre pied de page. F5 pour contraction, supaboss et ticket-pwa demande un export d'abord. `--ratchet` n'a toujours resserré aucun budget.

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
