# Le parc vu de dehors

_Troisième analyse, 02/09/2026 au soir. Les deux premières ([CAMPAGNE.md](CAMPAGNE.md), [GISEMENTS.md](GISEMENTS.md)) lisaient le code des apps : ce qu'elles importent du socle, ce qu'elles réécrivent à côté. Celle-ci lit ce qu'elles ÉMETTENT — les seize sites publiés, les dépôts et leurs dépendances, les exports que personne n'appelle._

> **Élagué le 06/09/2026.** Les treize chantiers de ce relevé ont été traités,
> et leurs fiches ont quitté ce document : ce qui reste est **pourquoi
> regarder dehors**, **avec quoi**, et **ce que la journée a appris**. Trois
> tableaux de mesures datées (poids, secrets et variables, état par chantier)
> sont partis aussi — ils décrivaient un parc du 02/09, et deux d'entre eux
> ont désormais une source vivante : `PARAMETRAGE.md` pour les secrets et les
> variables, la CI pour les budgets. L'historique garde la version longue.

## Pourquoi regarder ailleurs

Un défaut de production n'existe dans aucun dépôt. Le manifeste de miss-ticket-pwa est correct dans `public/` ; c'est le LIEN vers lui, `/manifest.json`, qui pointe la racine de l'origine `mister-guiiug.github.io` et non le sous-chemin de l'app — 404, l'app ne s'installe pas, et aucun lint ne le voit. Renovate est configuré dans treize dépôts ; il n'a jamais ouvert une PR, parce que le préréglage qu'ils étendent vit dans un dépôt `.github` qui n'existe pas. Le relevé d'adoption comptait dix-neuf copies ; il y en a trente-quatre, parce que sa règle de façade acquittait tout fichier qui importe n'importe quoi du socle.

**Aucun de ces trois défauts ne se voit depuis le code.** C'est la raison d'être de cette page, et elle n'a pas vieilli.

## Les instruments, pour que la mesure se refasse

| Sonde                                  | Instrument                                                | Ce qu'elle lit                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les sites publiés                      | `node scripts/probe-sites.mjs [app…] [--json]`            | `index.html` (langue, `theme-color`, CSP, icône iOS, Open Graph, canonique), le manifeste, `robots`/`sitemap`/`version.json`, le repli 404, le poids TRANSFÉRÉ du JS initial |
| Les exports morts                      | `node scripts/dead-exports.mjs [--all] [app…]`            | Un export jamais cité ailleurs (MORT) ; un export utilisé dans son seul fichier (SUPERFLU)                                                                                   |
| L'adoption, sans le mensonge de façade | `npm run measure-adoption`                                | Un fichier n'est une façade que s'il importe LE symbole libérateur du besoin, ou réexporte depuis le paquet                                                                  |
| Les dépendances, l'hygiène, la qualité | `npm outdated`, `gh pr list`, `scripts/console-audit.mjs` | Versions, fichiers de dépôt, workflows, `fr-FR` figés, `console.*`, densité de tests                                                                                         |

Le rendement d'un chantier se lit en nombre d'apps ou d'utilisateurs touchés,
rapporté au coût — et un **défaut** (quelqu'un en souffre aujourd'hui) passe
avant une **dette**.

## Ce que le relevé du 02/09 a donné

Treize chantiers, traités le jour même : Renovate réveillé (préréglage
`renovate/default.json` et workflow auto-hébergé, #157), les apps rendues
installables, la dette d'adoption triée (34 copies, 8 adoptées, 24 refusées
avec leur raison — voir plus bas), le bin `pwa-doctor` publié (#158, #159),
le poids de carbook ramené de 432 à 146 kB de JS initial, le SEO et le repli
404 vérifiés en production, les dépôts hors gabarit remis dessus, la locale
figée corrigée dans dix apps, 50 exports morts retirés, le journal passé par
`createLogger` dans treize apps, et `autoUpdate` remplacé par une invite.

Un seul geste est resté au propriétaire, et il y est encore : le secret
`RENOVATE_TOKEN` sur le socle — sans lui, le workflow le dit et s'arrête.

## Réserves de mesure

- La sonde lit la PRODUCTION : ce qui est fusionné mais pas déployé n'y est pas.
- Le poids « transféré » est le `Content-Length` servi par GitHub Pages en gzip ; Brotli ferait moins. Les chunks chargés après le premier rendu (`import()`) ne sont pas comptés — c'est voulu.
- `mister-quota` n'a pas de site (app Electron) ; la sonde l'exclut par le catalogue.
- Le relevé des exports morts lit le mot entier dans `src/`, tests compris ; il ne voit ni les chaînes de `lazy(() => import())` ni les consommateurs externes.
- L'installation de Renovate n'est pas vérifiable d'ici (jeton d'app requis) ; l'absence totale de PR sur dix-huit dépôts, y compris le socle dont la configuration est valide, est l'indice le plus fort.
- **Ajoutée le 06/09/2026, refermée le soir même :** les budgets de poids relevés ici n'étaient **contrôlés nulle part**. Le garde d'entrée des bins du socle échouait sous le lien symbolique que npm pose dans `.bin`, si bien que `pwa-bundle-budget` se chargeait, ne faisait rien et sortait 0 — sur les vingt dépôts. Corrigé en 4.5.0 (#219), publié en 4.5.1, et les vingt lockfiles montés dans la foulée. La section suivante donne la première mesure qui ait jamais eu lieu.

## La première mesure réelle des budgets (06/09/2026, au soir)

Ce document a retiré ses tableaux de poids datés en renvoyant à « la CI comme
source vivante ». Celui-ci fait exception, et pour une raison précise : la CI
ne mesurait rien. Les chiffres ci-dessous sont donc les **premiers** jamais
imprimés par `pwa-bundle-budget` et `pwa-doctor` — la ligne de base à partir
de laquelle la source vivante devient lisible. Relevés sur le journal de `main`
de chaque dépôt, après fusion.

| App               | TOTAL gzip | Budget           | Docteur                                |
| ----------------- | ---------- | ---------------- | -------------------------------------- |
| mister-quota      | 71,6       | 75               | _(pas de docteur en CI)_               |
| miss-dice         | 112,6      | 125              | 0 défaut, 2 dettes                     |
| miss-supatool     | 130,6      | 200              | 0 défaut, 3 dettes                     |
| mister-cim10      | 135,8      | 145              | 0 défaut, 2 dettes                     |
| miss-supaboss     | 165,0      | 180              | 0 défaut, 2 dettes                     |
| mister-footcoach  | 178,8      | 195              | 0 défaut, 5 dettes                     |
| pwa-starter-kit   | 190,4      | 210 (+ 420 brut) | **0 défaut, 0 dette, 0 info** (strict) |
| miss-genius       | 202,0      | 215              | 0 défaut, 3 dettes                     |
| miss-badminton    | 207,6      | 225              | 0 défaut, 2 dettes                     |
| miss-contraction  | 250,3      | 270              | 0 défaut, 4 dettes                     |
| miss-lookhouse    | 252,1      | 275              | 0 défaut, 3 dettes                     |
| mister-molkky     | 260,1      | 275              | 0 défaut, 4 dettes                     |
| miss-uwh          | 267,3      | 303              | 0 défaut, 3 dettes                     |
| mister-miss-koh   | 285,3      | 305 (+ 110 brut) | **0 défaut, 0 dette, 0 info**          |
| miss-ticket-pwa   | 308,2      | 330              | 0 défaut, 3 dettes                     |
| mister-puzzle     | 319,6      | 340              | 0 défaut, 5 dettes                     |
| mister-qowa       | 407,3      | 435 (+ 300 brut) | 0 défaut, 3 dettes                     |
| miss-carbook      | 514,3      | 545              | 0 défaut, 4 dettes                     |
| mister-family-map | 625,6      | 675              | 0 défaut, 5 dettes                     |

**Aucune application n'est au-dessus de sa borne, et le docteur rend `0 défaut`
partout.** Les dettes — de 0 à 5 par app — ne font échouer personne : aucun
dépôt ne porte `doctor-strict`, seul `pwa-starter-kit` est en `--strict`, et par
son script `build`. Elles n'en sont pas moins la première liste de travaux que
le parc ait produite sur lui-même.

**Le tableau de dépassements qui circulait avant cette mesure était faux, par
une erreur d'unité.** Il sommait le tableau de `vite build`, qui compte en **ko
(÷ 1000)**, alors que `measureBundle()` compte en **Kio (÷ 1024)** avec son
propre gzip : 3 à 10 kB d'écart pour le même build, assez pour fabriquer deux
dépassements imaginaires (« miss-uwh 274,1 / 269 » — mesuré par le bin, 267,3).
Seule la ligne `TOTAL gzip` du bin fait foi ; un chiffre lu ailleurs ne se cite
pas.

**Un vingtième dépôt manque, et il manquera un moment.** `mister-doc` a bien le
socle 4.5.1, mais sa CI échoue au pas _Test_ avant d'atteindre le `build` : un
garde délibéré y refuse le marqueur `[À compléter` tant que l'établissement n'a
pas fourni ses cinq mentions RGPD. Son budget et son docteur n'ont donc toujours
jamais tourné — et c'est le seul endroit du parc où la mesure attend une
décision humaine, pas un correctif.

## Ce que l'adoption a appris

Le relevé comptait un doublon dès qu'un fichier portait le nom guetté. Sur
trente-quatre copies, **vingt-quatre n'étaient pas des dettes** : le
`AppHeader.tsx` de mister-cim10 compose un slogan depuis la route et le store
de réglages, celui de miss-supaboss porte l'état de synchronisation de la
flotte, le `Badge` de mister-doc décline un ton chromatique métier là où le
socle décline six intentions sémantiques. Même nom, autre rôle — j'en ai
adopté trois avant de m'en apercevoir, et je les ai rendus.

La leçon n'est pas « le relevé se trompe » : il fait ce qu'un relevé peut
faire. C'est qu'un chiffre de dette sans moyen d'inscrire un refus mesure
aussi le travail impossible, et ne descend jamais. D'où `GARDES` : une raison
écrite par ligne, un test qui refuse celles qui n'expliquent rien, et un
relevé qui les AFFICHE au lieu de les taire.

Le reste de la journée a appris : la règle de façade, les citations hors
`src/`, et qu'un heredoc de ce poste mange les antislashs — les codemods
s'écrivent dans des fichiers, pas en ligne de commande. Et qu'un test peut
figer une limite plutôt qu'un contrat : trois apps affirmaient « le socle ne
livre que fr et en », ce qui a rendu leur CI rouge le jour où la limite est
tombée.
