---
'@mister-guiiug/dev-pwa-config': minor
---

`react/rive` : le chargement se signale, et un fichier refusé rend le repli.

- `onLoad` (nouveau) : appelé quand l'animation est prête — le moment de
  retirer ce que l'app montrait à sa place. mister-miss-koh appelait
  `useRive` elle-même pour le savoir.
- Un `.riv` absent ou corrompu rend désormais le `fallback` et appelle
  `onError`. Le moteur ne le lève pas (il émet `onLoadError` et garde une
  toile vide) : la promesse « repli garanti » était fausse pour ce cas, et
  miss-badminton lisait les quatre premiers octets du fichier pour s'en
  prémunir.
- Le composant est construit sur `useRive` plutôt que pris dans l'espace de
  noms du paquet, où `Rive` désigne selon le bundler la classe du moteur
  canvas et non le composant React.
- Une seule state machine part au moteur au singulier (`stateMachine`) :
  le pluriel est déprécié depuis le moteur 2.43. D'où la peer optionnelle
  `@rive-app/react-canvas` relevée à `^4.36.0` (tout le parc y est).
- Un `src` qui change recrée l'instance : le moteur ne rechargeait pas un
  fichier changé sous lui.
