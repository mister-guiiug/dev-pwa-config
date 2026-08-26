---
'@mister-guiiug/dev-wpa-config': minor
---

`react/share-button` — le bouton « Partager », la suite de `share.js`.

Le module a été promu ; les boutons, non. Quatre apps portent un `share.ts`, et
chacune garde son bouton — trois réponses différentes à la même question : que
montrer quand le partage natif n'existe pas et qu'on a copié à la place ? Rien du
tout, un `window.alert`, ou un libellé qui ne revient jamais à son état initial.

Ce que le composant tranche :

- **L'annulation n'affiche rien.** `shareOrCopy` distingue `cancelled` de `failed`
  précisément pour ça ; afficher « échec » à quelqu'un qui a fermé la feuille de
  partage est faux.
- **Le retour est annoncé.** La région `status` existe dès le premier rendu, vide
  tant qu'il n'y a rien à dire — insérée avec son texte, elle ne serait pas lue.
- **L'état revient de lui-même** (`resetAfterMs`), sans quoi « Lien copié » ment au
  prochain regard.

Trois libellés fr/en rejoignent `react/labels`, et `components.css` habille le
bouton comme les autres du paquet (cible tactile de 2,75 rem comprise).
