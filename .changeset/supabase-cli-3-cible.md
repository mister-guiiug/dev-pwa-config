---
'@mister-guiiug/dev-pwa-config': patch
---

`supabase-migrate` et `pwa-supabase-migrate` sous la CLI Supabase 3 : `db push` visait la base **locale**, la cible par défaut de la 3, et hors terminal la CLI refusait tout changement hébergé sans `--yes`. Le 21/11/2026, avec la 3.2.0 devenue le défaut en 6.38.0, miss-carbook a cherché `127.0.0.1:54322` (rien d'appliqué, déploiement sauté) et le déploiement des Edge Functions de mister-doc s'est arrêté sur « Confirmation required ». L'action lit le majeur de la CLI : en 3, `supabase db push --remote --password … --yes` ; en 2 (`cli-version: 2.x`), la commande d'avant. `supabase functions deploy` passe `--yes`, que la 2 accepte aussi. Rien à changer dans les apps.
