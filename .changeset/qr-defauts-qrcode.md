---
'@mister-guiiug/dev-pwa-config': patch
---

**`/qr` retrouve les défauts de `qrcode` : marge 4 modules, correction `'M'`.**

La 4.16.0 promettait de garder « le vocabulaire d'options de `qrcode` ». Elle a
gardé les noms, pas les valeurs : une option omise laissait `uqr` appliquer le
sien — 1 module de marge au lieu de 4, correction `'L'` au lieu de `'M'`. Le
vocabulaire commun masquait l'écart, qui ne se découvre qu'au lecteur qui
peine à scanner.

Quatre modules parce que la « quiet zone » d'ISO 18004 les demande : c'est elle
qui permet au lecteur de trouver les bords du code, et sur un fond chargé un
seul module n'y suffit pas.

**Ce qui change chez les consommateurs.** Un seul des quatre appelants du parc
omettait une de ces options : `mister-molkky` laissait la correction au défaut
et produisait donc du `'L'` depuis la 4.16.0. Son QR revient en `'M'` — même
taille de code pour son URL, 34 % des modules redessinés, et 15 % de perte
tolérée au lieu de 7. Les trois autres fixent les deux options et ne bougent
pas.

`margin: 0` reste une valeur et non une absence : c'est `??` et non `||` qui
pose le défaut, sinon le zéro explicite de `miss-ticket-pwa` et de
`mister-qowa` gagnerait une marge que personne n'a demandée. Un test le tient.
