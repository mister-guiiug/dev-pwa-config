---
'@mister-guiiug/dev-pwa-config': minor
---

Cinq gestes que plusieurs applications écrivaient chacune de leur côté entrent dans le socle. Ils ont été relevés dans le code de `main` des 24 applications, le 06/11/2026.

- **Le morceau Sentry** (`vite-pwa`, promu de dix-huit apps). Quatre pièces le composent. `sentryChunkFileNames` lui donne un nom sans empreinte, que les déploiements ne cassent plus. `withoutSentryPreload` le retire des préchargements de l'entrée. `sentryGlobIgnores()` le sort du précache. `sentryChunkGroups()` prend React dans un groupe de priorité plus haute : sans lui, `@sentry/react` entraînait React dans `sentry.js`, et mister-qowa, mister-settle et miss-ticket-pwa ne démarraient plus hors ligne (05/11/2026). `pwaWorkbox` sort désormais ce morceau du précache par défaut.
- **Le silence du réseau n'est pas une déconnexion** (`auth/stored-session`, `auth/supabase`, promu de quatre apps). `ignoreOfflineSignOut(session, client)` reconnaît l'évènement sans session qu'émet Supabase quand le renouvellement du jeton échoue hors ligne, alors que la session est encore rangée. **`supabaseAuthAdapter` l'applique** à `onAuthStateChange` : l'app n'éjecte plus son utilisateur au bout d'une demi-minute hors ligne. Une vraie déconnexion efface d'abord la session, et passe.
- **La session sans attendre le réseau** (`auth/supabase`, promu de cinq apps). `readSupabaseSession(client, { timeoutMs })` rend `{ session, fromStorage }` : le stockage hors ligne, `getSession()` borné en ligne, le stockage si l'appel lève. C'est la lecture de l'adaptateur, désormais exportée.
- **Le projet Supabase dans la CSP** (`vite-csp`, promu de douze apps). Comme le DSN de Sentry, `VITE_SUPABASE_URL` résolue par Vite vaut déclaration, sans option à poser. L'origine **exacte** du projet s'ajoute à `connect-src`, avec sa websocket, et à `img-src`. Dix apps passaient des jokers (`https://*.supabase.co`) qui ouvraient la politique à tous les projets Supabase.
- **Les polices Google hors ligne** (`vite-pwa`, promu de six apps). `googleFontsCaching()` rend les deux règles de la recette Workbox. `pwaWorkbox` les pose par défaut ; `googleFonts: false` pour s'en passer.
