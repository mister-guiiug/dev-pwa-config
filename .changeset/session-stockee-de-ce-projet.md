---
'@mister-guiiug/dev-pwa-config': minor
---

`auth/stored-session` : `storedSupabaseSession(client)` lit la session de **ce** projet, et plus la première case `sb-*-auth-token` venue.

Toute la famille est servie depuis `mister-guiiug.github.io`, donc avec un seul `localStorage`. Sur un appareil qui sert à deux apps Supabase du parc, deux cases cohabitent, et la lecture par motif pouvait rendre celle de l'autre app. Relevé le 05/11/2026 par l'audit hors ligne : hors ligne, une app pouvait ouvrir son écran sous l'utilisateur d'une autre. Une vraie déconnexion pouvait aussi passer pour un renouvellement de jeton abandonné, parce qu'une autre app avait encore sa session.

- **Avec le client**, le nom de case est celui que le SDK a choisi, lu dans `client.auth.storageKey` : ni recalculé depuis l'URL, ni imposé. Un `storageKey` explicite est suivi. Si cette case est vide, la réponse est `null`, même quand une autre app a sa session à côté.
- **`supabaseAuthAdapter`** passe son client. Les apps qui s'en servent sont corrigées en montant le socle, sans changer de code.
- **Sans argument**, ou avec un client qui ne dit pas sa case (client simulé de test), la lecture par motif reste, ambiguë comme avant. Les appels directs sont à migrer : `storedSupabaseSession()` devient `storedSupabaseSession(supabase)`. Ils sont relevés dans miss-uwh et mister-doc (`AuthContext.tsx`), miss-lookhouse (`auth/index.ts`) et mister-settle (`sessionUserId.ts`).
