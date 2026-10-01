---
'@mister-guiiug/dev-pwa-config': patch
---

Le CLI Supabase est épinglé à 2.119.0, au lieu de `latest`, dans l'action `supabase-migrate` et les réutilisables `pwa-supabase-migrate.yml` et `pwa-supabase-test.yml`.

`latest` fait résoudre la version par `supabase/setup-cli`, qui interroge l'API GitHub sans jeton. Le 30/09/2026, sous la charge d'une campagne sur le parc, la limite de débit a fait échouer le job `migrate` de miss-carbook (« Failed to resolve latest Supabase CLI release: rate limit exceeded ») : aucune migration appliquée, et le déploiement sauté. Une version fixe se télécharge directement, sans l'API, et rend les migrations reproductibles. La pile jetable de `pwa-supabase-test` éprouve désormais les migrations avec le CLI même qui les appliquera.

2.119.0 est la dernière version stable : les runs verts du parc l'utilisent depuis le 30/09 au soir, dont le pgTAP de miss-carbook (26 migrations sur une base neuve). Renovate la tiendra à jour : un `customManagers` de `renovate.json` lit l'annotation `# renovate:` qui précède chaque `default:`. `test/supabase-cli-epingle.test.mjs` vérifie que les trois valeurs restent égales, complètes, et lues par Renovate.

Rien à faire dans les apps : celles qui ne passent pas `cli-version` reçoivent l'épingle avec `@v6`. Celles qui l'écrivent gardent leur valeur ; mister-molkky épingle déjà 2.118.0 de lui-même.
