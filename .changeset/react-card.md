---
'@mister-guiiug/dev-wpa-config': minor
---

`react/card` — `Card` et `CardHeader`, la surface que dix apps avaient

Le socle avait `Button`, `Field`, `Badge`, `Sheet`, `Stat`… et pas de carte.
Dix apps sur dix-sept en avaient une, aucune du paquet : `Card.tsx` dans
`miss-genius` et `miss-uwh` — **le même fichier**, au préfixe de variable
près (`--mg-surface` contre `--uwh-surface`) —, dans `mister-footcoach`
(avec `CardHeader`, 23 importateurs) et `mister-qowa` ; et une classe `.card`
écrite à la main dans six feuilles de style de plus.

Le contrat est celui de footcoach, le plus complet : `Card` (`as`, `padding`)
et `CardHeader` (`title`, `subtitle`, `action`, `as` pour le niveau de titre).
`components.css` l'habille sous `[data-dwc="card"]` sur `--dwc-surface`,
`--dwc-border`, `--dwc-radius` — exactement les variables que les copies
nommaient chacune à sa façon.

Une carte est une surface, pas un contrôle : l'action va dans `action`, sur
un élément focusable, jamais en `onClick` sur le `div`. Quatre tests, une
fiche au showroom, une entrée dans la table d'équivalences.
