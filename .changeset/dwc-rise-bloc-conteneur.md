---
'@mister-guiiug/dev-wpa-config': patch
---

`components.css` : une boîte de confirmation ouverte depuis une feuille couvre enfin l'écran.

`ConfirmDialog` est `position: fixed; inset: 0; z-index: 60`, et on l'ouvre le plus souvent **depuis** une feuille — donc à l'intérieur de `sheet-panel`. Son voile se repliait alors sur les dimensions de la feuille au lieu de couvrir l'écran, et son `z-index` restait prisonnier du panneau : la boîte s'affichait en transparence, par-dessus le formulaire. Mesuré sur `miss-uwh` : 480 × 634 au lieu de 1280 × 720.

La cause n'est pas dans `ConfirmDialog` mais dans l'animation d'entrée des panneaux. `dwc-rise` portait `animation-fill-mode: both`, qui **retient** la valeur d'arrivée après la fin ; une transformation retenue reste une transformation, même réduite à l'identité, et un `transform` autre que `none` fait de l'élément le bloc conteneur de ses descendants `position: fixed`. Le panneau laissait `matrix(1, 0, 0, 1, 0, 0)` derrière lui, à demeure.

`sheet-panel`, `confirm-panel` et `toast` passent donc à `backwards`. Aucun changement visible : `dwc-rise` n'ayant pas d'image-clé `to`, son état d'arrivée est déjà l'état naturel de l'élément — il n'y a rien à retenir, et rien ne saute à la fin. Le panneau retombe à `transform: none`, le voile à 1280 × 720.

Une app qui redonne sa propre animation d'entrée aux panneaux en CSS non « layered » écrase cette règle et rouvre la brèche : utiliser `backwards` là aussi. Le détail est commenté sur `@keyframes dwc-rise`, et un garde-fou refuse désormais tout `both`/`forwards` dans le fichier.
