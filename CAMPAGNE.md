# La campagne d'adoption — mode d'emploi

Le relevé est sans appel : **130 fichiers recopiés dans les dix-sept apps, et
aucun de ces doublons ne manque au socle**. Cette campagne les remplace par les
imports du paquet, app par app, rapport par rapport. Elle s'exécute depuis une
machine où les dix-sept dépôts sont clonés **côte à côte** — ce qu'aucune CI ni
session distante n'a.

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
- **À PROMOUVOIR** — aucun sous-chemin ne publie cet export : c'est un
  chantier de socle, pas de migration.

Cas connus d'avance (relevés sur les dépôts accessibles) :

- `links.ts` : `SPONSOR_URL` migre tel quel ; `REPO_URL` devient
  `repoUrl('<id-app>')` — une ligne à la main.
- `useActionGuard` (miss-supaboss) : le socle publie
  `react/use-action-guard`, mais la **signature diffère** (rôles injectés en
  `checks`, plus lus dans les stores). Migration à la main, volontairement
  absente de la carte du codemod.

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
- une app à la fois, `verify` vert avant de passer à la suivante.
