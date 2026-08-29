---
'@mister-guiiug/dev-wpa-config': minor
---

Authentification : le port `auth/` et ses adaptateurs, promus de cinq implémentations Supabase Auth indépendantes — mister-doc (la référence MFA : assurance aal1/aal2, enrôlement TOTP, erreurs traduites), miss-uwh (needsMfa + purge locale à la déconnexion), miss-lookhouse et miss-carbook (le même câblage getSession/onAuthStateChange recopié, drapeaux de montage contre la réponse périmée), mister-molkky (session anonyme avec repli silencieux quand le projet la désactive), et l'adaptateur local de bac-sable qui prouve le contrat en quatre méthodes.

- `auth/` : machine d'état de session (`loading` → `signed-out` | `signed-in` | `needs-mfa`), hydratations numérotées (une réponse périmée ne s'applique jamais), lecture MFA best-effort (l'échec hors-ligne ne verrouille pas), aucune notion de rôle métier (voir `react/use-action-guard`).
- `auth/supabase` : adaptateur v2 à client injecté (peer optionnelle) — mot de passe, lien magique/OTP, inscription avec `needsConfirmation`, anonyme avec le repli de molkky, erreurs rendues `{ code, message }`.
- `auth/mfa` : TOTP fidèle à `mister-doc/backend/mfa.ts` — enrôlement (qr_code/secret/uri tels que Supabase les donne, nettoyage des facteurs abandonnés), défi, facteurs. Pas de codes de récupération : ceux de doc sont des RPC applicatives, pas une API Supabase.
- `auth/errors-fr` : carte française des erreurs, fusion doc (sous-chaînes) + carbook (codes stables), repli configurable.
- `react/use-auth` (useSyncExternalStore, sans Provider) et `react/auth-gate` (garde non stylée loading/fallback/mfa/children, avec le `bypass` du mode local : la sécurité réelle est la RLS).
