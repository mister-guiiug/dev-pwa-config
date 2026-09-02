# Gisements — ce que les apps écrivent et que le socle n'a pas

`CAMPAGNE.md` regarde dans un sens : ce que le paquet exporte et que les apps
recopient encore. Ce document regarde dans l'autre : **ce que plusieurs apps
écrivent chacune de leur côté, et que le paquet n'exporte pas**. Le premier
mesure une dette ; le second cherche des chantiers.

Analyse du 02/09/2026, sur les dix-sept apps clonées à côté du socle
(`bac-sable` compris, `mister-family-map` exclu : c'est son miroir).

## La méthode, et ce qu'elle vaut

Quatre sources, aucune ne suffit seule.

**Un instrument** — `node scripts/promotion-candidates.mjs`. Le symétrique
d'`adoption-candidates` : les noms déclarés par au moins deux apps que le
paquet n'exporte pas (410 noms de surface), regroupés par déclaration nommée
(106 groupes) et par nom de fichier (ce qui rattrape les `export default`).
Chaque exemplaire porte son nombre d'importateurs — un zéro est un cadavre,
pas un doublon — et chaque groupe sa similarité (Jaccard sur les lignes
normalisées) : 1,00 est une copie littérale, 0,05 un homonyme. **Il ne décide
rien** ; il dit par où commencer à lire.

**La lecture.** Une trentaine de fichiers ouverts, parce que l'instrument
compare des noms et que les noms mentent : `colors.ts` existe dans quatre apps
et désigne quatre choses ; `notifications.ts` dans trois, et trois métiers
différents.

**Les apps elles-mêmes.** Une source que personne n'exploitait : les
commentaires où une app écrit noir sur blanc ce que le socle ne lui donne pas
— « candidate à une évolution du socle », « le socle n'en rend qu'une », « le
dictionnaire du socle ne couvre pas l'espagnol ». Une trentaine de mentions
dans douze apps. **C'est la liste de souhaits, écrite par les demandeurs, et
elle dormait dans le code.**

Et une mesure sur les sites publiés, parce qu'un gisement peut aussi être un
défaut que trois apps ont corrigé et que quatre autres subissent.

## Le classement

Le rang est un rapport : ce que le chantier retire ou répare, sur ce qu'il
coûte. Le coût compte **tout** ce qu'un module doit livrer pour être adopté
— code, `.d.ts`, tests, `components.css`, libellés, README, showroom — parce
que la leçon `sparkline` (un module sans doc n'a aucun adoptant) ne se
rediscute pas.

| #   | chantier                                                     | apps        | ce qu'on retire ou répare                                  | coût   |
| --- | ------------------------------------------------------------ | ----------- | ---------------------------------------------------------- | ------ |
| 1   | Repli SPA `404.html` sur GitHub Pages                        | 4 en panne  | un défaut visible, trois corrections à la main             | minime |
| 2   | Libellés du socle en `de` `es` `it` `nl` `pt`                | 7           | huit fichiers-pont (~400 l.) qui n'existent que pour ça    | petit  |
| 3   | `react/card` + `[data-dwc="card"]`                           | 10          | quatre composants, six feuilles `.card`, ~50 sites d'appel | petit  |
| 4   | `id` — `createId`, `createUuid`                              | 4           | quatre fichiers, ~250 sites d'appel, trois copies internes | minime |
| 5   | Workflows réutilisables : `cleanup-runs`, `supabase-migrate` | 12 · 4 · 2  | ~1 100 lignes de YAML copiées                              | petit  |
| 6   | `react/app-header` + `react/page-container`                  | 9           | la mise en page commune de neuf en-têtes                   | moyen  |
| 7   | La couche auth : provider, formulaire, défi MFA              | 5           | ~1 200 l. ; débloque la dette `AuthGate` × 4               | élevé  |
| 8   | `format` : les règles que cinq apps réécrivent               | 5           | cinq adaptateurs de 50 à 80 l.                             | petit  |
| 9   | `bin pwa-bundle-budget`                                      | 2           | deux scripts, un garde-fou pour les seize                  | petit  |
| 10  | Les demandes écrites, petites                                | 1–2 chacune | ce que les apps ont demandé par écrit                      | minime |

### 1. Le repli SPA `404.html` — quatre apps servent la page 404 de GitHub

GitHub Pages n'a pas de repli SPA : rafraîchir `/miss-contraction/a-propos`
sert sa page « File not found », pas l'app. Le contournement connu est un
`404.html` identique à `index.html` — GitHub le sert, l'app démarre, le
routeur lit l'URL.

Mesuré sur les sites publiés, le 02/09 :

| app                 | routage | rafraîchir un lien profond | correction en place                  |
| ------------------- | ------- | -------------------------- | ------------------------------------ |
| `miss-contraction`  | chemin  | **page 404 de GitHub**     | aucune                               |
| `mister-footcoach`  | chemin  | **page 404 de GitHub**     | aucune                               |
| `miss-badminton`    | chemin  | **page 404 de GitHub**     | aucune                               |
| `mister-family-map` | chemin  | **page 404 de GitHub**     | aucune (à corriger dans `bac-sable`) |
| `miss-carbook`      | chemin  | coquille de l'app          | `scripts/copy-404.mjs`, dans `build` |
| `mister-molkky`     | chemin  | coquille de l'app          | plugin Vite en ligne, `closeBundle`  |
| `miss-dice`         | aucun   | coquille de l'app          | le même plugin, à titre préventif    |

Les autres routent par `#` (`cim10`, `uwh`, `doc`, `genius`, `lookhouse`,
`supaboss`, `qowa`, `puzzle`) ou n'ont pas de routes (`ticket-pwa`, `quota`) :
GitHub ne voit jamais le chemin, elles ne sont pas touchées. **Quatre apps sur
six à routage par chemin sont en panne, et les deux autres ont écrit la même
correction deux fois** — le plugin de `dice` et celui de `molkky` sont
identiques à la ligne près.

Le service worker masque le défaut après la première visite (Workbox sert
`index.html` à toute navigation dans son périmètre). Il reste entier pour ce
qui compte : un lien partagé ouvert à froid, un navigateur sans service
worker, tout ce qui indexe.

**La forme.** Un `spaFallbackPlugin()` dans `vite-pwa-base`, à côté de
`pwaSeoPlugin` : à `closeBundle`, copier `dist/index.html` en `dist/404.html`.
Actif par défaut dans le preset — l'app à routage par `#` n'en souffre pas, et
celle qui bascule un jour vers les chemins n'a rien à découvrir. Une vingtaine
de lignes, un test, et quatre apps réparées à leur prochaine montée de version.

### 2. Les libellés du socle en cinq langues de plus

`react/labels` porte 54 clés, en `fr` et `en`, et **retombe en silence sur le
français** pour toute autre locale. Or la famille parle plus que deux langues :

| app                | langues                            |
| ------------------ | ---------------------------------- |
| `miss-contraction` | `de` `en` `es` `fr` `it` `nl` `pt` |
| `miss-dice`        | `de` `en` `es` `fr` `it` `pt`      |
| `mister-qowa`      | `de` `en` `es` `fr` `it`           |
| `miss-badminton`   | `en` `es` `fr`                     |

Ce que ça coûte aux apps se voit à l'instrument : `AppUpdatesProvider` de
`miss-badminton` (65 l.) et de `miss-dice` (68 l.) sont **le même fichier à
82 %**, et leur en-tête dit pourquoi il existe : « `react/labels` du socle ne
livre que `fr` et `en` ». `AppLabelsProvider` (`contraction`), `SocleLabels`
(`uwh`), `SocleProviders` (`ticket-pwa`), `SocleLabelsBridge` (`cim10`),
`useNetworkGuard` (`puzzle`, `qowa`) : **huit fichiers-pont, sept apps,
environ quatre cents lignes**, dont la seule fonction est de surcharger ce que
le socle ne sait pas dire. `miss-badminton` va jusqu'à surcharger aussi le
français et l'anglais, « pour que le repli devienne inatteignable ».

Et les traductions existent déjà : `miss-contraction` a les 54 libellés — ou
leurs équivalents — en sept langues, `miss-dice` en six. **Le chantier n'est
pas de traduire, c'est de rapatrier.**

**La forme.** Cinq dictionnaires de plus dans `react/labels`, alimentés depuis
les apps qui les portent. Un pont par app subsistera — il faut bien passer la
locale — mais il tombe à trois lignes, et les surcharges disparaissent.

S'y ajoute, du même mouvement, **`useActionGuard({ online: true })` sans
message possible** : le motif « hors ligne » vient des libellés du socle, et
seul `checks[].message` accepte un texte. `mister-puzzle` et `mister-qowa` ont
chacune un `useNetworkGuard` de 32 et 53 lignes qui enveloppe le garde pour
lui redonner sa phrase. `puzzle` écrit son i18n à la main, sans
`LabelsProvider` : les cinq langues ne le sauveront pas, il lui faut une prop
`offlineMessage`. Trois lignes.

### 3. `react/card` — le composant que dix apps ont

Le socle a `Button`, `Field`, `Badge`, `Sheet`, `Skeleton`, `Stat`… et pas de
`Card`. Résultat :

| app                | forme                                                            | importateurs |
| ------------------ | ---------------------------------------------------------------- | ------------ |
| `miss-genius`      | `Card.tsx`, 15 l.                                                | 8            |
| `miss-uwh`         | `Card.tsx`, 15 l. — **la même**, au préfixe de variable CSS près | 15           |
| `mister-footcoach` | `Card.tsx`, 41 l., avec `CardHeader`                             | 23           |
| `mister-qowa`      | dans `ui.tsx`                                                    | 4            |

et une classe `.card` écrite dans six feuilles de style de plus (`carbook`,
`contraction`, `lookhouse`, `supaboss`, `cim10`, `quota`). **Dix apps sur
dix-sept** ont une carte ; aucune ne vient du socle.

`tokens.css` a déjà tout ce qu'il faut : `--dwc-surface`, `--dwc-border`,
`--dwc-surface-2`, `--dwc-radius`. Les deux copies de `genius` et `uwh` ne
diffèrent que par `--mg-` contre `--uwh-` — c'est exactement la variable que
le socle unifie.

**La forme.** `react/card` : `Card` (`as`, `padding`, `className`) et
`CardHeader` (`title`, `subtitle`, `action`) — celui de `footcoach`, qui a le
contrat le plus complet et le plus d'importateurs. Habillage dans
`components.css` sous `[data-dwc="card"]`.

### 4. `id` — deux cent cinquante sites d'appel, et trois copies dans le socle

| app                | exports                              | importateurs |
| ------------------ | ------------------------------------ | ------------ |
| `miss-uwh`         | `createId(prefix)`, `createUuid()`   | 99           |
| `mister-footcoach` | `genId(prefix)`, `nowDate`, `nowIso` | 75           |
| `bac-sable`        | `newId()`                            | 46           |
| `miss-genius`      | `createId(prefix)` — copie de `uwh`  | 30           |

Le besoin est le plus banal qui soit — un identifiant court préfixé, ou un
UUID v4 avec repli quand `crypto.randomUUID` manque — et **le socle le
réécrit lui-même trois fois** : `security.js`, `sync-queue.js`,
`react/use-offline-queue.js` portent chacun leur repli `randomUUID`.

**La forme.** `id` : `createId(prefix?)` et `createUuid()`, promus de
`miss-uwh` (le seul à avoir le repli v4 complet). Les trois copies internes
l'importent. `genId` de `footcoach` (compteur + horodatage) est une autre
garantie — unicité en mémoire, pas aléatoire — et reste chez lui.

### 5. Les workflows copiés

`.github/workflows` est le dossier le plus recopié de la famille, et le
mieux outillé pour ne pas l'être : `pwa-ci`, `pwa-deploy`, `pwa-lighthouse`
sont réutilisables et adoptés partout. Restent quatre trous.

**`cleanup-runs.yml` — 73 lignes, douze copies identiques.** Le socle a le
même fichier, mais en `workflow_dispatch` seulement : pas de `workflow_call`,
donc chaque app le recopie entier. Le rendre appelable ramène chaque copie à
dix lignes.

**`supabase-migrate` — quatre copies, 35 à 143 lignes.** `lookhouse`, `uwh`,
`doc` ont chacun un workflow autour de la même paire `supabase link` +
`supabase db push`, déclenché sur `supabase/migrations/**`, avec la même
concurrence « on ne coupe pas une migration en vol ». `carbook` a mis le sien
en ligne dans `deploy.yml`, avec `needs: migrate` — c'est ce qui bloque son
déploiement depuis le 29/08 (projet Supabase en pause). La composite action
`supabase-migrate` existe déjà ; il manque le workflow réutilisable autour.

**`deploy-worker` — deux copies** (`genius` 54 l., `supaboss` 39 l.), le même
`wrangler deploy` d'un Worker Cloudflare.

**`pwa-supabase-keepalive` — zéro appelant.** Le socle publie depuis longtemps
un workflow réutilisable qui pingue un projet Supabase tous les trois jours
pour qu'il ne s'endorme pas. **Aucune des huit apps Supabase ne l'appelle.**
`miss-carbook` est en pause depuis le 29/08, et ne se déploie plus. Ce n'est
pas un gisement de code — c'est une adoption à faire, et elle vaut d'être
nommée ici parce que le workflow réutilisable de migration devrait
l'embarquer d'office.

### 6. `react/app-header` — neuf en-têtes, une mise en page

Le socle a `BottomNav` et `AppFooter`. Il n'a pas le troisième côté du cadre.
Neuf apps ont un en-tête : `AppHeader` (`genius` 36 l., `supaboss` 104,
`uwh` 137, `cim10` 148), `Header` (`doc` 148, `ticket-pwa` 377), `TopBar`
(`footcoach` 63, `carbook` 375), `Navbar` (`puzzle` 354).

La similarité est basse (0,16) parce que le CONTENU est métier : le chip de
saison d'`uwh`, le badge démo de `supaboss`, le guide de démarrage de `cim10`.
Mais la MISE EN PAGE, elle, est la même partout : `<header>` collant en haut,
`padding-top` sur la zone sûre iOS, fond translucide `backdrop-blur`, filet en
bas, un titre `h1`, et une rangée d'actions. Ce qu'on y met revient dans
plusieurs apps : bascule de thème (`genius`, `uwh`), cloche avec compteur
(`uwh`, `doc`, `footcoach`), retour arrière automatique hors racine
(`footcoach`), lien réglages (`uwh`).

**La forme.** Le `TopBar` de `mister-footcoach` — `{ title, showBack,
actions }`, 63 lignes — est le contrat le plus juste : il ne décide rien du
contenu. `react/app-header` avec `leading`, `title`, `actions`, `sticky`, et
les libellés « Retour » du dictionnaire. Et `react/page-container` avec lui :
`badminton` (47 l.) et `molkky` (26 l.) ont chacun le conteneur de vue qui
applique les zones sûres et la largeur progressive téléphone → tablette.

Ce qu'on ne fait PAS : un `AppShell`. Les trois `Shell` (38, 97 et 538
lignes) n'ont rien en commun que le nom.

### 7. La couche auth — ce qui manque entre le port et les écrans

Le socle a le **port** (`auth/index`, `auth/supabase`, `auth/mfa`,
`auth/errors-fr`), un instantané React (`react/use-auth`) et une garde
(`react/auth-gate`). `CAMPAGNE.md` constate que **aucune des six apps n'a
adopté `useAuth`**, et que migrer `AuthGate` entraînerait « tout le port
`/auth` ». Vu depuis les apps, on voit pourquoi : il manque trois pièces.

| pièce                                                             | exemplaires                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| un fournisseur de contexte `signIn`/`signOut`/`session`/`loading` | `uwh` 161 l., `footcoach` 62, `doc` 218, `lookhouse` 119 |
| un formulaire e-mail + mot de passe                               | `uwh` 64 l., `footcoach` 58, `doc` 166, `lookhouse` 170  |
| un défi MFA (TOTP + code de secours)                              | `uwh` 60 l., `doc` 142                                   |

Les quatre formulaires sont le même écran : deux champs, un bouton, une
erreur mappée par l'i18n, sur `Card` + `TextField` + `Button` — trois d'entre
eux importent déjà ces deux derniers du socle. `doc` y ajoute l'inscription et
la passkey ; `lookhouse` y ajoute le garde réseau. `LoginScreen` de `supaboss`
n'en fait pas partie : c'est une saisie de jeton d'API, un homonyme.

**La forme.** `react/auth-provider` — promu de `footcoach`, le plus simple
(62 l.), rebâti sur le port ; `react/login-form` avec des emplacements
(`extra`, `secondary`) pour l'inscription et la passkey ; `react/mfa-challenge`
promu de `doc`, le plus complet. Le coût est élevé — trois composants, leurs
libellés, leurs tests, et la migration des cinq apps derrière — mais c'est le
seul chantier qui **rembourse une dette déjà mesurée** : les quatre `AuthGate`
et les six `useAuth` que le relevé compte depuis le 29/08.

### 8. `format` — les règles que cinq apps réécrivent

Le module `format` est adopté : `genius`, `uwh`, `lookhouse`, `supaboss`,
`quota` l'importent tous. Chacun garde pourtant un `format.ts` de 50 à 80
lignes, et chacun explique en en-tête ce qu'il ajoute :

- **le signe moins typographique (U+2212) et le « + » explicite** — `uwh`
  (`formatSignedEuro`) et `genius` (`formatDelta`), séparément ;
- **un nombre de décimales configurable** — `uwh` (`formatEuro` honore le
  réglage du club), `supaboss` (`formatPercent`, une décimale sous 10 %) ;
- **un libellé pour l'absence** — `lookhouse` (« — »), `supaboss` (« jamais »
  au lieu de « il y a 0 seconde ») ;
- une date courte numérique (`supaboss`).

**La forme.** Quatre options, pas quatre fonctions : `formatSigned`,
`formatCurrency({ decimals })`, `formatPercentage({ decimals: 'auto' })`,
`formatRelativeTime({ never })`. Les adaptateurs d'apps se vident.

### 9. Un budget de bundle pour les seize

`miss-uwh` (`check-bundle-budget.mjs`, 60 l., gzip total 255 kB) et
`mister-qowa` (`check-bundle.mjs`, 25 l., chunk principal 300 kB) refusent un
build qui grossit sans qu'on l'ait décidé. Deux apps sur seize ; le commentaire
d'`uwh` raconte pourtant trois montées de version où la mesure a **changé une
décision**.

**La forme.** Un `bin pwa-bundle-budget`, qui lit `"bundleBudget"` dans le
`package.json` de l'app (total gzip, ou chunk principal) et se branche en fin
de `build`. Le socle a déjà `pwa-icons` comme bin ; la mécanique est là.

### 10. Les demandes écrites, petites

Chacune tient dans une prop ou dix lignes. Elles sont dans le code des apps,
signées.

- **`image` : accepter le GIF** — `miss-carbook` garde sa propre liste MIME
  « candidat à une évolution du socle » (`IMAGE_ACCEPTED_TYPES` n'a pas le
  GIF, que l'app promet à l'écran).
- **`realtime/supabase` : refermer les canaux orphelins** — `miss-carbook`
  (`useRealtimeTable`) tient un `Set` de canaux « dont le socle n'a jamais reçu
  la poignée de fermeture » : une souscription qui échoue avant `SUBSCRIBED`
  n'en produit pas, et personne ne la referme. C'est plus un défaut qu'un
  manque.
- **`Badge` : un axe de taille** — `mister-doc` n'a pas migré ses pastilles
  parce que `size="xs"` « n'a pas d'équivalent ».
- **`react/use-fullscreen`** — `badminton` (62 l.) et `molkky` (44 l.) ont le
  même bouton plein écran, sans hook derrière.
- **`cn`** — `genius` et `uwh` ont le même joint de classes de cinq lignes
  (similarité 1,00). Aucune app n'a `clsx`.
- **`xlsx` : lire** — `miss-uwh` charge SheetJS depuis un CDN pour l'import.
  L'app elle-même reconnaît que c'est « un autre métier » que d'écrire un
  classeur qu'on maîtrise. **Non retenu**, et écrit ici pour que la question
  ne revienne pas.

### Et la moitié périmée de la liste de souhaits

Trois demandes trouvées dans les apps ont **déjà été exaucées** — et les apps
ne le savent pas :

| app             | ce que le commentaire réclame                              | ce que le socle a, depuis                  |
| --------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `miss-genius`   | un message « prêt hors ligne » (garde le sien, 30 l.)      | `showOfflineReady`, 3.27                   |
| `mister-puzzle` | une seconde sortie, une clé de report (les recode)         | `secondaryActions`, `snoozeKey`, 3.26–3.27 |
| `mister-doc`    | journaliser l'échec d'enregistrement (enrobe `registerSW`) | `onRegisterError`, 3.26                    |

C'est la règle de `CONTRIBUTING.md` — « promouvoir sans migrer, c'est ne pas
avoir fini » — vue de l'autre bout : le socle a livré, la demande est restée
écrite dans l'app, et le code de contournement avec elle. Trois PR
d'adoption, pas de travail socle.

## Ce qu'on ne fait pas, et pourquoi

- **`Modal`** (`badminton`, `molkky`, 5 importateurs) — c'est `Sheet` : titre,
  fermeture, piège de focus, Échap, voile. Ce qui diffère est l'habillage
  (centré sur grand écran), et c'est l'affaire de `components.css`. Adoption.
- **Les écrans de réglages** — onze apps en ont un, de 142 à 728 lignes, et
  tous ont les mêmes rubriques (export, import, réinitialisation, mise à jour
  forcée, version, autres apps). Mais la COMPOSITION est métier, et les
  briques existent déjà (`ThemeToggle`, `AppVersion`, `FamilyApps`,
  `ConfirmDialog`, `downloadText`). Seuls `badminton`, `molkky` et `uwh` ont
  un `Section`/`Toggle` local : trop peu, trop tôt. À surveiller.
- **L'onboarding** — six apps, trois natures : tutoriel de premier lancement
  (`badminton`, `molkky`), assistant de configuration (`uwh`, `supaboss`,
  `carbook`), bulle d'aide (`badminton`). Rien de commun au-delà d'un drapeau
  « vu », que `use-local-storage` couvre.
- **`colors`** — quatre homonymes. Le seul concept partagé, une palette
  catégorielle stable (`uwh`, `doc`, `genius`), tient en un tableau et un
  modulo. À surveiller si un quatrième apparaît.
- **Le centre de notifications** — `uwh`, `doc`, `footcoach`, `lookhouse`
  ont chacun une liste « lu / tout marquer lu / non lus », sur une table
  `notifications` qui a **trois formes** (`user_id` ou `doctor_id`, `read` ou
  `read_at`). Second temps : un port d'abord, comme pour `auth`, une UI
  ensuite.
- **Les gabarits SQL** — `profiles` + `handle_new_user` + `touch_updated_at`
  - `is_admin` reviennent dans `bac-sable`, `carbook`, `doc`. Le paquet ne
    franchit ni Deno ni Postgres ; il pourrait livrer des fichiers à copier. La
    valeur n'existe qu'à la naissance d'une app : à écrire quand la prochaine
    naît, pas avant.
- **`ExportBundleSchema` / `appDataSchema` / les sept `storage.ts`** — la
  vraie réponse est `versioned-store`, que `miss-genius` a déjà prise pour son
  import. Adoption, et le retrait de `backup` (zéro adoptant) est une décision
  à écrire, pas un module à promouvoir.
- **`env.ts`** — trois homonymes (validation zod, échec rapide, drapeaux
  Firebase). `bac-sable` recopie `resolveBackendKind` : adoption.
- **Le reste du balayage** est de l'adoption, pas de la promotion, et
  `adoption-candidates` le voit déjà : `getSupabase` recopié dans quatre apps
  malgré `supabase-client`, `InstallPrompt` dans deux malgré
  `pwa-install-prompt`, `RiveScene` dans deux malgré `react/rive`,
  `translate` dans trois malgré `createI18n`, et `generate-pwa-icons` dans
  **onze** malgré le bin `pwa-icons`.

## Les cadavres croisés en route

`TOURNAMENT_STATUS_LABELS` — déclaré dans `miss-uwh` (`domain.ts:324`) et
`mister-footcoach` (`types/index.ts:76`), utilisé dans aucun. Le balayage le
sortait comme un doublon ; c'est le même fossile dans deux dépôts jumeaux.

## L'autre moitié, pour mémoire

Ce document cherche ce qui manque au socle. Le tri du 02/09 dans
`CAMPAGNE.md` a montré l'inverse chez `mister-molkky` : cinq modules du socle
le nomment comme source, et il n'en avait réadopté aucun. **`miss-dice` est
dans le même cas, en plus grand** : `useKeyboardRoll`, `useSpeak`,
`useShakeToRoll`, `useInstallPrompt`, `useReducedMotion`, `useTheme`,
`useSound`, `useI18n` — huit hooks locaux dont le socle exporte l'équivalent,
deux promus depuis cette app même. Une app qui donne un module ne le réadopte
pas toute seule ; c'est la règle, pas l'exception.

## La leçon

L'instrument a trouvé les gisements par volume (`Card`, `id`, les en-têtes) ;
la lecture a trouvé ceux par nature (la couche auth, `format`) ; **les
commentaires des apps ont trouvé les plus précis** — une prop, une option, un
type MIME — parce qu'ils ont été écrits au moment exact où quelqu'un a buté
sur le manque. Et la mesure sur les sites publiés a trouvé le seul qui soit
un défaut en production.

Aucune des quatre sources ne voyait les trois autres. Le prochain relevé les
prendra toutes.
