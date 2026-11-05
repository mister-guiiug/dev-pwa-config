---
'@mister-guiiug/dev-pwa-config': minor
---

`supabase-client` : la case de session se connaît avant le SDK. Il y a deux ajouts : `storageKey()` sur la fabrique, et la fonction `supabaseStorageKey(url)`.

Toute la famille est servie depuis une seule origine, donc avec un seul `localStorage`. Depuis la 6.30.0, `storedSupabaseSession(client)` lit la session de CE projet sous la case que nomme le client (`client.auth.storageKey`). Une app qui charge le SDK à la demande passe cependant à `supabaseAuthAdapter` une enveloppe, objet ou `Proxy`, qui ne connaît pas cette case. Au démarrage hors ligne, le SDK n'est pas là pour la dire, et l'adaptateur retombait sur la première case `sb-*` venue, peut-être celle d'une autre app.

- **Promu de trois apps.** miss-holi-voyage, miss-lookhouse et mister-settle recalculaient chacune la case depuis `VITE_SUPABASE_URL` (`sb-<premier label de l'hôte>-auth-token`, la formule de supabase-js 2.118.0). Chacune confrontait sa formule au SDK installé.
- **`storageKey()`** rend la case sans charger le SDK : celle de `auth.storageKey` (ou `clientOptions.auth.storageKey`) si l'app l'impose, sinon celle que le SDK dériverait de l'URL. Sans URL, elle rend `null`.
- **La fabrique passe cette case à `createClient`.** Le nom annoncé et le nom écrit sont donc le même par construction, quoi que fasse une version future du SDK. Aujourd'hui, c'est exactement son défaut : aucune session rangée ne change de case, et personne n'est déconnecté.
- **Mode d'emploi** : dans l'enveloppe, `if (methode === 'storageKey') return supabase.storageKey();`. Sans fabrique sous la main, `supabaseStorageKey(url)` fait le même calcul.
