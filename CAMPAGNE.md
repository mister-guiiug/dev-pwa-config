# La campagne d'adoption — mode d'emploi

Le relevé est sans appel : **127 fichiers recopiés dans les dix-sept apps, et
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
est **opt-in** — deux apps sur dix-sept le font (`miss-uwh`,
`mister-family-map`). Migrer `Button`, `Sheet` ou `BottomNav` dans les quinze
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

Relevé complet, dix-sept dépôts clonés côte à côte. **131 doublons avant, 127
après.** Le chiffre bouge peu, et c'est le vrai résultat de ce passage : la
campagne butait sur un prérequis que personne n'avait vu.

Migré et vérifié (lint, tests, build verts, orphelins supprimés) :

| App                 | Ce qui est passé au socle                        |
| ------------------- | ------------------------------------------------ |
| `mister-family-map` | `geo` — 14 fichiers, la ré-exportation supprimée |
| `miss-supaboss`     | `useOnline` — 5 appelants                        |
| `miss-badminton`    | `useOnline` — 1 appelant                         |
| `mister-molkky`     | `useOnline` — 1 appelant                         |

Onze autres apps montent en 3.21.0 sans migration : leurs doublons sont tous
soit refusés faute de `components.css`, soit bloqués par un symbole local.

Ce qui reste, par ordre de valeur :

1. **Le prérequis `components.css`, app par app.** C'est le verrou : il ferme
   à lui seul 62 migrations sur les quinze apps qui ne l'ont pas. Une PR
   d'apparence par app, avec des captures.
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
5. **`miss-ticket-pwa` est bloquée en amont.** Restée en `^2.1.2` : la montée
   en 3.x butte sur le durcissement TypeScript de la 3.0.0
   (`verbatimModuleSyntax`, treize imports à passer en `import type`), et
   `eslint` manque à ses `devDependencies`. À traiter avant toute adoption.
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
