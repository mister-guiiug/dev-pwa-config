---
'@mister-guiiug/dev-wpa-config': minor
---

Synchro : la fabrique de client Supabase, et la file d'écritures hors-ligne qui manquait au socle.

**`./supabase-client`** — PROMU de **5 apps** (miss-uwh, miss-lookhouse, mister-molkky, mister-doc, bac-sable) qui réécrivent la même fabrique avec de petites divergences — et c'est dans les divergences que sont les défauts. La doctrine anti-écran-blanc d'abord : « l'init au chargement du module tuait l'app avant `createRoot()` », commentaire retrouvé **mot pour mot** dans miss-carbook et mister-puzzle, sur deux backends. Ici rien ne s'exécute à l'import : configuration jugée par `missingConfig` (`./backend`, `SUPABASE_ENV_KEYS` se passe tel quel à un `requires`), SDK (~120 Ko, peer optionnelle) importé dynamiquement au premier `getClient()` — c'est la **promesse** qui est gardée, deux appels concurrents ne créent qu'un client —, options `auth` passables (`persistSession`, `flowType: 'pkce'`…), et `fetch` corrélé optionnel via `./correlation` (le motif du bac-sable).

**`./sync-queue`** — le chemin **montant**, absent du socle (`realtime/` ne couvre que la descente). PROMU de miss-uwh (la référence : file persistante, drain sérialisé, backoff + jitter, lettres mortes) ; la copie de miss-lookhouse, « inspirée du syncQueue de miss-uwh », avait **perdu le retrait exponentiel** en route — la preuve que ça devait monter au socle — et mister-puzzle montrait le même besoin côté Firebase : le module est agnostique, `process` injecté. Le `Store` (`./storage`) injecté est la source de vérité, relu à chaque tour ; retrait par identifiant, jamais `slice(1)` ; lettre morte au lieu d'une tête bloquante (`defaultShouldRetry` de `react/net` fait la politique) ; rejeu auto-programmé via `backoffDelay` de `./realtime` — réutilisé, pas dupliqué ; fusion par entité (`keyOf`) ; plafond visible (`enqueue` rend `null`).

`react/use-offline-queue` reste la variante React ; son en-tête renvoie désormais vers `sync-queue` (comportement inchangé).
