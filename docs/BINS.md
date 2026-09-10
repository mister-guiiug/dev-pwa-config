<!--
  Cette page est une PARTIE du manuel du socle : le README ne pouvait plus la
  porter. Il faisait 3 719 lignes et 252 kB — le plus gros fichier du paquet
  publié, devant `components.css` — et servait à la fois de vitrine, d'index et
  de manuel de 151 sous-chemins. On n'y trouvait plus rien.

  Les pages du manuel vivent dans `docs/`, le README oriente. Chaque page reste
  la SOURCE de ce qu'elle dit : rien n'a été résumé, réécrit ni raccourci au
  passage — les titres et leurs ancres sont ceux d'avant, pour que les liens
  déjà écrits ailleurs continuent de tomber juste.
-->

# Les binaires du socle

_Manuel du socle `@mister-guiiug/dev-pwa-config` — les six commandes que le paquet installe, et ce qu’elles lisent. Retour au
[README](../README.md)._

## Bin

| Commande            | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pwa-icons`         | Génère les icônes PWA (PNG + maskable) depuis un SVG/PNG source. Requiert `sharp`. Ex. `pwa-icons --source public/favicon.svg --maskable`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pwa-bundle-budget` | Refuse un build qui dépasse `bundleBudget` (`totalGzipKb` : tout le JS gzip ; `mainChunkKb` : le chunk principal, brut) lu dans `package.json`. Ex. `"build": "vite build && pwa-bundle-budget"` — promu de miss-uwh et mister-qowa. `--ratchet` propose un budget resserré (mesure + 10 %) quand le build a maigri, `--write` l'écrit : un budget posé un jour de surpoids ne redescendait jamais                                                                                                                                                                                                                  |
| `pwa-doctor`        | Lit UN dépôt et dit ce qui manque à la checklist du parc — fichiers du gabarit, workflows, et le build (`dist/` : manifeste lié sous le site, PNG 512, `id`, langue, icône iOS, CSP, `404.html`) ; plus un seul fait qui n'est pas sur le disque, les issues du dépôt, quand un jeton permet de le lire (`--no-github` coupe l'appel). Trois verdicts (défaut, dette, info), le geste à chaque ligne, code 1 sur un défaut (`--strict` : aussi sur une dette). Les 56 contrôles sont nommés et groupés en quatre familles : `--regles` les liste, `--only` / `--skip` restreignent. Ex. `"postbuild": "pwa-doctor"` |
| `pwa-pgtap`         | Joue les fichiers pgTAP de `supabase/tests/` contre la base LIÉE, sans Docker : chaque assertion dépose son verdict dans une table temporaire que la dernière requête renvoie d'un bloc (`supabase db query` ne rend que le dernier jeu de lignes). Même fichier, même plan, même `rollback`. Exige le CLI `supabase`, `supabase link` fait et `SUPABASE_ACCESS_TOKEN`. Promu de mister-miss-koh ; complément du réutilisable `pwa-supabase-test.yml` (pile jetable en CI). Ex. `npx pwa-pgtap rls.test.sql`                                                                                                        |
| `pwa-screenshots`   | Les deux captures du manifeste — `narrow` 540×1170 et `wide` 1280×720, celles qui décident de la fiche d'installation — prises sur le build servi par `vite preview`, ou sur une app déjà servie (`--url`, données réelles) ; `--prepare` joue un module avant chaque capture pour mettre l'écran dans l'état voulu par l'interface. `pwaBaseOptions` lit ensuite `public/screenshots/` et déclare les entrées au manifeste, aux tailles lues dans les fichiers. Trois scripts faisaient la même chose (squelette, mister-miss-koh, showroom). Ex. `npx pwa-screenshots --wide-path reglages`                       |
| `pwa-bindings`      | Pose les binaires natifs de CE poste **aux versions du lockfile**. Utile là où le `.npmrc` épingle `os=linux` (le lockfile reste celui de la CI) et où `npm ci` n'installe donc rien pour Windows ou macOS. La liste n'est pas écrite : toute entrée du lockfile dont `os`/`cpu`/`libc` désignent le poste est retenue. `--dry-run` imprime la commande sans l'exécuter, `--dir` vise un autre dossier. Ex. `npx pwa-bindings`                                                                                                                                                                                      |

### Pourquoi `pwa-bindings` épingle

La parade connue s'écrivait à la main, et **sans numéro de version** :

```bash
npm i --no-save @rolldown/binding-win32-x64-msvc lightningcss-win32-x64-msvc …
```

Or `npm i <nom>` installe la **dernière** version publiée, pas celle que le
lockfile a résolue. Le poste se met alors à faire tourner un compilateur que la
CI n'a jamais vu — et il ne le dit pas.

Ce que ça a coûté, une fois mesuré (`mister-footcoach`, 06/09/2026) : le poste
avait `@rolldown/binding-win32-x64-msvc` **1.2.7** quand le lockfile disait
**1.1.5**. Le transformeur de 1.2.7 conserve davantage de commentaires à travers
la transformation JSX, donc des indices `istanbul ignore` qui ne survivaient pas
survivaient — et `ast-v8-to-istanbul` retire du rapport le sous-arbre annoté.
Deux fichiers y perdaient une région entière, entièrement couverte : **75.67 /
74.83 / 71.18 / 76.13** sur le poste contre **75.72 / 75.22 / 71.26 / 76.18** en
CI. L'écart se lit « Windows ≠ Linux » alors que les deux systèmes rendent le
même chiffre au bit près dès que la chaîne d'outils est la même.

Une commande épinglée à la main n'aurait pas suffi : les versions diffèrent d'une
app à l'autre — le même jour, `@rolldown/binding` valait 1.0.3 sur `miss-uwh` et
`mister-qowa`, 1.1.5 sur `mister-footcoach`, 1.2.5 ici. La seule forme qui reste
vraie est celle qui lit le lockfile.

### À quoi sert `pwa-doctor`

Un lint voit le code ; il ne voit pas qu'un manifeste est lié à la racine de
l'origine (404 en production, l'app ne s'installe pas), qu'un `renovate.json`
étend un préréglage dans un dépôt inexistant (Renovate ne fait rien, en
silence), qu'une app routée par chemin n'a pas de `404.html` (un lien profond
sert la page 404 de GitHub). Ce sont des défauts de CONFORMITÉ AU PARC : ils
vivent entre le dépôt, le build et l'hébergeur, et le 02/09/2026 on les a tous
trouvés à la main ([PARC.md](PARC.md)). `pwa-doctor` les cherche en une
seconde, sur un dépôt :

1. **le dépôt** — `.editorconfig`, `.nvmrc`, `.gitattributes` en LF,
   `renovate.json` sur le préréglage du socle, `.lighthouserc.json`, une spec
   a11y si Playwright est là, un `bundleBudget` ;
2. **les workflows** — Lighthouse, `cleanup-runs`, le keep-alive Supabase si
   l'app en dépend, les e2e en CI (et qu'aucune spec ne reste hors du filtre
   `e2e-grep`, donc jamais jouée), un déploiement Pages passé par le
   réutilisable, les références au socle en `@v4` ;
3. **le build** (`dist/`, après `vite build`) — `lang`, le lien du manifeste
   sous le site, PNG 192/512 et maskable, `id`, la langue du manifeste égale à
   celle de la page, l'icône iOS, `theme-color` par schéma, CSP, Open Graph,
   canonique, `version.json`, `404.html` quand l'app route par chemin sans
   passer par `pwa-deploy.yml` (qui le pose au déploiement) ;
4. **le seul réglage de dépôt qui se voit à l'écran** — une app qui affiche
   « Signaler un problème » (`<AppFooter … issues>`, ou `issueReportUrl` dans
   un pied de page maison) sur un dépôt dont les issues sont **désactivées** :
   `issues/new` répond 404, l'utilisateur clique et se cogne. C'est arrivé —
   `miss-supatool` affichait le lien le 06/09/2026, `miss-ticket-pwa` aussi ;
   les deux ont été rouverts le jour même, et le contrôle est là pour la
   rechute (une case se décoche en deux clics, un dépôt neuf peut naître sans,
   et le code de l'app est écrit pareil dans les deux cas).

Ce quatrième point est **le seul qui ne se lise pas sur le disque** : le fait
vient de l'API GitHub, appelée quand un jeton est présent — la CI en donne un
(`GITHUB_TOKEN: ${{ github.token }}`, posé par `pwa-ci.yml`). Sans jeton, sans
réseau, sur une réponse inattendue ou sur un dépôt qu'on n'a pas su nommer
sans deviner, **le contrôle se tait** : pas de « probablement », pas de « à
vérifier », rien. `--no-github` coupe l'appel pour un diagnostic strictement
hors ligne. Tout le reste tourne sans réseau, comme avant.

Trois verdicts : **défaut** (quelqu'un en souffre aujourd'hui), **dette** (le
socle a la réponse, l'app ne l'a pas prise), **info** (une mesure : locales
figées, `console.*`, un budget sans `mainChunkKb`, `localStorage` sans magasin
versionné). Chaque ligne dit le geste qui la fait disparaître, pas un score.
En CI, `run-doctor: true` du réutilisable `pwa-ci.yml` le lance après le build
(`doctor-strict: true` refuse toute dette — le régime du squelette) ; en
local, `npx pwa-doctor` suffit. Il ne mesure ni le poids (`pwa-bundle-budget`)
ni ce que l'hébergeur sert vraiment (`scripts/probe-sites.mjs`, sur le site
publié).

**Le 05/09/2026, une application sur vingt l'appelait** — le squelette. Un
garde que personne n'exécute n'est pas un garde : d'où l'entrée `run-doctor`,
opt-in en 4.x et `true` par défaut à la prochaine majeure.

#### Les contrôles sont nommés (4.10.0)

`pwa-doctor --regles` liste les **56 contrôles**, groupés en quatre familles
(dépôt, workflows, source, build), avec leur identifiant et leur niveau. C'est
ce qu'il faut pour écrire un refus motivé sans deviner un identifiant, et pour
savoir ce que l'outil regarde sans lire son code :

```bash
npx pwa-doctor --regles                      # le catalogue
npx pwa-doctor --only spa-404,manifest-lang  # travailler sur deux contrôles
npx pwa-doctor --skip wf-lighthouse          # en écarter un, le temps d'un essai
```

`--only` et `--skip` servent à travailler **sur** un contrôle — le déboguer,
mesurer ce qu'il coûte, écrire son correctif. Ils ne sont pas un moyen de se
taire en CI : personne ne les écrit dans un workflow, et un identifiant
inconnu fait échouer la commande au lieu de rendre un rapport vide. Pour ne
pas suivre un contrôle **ici**, le geste reste le refus motivé de
`package.json`, qui l'éteint sans le cacher.

Sous le capot, `diagnose()` ne fait plus six cents lignes d'un seul tenant :
un contexte lu une fois, quatre familles de règles qui se jouent séparément, et
un catalogue figé que le test compare aux familles dans les deux sens. C'est la
condition pour écrire `pwa-doctor --fix` règle par règle (chantier ouvert,
`STRATEGIE.md` § 8) plutôt qu'au milieu d'un bloc que personne ne peut relire.
