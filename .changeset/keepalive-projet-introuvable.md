---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-supabase-keepalive.yml` dit pourquoi le ping échoue. Relevé sur mister-settle, rouge chaque jour du 18 au 26/10/2026 : le projet Supabase n'existait plus dans le DNS, et l'étape s'arrêtait sur « exit code 6 », sans rien dire de la cause.

- **Projet absent du DNS** (curl, code 6) : « Projet Supabase introuvable ». Le message dit quoi faire : restaurer un projet en pause depuis le tableau de bord, ou mettre à jour `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` après une suppression.
- **Autre échec réseau** : « Projet Supabase injoignable », avec le code de curl.
- Le message ne recopie pas l'adresse du projet, qui vient d'un secret.
