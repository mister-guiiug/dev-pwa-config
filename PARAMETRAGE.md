# Paramétrer une application : variables et secrets — la procédure et ses variantes

_Ce document dit **comment faire**, geste par geste, avec les commandes. Le
**modèle** (manifeste, dérivation, audit, gardes) est instruit dans
[CONFIG.md](CONFIG.md) ; la **règle** tient en une phrase dans le README
(« Secrets et variables — la ligne de partage »). Tout ce qui suit a été relevé
sur les workflows du socle en 4.2.0 et sur les dépôts du parc le 06/09/2026._

## 0. La règle, et ses trois conséquences

**La question n'est pas « est-ce sensible ? », c'est « le navigateur le
voit-il ? ».** Vite copie toute `VITE_*` dans le bundle : elle part en clair sur
GitHub Pages. La ranger en secret ne protège rien — un secret masque les
journaux de CI, pas la valeur. Ce qui donne un **pouvoir** (écrire, déployer,
administrer) est un secret ; ce que le navigateur reçoit est une variable.

Trois conséquences pratiques, toutes payées au moins une fois dans le parc :

1. **Un secret ne se relit pas.** `gh secret list` rend des noms, jamais des
   valeurs. Une valeur à déplacer ou perdue se reprend chez le fournisseur
   (tableau de bord Supabase, console Firebase), pas sur GitHub.
2. **Le bloc `with:` d'un job `uses:` ne voit pas le contexte `secrets`.** Une
   `VITE_*` rangée en secret ne peut donc même pas atteindre un workflow
   réutilisable : GitHub refuse le fichier entier sur `main`, et la PR ne l'a
   pas vu (mister-puzzle, 06/09/2026). Les secrets passent par le bloc
   `secrets:`, et seulement ceux que le réutilisable **déclare**.
3. **Une valeur qui donne un pouvoir se pose à la main, par son propriétaire.**
   Un agent pose des variables (`gh variable set`) ; il ne pose pas de
   secrets, et ne les connaît pas. Les documents du parc le disent à chaque
   fois qu'une étape le demande.

## 1. Les rangements

| Rangement               | Où ça vit                                                                                                                                  | Qui le lit                                                                                                           | Relisible ?          | Exemples                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`vars`**              | Variables Actions du dépôt (Settings → Secrets and variables → Actions → Variables)                                                        | `${{ vars.X }}` dans tout workflow, dans `with:`, dans `secrets:` d'un appelant                                      | oui                  | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FIREBASE_*`, `VITE_VAPID_PUBLIC_KEY`, `VITE_SENTRY_DSN`, `VITE_BACKEND`                                           |
| **`secrets`**           | Secrets Actions du dépôt, chiffrés                                                                                                         | `${{ secrets.X }}` dans `env:` d'un job ordinaire et dans le bloc `secrets:` d'un appelant — **jamais dans `with:`** | non (noms seulement) | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `CLOUDFLARE_API_TOKEN`, `RENOVATE_TOKEN`, `PRIVATE_READ_TOKEN` |
| **`local`**             | Le poste : `.env.local`, `.env.development.local` (lus par Vite) ; `.env.supabase.local`, `../supabase-token.txt` (hors Vite, `chmod 600`) | `npm run dev`, le CLI Supabase, les scripts du poste                                                                 | —                    | mot de passe de la base, jeton personnel, secret de planification d'une fonction Edge                                                                                  |
| **versionné**           | `.env.production` commité — une **exception assumée**, pour des valeurs publiques par construction                                         | le build, sans rien à poser sur GitHub                                                                               | oui                  | les `VITE_FIREBASE_*` de miss-ticket-pwa                                                                                                                               |
| **chez le fournisseur** | Supabase (Auth → URL, Hooks ; `supabase secrets set`), Cloudflare (`wrangler secret`), Firebase                                            | le service lui-même, jamais le navigateur ni GitHub                                                                  | selon le service     | `site_url`, `uri_allow_list`, hook de jeton, `IMPORT_CRON_SECRET`                                                                                                      |

Deux rangements existent et ne servent pas, par décision : les **Environments**
GitHub (`github-pages` existe partout et ne porte rien — CONFIG.md, phase 4) et
les **secrets d'organisation** (le compte est personnel, voir
[l'org casserait les URL de Pages](STRATEGIE.md)).

Deux valeurs ressemblent à des secrets et n'en sont pas : la **clé anonyme
Supabase** (un JWT de rôle `anon`, arbitré par la RLS) et la **configuration
Firebase** (protégée par App Check et les règles). Vérifier la première avant de
la traiter comme publique :

```bash
echo "$VITE_SUPABASE_ANON_KEY" | cut -d. -f2 | base64 -d
```

Le résultat doit dire `"role":"anon"` — jamais `service_role`.

## 2. La chaîne : d'où une valeur part, où elle arrive

```
code            import.meta.env.VITE_X
                        ▲
build           `build-env` du réutilisable — une ligne KEY=VALUE, écrite dans $GITHUB_ENV
                        ▲
appelant        build-env: |
                  VITE_X=${{ vars.VITE_X }}        ← une VARIABLE du dépôt
                required-env: |
                  VITE_X                            ← refuse une valeur VIDE avant le pre-build
                secrets:
                  SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}   ← un SECRET, nommé
                        ▲
GitHub          vars / secrets du dépôt
```

Deux propriétés de cette chaîne décident de tout :

- **`build-env` ne contrôle que la forme.** Quand `vars.VITE_X` n'existe pas,
  la ligne vaut `VITE_X=`, elle passe, et le bundle part avec une chaîne vide
  — mister-qowa a été publié avec `apiKey: undefined`, CI verte. D'où
  **`required-env`** pour ce dont l'absence casse l'app, et rien d'autre : une
  `VITE_SENTRY_DSN` absente fait taire l'observabilité, un garde bruyant finit
  désactivé.
- **Un slot `secrets:` accepte n'importe quelle expression.** Le keep-alive
  déclare `VITE_SUPABASE_URL` en secret ; l'appelant y passe
  `${{ vars.VITE_SUPABASE_URL }}` — une seule valeur, un seul endroit, aucun
  secret à poser. L'inverse est faux : un `with:` ne lit pas `secrets`.

Ce que chaque réutilisable du socle consomme, et rien d'autre :

| Réutilisable                     | `with:` (variables)                              | `secrets:` (déclarés)                                                          | Notes                                                                                     |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `pwa-ci.yml`                     | `build-env` — des valeurs **factices** suffisent | aucun (`GITHUB_TOKEN` est fourni)                                              | jamais de vraie valeur en CI : le build de PR n'atteint aucun service                     |
| `pwa-deploy.yml`                 | `build-env`, `required-env`, `firebase-project`  | `FIREBASE_SERVICE_ACCOUNT_KEY` (si `firebase-project`)                         | pose `VITE_BASE_PATH` et le repli SPA ; s'arrête sur une variable requise vide            |
| `pwa-lighthouse.yml`             | `build-env` (factices)                           | aucun                                                                          | refuse un audit sans page rendue                                                          |
| `pwa-supabase-migrate.yml`       | `deploy-functions`, `functions-flags`            | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`         | échoue en nommant le secret absent — conditionner le job à `vars.VITE_SUPABASE_URL != ''` |
| `pwa-supabase-keepalive.yml`     | `table`                                          | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — **à nourrir depuis `vars`**    | exige la table `keep_alive` ; sans elle, 404 en silence                                   |
| `pwa-supabase-test.yml`          | `cli-version`, `exclude`                         | aucun                                                                          | pile jetable du runner                                                                    |
| `pwa-worker-deploy.yml`          | `working-directory`                              | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (facultatifs)                  | absent = déploiement ignoré, sans échec                                                   |
| action `firebase-deploy`         | `project-id`, `only`                             | `service-account-key` **ou** `token` (déprécié)                                | pour un déploiement écrit à la main                                                       |
| `renovate.yml` (le socle seul)   | —                                                | `RENOVATE_TOKEN` — un jeton classique, cf. l'en-tête du fichier                | absent = « Renovate ne tourne pas », en notice, à chaque samedi                           |
| `sync-from-private.yml` (miroir) | —                                                | `PRIVATE_READ_TOKEN` — PAT classique, scope `repo`, lecture sur le dépôt privé | le miroir `mister-family-map` ne reçoit jamais de PR                                      |

## 3. La procédure — le cas standard

Une application née du squelette, qui prend un projet Supabase. Sept gestes,
dans cet ordre ; les variantes sont au § 4.

### 3.1 Déclarer

Le squelette livre `config/env.manifest.json` et `.env.example`. Toute variable
que le code lit y figure, avec son rangement (`vars` / `secrets` / `local`), sa
phase et son repli. Deux invariants, que `pwa-doctor` tient : une `VITE_*` n'a
jamais `store: "secrets"` ; un `store: "secrets"` ne commence jamais par
`VITE_`. Une exception s'écrit, avec sa raison.

### 3.2 Poser les variables

```bash
gh variable set VITE_SUPABASE_URL --body "https://<ref>.supabase.co" -R mister-guiiug/<app>
```

```bash
gh variable set VITE_SUPABASE_ANON_KEY --body "<clé anon, vérifiée au § 1>" -R mister-guiiug/<app>
```

`VITE_BACKEND=supabase` seulement si l'application force le backend au lieu de
le déduire des deux variables présentes (le squelette le déduit).

Variantes équivalentes :

- **plusieurs d'un coup**, depuis un fichier au format `.env` (à ne pas
  committer, même sans secret) :

  ```bash
  gh variable set -f variables.env -R mister-guiiug/<app>
  ```

- **l'interface web** : Settings → Secrets and variables → Actions → onglet
  _Variables_ → _New repository variable_. Même résultat, même portée.
- **l'API**, pour un script : `gh api -X POST repos/mister-guiiug/<app>/actions/variables -f name=… -f value=…`
  (puis `PATCH …/variables/<name>` pour modifier). `gh variable set` fait
  exactement cela.

### 3.3 Poser les secrets — par le propriétaire

Les trois du réutilisable de migration. La valeur passe par l'entrée standard,
jamais en argument — un argument reste dans l'historique du shell :

```bash
gh secret set SUPABASE_ACCESS_TOKEN -R mister-guiiug/<app> < jeton.txt
```

```bash
gh secret set SUPABASE_DB_PASSWORD -R mister-guiiug/<app>
```

(sans redirection, `gh` demande la valeur sans l'afficher). `SUPABASE_PROJECT_ID`
est déclaré en secret par le réutilisable et n'en est pas un ; le poser en
`vars` et nourrir le slot par `${{ vars.SUPABASE_PROJECT_ID }}` est la forme
juste — c'est ce que le keep-alive fait déjà pour l'URL et la clé.

Variantes : `gh secret set -f secrets.env` depuis un fichier `.env` **à effacer
aussitôt** ; l'interface web (onglet _Secrets_) ; `--env production` pour un
secret d'Environment, le jour où le parc en utilise un.

### 3.4 Brancher dans les workflows

`deploy.yml` — les variables par `build-env`, les indispensables par
`required-env`, aucun `secrets: inherit` :

```yaml
jobs:
  deploy:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v4
    with:
      use-base-path: true
      build-env: |
        VITE_SUPABASE_URL=${{ vars.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY=${{ vars.VITE_SUPABASE_ANON_KEY }}
      required-env: |
        VITE_SUPABASE_URL
        VITE_SUPABASE_ANON_KEY
```

`supabase-migrations.yml` — les secrets nommés, et le job conditionné à la
variable qui active déjà le backend (sinon un dépôt sans projet rougit à chaque
poussée) :

```yaml
jobs:
  migrate:
    if: vars.VITE_SUPABASE_URL != ''
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-supabase-migrate.yml@v4
    secrets:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_PROJECT_ID: ${{ vars.SUPABASE_PROJECT_ID }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

`supabase-keepalive.yml` — les slots `secrets:` nourris par les `vars` (aucun
secret à poser), et **la table `keep_alive` appliquée au projet** : sans elle,
le ping répond 404 en silence et le projet Free s'endort au bout de sept jours.

`ci.yml` — des valeurs **factices** dans `build-env` quand le build exige des
clés (Firebase, ou un module qui valide l'environnement au chargement). Jamais
les vraies : un build de PR n'a rien à joindre.

### 3.5 Régler côté Supabase — ce qu'aucun workflow ne peut poser

- **L'adresse de retour du lien de connexion.** Un projet neuf n'autorise que
  `http://localhost:3000` : le lien part, l'utilisateur clique, et n'arrive
  nulle part. Authentication → URL Configuration, ou l'API de gestion :

  ```bash
  curl -s -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
    -d '{"site_url":"https://mister-guiiug.github.io/<app>/","uri_allow_list":"https://mister-guiiug.github.io/<app>/,http://localhost:<port>/"}' \
    "https://api.supabase.com/v1/projects/<ref>/config/auth"
  ```

- **Le hook « Custom Access Token »** (Authentication → Hooks, ou
  `hook_custom_access_token_enabled` + `hook_custom_access_token_uri` =
  `pg-functions://postgres/public/custom_access_token_hook` par la même API) :
  sans lui, le jeton ne porte aucun rôle et `useRole()` ne voit jamais un
  administrateur.
- **Les secrets d'une fonction Edge**, par fichier et jamais en ligne de
  commande :

  ```bash
  supabase secrets set --env-file fonction.env --project-ref <ref>
  ```

- **Le poste** : `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` et les secrets
  de fonction dans `.env.supabase.local` (ignoré par git, `chmod 600`) ; le
  jeton personnel dans un fichier hors du dépôt, lu par
  `export SUPABASE_ACCESS_TOKEN="$(tr -d '\r\n ' < ../supabase-token.txt)"`,
  jamais affiché.

### 3.6 Le poste de développement

Vite lit `.env`, `.env.local`, `.env.<mode>` et `.env.<mode>.local`. Les
valeurs du poste vont dans `.env.development.local` ; `.gitignore` ignore
`.env` et `.env.*` et n'excepte que `.env.example` (et `.env.production`
quand l'application a choisi l'exception versionnée). `pwa-doctor` refuse une
`VITE_*` lue par le code et absente de `.env.example`.

### 3.7 Vérifier

| Ce qu'on vérifie               | Comment                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Ce que GitHub détient          | `gh variable list -R mister-guiiug/<app>` ; `gh secret list -R …` (noms seulement)                      |
| Le rangement                   | `npx pwa-doctor` : `vite-en-secret`, `secrets-inherit`, `env-example`, `env-example-incomplet`          |
| Une valeur requise vide        | l'étape « Vérifier les variables requises » du déploiement échoue en la nommant                         |
| Le keep-alive                  | `gh workflow run supabase-keepalive.yml -R …` puis le run : HTTP 200, pas 404                           |
| Ce qu'un build EN LIGNE a reçu | l'écran Réglages de l'application (`configReport()` du squelette dit le backend actif et ce qui manque) |
| Ce que l'hébergeur sert        | `node scripts/probe-sites.mjs <app>` depuis le socle                                                    |

## 4. Les variantes, par situation

**A. Une application sans backend.** Rien à poser. `.env.example` le dit
(« aucune variable n'est requise »), `required-env` reste vide, et c'est une
propriété à conserver : hors ligne, tests sans secrets, page publique sans
compte.

**B. Firebase.** Les `VITE_FIREBASE_*` sont publiques : en `vars`, ou dans un
`.env.production` versionné (miss-ticket-pwa — l'exception doit être écrite au
manifeste). Le déploiement des règles passe par `firebase-project` +
`firebase-only` du réutilisable, avec le secret `FIREBASE_SERVICE_ACCOUNT_KEY`
(le JSON du compte de service). La variante `FIREBASE_TOKEN` (`firebase
login:ci`, dépréciée par Firebase) n'existe que dans l'action composite
`firebase-deploy`, donc dans un déploiement écrit à la main — c'est l'état de
mister-puzzle, tant que ses sept clés vivent en secrets. En CI : sept valeurs
factices dans `build-env`, comme `ci.yml` de puzzle le fait.

**C. Un Worker Cloudflare.** `CLOUDFLARE_API_TOKEN` — un **jeton d'API**
restreint (Workers Scripts : Edit), pas la Global API Key — et
`CLOUDFLARE_ACCOUNT_ID` si le jeton couvre plusieurs comptes. Le réutilisable
`pwa-worker-deploy.yml` **ignore** le déploiement quand le jeton manque, sans
échouer. La Global API Key ne marche qu'accompagnée de l'e-mail du compte
(`CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`) et répond « Invalid API Token » en
Bearer : ne pas la confondre avec un jeton.

**D. L'observabilité.** `VITE_SENTRY_DSN` en `vars`, facultative, **jamais**
dans `required-env` : absente, Sentry n'est pas chargé et l'application tourne.

**E. Une valeur qui n'est lue que par un serveur annexe** (`CORS_ORIGINS` du
serveur de puzzle) : `phase: "server"` au manifeste, pour qu'un audit ne la
compte pas comme orpheline.

**F. Le socle lui-même.** `RENOVATE_TOKEN` (un jeton classique, voir l'en-tête
de `renovate.yml`) est le seul secret que le socle attend ; sans lui, chaque
exécution planifiée s'arrête en notice et **aucun dépôt ne reçoit ses montées**
— c'est l'état du parc depuis sa création. En local, le socle s'installe avec
un jeton `read:packages` (`npm login --scope=@mister-guiiug`, ou
`NODE_AUTH_TOKEN` avant `npm ci`) ; en CI, `GITHUB_TOKEN` suffit.

**G. Un dépôt privé et son miroir public.** Le miroir porte `PRIVATE_READ_TOKEN`
(PAT classique, scope `repo`, lecture sur le privé). Les valeurs de l'application
se posent sur le **miroir**, seul dépôt où la CI et le déploiement tournent.

**H. Déplacer une valeur de `secrets` vers `vars`** — le cas de puzzle, et de
toute `VITE_*` rangée à tort :

1. reprendre la valeur **chez le fournisseur** (elle ne se relit pas sur
   GitHub) ;
2. `gh variable set VITE_X --body "…"` ;
3. faire lire `vars.VITE_X` par le workflow, dans la même PR ;
4. vérifier le déploiement ;
5. `gh secret delete VITE_X` — en dernier, jamais avant : une valeur déplacée
   pendant qu'un workflow tourne fait un déploiement à moitié configuré.

**I. Retirer, faire tourner.** `gh secret delete NOM -R …`,
`gh variable delete NOM -R …`. Un jeton fine-grained qui expire ne casse pas
bruyamment : Renovate cesse d'ouvrir des PR, le miroir cesse de se
synchroniser, et on s'en aperçoit des mois plus tard — d'où `rotation` et
`lastRotated` au manifeste, et une vérification à date fixe.

**J. Plusieurs dépôts en une passe.** Une boucle sur `gh` suffit, valeurs
lues d'un fichier hors dépôt :

```bash
for app in miss-uwh mister-doc; do gh variable set VITE_SENTRY_DSN --body "$DSN" -R "mister-guiiug/$app"; done
```

Ne jamais le faire pour un secret depuis un script partagé : la valeur y
resterait.

**K. Les Environments GitHub** (`--env production`) restent disponibles et
inutilisés : ils n'apportent quelque chose qu'avec deux cibles de déploiement,
ce qu'aucune application du parc n'a. Le jour venu, CONFIG.md (phase 4) en
dit l'ordre.

## 5. Les pièges, datés

| Piège                                                                    | Symptôme                                                                                                         | Parade                                                                      |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `${{ secrets.X }}` dans le `with:` d'un job `uses:` (puzzle, 06/09/2026) | run nommé `.github/workflows/deploy.yml`, `failure` sans étape, sur `main` seulement                             | les `VITE_*` en `vars` ; les secrets par le bloc `secrets:`                 |
| `secrets: inherit` (12 appelants sur 16, 04/09/2026)                     | aucun — c'est le problème : le workflow appelé reçoit tout le trousseau                                          | nommer ; `pwa-doctor` le relève                                             |
| `VITE_*` en secret (15 valeurs sur 3 dépôts)                             | journaux masqués, bundle en clair, conversion au réutilisable impossible                                         | déplacer (§ 4.H)                                                            |
| variable absente = chaîne vide (mister-qowa)                             | site en ligne, `apiKey: undefined`, CI verte                                                                     | `required-env`                                                              |
| keep-alive sans table `keep_alive`                                       | 404 en silence, projet en pause au 7ᵉ jour, plus aucun déploiement (carbook)                                     | appliquer `templates/supabase/keep-alive.sql`, tester par `gh workflow run` |
| `site_url` / liste d'URL de retour à `localhost:3000`                    | le lien de connexion n'arrive nulle part                                                                         | § 3.5                                                                       |
| hook de jeton non activé                                                 | `useRole()` ne voit jamais un administrateur                                                                     | § 3.5                                                                       |
| Global API Key Cloudflare sans l'e-mail                                  | « Invalid API Token »                                                                                            | un jeton d'API restreint                                                    |
| `.env` absent de `.gitignore` (cim10, corrigé le 04/09)                  | une valeur du poste commitée                                                                                     | `.env` et `.env.*`, exceptions nommées                                      |
| valeur perdue                                                            | `gh secret` ne la rend pas                                                                                       | la reprendre chez le fournisseur ; la régénérer si c'est un jeton           |
| `build-env` avec guillemets ou `export`                                  | la valeur part avec ses guillemets ; une ligne `export X=…` définit une variable nommée « export X », en silence | une ligne `KEY=VALUE`, nue                                                  |
| jeton fine-grained expiré                                                | Renovate ou le miroir se taisent, des mois durant                                                                | `rotation` au manifeste, vérification datée                                 |

## 6. Aide-mémoire

```bash
gh variable list -R mister-guiiug/<app>
```

```bash
gh secret list -R mister-guiiug/<app>
```

```bash
gh variable set NOM --body "valeur" -R mister-guiiug/<app>
```

```bash
gh secret set NOM -R mister-guiiug/<app> < valeur.txt
```

```bash
gh variable delete NOM -R mister-guiiug/<app>
```

```bash
gh secret delete NOM -R mister-guiiug/<app>
```

```bash
npx pwa-doctor
```

```bash
gh workflow run supabase-keepalive.yml -R mister-guiiug/<app>
```
