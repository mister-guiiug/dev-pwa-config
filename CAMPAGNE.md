# La campagne d'adoption — mode d'emploi

Le relevé est sans appel : **71 fichiers recopiés dans les dix-sept apps, et
aucun de ces doublons ne manque au socle**. Cette campagne les remplace par les
imports du paquet, app par app, rapport par rapport. Elle s'exécute depuis une
machine où les dix-sept dépôts sont clonés **côte à côte** — ce qu'aucune CI ni
session distante n'a.

Le chiffre à jour vit dans le README, engendré par `npm run sync` ; celui-ci
n'est qu'un ordre de grandeur. Ce qui a été fait au dernier passage, et ce
qu'il reste, est en bas de cette page.

## Préparer

```bash
# Un dossier parent, les dix-sept dépôts dedans, ce dépôt aussi.
mister-guiiug/
├── dev-wpa-config/          ← ce dépôt
├── mister-family-map/
├── miss-supaboss/
└── … (les quinze autres)
```

Depuis `dev-wpa-config/`, mettre chaque app sur la dernière version du paquet
(`npm install` par app). **Seule la ligne du paquet bouge** — voir les
gardes-fous plus bas pour `--peers` et l'exclusion des miroirs :

```bash
node scripts/migrate-consumers.mjs            # essai à blanc, rien n'est écrit
node scripts/migrate-consumers.mjs --install  # applique, puis installe
```

## Le prérequis, avant tout le reste

**Les composants du paquet ne sont pas habillés.** Ils ne posent que des
attributs `data-dwc` ; c'est `components.css` qui les habille, et cet import
est **opt-in**. Migrer `Button`, `Sheet` ou `BottomNav` sans lui échange un
composant stylé contre un composant **nu** : ça compile, les tests passent, le
lint est vert, et l'écran est cassé.

Le verrou a sauté le 30/08/2026 : **quinze apps sur dix-sept** ont pris le
prérequis (voir le passage plus bas). Les deux qui ne l'ont pas — `miss-dice` et
`miss-contraction` — portent un design maison assumé.

**`mister-quota` était la troisième, et son motif ne tenait pas.** On la
dispensait parce qu'elle est en Electron « sans Tailwind ». En allant lire la
feuille plutôt qu'en croyant le motif, sa migration a montré que
`components.css` **ne contient aucune directive Tailwind** (`@apply`,
`@tailwind`, `theme()`), que tous ses sélecteurs sont portés par `[data-dwc=…]`
— donc sans collision possible — et que `@layer components` étant du CSS natif,
le style non layered de l'app l'emporte de plein droit. Un `@import` suffisait.

Ce que cette dispense a coûté : trois défauts d'accessibilité restés en place
dans les composants maison — un dialogue `role="dialog"` **sans nom
accessible** dont l'`autoFocus` portait sur le bouton **destructif** (une
frappe sur Entrée supprimait un compte), et une fermeture de notification par
`onClick` sur un `<div>`, inatteignable au clavier. **Un motif d'exemption qui
n'a jamais été vérifié est une dette qui ne se voit pas.**

Une app qui veut adopter la couche interface commence donc par :

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-wpa-config/tailwind-preset.css';
@import '@mister-guiiug/dev-wpa-config/components.css'; /* ← le prérequis */
```

C'est une décision d'apparence, pas une ligne de plomberie : elle se prend app
par app, elle se regarde, et elle mérite sa propre revue. `adopt.mjs` REFUSE
tant qu'elle n'est pas prise (`--allow-unstyled` pour qui a mesuré ce qu'il
fait). Les crochets — `react/i18n`, `react/use-online`, `react/use-theme` — et
tout ce qui n'est pas dans `react/` ne sont pas concernés : ils n'ont pas
d'habillage à perdre.

## Mesurer avant

Deux relevés, pour avoir un « avant » comparable à l'« après » :

```bash
node scripts/measure-adoption.mjs --write     # doublons (fusionne, ne perd rien)
node scripts/console-audit.mjs                # console.error/warn orphelins
```

## Migrer, app par app

**Toujours l'essai à blanc d'abord**, une app à la fois :

```bash
node scripts/adopt.mjs --app miss-genius            # rien n'est écrit
node scripts/adopt.mjs --app miss-genius --write    # après lecture du rapport
cd ../miss-genius && npm run verify                 # ou l'équivalent de l'app
```

Le rapport classe chaque doublon :

- **À RÉÉCRIRE / RÉÉCRITS** — imports basculés vers le paquet. Le fichier
  recopié n'est PAS supprimé : orphelin, il reste visible dans le diff et
  réversible. Le supprimer est la dernière étape, à la main, une fois l'app
  verte.
- **BLOQUÉS — décision humaine** — l'app a collé ses propres symboles à côté
  du composant promu (`ListSkeleton`, `ToastViewport`, `formatPercent`…).
  Trois issues, au choix : garder le fichier local pour ces symboles-là et
  importer le reste du paquet ; proposer le symbole à la promotion s'il est
  générique ; ou le renommer dans un fichier à lui. Jamais de réécriture
  automatique ici — elle casserait la compilation.
- **REFUSÉS — l'app n'importe pas `components.css`** — le prérequis ci-dessus
  n'est pas pris. Rien n'est écrit tant qu'il ne l'est pas.
- **À PROMOUVOIR** — aucun sous-chemin ne publie cet export : c'est un
  chantier de socle, pas de migration.

**Puis relire chaque site d'appel réécrit.** Le codemod compare des NOMS de
symboles, pas des API — c'est sa limite, et elle ne se voit pas. Un composant
local sans prop obligatoire qui puise dans un store se réécrit sans une erreur
de type et rend autre chose :

- `<BottomNav />` de `miss-lookhouse` portait cinq destinations et le compteur
  de non-lues du store ; celui du paquet, sans prop `items`, rend une barre
  **vide**. La migration fidèle existe — `items`, `linkComponent={NavLink}`,
  `hrefProp="to"`, `badge` / `badgeLabel` — mais elle s'écrit à la main.
- `<ThemeToggle />` de la même app est câblé au store Zustand de l'app ; celui
  du paquet lit `useTheme` et son propre stockage. Les deux thèmes divergent
  sans que rien ne le dise.

La règle : un composant dont le site d'appel ne passe AUCUNE prop est suspect
par construction. Le relire fait partie de la migration.

Cas connus d'avance (relevés sur les dépôts accessibles) :

- `links.ts` : `SPONSOR_URL` migre tel quel ; `REPO_URL` devient
  `repoUrl('<id-app>')` — une ligne à la main. Neuf apps sur neuf sont dans ce
  cas : aucune ne migre `links` toute seule.
- `useActionGuard` (miss-supaboss) : le socle publie
  `react/use-action-guard`, mais la **signature diffère** (rôles injectés en
  `checks`, plus lus dans les stores). Migration à la main, volontairement
  absente de la carte du codemod.
- les crochets `useI18n` et `useTheme` ne sont pas des remplacements d'import :
  le premier demande un fournisseur et des dictionnaires, le second son propre
  stockage. Les compter dans la tranche mécanique fausse le chiffre.

## Le journal partout

`console-audit.mjs` liste chaque `console.error`/`warn` orphelin avec un nom de
journal **proposé** (déduit du chemin — une proposition, pas une décision) :

```bash
node scripts/console-audit.mjs --app mister-doc
```

Remplacement type, à la main :

```ts
import { createLogger } from '@mister-guiiug/dev-wpa-config/logger';
const log = createLogger('favoris'); // le nom : votre décision
log.error('Échec du rejeu de la file', { cause });
```

Ce que ça change : un niveau exploitable, une origine, et l'identifiant de
corrélation — la ligne finit dans le même fil d'Ariane que l'erreur remontée.

## Mesurer après, et publier le chiffre

```bash
node scripts/measure-adoption.mjs --write
node scripts/console-audit.mjs
npm run sync        # le README affiche la dette recalculée
```

La dette en tête du README doit avoir baissé. C'est le seul chiffre qui prouve
que le socle est un socle et pas une étagère — le faire baisser en public est
le but de la campagne.

## Les gardes-fous, pour mémoire

- l'écriture du relevé **fusionne** : un passage partiel ne détruit pas le
  relevé des apps absentes (`--replace` refuse de réduire la couverture sans
  `--force`) ;
- le codemod ne devine aucun chemin, n'interprète ni `import *` ni imports
  par défaut, et bloque dès qu'un symbole manque au sous-chemin ;
- il refuse un composant tant que l'app n'a pas pris le prérequis
  `components.css` ;
- une app à la fois, `verify` vert avant de passer à la suivante — et le vert
  ne prouve que la compilation : l'écran, lui, se regarde ;
- **`migrate-consumers.mjs` ne monte QUE le paquet.** Aligner aussi les
  `peerDependencies` se demande par `--peers` : sur `mister-quota`, seule app
  Electron du parc et restée en arrière, un simple « aligne le plancher »
  proposait cinq montées majeures — React, Vite, TypeScript, Vitest, ESLint.
  Les miroirs (`mister-family-map`) sont exclus de la découverte : une écriture
  y serait interdite, et un `npm run mirror` suivant l'écraserait en silence.

### Le piège de `npm install` après une montée de version

Rencontré **par trois agents indépendamment** le 31/08/2026, en alignant les
dix-sept planchers sur la 3.29.0. Il vaut d'être écrit parce qu'il fait valider
du code périmé **sans rien signaler**.

Après un `npm install --package-lock-only`, un `npm install` ordinaire répond
« up to date », écrit bien la nouvelle version dans
`node_modules/.package-lock.json` — et **laisse les fichiers de l'ancienne
version sur le disque**. La validation qui suit teste donc le code d'avant en
croyant tester celui d'après. L'un des trois s'en est aperçu tard.

Le remède est de forcer la réextraction :

```bash
rm -rf node_modules/@mister-guiiug/dev-wpa-config && npm install
# ou, plus simplement quand le verrou est déjà bon :
npm ci
```

Attention toutefois : sur un dépôt dont le `.npmrc` épingle `os=linux`
(`mister-footcoach`), un `npm ci` remplace les binaires natifs win32 par ceux de
Linux. Retirer le seul dossier du paquet et réinstaller avec `--os=win32`
préserve l'existant — et le verrou commité reste identique à l'octet près, car
`os=linux` n'affecte que l'installation, pas ce qui est écrit.

**Vérifier la version sur le DISQUE, pas dans le verrou**, avant de conclure
qu'une validation prouve quelque chose.

## Le passage du 29/08/2026 — ce qui est fait, ce qui reste

Relevé complet, dix-sept dépôts clonés côte à côte, tout fusionné et publié.
**132 doublons avant, 113 après.**

Les cinq premiers sont tombés en une journée de tranche mécanique ; les
quatorze suivants ont demandé de relire chaque site d'appel dans une app —
`miss-genius`, qui a dû d'abord lever le prérequis `components.css`, puis
`miss-uwh`, qui l'avait déjà. C'est le vrai enseignement du passage : la couche
outillage se migre par lots, la couche interface se migre app par app, et le
prérequis se paie une fois par app.

**Un `git fetch` d'abord.** Le relevé lit les COPIES DE TRAVAIL, pas les
dépôts distants : deux clones en retard de quinze et dix-huit commits
(`miss-dice`, `miss-ticket-pwa`) ont d'abord produit un relevé faux, des
vérifications sur du code obsolète et une PR en conflit. Rien dans l'outil ne
le signale. Vérifier avant de mesurer :

```bash
for d in ../*/; do git -C "$d" fetch -q origin 2>/dev/null &&
  echo "$d $(git -C "$d" rev-list --left-right --count origin/main...main 2>/dev/null)"; done
```

**`mister-family-map` ne reçoit pas de PR.** C'est le MIROIR PUBLIC de
`elowner-ax/bac-sable`, publié depuis le poste par `npm run mirror` : les
minutes Actions sont gratuites sur le public, la CI y tourne, mais le
développement se fait sur le dépôt privé. Migrer cette app veut dire ouvrir la
PR dans `bac-sable`, puis publier. Le relevé, lui, mesure le miroir : il voit
donc la migration **après** publication, pas après fusion. Une app peut donc
apparaître en retard sans l'être — c'est le seul cas de la famille, et
`docs/MIRRORING.md` du dépôt privé en donne le mode d'emploi.

Migré et vérifié (lint, tests, build verts, orphelins supprimés) :

| App                 | Ce qui est passé au socle                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `miss-genius`       | `components.css`, puis 8 doublons : `Button`, `Sheet`, `ConfirmDialog`, `Field`, `BottomNav`, `AppFooter`, `EmptyState`, `links` — **12 → 4** |
| `miss-uwh`          | 7 doublons : `Button`, `Sheet`, `Field`, `EmptyState`, `ConfirmDialog`, `AppFooter`, `links` — 124 imports, 8 fichiers supprimés — **13 → 6** |
| `mister-family-map` | `geo` — 14 fichiers, via `bac-sable` puis `npm run mirror`                                                                                    |
| `miss-supaboss`     | `useOnline` — 5 appelants                                                                                                                     |
| `miss-badminton`    | `useOnline` — 1 appelant                                                                                                                      |
| `mister-molkky`     | `useOnline` — 1 appelant                                                                                                                      |

Onze autres apps montent en 3.21.0 sans migration : leurs doublons sont tous
soit refusés faute de `components.css`, soit bloqués par un symbole local.

**Ce que `miss-genius` a appris à la campagne.** C'est la première app à avoir
pris le prérequis, et le seul passage complet sur la couche interface. Trois
enseignements, tous coûteux à redécouvrir :

- **Prendre `components.css` ne suffit pas : il faut câbler les jetons.** Chaque
  `var(--dwc-…)` a un repli neutre — sans câblage, les composants sont corrects
  mais GRIS. Et le câblage ne se recopie pas d'un thème à l'autre :
  `--dwc-primary` sert aussi de couleur de TEXTE, et le violet de l'app posé sur
  sa surface sombre ne donnait que 2,33:1.
- **Trois composants sur six n'étaient pas des remplacements d'import.**
  `BottomNav` encapsulait ses destinations (barre VIDE sans `items`), `AppFooter`
  une phrase d'accroche que le socle ignore, `EmptyState` une animation Rive. Les
  deux premiers cassaient l'écran sans une erreur de type.
- **Une enveloppe doit changer de nom.** `EmptyState.tsx` gardé comme enveloppe
  autour du composant promu restait un « doublon » aux yeux du relevé, qui repère
  par NOM DE FICHIER — et `adopt.mjs` proposait de réécrire ses appelants vers le
  paquet, ce qui aurait sauté l'enveloppe. Renommer dit ce que le fichier AJOUTE.

L'app garde trois traits en propre (bouton pilule, coins de la feuille, barre
collante) et adopte le reste. C'est la ligne de partage à viser ailleurs.

**Ce que `miss-uwh` a ajouté.** Deuxième passage complet sur la couche
interface, et le premier sur une app qui avait DÉJÀ le prérequis : la migration
a donc porté sur les seuls composants. Elle confirme la ligne de partage de
`miss-genius` et ajoute trois pièges que `miss-genius` n'avait pas rencontrés,
tous invisibles au typage :

- **Un contrat de comportement peut changer sans que l'API bouge.** La copie
  locale de `ConfirmDialog` appelait `onConfirm()` **puis** `onClose()` ; celle
  du socle laisse `onConfirm` seul décider — pour ne pas fermer une
  confirmation asynchrone avant la fin de sa requête, et c'est écrit dans son
  en-tête. Les quatorze appelants s'appuyaient tous sur la fermeture
  automatique : quatre laissaient la boîte ouverte, dix la rouvraient à la
  feuille suivante, leur `confirmDelete` n'étant plus jamais remis à `false`.
  **Lire l'en-tête du composant promu, pas seulement sa signature.**
- **Une animation d'identité peut casser une imbrication.** Reposer
  l'animation maison sur `[data-dwc='sheet-panel']` a suffi à faire disparaître
  la confirmation rendue DANS la feuille : `to { transform: translateY(0) }`
  avec `fill-mode: both` persiste après la fin, le panneau devient bloc
  conteneur des `position: fixed` et ouvre un contexte d'empilement. Les
  animations du socle n'ont qu'un `from` pour cette raison exacte — leur état
  final est celui de l'élément, sans transformation. Une identité qui reprend
  une animation du socle doit copier cette forme.
- **Le contrat de jetons a des trous qui ne se voient pas.** `--dwc-border-strong`
  manquait ; son repli est `--dwc-border`, donc rien ne casse — sauf que c'est
  le pourtour des champs, que WCAG 1.4.11 veut à 3:1, et que le filet de
  séparation de l'app tenait 1,3:1. Le défaut existait déjà dans la copie
  locale ; l'adoption l'a révélé plutôt que causé. **Câbler les quinze jetons,
  pas ceux qui se remarquent.**

À quoi s'ajoute un point de méthode : `LabelsProvider` branché sur la locale de
l'app. Les composants du paquet portent leurs propres textes et retombent sur le
français hors fournisseur — invisible pour une app monolingue, faux pour une app
bilingue. C'est un point de raccordement unique, à poser à la racine.

Ce qui restait à l'issue de ce passage — `components.css` sur quatorze apps,
`links`, `useTheme`/`useI18n`, le nommage d'`applyUpdate`/`backup`,
`miss-ticket-pwa` sans tests, `mister-quota` hors paquet — a été repris le
lendemain. Voir le passage suivant.

## Le passage du 30/08/2026 — le verrou saute, et le socle grandit

Relevé complet, mêmes dix-sept dépôts. **113 doublons avant, 71 après.** Le
paquet passe de 3.21.1 à **3.23.0** en trois releases dans la journée.

La différence avec la veille tient en une phrase : **on n'a pas migré vers le
socle, on a d'abord fait grandir le socle avec ce que les apps avaient déjà
écrit.** Une analyse du parc a montré que l'adoption était **de configuration,
pas d'exécution** — les configs partout, mais une quarantaine de modules métier
réécrits à la main dans les apps. Onze modules ou correctifs en sont sortis,
tous promus d'un code éprouvé en production :

| Module socle                            | Promu de                                      |
| --------------------------------------- | --------------------------------------------- |
| `auth`, `auth/mfa`, `auth/errors-fr`    | cinq intégrations Supabase Auth, MFA de doc   |
| `pdf`, `xlsx`                           | mister-doc (211 et 259 lignes, testées)       |
| `pairing`, `qr`, `react/use-qr-scanner` | qowa, molkky, miss-ticket-pwa                 |
| `versioned-store`, `idb`                | uwh/genius jumeaux, molkky, badminton, doc    |
| `supabase-client`, `sync-queue`         | uwh (la file de référence), lookhouse, puzzle |

**Le prérequis se prend en une passe, pas en dix.** Dix PRs d'apparence
lancées ensemble, une par app, chacune avec la même consigne : importer la
feuille, câbler les quinze jetons sur la palette existante, puis migrer
**uniquement** les composants dont l'équivalence est prouvée en lisant les deux
implémentations. Résultat : de trois apps à quatorze. Le trait commun des dix
rapports est ce qui a été **écarté** — `Badge` chez mister-doc (axe chromatique
métier contre axe sémantique du socle), `Input`/`Spinner`/`BottomNav` chez
footcoach (chaque refus appuyé sur un test existant qui les documentait),
`ThemeToggle` chez lookhouse (le thème vit dans le store). Le codemod compare
des noms ; seule la lecture compare des API.

**Ce que la campagne a trouvé en chemin.** Douze bugs, dont aucun n'était
cherché :

- `web-vitals` **faux dans quatre apps** — mais pas pour la raison qu'on a
  cru pendant deux jours. Cette page a écrit, et plusieurs PR ont repris,
  qu'`onFID` était « retiré de la v4 », que l'appel levait et que seul CLS
  était mesuré. **C'est faux** : `onFID` est déprécié en v4 et retiré en v5, et
  les verrous résolvent la 4.2.4, qui l'exporte. Vérifié sous Node ET au
  navigateur en migrant `mister-cim10` (#29) : les cinq métriques étaient bien
  relevées. Le vrai défaut ne se voyait pas dans les imports mais dans
  `getRating` — un `case 'CLS'` puis un `default: return 'good'`, donc **quatre
  métriques sur cinq notées « bonnes » quelle que soit leur valeur**, un LCP à
  dix secondes compris. Une mesure fausse coûte plus qu'une mesure absente,
  parce qu'on s'y fie. L'en-tête du module portait l'erreur, et lui servait de
  justification d'adoption ;
- `matchMedia` **inversé** dans deux apps (`prefers-color-scheme: light` avec
  repli sombre) : démarrage en sombre dès que la requête est inévaluable ;
- la **corruption silencieuse des codes de partie** de molkky, dont la
  normalisation corrigeait `I`→`1` et `O`→`0` vers des caractères absents de son
  propre alphabet — un code normalisé pouvait devenir injoignable ;
- son **QR de partage** encodait `direct/CODE` quand le routeur ne sert que
  `/live/:code` : le lien menait à l'accueil, le scan échouait ;
- l'alerte de puzzle **s'affichait derrière** le tiroir et les menus (le socle
  empile `confirm` à 60, l'app monte ses surfaces à 90) ;
- le `git clone --recursive` de miss-ticket était **cassé** : le sous-module
  pointait un commit orphelin après réécriture d'historique ;
- la bannière de mise à jour de supaboss **ne pouvait jamais s'afficher**
  (`registerSW` non injecté dans le hook) ;
- ~1 500 lignes de `format.ts`/`security.ts` **mortes** dans quatre apps ;
- et deux défauts **du socle lui-même**, découverts par deux migrations
  indépendantes qui les ont mesurés au navigateur : le clic sur le voile ne
  fermait ni `Sheet` ni `ConfirmDialog` (voile enfant recouvrant la racine
  écoutée — les tests du paquet dispatchaient sur la racine, jsdom ne fait pas
  de hit-testing), et `ConfirmDialog` imposait deux boutons, ce qui a bloqué
  trois apps sur leurs dialogues d'alerte.

**La boucle complète, en une journée** : une app découvre un défaut du socle en
migrant → le socle est corrigé et publié → l'app retire sa rustine et **vérifie
la fermeture au clic réel**. C'est ce qu'ont fait footcoach et molkky pour le
voile ; puzzle, cim10 et carbook pour le mode mono-action. Un correctif de socle
n'est fini que quand l'app qui l'a demandé l'a rejoué.

Ce qui reste, par ordre de valeur :

1. ~~**Les promotions restantes** : iCalendar, compression d'image avec retrait
   EXIF, wake lock.~~ **Faites le jour même** — `ical`, `image` et
   `react/use-wake-lock` sont dans la 3.24.0. Ce qui reste n'est plus de la
   promotion mais de l'**adoption** : trois apps pour `image` (bac-sable,
   carbook, puzzle), trois pour le wake lock (dice, molkky, contraction). Pour
   `ical`, voir la section du bas : les quatre sont passées.
2. **`links` — sept apps, sept fois la même ligne.** `SPONSOR_URL` migre tel
   quel, `REPO_URL` devient `repoUrl('<id-app>')`. Aucune ne migre seule ;
   toutes migrent en une passe.
3. **`useTheme` et `useI18n`.** Ce ne sont pas des remplacements d'import : le
   premier demande de migrer l'état de thème vers le stockage du socle
   (`legacyKeys` est là pour ça, et `miss-badminton` puis `mister-cim10` en
   donnent le modèle — les deux y ont tué leur `matchMedia` inversé au
   passage), le second un fournisseur et des dictionnaires.
4. ~~**`applyUpdate` (6 blocages) et `backup` (7) — un besoin, huit noms.**~~
   **Ce diagnostic était faux, et une enquête l'a démonté le 30/08/2026 en
   lisant les treize copies.** Il n'y a ni huit noms ni sept jeux de symboles :
   deux rôles et quatre noms. `registerServiceWorker()` porte **le même nom
   dans les six apps** ; seul le bouton « forcer » varie (`forceAppUpdate`,
   `forceSwUpdate`, `reloadApp`, ou rien du tout dans deux apps). Et
   `forceUpdate` n'existe **nulle part** dans le parc — c'était une ligne morte
   de la table du relevé.

   Le vrai obstacle n'est pas le nommage, c'est le **comportement** : cinq apps
   sur six portent une désinscription de service worker en développement que le
   socle n'a pas, cinq injectent leur bandeau **avant le montage de React** (donc
   hors du contexte i18n), et les libellés du paquet ne parlent que `fr` et `en`
   — adopter tel quel ferait retomber en français les **sept** locales de
   `miss-contraction`, les six de `miss-dice` et l'espagnol de `miss-badminton`.

   Côté `backup`, six des sept blocages sont des **faux positifs** : le relevé
   guettait un fichier nommé `storage.ts`, un nom si générique que trois des
   sept étaient déjà des façades sur le socle et deux ne contenaient aucune
   sauvegarde. **Un seul dépôt duplique vraiment `./backup`** (`mister-cim10`),
   et il ne peut pas l'adopter en l'état : ses quinze clés n'ont aucun préfixe
   commun, alors que tout le module est bâti sur l'invariant « préfixe =
   identité d'app ». Quant aux quatre vraies sauvegardes du parc, elles
   exportent **la donnée validée et migrable**, pas la carte brute de
   `localStorage` : `./backup` serait un recul pour elles, et c'est _cela_ — pas
   ses noms — qui explique ses **zéro adoptants**.

   L'ordre de bataille qui en sort : `mister-cim10` d'abord côté `applyUpdate`
   (seule app sans purge dev à sauver, sans locale à rattraper, un seul
   appelant — sa PR devient le brief des cinq autres), et côté sauvegarde une
   seule migration réelle, `miss-uwh` vers **`versioned-store`** et non vers
   `backup`.

5. **`UpdatePromptBanner` (8) et `Toast` (5)** restent les deux plus gros
   postes du relevé, maintenant que la couche interface est habillée partout.
6. **`mister-tv-webos` n'est même pas un dépôt git.** Aucune PR n'y est
   possible : à initialiser avant toute campagne.

## Ce que les gardes-fous ne voyaient pas, et qui a coûté cher

Trois défauts relevés le 29/08/2026, en réappliquant cette campagne aux dix-sept
apps depuis une machine Windows. Ils sont corrigés ; ils disent surtout à quoi
tenir un outil de campagne.

- `measure-adoption.mjs` découpait le nom de fichier sur `/` seul. Sous Windows,
  `join` sépare avec `\` : aucun nom ne correspondait à la table, le relevé
  annonçait **zéro doublon**, et `npm run adoption` aurait publié une dette
  éteinte que personne n'avait payée. Un relevé faux dans le sens flatteur est
  pire que pas de relevé.
- `adopt-plan.mjs` cherchait `type Coordinates` parmi les valeurs d'un module
  JavaScript — qu'aucun module JavaScript n'exporte. Quatorze réécritures
  légitimes de `mister-family-map` étaient déclarées bloquées pour cette seule
  raison.
- `console-audit.mjs` proposait `createLogger('src\features')` sous Windows,
  faute de découper sur les deux séparateurs.

Trois autres, relevés le 30/08/2026 dans le même outil, penchaient tous du côté
**pessimiste** — le sens qu'on ne soupçonne jamais, parce qu'un chiffre trop
gros ressemble à du travail qui reste, pas à une panne d'instrument.

- **Neuf besoins sur vingt-six étaient INACQUITTABLES par construction.**
  L'acquittement exigeait que l'app importe un symbole portant **le nom du
  besoin** — or `links`, `backup`, `format`, `Toast`, `share`, `geo`,
  `webVitals`, `security` et `useI18n` ne sont le nom d'aucun export du paquet.
  Sept apps pouvaient migrer `links` à la perfection et rester comptées en dette
  **pour toujours**. Chaque besoin déclare maintenant ses symboles libérateurs,
  et `test/adoption-equivalents.test.mjs` les confronte à la surface publique
  réelle : une clé ne peut plus redevenir immortelle en silence.
- **Une façade était comptée comme un doublon.** Un fichier qui porte le nom
  guetté mais qui importe déjà le paquet est une adoption en cours, pas une
  réécriture. Trois des sept `storage.ts` du parc étaient dans ce cas.
- **Le prérequis n'était pas mesuré du tout.** Le balayage s'arrêtait aux
  fichiers JavaScript, donc `components.css` — sans lequel un composant migré
  s'affiche **nu** — n'apparaissait dans aucun relevé. La campagne citait
  « quatorze sur dix-sept » sans qu'aucune donnée du dépôt ne l'étaye ; deux
  migrations l'ont relevé le même jour. Le CSS est désormais lu, et le chiffre
  se vérifie (les trois manquantes sont bien `miss-contraction`, `miss-dice` et
  `mister-quota`). **Un prérequis qu'on ne mesure pas est un prérequis qu'on
  croit acquis.**

Un dernier, le même jour, ne concerne pas l'outillage de campagne mais la suite
de tests du paquet lui-même — et c'est le plus instructif.

- **`jsdom` ne fait pas de hit-testing.** Les tests de `Sheet` et de
  `ConfirmDialog` vérifiaient « le clic sur le fond ferme » en dispatchant
  l'évènement **sur la racine**. Dans un vrai navigateur, le voile est un enfant
  qui recouvre exactement cette racine : le clic atterrit sur lui, la garde
  `target === currentTarget` le rejette, et rien ne se ferme jamais. Les tests
  étaient verts, la garantie était fausse, et il a fallu **deux migrations
  indépendantes qui ouvraient une vraie feuille dans un vrai navigateur** pour
  s'en apercevoir. Un test qui construit lui-même l'évènement qu'il attend ne
  prouve que la fonction qu'il appelle. Quand une garantie porte sur ce que fait
  l'utilisateur — un clic à un endroit, pas un `dispatchEvent` sur un nœud —
  elle se vérifie une fois pour de bon dans un navigateur, et la migration qui
  adopte le composant est le bon moment pour le faire.

Un cinquième, le même jour, explique une part du chiffre que toutes les
campagnes cherchaient à faire baisser.

- **Le paquet documentait 62 de ses 137 sous-chemins.** La table « Exports npm »
  du README — l'index que lit quiconque cherche « est-ce que ça existe déjà ? » —
  en ignorait **75**, dont **22 sans aucune mention ailleurs dans la page** :
  `security`, `markdown`, `similarity`, `haptics`, `audio`, `speech`,
  `rate-limit`, `geocode-ban`, `image`, les trois transports `push/*`,
  `SegmentedControl`, `ConnectionBanner`, `SyncStatusBadge`, `Field`, et sept
  hooks React promus d'apps de la famille. La leçon sparkline n'était pas une
  anecdote : c'était **un tiers du paquet**. Les relevés d'adoption comptaient
  donc des doublons pour du code que les apps ne pouvaient pas découvrir — et
  chaque promotion sans ligne de README naissait invisible. La table est
  complétée (137/137), et `test/package-surface.test.mjs` fait désormais échouer
  `npm test` sur tout sous-chemin publié qui n'y figure pas. Le contenu de la
  ligne reste au jugement de l'auteur ; seule sa **présence** est vérifiée —
  parce qu'un garde-fou qu'on peut satisfaire sans réfléchir vaut mieux qu'un
  garde-fou qu'on contourne.

## L'iCalendar, ou ce qu'une promotion révèle des quatre copies

Le module `ical` est le cas d'école de la campagne : **quatre réécritures
indépendantes de la RFC 5545**, aucune complète, chacune juste sur un point que
les trois autres rataient. La promotion a réuni les quatre bonnes réponses ;
les migrations qui ont suivi ont montré ce que chaque app y gagnait — et le
compte n'est pas symétrique.

- **La journée entière partait un jour trop tôt** chez `bac-sable`. Le jour
  civil était lu en **UTC** : une fête du 19 septembre saisie à Paris
  (`2026-09-19T00:00+02:00`, soit le 18 à 22 h UTC) s'exportait « les 18 et
  19 ». Les **deux bornes** fausses, et seulement à l'est de Greenwich — donc
  invisible pour qui teste depuis Londres ou une CI en UTC.
- **`DTSTAMP` était purement absent** de `mister-footcoach`, alors que la
  §3.6.1 l'impose. Et son `X-WR-CALNAME` atteignait **102 octets sur une seule
  ligne** pour une équipe au nom long et accentué. Le pliage du socle compte les
  octets mais itère par point de code : il coupe entre deux lettres, jamais au
  milieu d'un `é`.
- **Son arithmétique de durée sautait une heure** la nuit du changement
  d'heure : `new Date(y, m, d, h, min + durée)` passe par le calendrier local,
  là où le socle fait le calcul sur le cadran (`Date.UTC`). Une CI en UTC ne
  pouvait pas le voir.

**La nature de la date ne se devine pas, elle se déduit de l'affichage.**
Instant UTC ou heure murale flottante : les deux apps ont tranché en sens
inverse, et les deux ont raison. `bac-sable` garde l'instant UTC parce que ses
pages affichent déjà en `toLocaleString`, donc dans le fuseau du **lecteur** —
un `.ics` flottant contredirait la page qui vient de l'engendrer.
`mister-footcoach` garde l'heure flottante parce qu'un entraînement à 18 h est à
18 h, point ; il refuse même le `X-WR-TIMEZONE` que le socle propose, car le
poser ferait reconvertir cette heure. Le critère n'est pas « qu'est-ce qui est
plus correct », c'est **« qu'est-ce que l'app montre déjà à l'écran »**.

### La limite du socle : il ne franchit pas la frontière Deno

`mister-doc` est la seule des quatre à **ne pas** avoir migré, et son refus
délimite le périmètre du paquet pour toutes les apps à backend Supabase. Tout
son RFC 5545 vit dans une **Edge Function** (Deno) ; le navigateur n'en écrit
pas une ligne, le bouton « Télécharger le .ics » est un lien vers ce flux.

Quatre obstacles, dont trois vérifiés en commande :

1. `@mister-guiiug/dev-wpa-config` est **404 sur npmjs** et **401 sans jeton sur
   GitHub Packages** — qui exige un jeton même en lecture, même pour un dépôt
   public.
2. Le déploiement se fait par `supabase functions deploy --use-api` : c'est
   **l'infrastructure Supabase** qui résout les spécifieurs `npm:`, sans nos
   identifiants. C'est pourquoi la fonction `push` peut importer
   `npm:web-push` — lui est public.
3. Le `.npmrc` par fonction que Supabase prévoit pour un registre privé devrait
   porter le jeton **en clair dans un dépôt public**.
4. Décisif : le workflow de déploiement se déclenche sur
   `paths: supabase/functions/**`. **Changer une ligne d'import redéploierait
   les fonctions et rejouerait les migrations SQL** — un effet de bord sans
   rapport avec le bénéfice recherché.

Une échappatoire existe — le dépôt étant public, les modules sont servis en
`application/javascript` par le CDN GitHub, donc importables par URL — et elle a
été **écartée sciemment** : elle troque un registre contre un tiers dans la
chaîne d'approvisionnement d'un point d'entrée qui lit en `service_role`, et
elle bute de toute façon sur l'obstacle 4.

**Ce qu'il faut en retenir** : le socle est un paquet de **navigateur et de
build**. Pour du code qui tourne chez l'hébergeur, l'adoption utile n'est pas
l'import mais la **référence** — la PR se réduit alors à écrire la décision
là où le prochain lecteur la trouvera, pour qu'il ne refasse pas l'analyse. Les
deux défauts que le socle nomme chez `mister-doc` (`DTSTAMP` recalculé à chaque
évènement, lignes non pliées) restent donc en place, **documentés** au lieu
d'être corrigés. C'est un résultat, pas un abandon.

**Et la frontière ne passe pas entre deux fichiers : elle passe entre deux
DOSSIERS.** `miss-lookhouse` l'a montré le lendemain, en essayant d'adopter
`geo`. Son script `build-edge-core.mjs` recopie **tout `src/domain/`** vers ses
Edge Functions, en réécrivant les imports pour Deno. Sept modules de plus sont
donc dans le même cas que `geo` : `scoring`, `similarity`, `clustering`,
`priceHistory`, `normalize`, `text`, `imageHash`.

Le corollaire est inconfortable et mérite d'être écrit : **le socle porte un
module promu en partie de `miss-lookhouse` — `similarity` — que
`miss-lookhouse` ne pourra jamais réimporter.** Ça ne l'invalide pas, l'autre
provenance l'importe. Mais avant d'inscrire une app dans un lot d'adoption, il
faut savoir si le code visé franchit cette frontière : sinon on lui demande
quelque chose qu'elle ne peut pas tenir, et c'est l'agent qui découvre le mur en
migrant.

Le repérage tient en une commande : chercher un script de build qui recopie du
`src/` vers `supabase/functions/`.

## Le passage du 31/08/2026 — l'instrument mentait dans les trois sens

La dette affichait **cinq** doublons. Trois n'existaient pas, et en cherchant
pourquoi, un troisième défaut est apparu — plus lourd que les deux premiers,
parce qu'il ne faussait pas la dette : il effaçait l'adoption.

### 1. Les worktrees d'agent comptaient comme du code d'app

`.claude` n'était pas dans la liste des dossiers ignorés. Le balayage
descendait dans les worktrees : 298 fichiers source sous
`mister-footcoach/.claude`, 116 sous `mister-qowa`, 98 sous
`miss-contraction`. Du code de branches non fusionnées, parfois abandonnées.

miss-contraction était comptée en dette sur `useI18n` pour un fichier qui
n'existe que là — donc dans aucune version de l'app.

**Le tort symétrique est le dangereux** : un worktree qui importe le paquet
ajoute ses symboles à ceux de l'app, et acquitte donc un besoin que `main` ne
couvre pas. Une migration en cours d'écriture se compte alors comme faite.
Mesuré le jour même : aucune app n'était dans ce cas, mais rien ne l'empêchait.

### 2. `storage.ts` était devenu cent pour cent faux positifs

La ligne était signalée depuis le 30/08 comme la plus faible de la table,
« conservée pour le vrai positif ». Ce vrai positif — mister-cim10 — avait
migré entre-temps. Il ne restait que le bruit.

**La supprimer aurait perdu le rappel.** `backup` se détecte maintenant par ce
que l'app _déclare_ (`exports: ['createBackup', …]`) plutôt que par le nom de
ses fichiers : zéro détection sur le parc, donc le même chiffre que la
suppression, sans jeter ce que la suppression jetait.

C'est la leçon des trois homonymes — `Navbar.tsx`, `theme.ts`, `storage.ts` —
enfin appliquée au lieu d'être seulement écrite en commentaire : **un nom de
fichier ne dit pas ce qu'un fichier fait.**

### 3. Sept modules passaient pour morts

Le relevé ne connaissait que l'import **nommé** et le `@import` CSS. Or la
couche outillage ne s'importe presque jamais comme ça.

| sous-chemin           | compté | vrai    | forme                     |
| --------------------- | ------ | ------- | ------------------------- |
| `/prettier`           | 0      | 16 / 17 | `export { default } from` |
| `/eslint-react`       | 0      | 16 / 17 | réexportation             |
| `/vitest-setup`       | 0      | 15 / 17 | `import '…'`              |
| `/tsconfig-app-react` | 0      | 15 / 17 | `"extends"`               |
| `/tsconfig-node`      | 0      | 15 / 17 | `"extends"`               |
| `/lint-staged`        | 0      | 14 / 17 | réexportation             |
| `/commitlint`         | 0      | 3 / 17  | réexportation             |

Ce README affirme depuis le premier jour « la couche outillage est adoptée ».
C'était vrai, et l'instrument affichait zéro. **Un module qu'on ne sait pas
mesurer passe pour mort** — et c'est ce chiffre qui décide quoi promouvoir
ensuite.

La lecture des `tsconfig` est ancrée sur `extends`, pas sur le nom du paquet :
`miss-dice` le citait deux fois dans des _commentaires_, ayant recopié le
contenu au lieu de l'étendre.

### Ce que la séance laisse comme méthode

**Corriger un instrument dans les deux sens, ou pas du tout.** Les deux
premiers défauts faisaient baisser la dette de 5 à 2 sans qu'une app ait
migré ; le troisième fait monter l'adoption de sept sous-chemins, également
sans qu'une ligne d'app change. Un instrument qu'on ne corrige que dans le sens
flatteur n'est pas un instrument.

**Ce qui décide se sépare de ce qui s'exécute.** Les trois défauts vivaient
dans du code que rien ne pouvait exercer : le point d'entrée de
`measure-adoption.mjs` balaie dix-sept dépôts dès qu'on le charge. Le balayage
est parti dans `scripts/adoption-scan.mjs` — troisième application de la même
séparation, après `adoption-equivalents.mjs` et `migrate-plan.mjs`.

**La mutation ne sert que si elle s'applique.** Deux fois dans la séance, une
mutation n'a rien cassé : une fois parce que le motif ne correspondait plus au
fichier reformaté, une fois parce que le test passait _pour une mauvaise
raison_ — le cas `miss-dice` était écarté par l'exigence de guillemets, pas par
l'ancrage sur `extends` qu'il prétendait prouver. Vérifier que le fichier a
changé, puis que le bon test tombe.

### Une copie ne dérive pas au hasard

`miss-dice` était la seule app à avoir inliné les `tsconfig` du socle, en
justifiant que « the family projects flatten them locally ». Quinze apps sur
dix-sept les étendaient. La copie avait perdu **dix options** :
`verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `isolatedModules`,
`noUnusedLocals`… toutes des options de _strictesse_.

**Une copie dérive vers le moins exigeant, parce que c'est le sens où rien ne
résiste.** Personne n'avait désactivé ces dix contrôles : ils avaient
simplement cessé d'arriver. Le retour au socle a coûté zéro erreur —
`tsc -b --force` après suppression du cache, avec `tsc --showConfig` pour
vérifier que les options étaient bien redevenues actives.

C'est le meilleur argument de la campagne, et il ne se voit qu'en migrant : le
coût d'une copie n'est pas ce qu'elle duplique, c'est ce qu'elle cesse de
recevoir.

## Le tri des candidats du 01/09/2026

`scripts/adoption-candidates.mjs` a sorti **57 noms** que les apps déclarent et
que le paquet exporte déjà. Voici ce qu'ils sont devenus, pour que personne ne
refasse l'analyse. **Un tiers seulement était une vraie duplication.**

### Ce qui a été migré

| nom                               | apps      | verdict                                                             |
| --------------------------------- | --------- | ------------------------------------------------------------------- |
| `registerSW`                      | 9         | **doublon** — le plus gros du parc, jamais compté ; neuf migrations |
| `dates` (5 fns)                   | bac-sable | **doublon** — identiques au caractère près                          |
| `createRateLimiter`               | bac-sable | **doublon** — identique ligne pour ligne                            |
| `sanitize*` (3 fns)               | bac-sable | **doublon** — identiques, plus une coercition                       |
| `nameSimilarity`, `normalizeName` | bac-sable | **doublon** — identiques                                            |

Le cas `bac-sable` mérite d'être retenu : **ce dépôt est la source d'au moins
trois modules du socle** — `dates`, `rate-limit`, `similarity` le nomment dans
leur en-tête — et n'avait jamais réadopté ce qu'il avait donné. Le code est
parti, la copie est restée, et les deux ont vécu côte à côte pendant des mois.

### Ce qui est un HOMONYME, et pas une dette

- **`useAuth` (6 apps)** — six contrats différents sous un seul nom.
  miss-carbook et miss-ticket-pwa câblent leur SDK en direct (Supabase pour
  l'une, Firebase pour l'autre) ; miss-lookhouse et mister-footcoach exposent
  un contexte ; miss-uwh y ajoute dix rôles de club et le TOTP ; mister-doc une
  fiche médecin, un aperçu admin et la MFA. Le `useAuth(client)` du socle est
  un instantané sur un port injecté — **aucun des six ne l'est**, même si tous
  pourraient être bâtis dessus.
- **`addDays` de mister-footcoach** — prend et rend une **chaîne ISO**, là où
  le socle prend et rend une `Date`. Même nom, signature incompatible.
- **`CATEGORIES` de miss-dice** — le tableau de score du yahtzee, sans rapport
  avec le catalogue d'apps.

### Ce qui est un doublon RÉEL mais qu'on ne fait pas, et pourquoi

- **`AuthGate` (4 apps)** — celui de miss-uwh est structurellement identique à
  celui du socle : `bypass`, `loading`, `fallback`, `mfa`, `children`, un pour
  un. Mais il dépend du `useAuth` de l'app, donc l'adopter entraîne **tout le
  port `/auth`** et son adaptateur. Ce n'est pas un échange mécanique, c'est
  une refonte de la couche d'authentification, app par app.
- **`useAsync` de bac-sable** — le socle rend `error: Error | null`, la copie
  `string | null`. Une dizaine de sites d'appel passent `state.error`
  directement à `<ErrorBanner message={…}/>`.
- **`resolveBackendKind` de bac-sable** — le socle prend un second argument
  `kinds` et rend `string`, pas `'local' | 'supabase'`.
- **`toISODate` et `addDays` de mister-doc** — identiques au socle, mais douze
  lignes dans un module de 253 dont tout le reste est du métier (fériés
  français, quadrimestres, semaines ISO). Son `fromISODate` diffère
  volontairement : il rend toujours une `Date` là où le socle rend `null` sur
  une entrée invalide. Migrer imposerait un traitement du `null` à huit sites
  d'appel, **pour un cas qui ne peut pas se produire** — toutes les entrées
  sont des clés ISO internes ou une colonne `date` de Supabase.

### La leçon

Le balayage automatique trouve ce que la table à la main ne peut pas trouver —
il a sorti en tête la plus grosse duplication connue du dépôt, que personne ne
mesurait. Mais **il ne décide rien** : sur les cinq noms les plus partagés,
deux étaient des homonymes et un troisième était un vrai doublon qu'il vaut
mieux ne pas payer maintenant.

Un outil qui propose et un humain qui tranche, ce n'est pas un demi-outil :
c'est le seul montage qui ne fabrique pas de fausses dettes.

## Le second tri du 02/09/2026

La dette mesurée est retombée à **un seul doublon** — le `pwa-register-stub` de
`mister-family-map`, qui s'éteindra au prochain `npm run mirror` puisque
`bac-sable`, sa source, l'a déjà retiré. Le balayage, lui, sort encore
**54 noms**. Voici ce qu'ils sont, pour que personne ne refasse l'analyse.

### `mister-molkky` n'avait rien réadopté non plus

Le cas `bac-sable` n'était pas isolé. **Cinq modules du socle nomment
`mister-molkky` dans leur en-tête** — `react/use-keyboard-shortcuts`,
`react/use-pull-to-refresh`, `react/use-feedback`, `react/use-long-press` et
`audio`. L'app importait déjà vingt-trois sous-chemins du socle, **aucun de ces
cinq**.

C'est le même schéma, et il mérite d'être nommé : **une app qui donne un module
ne le réadopte pas toute seule.** Rien ne l'y ramène — le code est parti, la
copie marche, personne ne repasse. Il faut aller le chercher.

Deux ont été migrés (contrats identiques, socle strictement meilleur : gardes
`contenteditable` et IME, abonnements tenus par une ref au lieu d'être refaits
à chaque rendu). Les deux autres suivent ci-dessous.

### Le balayage ne distingue pas un doublon d'un cadavre

`useLongPress` de `mister-molkky` sortait comme doublon à migrer. **Zéro import
dans tout le dépôt** : du code mort. La bonne action n'était pas de migrer,
c'était de supprimer.

C'est un mode d'échec en plus de l'homonymie, et il est plus sournois : un
homonyme se voit en lisant la signature, un cadavre demande de compter les
sites d'appel. **Le premier réflexe devant un candidat : chercher qui
l'importe.**

### Ce qui reste, et ce que ça coûte

| candidat               | apps              | verdict                                                                                                                                                                                                                                                     |
| ---------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useFeedback`          | molkky, badminton | doublon réel, **entraîne l'audio** — la version du socle prend ses sons dans son module `audio` (`TonePresetName`), la copie appelle son `playSound` local                                                                                                  |
| `usePullToRefresh`     | puzzle            | **contrat différent** : rend `{pullDistance, refreshing, threshold}` en pixels là où le socle rend `progress` ∈ [0,1] ; et supprime le défilement natif par `preventDefault` sur un `touchmove` non passif, quand le socle bascule `overscroll-behavior`    |
| `useAccessibility.tsx` | carbook, puzzle   | **copie littérale entre deux apps** (206 et 208 lignes, quatre écarts). Le socle n'en couvre que la moitié : `useFocusTrap`, `useEscape`, l'annonceur ; `useAutoFocus`, `useFocusRestore`, `useIconButtonProps`, `useAccessibleLink` n'ont pas d'équivalent |
| `ErrorBoundary`        | uwh, doc, dice    | doublon réel, **mais les trois branchent déjà `recordError`** : la migration gagne la référence de corrélation et quarante lignes, pas une correction                                                                                                       |

### Deux défauts trouvés en lisant, pas en mesurant

- **`mister-puzzle` a corrigé un défaut que `miss-carbook` porte encore.** Dans
  la copie de `carbook`, `usePrefersReducedMotion` et `usePrefersHighContrast`
  démarrent à `useState(false)` et se corrigent dans un effet : **le premier
  rendu affirme donc que l'utilisateur ne demande rien**, et une animation part
  avant d'être coupée. `puzzle` initialise depuis `matchMedia().matches`. Le
  `useMediaQuery` du socle fait pareil — c'est un argument de plus pour
  l'adopter.
- **Les deux apps interrogent `(prefers-contrast: high)`**, le socle
  `(prefers-contrast: more)`. La liste de valeurs de Media Queries Level 5 est
  `no-preference | less | more | custom` : `high` n'y est pas. Reste à vérifier
  sous contraste renforcé réel si Chrome l'accepte encore en alias — la sonde
  par `mediaText` ne tranche pas, ce Chrome ne normalise pas les requêtes
  invalides.

## Le sens inverse — 02/09/2026

Tout ce document mesure l'adoption : ce que le paquet exporte et que les apps
recopient. La question symétrique — **ce que plusieurs apps écrivent et que le
paquet n'a pas** — a désormais son instrument, `scripts/promotion-candidates.mjs`,
et son tri : `GISEMENTS.md`. Dix chantiers classés par rendement, dont un
défaut mesuré en production (quatre apps servent la page 404 de GitHub sur un
lien profond) et une liste de souhaits que les apps avaient écrite dans leurs
propres commentaires, sans que personne ne la lise.
