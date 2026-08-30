---
'@mister-guiiug/dev-wpa-config': patch
---

`components.css` — un même jeton ne porte plus deux replis différents.

`--text-fluid-xs` retombait sur `0.8rem` à huit endroits et sur `0.75rem` sur
les onglets de `BottomNav`. Sans conséquence pour les seize apps qui importent
le preset — la variable y est définie — mais **une app qui ne le prend pas ne
voit QUE les replis**, et obtenait donc deux tailles pour une seule intention.

Le cas n'est pas théorique : `mister-quota`, en Electron sans Tailwind, vient de
prendre la feuille seule. Sa migration a d'ailleurs montré que le motif
d'abstention de cette app ne tenait pas — `components.css` ne contient ni
`@apply`, ni `@tailwind`, ni `theme()`, et tous ses sélecteurs sont portés par
`[data-dwc="…"]`, donc sans collision possible. Le README le dit maintenant, et
précise que la feuille lit **huit variables de l'échelle fluide en plus des
quinze jetons du contrat**, toutes avec repli.

`test/components-css.test.mjs` garde la cohérence — sur les replis **scalaires**
seulement. Les replis de couleur imbriquent `light-dark()`, `color-mix()` ou un
second `var()` : les comparer demande un analyseur, pas une expression
rationnelle, et une expression rationnelle qui les tronque comparerait des
valeurs fausses. Un garde-fou étroit et exact vaut mieux qu'un large et menteur.
