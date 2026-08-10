---
'@mister-guiiug/dev-wpa-config': patch
---

Showroom : catalogue cherchable, pièges par composant, arbres de décision,
hooks. Aucun changement du contenu publié sur npm — `showroom/` n'est pas dans
`files`.

Le showroom montrait chaque composant isolément et ne répondait jamais à deux
questions : **lequel prendre** quand plusieurs conviennent, et **comment on se
trompe** avec celui qu'on a pris. Les deux se répondaient pourtant déjà dans le
dépôt — en commentaires de `components.css`, en notes de version — c'est-à-dire
partout sauf là où l'erreur se commet.

- **32 pièges** répartis sur les 14 fiches, chacun adossé à un défaut constaté
  et chiffré : 7 apps sur 13 avaient réimplémenté `EmptyState`, les variantes
  `sm` locales descendaient à 32 px, une variante pleine de `Badge` échouait au
  contraste dans 11 thèmes sur 14, les copies locales de `Field` remplaçaient
  l'aide par l'erreur dans `aria-describedby`. Plus une note d'accessibilité par
  fiche.
- **4 arbres de décision** de deux à quatre branches — au-delà, ce n'est pas
  l'arbre qui manque de place, c'est l'API qui est sous-spécifiée. Chaque
  recommandation est un lien vers la fiche du composant.
- **Les 9 hooks du paquet**, qui n'apparaissaient nulle part dans sa propre
  vitrine alors qu'ils en sont près de la moitié de la surface React.
- **Un catalogue cherchable** de 23 entrées, filtrable par catégorie.

`test/showroom-catalogue.test.mjs` importe `react/index.js` et exige que tout
export soit documenté ou nommément exclu — c'est ce qui a révélé l'absence des
hooks. Il vérifie aussi la parité FR/EN piège par piège (longueur des listes
comprise), la forme des arbres, et que chaque fiche a bien son emplacement dans
la page.

Deux défauts trouvés et corrigés en cours de route : reconstruire les boutons de
filtre à chaque clic renvoyait le focus sur `<body>` — au clavier, on repartait
en haut de la page ; et le lien de recommandation, peint en `--ds-primary`,
tombait sous 4,5:1 dans 5 combinaisons thème × schéma sur 28. Son encre est
désormais dérivée, comme celle des pastilles.
