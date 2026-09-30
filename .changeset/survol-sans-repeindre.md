---
'@mister-guiiug/dev-pwa-config': patch
---

Le survol des boutons ne repeint plus : le contraste au survol est celui du repos.

`Button` et « Mettre à jour » (`update-banner-update`) signalaient le survol par `filter: brightness(1.08)`, qui éclaircit le fond ET l'encre. Sous une encre claire, le fond se rapproche d'elle. Mesuré sur les 38 palettes de `themes.js` : le contraste baissait au survol dans 20 palettes en `primary` comme en `danger`, et passait sous 4,5:1 dans onze cas qui le tenaient au repos (huit en `danger`, deux en `outline`, mister-molkky clair en `primary` : 4,99 → 4,39). Aucun sens de variation n'est sûr pour toutes les paires : foncer aide sous le blanc et nuit sous une encre sombre.

- **Tous les boutons** se relèvent d'un pixel au survol, comme la carte d'application (huit apps avaient écrit ce relèvement).
- **Les deux aplats** (`primary`, `danger`) et « Mettre à jour » gagnent un halo de leur propre teinte, celui que mister-miss-koh posait déjà sur ses boutons.
- **Sous `@media (hover: hover)` seulement** : sur un écran tactile, `:hover` restait collé après le tap (relevé par mister-miss-koh).
- **Contraste forcé** : la paire système `Highlight` / `HighlightText` reste le signal du survol, sous la même condition.

Deux garde-fous dans `test/components-css.test.mjs` : aucun survol de bouton ne touche au fond, à l'encre, au filtre ni à l'opacité, et aucun survol du fichier ne passe par un filtre.
