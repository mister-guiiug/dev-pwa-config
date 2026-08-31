---
'@mister-guiiug/dev-wpa-config': patch
---

Deux défauts que l'adoption du hors-connexion par trois apps a fait tomber le
même jour.

**`useActionGuard` gardait un motif figé.** Sa mémoïsation porte sur une
signature du contenu de `checks` — parce qu'ils arrivent en littéral, donc avec
une identité neuve à chaque rendu. Mais cette signature ne retenait que
`[code, blocked]` : **`message` en était absent**. Une app dont les motifs
suivent la langue sans passer par `LabelsProvider` gardait donc le texte de la
langue précédente, indéfiniment — même `code`, même `blocked`, donc aucun
recalcul.

`mister-qowa`, `mister-molkky` et `mister-puzzle` l'ont contourné le même jour,
deux d'entre elles en recalculant le motif hors du hook. Un contournement que
trois apps trouvent séparément est un défaut du paquet, pas une particularité
de chacune. Le test le reproduit **au re-rendu du même composant** : un montage
neuf repart avec une mémoïsation vide et ne prouverait rien.

**`ConnectionBanner` désalignait une icône.** `components.css` le posait en
`display: block` avec `text-align: center`. Or son `label` accepte un nœud
React, et la copie dont il est promu y passait une icône **suivie** d'un texte :
l'icône se posait sur la ligne de base, et l'app devait remettre un
`flex items-center justify-center gap-2` par-dessus. Il est désormais centré en
`flex` — pour un enfant textuel unique, le cas de toutes les autres apps, le
rendu est identique.
