---
'@mister-guiiug/dev-wpa-config': minor
---

Carte : la vue initiale part par `onReady`, plus par `onViewportChange`.

Les deux adaptateurs annonçaient la vue de départ par `onViewportChange` —
`whenReady` côté Leaflet, `once('load')` côté MapLibre. Une carte qui finit de
s'initialiser n'a pourtant rien déplacé, et confondre les deux fait d'elle un
**second écrivain** de l'état qu'elle est censée refléter.

Le défaut se voit sur une machine lente, donc jamais en développement :
`mister-family-map` recopie ce callback dans le brouillon de son assistant
« ajouter un lieu » ; sur un runner à WebGL logiciel, le `load` de la carte
tombait après la saisie et le centre par défaut (46.6 / 2.4, le milieu de la
France) écrasait les coordonnées tapées. La détection de doublons cherchait
alors à 400 km du lieu visé, et le parcours critique échouait trois fois sur
trois — uniquement en CI.

- `onViewportChange` ne signale plus que les déplacements réels.
- `onReady` livre la vue initiale, une fois, quand la carte est prête : c'est
  ce qu'il faut pour amorcer un zoom ou un regroupement de marqueurs.

**Migration** : un écran qui s'appuyait sur la première émission pour connaître
son zoom de départ doit désormais brancher `onReady`. Un écran qui n'utilisait
`onViewportChange` que pour suivre l'utilisateur n'a rien à changer — et cesse
d'être écrasé.
