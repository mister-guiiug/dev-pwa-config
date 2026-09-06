---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-screenshots` : le script de Vite est résolu par `vite/package.json` et son champ `bin`. `vite/bin/vite.js` n'est pas exporté par le paquet, et le bin sortait en `ERR_PACKAGE_PATH_NOT_EXPORTED` à sa première exécution réelle.
