---
'@mister-guiiug/dev-pwa-config': minor
---

`command` : la recherche Ctrl+K des pages HTML du parc devient un sous-chemin publié (`@mister-guiiug/dev-pwa-config/command`, types dans `command.d.ts`). Raccourcis Ctrl/Cmd+K et « / », combobox ARIA (`aria-activedescendant`, flèches, Échap), filtrage sans diacritiques, aucune dépendance et aucun accès au DOM au chargement. Promu de la mécanique que portaient déjà trois pages : le showroom, parc-dashboard et le hub.

Le module est entré avec #441, fusionnée sans changeset : ni la 6.24.0 ni l'étiquette `v6` ne le contiennent. Cette version le livre. Le hub (`mister-guiiug.github.io`) en dépend déjà : son build copie `command.js` à la racine du site. Le showroom, lui, en embarque désormais sa propre copie engendrée (`showroom/command.js`) au lieu d'importer `../command.js`, qui sur Pages visait la copie du hub.
