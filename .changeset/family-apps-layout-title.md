---
'@mister-guiiug/dev-pwa-config': minor
---

`FamilyApps` : deux props qui reprennent ce que les apps écrivaient en CSS.

Relevé sur les treize apps du parc qui habillent cette grille à la main :
**treize sur treize** remplacent la grille responsive par une colonne unique, et
**neuf sur treize** masquent le `<h3>` en `display: none` parce que l'écran
annonce déjà sa section. Deux décisions unanimes ou presque, qu'aucune prop ne
savait exprimer — chaque app les repayait donc en règles.

- `layout: 'list'` force une colonne, quelle que soit la largeur. Le défaut
  `'grid'` ne bouge pas : quatre apps rendent la grille en pleine page.
- `showTitle: false` ne rend pas le titre. Le `aria-label` de la `<section>`
  porte le même texte : la région reste nommée.
- La carte se relève d'un pixel au survol — huit apps sur treize avaient ajouté
  ce même geste. Éteint sous `prefers-reduced-motion`.
