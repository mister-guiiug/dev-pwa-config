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

> **Élagué le 06/09/2026.** Les vingt-neuf propositions T/K/G/F ont été
> exécutées en cinq étapes ; leurs fiches ont quitté ce document, et le § 3 ne
> garde que ce qui reste ouvert. **Les trois bilans, eux, restent en entier** :
> ils ne racontent pas ce qui a été livré — le CHANGELOG le dit mieux — mais ce
> que la première exécution réelle a démenti, et cela ne se trouve nulle part
> ailleurs. Le § 6 s'est enrichi de la réserve la plus lourde de cette page, et
> a vu tomber la plus ancienne. L'historique garde la version longue.

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

_Relevé du 05/09/2026, conservé pour ses ORDRES DE GRANDEUR : ce sont eux qui
ont fondé l'ordre des chantiers. Les comptes du jour se lisent dans le README
(`npm run sync`), le catalogue et la CI._

Trois chiffres portaient tout le raisonnement :

- **`pwa-doctor` tournait sur une application sur vingt** — le squelette. Les
  dix-neuf autres ne l'appelaient ni au build ni en CI, et `pwa-ci.yml` ne le
  proposait pas. _(Corrigé depuis, puis rattrapé par bien pire : le drapeau a
  été posé partout le 06/09, et les bins ne s'exécutaient toujours pas — voir
  les réserves, § 6.)_
- **51 des 148 sous-chemins n'avaient aucun importateur** dans le parc, dont la
  couche auth entière, `vite-pwa` (le manifeste engendré) et
  `react/pwa-install-prompt`, que cinq apps avaient réécrit. Le chiffre robuste
  est 44 : sept sous-chemins de configuration échappaient au relevé.
- **Renovate n'avait jamais tourné** : chaque exécution s'arrêtait sur
  « `RENOVATE_TOKEN` absent ». Playwright allait de 1.49 à 1.62 selon les apps,
  `supabase-js` de 2.45 à 2.115.

Le squelette comptait alors 19 fichiers source et 7 ADR ; le générateur, 260
lignes de gestes GitHub et 184 lignes pures testées.

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

> **Ce constat a été deux fois vrai.** L'entrée `run-doctor` est arrivée le
> 06/09 et le drapeau a été posé sur dix-sept dépôts — puis on a découvert le
> même soir que **les bins ne s'exécutaient pas du tout** sous le lien
> symbolique de `node_modules/.bin` : le drapeau était posé, le contrôle ne
> tournait nulle part, et rien ne le disait. Corrigé en 4.5.0. Voir la réserve
> ajoutée au § 6, qui est la plus lourde de cette page.

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

## 3. Les propositions — et ce qu'il en reste

Les vingt-neuf propositions de ce relevé (T1–T15 pour les gardes et
l'outillage, K1–K6 pour le squelette, G1–G4 pour le générateur, F1–F8 pour
l'utilisateur final) ont été **exécutées entre le 05 et le 06/09/2026**, en
cinq étapes dont les bilans suivent. Leurs fiches — constat, forme, coût,
preuve — ont quitté ce document : ce qu'elles proposaient est dans le code, et
ce qu'elles ont appris est dans les bilans.

**Ce qui reste ouvert :**

| #       | Ce qui reste                                                                                                                                 | À qui                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| T1      | poser le secret `RENOVATE_TOKEN` sur le socle — aucun script ne peut le faire                                                                | propriétaire           |
| T12–T15 | rétrécir le socle : retirer les gabarits qui doublent le squelette, engendrer le manifeste par codemod, dater les sous-chemins sans adoptant | une majeure            |
| F8      | « Nouveautés » après une mise à jour, alimentée par `version.json` et le CHANGELOG                                                           | si un besoin l'appelle |
| —       | activer le hook « Custom Access Token » et la liste d'URL de retour sur les projets Supabase hébergés                                        | propriétaire           |

F7 (écrire hors ligne) est livré depuis : le squelette porte la file sur son
port, et `mister-doc` la sienne avec le conflit d'occupant traité.

## 4. Ce que l'exécution a donné

Les cinq étapes ont été jouées les 05 et 06/09/2026. Les trois bilans qui
suivent ne listent pas ce qui a été livré — le CHANGELOG et les PR le disent —
mais **ce que la première exécution réelle a démenti ou révélé**. C'est la
partie qu'on ne retrouve nulle part ailleurs, et la seule raison de garder ces
pages.

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
- ~~F4 suppose qu'une fonction `security definer` appartenant à `postgres` peut
  effacer dans `auth.users` sur un projet hébergé.~~ **RÉSERVE FERMÉE le
  06/09/2026**, prouvée quatre fois par quatre chantiers indépendants — dont
  une sonde en lecture seule sur un projet **hébergé**, qui établit le
  mécanisme : le droit vient d'un `GRANT` de la plateforme ou de la propriété
  de la table, ni l'un ni l'autre n'étant un privilège de superutilisateur,
  dont `postgres` ne dispose pas. Portée exacte : l'**effet** (« plus une
  ligne ») est établi sur des piles jetables, le **mécanisme** sur un projet
  hébergé — personne n'a encore effacé un compte hébergé par cette voie. Le
  repli par anonymisation n'a été livré nulle part. Voir `VALEUR.md`, V9.
- Les coûts sont des estimations pour une personne connaissant le parc, hors
  imprévu de chaîne d'outils.

**Ajoutée le 06/09/2026, et c'est la plus lourde de cette page.** Tout ce que
ce document dit de `pwa-doctor` ou de `pwa-bundle-budget` « en CI » décrivait
un décor. Les quatre bins du socle ne lançaient `run()` que si
`import.meta.url === pathToFileURL(process.argv[1]).href` ; sous le lien
symbolique que npm pose dans `.bin`, la comparaison est fausse et le module
sort **0 sans rien faire**. La campagne du 06/09 a donc posé `run-doctor: true`
sur dix-sept dépôts, et le relevé a conclu « le docteur diagnostique 19 apps »
— **le drapeau était bien posé et le contrôle ne s'exécutait nulle part**. Le
`0/0/0` du squelette mesurait l'absence d'exécution, pas l'absence de défaut.
Corrigé en 4.5.0 ; une app ne le verra qu'après avoir monté son lockfile.
