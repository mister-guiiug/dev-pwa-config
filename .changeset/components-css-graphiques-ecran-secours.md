---
'@mister-guiiug/dev-wpa-config': minor
---

`components.css` : habiller les graphiques minuscules, et faire de la frontière d'erreur montée à la racine un vrai écran de secours.

**`[data-dwc='sparkline' | 'bars' | 'gauge']`** — les composants de `/react/sparkline` rendent la géométrie, jamais la couleur : sans habillage, les barres (hauteur en %) et la jauge s'effondrent faute de boîte. L'habillage pose les dimensions par défaut, l'encre de marque via `currentColor` (recolorer = une règle `color` de l'app), et rend l'alternative textuelle de `describeSeries` lue-mais-pas-vue sans dépendre d'un utilitaire `sr-only` que l'app a pu purger. En contraste forcé, barres et jauge — qui n'existaient que par leurs aplats, comme le squelette — reçoivent l'encre système.

**`[data-dwc='error-boundary']` à la racine** — trois apps (mister-footcoach, miss-carbook, mister-puzzle) recopient le même bloc, à l'octet près : l'écran blanc évité doit être un **écran** centré, pas une bannière perdue en haut de page. La règle `:where(#root) > …` reprend leurs choix (plein écran, centré, cadre et fond de danger retirés — pleine page, ils crieraient plus fort que le message) sans toucher au rendu de la frontière posée au milieu d'une page. La référence à citer au support (`error-boundary-reference`) est enfin habillée : discrète, et copiable d'un geste (`user-select: all`).

Tout reste dans le contrat : `@layer components`, les quinze variables `--dwc-*` et rien d'autre, un repli sur chaque `var()` — les garde-fous de `test/components-css.test.mjs` en témoignent.
