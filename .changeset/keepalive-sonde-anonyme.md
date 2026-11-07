---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-supabase-keepalive.yml` : sonde anonyme optionnelle (`anon-probe`). Le ping ne lit que `keep_alive` ; pendant trois jours, jusqu'au 07/11/2026, le jeu public de miss-arcade a renvoyé 401 à tout visiteur anonyme (une politique RLS appelait une fonction que `anon` ne peut pas exécuter), et le keep-alive restait vert.

- `anon-probe: 'rest/v1/<table>?select=…'` lit ce chemin avec la même clé anon, après le ping. Rouge sur 401/403, avec la cause recopiée de PostgREST, et sur tout autre code que 200.
- `anon-probe-nonempty: true` exige en plus une réponse non vide : une RLS qui filtre tout rend `[]` en 200.
- Sans l'entrée, rien ne change.

Migration : facultative — poser `anon-probe` dans le caller des apps dont un visiteur anonyme lit des données (miss-arcade d'abord : `rest/v1/tenants?select=id&slug=eq.demo&published=eq.true&limit=1`).
