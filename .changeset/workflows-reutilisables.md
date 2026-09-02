---
'@mister-guiiug/dev-wpa-config': patch
---

Trois workflows réutilisables de plus — `cleanup-runs`, `pwa-supabase-migrate`, `pwa-worker-deploy`

`.github/workflows` est le dossier le plus recopié de la famille, et le mieux
outillé pour ne pas l'être : `pwa-ci`, `pwa-deploy`, `pwa-lighthouse` sont
appelables et adoptés partout. Restaient trois trous, mesurés le 02/09/2026 :

- **`cleanup-runs.yml` — 73 lignes, douze copies identiques.** Le socle avait
  le même fichier, mais en `workflow_dispatch` seulement : chaque dépôt devait
  l'héberger. Il déclare `workflow_call` ; une copie tombe à dix lignes. Les
  entrées passent par `env:` au lieu d'être interpolées dans le JavaScript.
- **`pwa-supabase-migrate.yml` — quatre copies, 35 à 143 lignes**
  (lookhouse, uwh, doc, carbook) autour de la même paire `supabase link` +
  `supabase db push`, avec la même concurrence « on ne coupe pas une migration
  en vol ». Une fois, avec le déploiement optionnel des Edge Functions.
- **`pwa-worker-deploy.yml` — deux copies** (genius, supaboss) du même
  `wrangler deploy`, avec la même décision : sans secret Cloudflare, on
  n'échoue pas, le Worker est optionnel.

Et un rappel que le README ne portait pas : **`pwa-supabase-keepalive.yml`
existait, réutilisable, et aucune des huit apps Supabase ne l'appelait** —
`miss-carbook` dort depuis le 29/08 et ne se déploie plus. Il figure
désormais dans la table des workflows, à côté de la migration.

`test/workflows.test.mjs` verrouille ce qu'un appelant est en droit
d'attendre : `workflow_call` déclaré, actions référencées par `@v3` (un
chemin relatif vise le checkout de l'appelant), jamais `secrets: inherit`,
et le `404.html` du déploiement Pages écrit entre le build et l'artefact.

Outillage de la famille, hors paquet npm : les apps le reçoivent quand `v3`
suit cette version.
