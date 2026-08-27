---
'@mister-guiiug/dev-wpa-config': minor
---

Stockage tolérant, coffre chiffré, préchargement des routes, et un port de notifications push.

**`./storage`** — PROMU. L'accès `localStorage` enveloppé de `try/catch` est recopié dans **7 apps sur 17**, la plus grosse duplication du relevé. La promotion ajoute `createStore(prefix)` : les seize apps sont servies depuis un seul domaine, donc un seul `localStorage`, et trois seulement préfixent leurs clés.

**`./secure-storage`** — PROMU de `miss-supaboss/src/api/crypto/patVault.ts` (AES-256-GCM, clé PBKDF2-SHA-256 en mémoire seule). Ses limites sont reprises telles quelles : protège la fuite passive, **pas** un XSS actif. Le nombre d'itérations est relu depuis le coffre, pour qu'en relever la constante ne rende pas illisibles les coffres existants.

**`./prefetch` et `./react/use-prefetch`** — NEUF, besoin constaté : les 17 apps découpent leurs routes en `lazy()`, aucune ne les préchauffe. Le précache du service worker ne couvre que la deuxième visite. Préchargement sur l'intention (pointeur, focus, doigt), coupé sur `saveData` et en 2G.

**`./push` + `./push/firebase`, `./push/supabase`, `./push/webpush`** — NEUF ASSUMÉ : aucun code push n'existait dans les dépôts relevés. Livré comme un **port avec adaptateurs**, sur le modèle de `MapProvider` — le paquet n'impose aucun fournisseur. Rapporte _pourquoi_ le push est indisponible (dont le cas iPhone-en-onglet), ne redemande pas une permission déjà refusée, et désabonne côté serveur d'abord.

Le volet **Logging** de la demande existait déjà (`./logger`), de même que l'offline, la mise à jour et les stratégies de cache (`./vite-pwa`, `./sw-update`).
