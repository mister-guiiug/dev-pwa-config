---
'@mister-guiiug/dev-pwa-config': patch
---

`cspPlugin` garde toujours `'self'` en `connect-src`, et le dit au build quand l'app l'avait omis. Une liste `connectSrc` remplace le défaut : miss-devises ne reprenait pas `'self'`, la sonde de `sw-update` (requête `HEAD` vers la page) et la websocket du rechargement à chaud de Vite étaient refusées par la CSP. « Forcer la mise à jour » ne purgeait plus, même en ligne (corrigé côté sonde par la 6.28.1 ; ceci ferme la porte côté politique). `'none'` cède la place à `'self'`.
