# La campagne d'adoption — mode d'emploi

Le relevé est sans appel : **120 fichiers recopiés dans les dix-sept apps, et
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
(peers alignés, `npm install` par app) :

```bash
node scripts/migrate-consumers.mjs --install
```

## Le prérequis, avant tout le reste

**Les composants du paquet ne sont pas habillés.** Ils ne posent que des
attributs `data-dwc` ; c'est `components.css` qui les habille, et cet import
est **opt-in** — trois apps sur dix-sept le font (`miss-genius`, `miss-uwh`,
`mister-family-map`). Migrer `Button`, `Sheet` ou `BottomNav` dans les quatorze
autres échange un composant stylé contre un composant **nu** : ça compile, les
tests passent, le lint est vert, et l'écran est cassé.

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
  ne prouve que la compilation : l'écran, lui, se regarde.

## Le passage du 29/08/2026 — ce qui est fait, ce qui reste

Relevé complet, dix-sept dépôts clonés côte à côte, tout fusionné et publié.
**132 doublons avant, 120 après.**

Les cinq premiers sont tombés en une journée de tranche mécanique ; les sept
suivants ont demandé de lever le prérequis `components.css` sur une app et d'y
relire chaque site d'appel. C'est le vrai enseignement du passage : la couche
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

Ce qui reste, par ordre de valeur :

1. **Le prérequis `components.css`, app par app.** C'est le verrou : il ferme
   à lui seul **68 migrations sur les quatorze apps** qui ne l'ont pas. Une PR
   d'apparence par app, avec des captures — `miss-genius` montre la forme
   qu'elle prend, jetons compris.
2. **`links` — neuf apps, neuf fois la même ligne.** `SPONSOR_URL` migre tel
   quel, `REPO_URL` devient `repoUrl('<id-app>')`. Aucune ne migre seule ;
   toutes migrent en une passe.
3. **`useTheme` (8 apps) et `useI18n` (4).** Ce ne sont pas des remplacements
   d'import : le premier demande de migrer l'état de thème vers le stockage du
   socle (`legacyKeys` est là pour ça), le second un fournisseur et des
   dictionnaires.
4. **`miss-uwh` et ses 39 `Button`.** Seule app, avec `mister-family-map`, à
   importer `components.css` : la migration est possible, mais son `Button`
   local est habillé aux jetons `--uwh-*`. Trente-neuf boutons changent de
   tête — décision d'apparence, pas nettoyage d'imports.
5. **`miss-ticket-pwa` n'a aucun test.** `npm test` sort à 0 en annonçant
   `No test files found` : c'est la seule app de la famille dans ce cas, et sa
   CI passe donc au vert sans rien vérifier d'autre que le lint, les types et
   le build. L'y adopter à l'aveugle serait le seul cas sans filet. Son linter,
   lui, est réparé : `eslint` ne figurait pas dans ses `devDependencies` — elle
   comptait sur l'installation automatique des peers par npm, qu'un lockfile
   régénéré n'a pas reconduite.
6. **`mister-quota` ne dépend pas du paquet.** Ses quatre doublons ne sont pas
   une dette de migration tant que l'app n'est pas consommatrice.

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
