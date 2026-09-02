---
'@mister-guiiug/dev-wpa-config': minor
---

Les petites demandes écrites dans les apps : `Badge` `size`, `useFullscreen`, `cn`

Le tri de `GISEMENTS.md` a relevé, dans les commentaires des apps, ce que le
socle ne leur donnait pas. Trois demandes tiennent chacune dans dix lignes :

- **`Badge` gagne un axe de taille** — `xs` / `sm` / `md` (`md` est l'ancien
  et seul rendu). `mister-doc` gardait ses pastilles de calendrier hors du
  paquet parce que « `size="xs"` n'a pas d'équivalent : le socle n'a pas d'axe
  de taille ».
- **`react/use-fullscreen`** — le plein écran natif : `supported`, `active`
  (suit `fullscreenchange`), `enter` / `exit` / `toggle` qui ne lèvent jamais.
  `miss-badminton` (62 l.) et `mister-molkky` (44 l.) portaient le même bouton ;
  le paquet promeut le hook, le bouton reste à l'app.
- **`cn`** — joint des classes (chaînes, tableaux, objets `{ classe:
condition }`). `miss-genius` et `miss-uwh` en portaient la même copie de
  cinq lignes, à la lettre.

Deux autres demandes de la même liste avaient **déjà leur réponse** dans le
socle, et sont documentées comme telles dans `GISEMENTS.md` : le GIF dans
`IMAGE_ACCEPTED_TYPES` est refusé par une décision écrite dans le module
même (la liste est un plancher, on l'élargit au site d'appel), et les canaux
temps réel orphelins sont refermés depuis 3.24.0 — le contournement de
carbook survit à un défaut qui n'existe plus.
