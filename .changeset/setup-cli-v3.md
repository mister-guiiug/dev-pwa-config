---
'@mister-guiiug/dev-pwa-config': patch
---

`supabase/setup-cli` passe en v3.0.1, épinglée au même SHA dans l'action `supabase-migrate` et dans `pwa-supabase-test.yml`. L'action était en v1.7.1, et le réutilisable suivait le tag mobile `@v1`. La v1 tournait sur Node 20, que GitHub déclare obsolète. La v3 installe le CLI depuis npm (le paquet `supabase`, binaires `@supabase/cli-*`) avec le Node et le npm du runner : la version, même `latest`, ne se résout plus par l'API GitHub. Les images de `supabase start` viennent toujours de public.ecr.aws : comme la v1 depuis la v1.7.2, la v3.0.1 laisse le CLI choisir son registre au lieu d'imposer GHCR, qui bride.

Le CLI reste en 2.119.0. Renovate le suit désormais sur npm, la source même de l'installation : annotation `datasource=npm depName=supabase`, et un `extractVersionTemplate` qui accepte les versions sans « v ». L'ancien, `^v…`, aurait écarté toutes les versions npm sans un message. `test/supabase-cli-epingle.test.mjs` garde ces deux points, et le même SHA dans les deux appels.

Rien à faire dans les applications. `npm` tourne dans le dépôt appelant et lit donc son `.npmrc`, qui dans tout le parc ne vise que le scope `@mister-guiiug`.
