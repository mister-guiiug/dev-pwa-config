# La configuration du parc : un modèle qui tient dans le temps

_Dossier instruit le 04/09/2026. Tous les chiffres qui suivent ont été relevés
ce jour-là sur les dix-huit dépôts et sur l'API GitHub — aucun n'est repris de
l'inventaire du 02/09, dont la péremption est précisément le sujet._

## Le constat : la règle existe, elle n'est appliquée nulle part

Le README porte depuis le 02/09 la ligne de partage — _« la question n'est pas
« est-ce sensible ? », c'est « le navigateur le voit-il ? »_ — et
[PARC.md](./PARC.md) en tire un inventaire dépôt par dépôt. Deux jours plus
tard, voici l'état réel :

| Mesure                                                        | Relevé du 04/09                                         |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| Workflows de déploiement en `secrets: inherit`                | **12 sur 16**                                           |
| Valeurs publiques (`VITE_*`) rangées en `secrets`             | **15**, sur 3 dépôts (puzzle 8, carbook 5, molkky 2)    |
| Dépôts rangeant leurs `VITE_*` en `vars`, comme dit le README | **1** (mister-doc)                                      |
| Dépôts utilisant un _Environment_ pour porter une valeur      | **0** (`github-pages` existe partout, il ne porte rien) |
| Valeurs déclarées que plus aucun workflow ne lit              | **8** (carbook 3, puzzle 2, bac-sable 2, ticket-pwa 1)  |
| Dépôts où `.env` n'est pas dans `.gitignore`                  | **1** (mister-cim10) — corrigé le 04/09                 |
| Dépôts lisant une `VITE_*` sans `.env.example`                | **1** (miss-ticket-pwa) — corrigé le 04/09              |

Un chiffre explique presque tous les autres : **les quatre dépôts qui nomment
correctement leurs secrets sont exactement les quatre qui n'utilisent pas le
workflow réutilisable du socle.** Les douze qui passent par le socle héritent
du trousseau entier. Le chemin recommandé est le chemin fautif.

Et la cause première est dans le socle lui-même. Le gabarit que l'on copie pour
créer un projet — [`templates/github-workflows/deploy.yml`](./templates/github-workflows/deploy.yml)
— dit deux fois l'inverse du README :

```yaml
# - Variables d'env du build (Supabase, Firebase, etc.) via secrets
#   Ajouter ici les VITE_* spécifiques au projet via ${{ secrets.* }}
```

Les quinze `VITE_*` rangées en secrets ne sont pas de la négligence : c'est le
gabarit appliqué à la lettre. **Une règle que ne porte pas l'artefact qu'on
copie est une règle qui n'existe pas.**

## Le diagnostic, en une phrase

La configuration d'une app existe en **quatre exemplaires** — ce que le code
lit (`import.meta.env.VITE_X`), ce que `.env.example` documente, ce que le
workflow injecte, ce que GitHub détient — et **rien ne les compare**. Le seul
lien est une table Markdown écrite à la main, vraie le jour de sa rédaction et
fausse dès la première PR.

Un modèle d'entreprise n'ajoute pas une documentation de plus. Il **déplace la
vérité dans un fichier déclaré**, fait **dériver** le reste de ce fichier, et
**confronte** périodiquement la déclaration au réel.

## Le modèle, en cinq couches

### 1. Déclarer — le manifeste

Un fichier par dépôt, versionné, relu en PR comme le reste :

```jsonc
// config/env.manifest.json
{
  "app": "miss-uwh",
  "entries": [
    {
      "name": "VITE_SUPABASE_URL",
      "store": "vars", // vars | secrets | local  (local = jamais sur GitHub)
      "phase": "build", // build | deploy | server
      "required": "prod", // always | prod | optional
      "purpose": "URL du projet Supabase du club",
      "fallback": "backend local — la démo publique marche sans compte",
      "provider": "supabase",
    },
    {
      "name": "SUPABASE_DB_PASSWORD",
      "store": "secrets",
      "phase": "deploy",
      "required": "prod",
      "purpose": "db push des migrations avant le build",
      "provider": "supabase",
      "rotation": "P180D",
      "lastRotated": "2026-06-14",
    },
  ],
}
```

Deux invariants suffisent à rendre la ligne de partage **mécanique** — ce
qu'une phrase de README ne sera jamais :

- une entrée dont le nom commence par `VITE_` ne peut pas avoir
  `store: "secrets"` : Vite la copie dans le bundle, le secret ne masque que
  les journaux ;
- une entrée `store: "secrets"` ne peut pas commencer par `VITE_`.

Et, leçon des `GARDES` de l'adoption : **une exception doit pouvoir s'écrire**,
avec sa raison (`"exception": "…"` d'au moins trente caractères). Sans quoi le
chiffre de dette ne descend jamais et plus personne ne le regarde.

### 2. Dériver — ne jamais écrire deux fois la même vérité

Depuis le manifeste, une commande engendre :

- **`.env.example`** — aujourd'hui écrit à la main, donc incomplet dès qu'une
  variable arrive ;
- **le bloc `build-env` et la liste `secrets:` de `deploy.yml`** — c'est
  précisément ce qui manque aux douze dépôts en `secrets: inherit` : nommer
  quinze lignes à la main est un travail que personne ne fait, l'engendrer est
  gratuit.

### 3. Confronter au réel — l'inventaire devient une commande

`pwa-env audit` interroge l'API GitHub et compare le manifeste à ce que le
dépôt détient vraiment. Trois écarts, ceux-là mêmes que la table du 02/09
listait à la main :

| Écart         | Définition                                 | Aujourd'hui             |
| ------------- | ------------------------------------------ | ----------------------- |
| **manquant**  | requis par le manifeste, absent de GitHub  | 19 valeurs sur 6 dépôts |
| **mal rangé** | valeur publique en `secrets`, ou l'inverse | 15 valeurs sur 3 dépôts |
| **orphelin**  | présent sur GitHub, dans aucun manifeste   | 8 valeurs sur 4 dépôts  |

La commande tourne **en local sur la session `gh` du mainteneur**, comme
[`apply-rulesets.mjs`](./scripts/apply-rulesets.mjs). C'est délibéré : la faire
tourner en CI demanderait un PAT à droit `Secrets: Read` sur dix-huit dépôts —
soit **un secret de plus à gérer pour gérer les secrets**, et le plus puissant
du parc.

### 4. Échouer fort — une valeur absente ne doit jamais atteindre la production en silence

C'est le vrai enseignement de mister-qowa : l'app est déployée, son bundle
porte `apiKey: undefined`, la CI est verte, et **rien ne le dit**. Le
mécanisme est visible dans le réutilisable : la validation de `build-env` ne
contrôle que la _forme_.

```sh
case "$line" in
  [A-Za-z_]*=*) printf '%s\n' "$line" >> "$GITHUB_ENV" ;;
```

Quand `vars.VITE_SUPABASE_URL` n'existe pas, la ligne vaut
`VITE_SUPABASE_URL=` — elle passe, et le build reçoit une chaîne vide.

| Garde                                          | Où          | Attrape                                      |
| ---------------------------------------------- | ----------- | -------------------------------------------- |
| Entrée **`required-env`** sur `pwa-deploy.yml` | déploiement | la valeur vide qui part en production        |
| **`envGuardPlugin()`** dans `vite.config.ts`   | build       | la même chose hors CI, y compris en local    |
| **`configReport()`** dans l'écran Réglages     | exécution   | ce qui manque sur un build **déjà en ligne** |

**Aucun de ces trois gardes n'est à inventer : le parc les a déjà écrits, à la
main, aux mauvais endroits.**

- `deploy-worker.yml` de miss-genius et de miss-supaboss vérifient
  `[ -z "$CLOUDFLARE_API_TOKEN" ]` et s'arrêtent en le disant. Le motif est
  bon ; il est écrit là où l'enjeu est faible — un Worker qui ne se déploie
  pas — et absent là où il est fort : le build de l'app.
- Le socle sait déjà refuser une configuration absente : le `getClient()` de
  [`supabase-client.js`](./supabase-client.js) **rejette en nommant les
  variables manquantes**. Mais il ne le fait qu'à l'exécution, et **que pour
  Supabase**. C'est exactement pourquoi mister-qowa est passé au travers : il
  est sur Firebase, où rien de tel n'existe.
- `src/app/config/env.ts` de bac-sable valide ses trois `VITE_*` par un schéma
  Zod, journalise ce qui est invalide et retombe explicitement sur le backend
  local. C'est `configReport()` déjà écrit — pour une app sur dix-sept.

Le troisième garde n'est donc pas un luxe : il porte la règle _« une app doit
démarrer sans configuration »_. Le repli reste choisi, mais **il se voit** —
l'écran dit quel backend est actif, au lieu de laisser croire que le compte
distant fonctionne.

### 5. Faire vivre — moindre privilège, expiration, suppression

Une gestion d'entreprise se juge moins à la pose d'un secret qu'à son retrait.

- **Moindre privilège.** Les deux workflows Cloudflare demandent déjà un token
  restreint (`Workers Scripts: Edit`), pas la Global API Key — qui, elle, ne
  s'annule pas et ouvre tout le compte. À généraliser aux PAT :
  `RENOVATE_TOKEN`, `MIRROR_PUSH_TOKEN`, `PRIVATE_READ_TOKEN` en jetons
  **fine-grained**, portée d'un dépôt, expiration ≤ 90 jours.
- **L'expiration est le piège.** Un fine-grained PAT qui expire ne casse pas
  bruyamment : Renovate cesse d'ouvrir des PR, le miroir cesse de se
  synchroniser, et on s'en aperçoit des mois plus tard. D'où `rotation` et
  `lastRotated` dans le manifeste, et une échéance qui ouvre une _issue_.
- **La suppression fait partie du cycle.** Les sept orphelins d'aujourd'hui
  sont là parce que rien ne propose jamais de les enlever — deux d'entre eux
  servent hors GitHub Actions (`CORS_ORIGINS` pour le serveur de mister-puzzle,
  `FIREBASE_TOKEN` pour un `firebase:deploy` lancé à la main) et doivent
  s'écrire au manifeste en `phase: "server"`, pas disparaître. Les six autres
  ne sont injectés nulle part.

## Les trois décisions structurantes, et leur prix

### L'organisation GitHub — la bonne réponse, trop chère ici

`mister-guiiug` et `elowner-ax` sont des **comptes personnels** (vérifié :
`"type": "User"`). Les secrets d'organisation, qui permettent de poser une
valeur **une fois** et de la partager avec les dépôts choisis, n'existent donc
pas. C'est ce qui oblige aujourd'hui à recopier `SUPABASE_ACCESS_TOKEN` sur
quatre dépôts et à le tourner quatre fois.

Le prix du passage en organisation n'est pas le transfert : c'est **l'URL**.
Les sites passeraient de `mister-guiiug.github.io/miss-dice/` à
`<org>.github.io/miss-dice/`, et **GitHub ne redirige pas les Pages**. Une PWA
installée est liée à son origine _et à son chemin_ : service worker,
`start_url`, portée du manifeste — tout casse, chez tous ceux qui l'ont
installée, et chaque lien publié meurt.

**Verdict : non, en l'état.** Mais la conclusion utile est ailleurs : le vrai
prérequis est **un nom de domaine**. Une fois les sites servis depuis un
domaine propre, l'URL cesse de dépendre du compte, et l'organisation devient un
changement interne, presque gratuit. C'est l'ordre à retenir — le domaine
d'abord, l'organisation ensuite, jamais l'inverse.

### SOPS + age — une source unique sans changer d'URL

À défaut d'organisation, la propriété « un seul endroit » s'obtient par un
fichier chiffré versionné et une commande qui le pousse vers les dépôts.
`vscode-sops-diff` est déjà dans le compte : l'outil est connu.

**Proportionné, pas systématique.** Quatre noms seulement vivent sur plusieurs
dépôts : `SUPABASE_ACCESS_TOKEN` (carbook, uwh, doc — et lookhouse dès qu'il
sera pourvu), `SUPABASE_DB_PASSWORD` et `SUPABASE_PROJECT_ID` (carbook, uwh),
`CLOUDFLARE_API_TOKEN` (supaboss, et genius dès qu'il sera pourvu). Pour ces
quatre-là, le coffre gagne la rotation en un point ; il ajoute une clé `age` à
conserver, qui devient le point unique de défaillance du parc. **Verdict : oui
pour les valeurs dupliquées, non pour le reste** — une valeur qui ne vit que
dans un dépôt n'a rien à gagner à sortir de GitHub.

### OIDC — là où le fournisseur le permet, et seulement là

L'identité fédérée supprime le jeton de longue vie : le workflow prouve son
identité à chaque exécution, il n'y a plus rien à voler ni à tourner.

| Fournisseur     | Fédération OIDC depuis GitHub Actions               | Conséquence                                      |
| --------------- | --------------------------------------------------- | ------------------------------------------------ |
| Google/Firebase | **oui** (Workload Identity Federation)              | puzzle, ticket-pwa, qowa peuvent tout supprimer  |
| Supabase        | non — la CLI exige un PAT (`SUPABASE_ACCESS_TOKEN`) | le secret reste, on le restreint et on le tourne |
| Cloudflare      | non — jeton d'API                                   | idem, portée `Workers Scripts: Edit`             |

Le gain le plus net est `FIREBASE_TOKEN` : c'est le jeton hérité de
`firebase login:ci`, déprécié, sans expiration et à portée maximale. Deux
dépôts en portent un.

_(Portée des fournisseurs vérifiée à la connaissance d'aujourd'hui ; à
reconfirmer au moment d'exécuter — c'est le genre de point qui bouge.)_

### GitHub Environments — gratuits, et inutilisés

Sur un dépôt **public**, les environnements et leurs règles de protection ne
coûtent rien. Aucun dépôt du parc n'en tire parti : `github-pages` existe
partout, créé par le déploiement, et ne porte aucune valeur.

Poser les secrets de déploiement dans un environnement `production` restreint
à `main`, c'est garantir qu'aucune exécution partie d'une branche ou d'un
`workflow_dispatch` opportun ne peut atteindre les identifiants de production.
Détail d'implémentation : l'environnement se déclare dans le _job appelé_ —
`pwa-deploy.yml` a donc besoin d'une entrée `environment`.

## L'ordre des opérations

**Phase 0 — ce qui saigne (aucun code). ✅ faite le 04/09/2026.** Gabarit
`deploy.yml` réécrit ([#171](https://github.com/mister-guiiug/dev-pwa-config/pull/171)),
`.gitignore` de mister-cim10 ([#42](https://github.com/mister-guiiug/mister-cim10/pull/42)),
`.env.example` de miss-ticket-pwa ([#20](https://github.com/mister-guiiug/miss-ticket-pwa/pull/20)).

Deux choses apprises en le faisant. Le `.gitignore` de miss-ticket-pwa ne
couvrait que `.env` — ni `.env.local` ni `.env.development` : le même défaut
que cim10, à un fichier près. Et son `.env.production` est **versionné
volontairement** : il ne contient que des `VITE_FIREBASE_*`, publiques par
construction, et les versionner supprime toute dérive entre le dépôt et le
site. C'est un quatrième rangement légitime, à côté de `vars`, `secrets` et
`local` — le manifeste devra le nommer.

**Phase 1 — le socle, côté déploiement. ✅ faite le 04/09/2026**
([#171](https://github.com/mister-guiiug/dev-pwa-config/pull/171)). L'entrée
`required-env` arrête le déploiement **avant le pre-build** — donc avant les
migrations — en nommant les variables vides. Elle est **opt-in** : les seize
appelants existants n'ont pas changé de comportement, et poser la liste dans
chaque app est la phase 3. C'est elle qui transformera la panne silencieuse de
mister-qowa en déploiement rouge.

En l'écrivant, un quatrième garde artisanal est apparu — le meilleur du parc :
`src/config/firebase.ts` de miss-ticket-pwa **lève en production** quand la
configuration est incomplète, et renvoyait déjà vers un `.env.example` qui
n'existait pas. C'est exactement `envGuardPlugin()`, écrit pour une app sur
dix-sept, dans la pile même où mister-qowa échoue en silence.

**Phase 2 — le socle, côté déclaration.** Schéma du manifeste, `pwa-env check`
(hors ligne, en CI sur chaque PR), `pwa-env sync --write`, `pwa-env audit` (en
ligne, sur la session `gh`). `pwa-doctor` délègue à `pwa-env check` ses quatre
contrôles actuels au lieu de les dupliquer.

**Phase 3 — les apps, une PR chacune.** Manifeste écrit, `VITE_*` déplacées de
`secrets` vers `vars`, `secrets: inherit` remplacé par la liste engendrée,
orphelins supprimés. Commencer par **mister-doc**, qui est déjà conforme : son
manifeste sert de référence et sa PR ne change que des fichiers, pas des
valeurs.

**Phase 4 — le cycle de vie.** Environnement `production`, PAT fine-grained
datés, OIDC pour les trois dépôts Firebase, échéances de rotation.

L'ordre n'est pas négociable sur un point : **la phase 3 déplace des valeurs
sur GitHub**, et une valeur déplacée pendant qu'un workflow tourne fait un
déploiement à moitié configuré. Chaque app se fait en une passe, secrets posés
avant que la PR ne soit fusionnée.

## Ce qui n'est PAS proposé

- **Un coffre externe** (Vault, Doppler, Infisical). C'est un service de plus à
  maintenir, à payer et à surveiller pour dix-sept PWA tenues par une seule
  personne ; le jour où il est indisponible, plus rien ne déploie. GitHub
  détient déjà les secrets et exécute déjà les workflows.
- **Chiffrer les valeurs publiques.** Une `anon key` dans un coffre reste
  ensuite dans le bundle, en clair, sur GitHub Pages. Ce qui protège la donnée
  est la RLS ; ce qui protège Firebase est App Check et les règles. Cacher la
  clé donne l'illusion, pas la protection.
- **Interdire `secrets: inherit` par un ruleset.** GitHub n'offre pas cette
  règle. C'est `pwa-doctor --strict` qui la tient, et c'est suffisant : le
  contrôle échoue la CI.
- **Un audit automatique quotidien.** L'écart entre le manifeste et GitHub ne
  bouge qu'au rythme des PR ; un contrôle hebdomadaire à la main coûte moins
  qu'un PAT tout-puissant vivant en CI pour l'automatiser.
