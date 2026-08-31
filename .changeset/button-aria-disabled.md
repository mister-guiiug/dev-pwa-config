---
'@mister-guiiug/dev-wpa-config': patch
---

`Button` et `useActionGuard` composent enfin.

`useActionGuard` rend `disabledProps: { 'aria-disabled': true }` — c'est le
motif que son en-tête documente. `ButtonProps` **retirait** `aria-disabled` de
son type, au motif que `loading` le pose. Les deux modules du paquet ne
composaient donc pas, et `mister-doc` (#45) a dû retomber sur `disabled` natif,
qui retire le bouton du parcours clavier et empêche donc de **découvrir** le
motif du blocage — exactement ce que le hook existe pour éviter.

Pire, l'habillage suivait la même faille : `components.css` ne stylait que
`:disabled`. Un bouton gardé avait donc **l'air actif tout en étant inerte**,
le pire des deux mondes. C'est ce qui a fait retomber `bac-sable` (#23) sur
`disabled` natif à son tour.

Les deux raisons de bloquer se cumulent maintenant : le clic est neutralisé
dans les deux cas, le focus est conservé dans les deux cas, et les deux sont
habillées pareil — y compris dans le bloc de contraste forcé, où l'opacité ne
signifie rien et où `GrayText` est le signal attendu.
