---
'@mister-guiiug/dev-pwa-config': minor
---

**L'audit SCA suit `server-dir` : les vingt-cinq alertes restantes du parc
étaient TOUTES dans un second manifeste, aucune à la racine.**

Les alertes Dependabot ont été activées sur les vingt-huit dépôts le
13/09/2026 — 135 alertes, dont 70 `high`. Le lot facile vidé, voici ce qui
restait au 14/09, et où :

| Manifeste                | Alertes | Portée                                                | `server-dir` déclaré ? |
| ------------------------ | ------: | ----------------------------------------------------- | ---------------------- |
| `mister-puzzle/server/`  |   **9** | **toutes `runtime`** — socket.io, ws, qs, body-parser | **oui** (`server`)     |
| `miss-genius/worker/`    |  **15** | undici, sharp, ws, esbuild                            | non (`worker/`)        |
| `miss-supatool/proxy/`   |   **1** | sharp                                                 | non (`proxy/`)         |
| Racine de ces trois apps |   **0** | —                                                     | —                      |

`npm audit --omit=dev` à la racine rendait « 0 vulnérabilité » dans les trois
cas, **et c'était exact** : aucune de ces dépendances n'y figure. L'étape
d'audit, elle, ne s'exécutait qu'à la racine.

Le cas de `mister-puzzle` dit tout : le dépôt déclare `server-dir: server`
depuis toujours, et le réutilisable s'en sert pour y lancer `npm ci` et
`tsc --noEmit`. Il savait donc exactement où était le backend — il l'y
type-vérifiait, il ne l'y auditait pas. Neuf avis, tous sur du code qui tourne
en production.

**Ce qui change.** Quand `server-dir` est renseignée et qu'un `package.json`
s'y trouve, l'audit y est rejoué, dans une étape au nom distinct :
`Audit dependencies (SCA — server)`. Deux étapes plutôt qu'une boucle, pour la
raison qui a déjà décidé du couple `Test` / `Test (couverture et seuils)` : le
journal doit dire lequel des deux manifestes a parlé, sans qu'il faille le
déduire d'un `if` caché.

Elle tombe **avant** `Server — install & type-check`, parce que `npm audit` lit
le **lockfile** et n'a besoin d'aucune installation — mesuré : un dossier qui
n'a que `package.json` + `package-lock.json`, sans `node_modules`, rend le
rapport complet, et `--omit=dev` y filtre correctement les dépendances de
développement.

**`server-dir` sans lockfile : l'étape échoue, en le disant.** Trois raisons,
dans cet ordre :

1. **Ce n'est pas un rouge neuf.** L'étape `Server — install & type-check` fait
   `npm ci`, qui refuse déjà ce cas (`EUSAGE`). Un `server-dir` sans lockfile a
   donc toujours eu une CI rouge ; la garde ne fait que le dire plus tôt, et en
   français, au lieu du `ENOLOCK` de npm — « This command requires an existing
   lockfile » — au milieu d'un job.
2. **Fabriquer un lockfile à la volée serait pire que de ne rien faire.** Un
   `npm install --package-lock-only` auditerait les versions résolues **du
   jour**, pas celles que le dépôt livre : un vert qui ne parle pas de ce qui
   est déployé.
3. **Sauter en silence reproduirait la panne qu'on répare.** C'est déjà la
   règle de `run-coverage`, qui refuse de démarrer sans son script plutôt que
   de retomber sur `npm run test`.

Aucun dépôt n'est concerné aujourd'hui : `mister-puzzle/server` porte son
lockfile. Les deux sous-projets du parc qui n'en ont pas — `miss-supaboss/proxy`
et `mister-tv-webos/companion` — ne déclarent pas `server-dir`.

**Ce que ce correctif NE couvre PAS.** Six dépôts du parc portent un second
manifeste ; **un seul déclare `server-dir`**. `miss-genius/worker`,
`miss-supatool/proxy`, `miss-supaboss/proxy`, `mister-doc/e2e` et
`mister-tv-webos/companion` resteront donc hors de l'audit tant qu'ils ne
renseignent pas l'entrée. Les vingt-cinq alertes ont été vidées à la main le
14/09 (`mister-puzzle#63`, `miss-genius#51`, `miss-supatool#31`) : ce qui est
réparé ici, c'est le fait que **rien n'aurait signalé les suivantes**.

Au passage, `npm-audit-level` part désormais par `env:` au lieu d'être
interpolée dans la ligne de commande — c'est la règle du dépôt pour toute
entrée d'appelant (`build-env`, `e2e-*`), et les deux audits s'y tiennent
maintenant. Comportement inchangé : `--omit=dev`, seuil `high` par défaut.

Cette version existe aussi pour faire avancer l'étiquette mobile `v4` : un
changement de workflow réutilisable n'atteint aucun des dix-neuf consommateurs
tant que rien n'est publié.
