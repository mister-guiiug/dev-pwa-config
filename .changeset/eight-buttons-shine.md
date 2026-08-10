---
'@mister-guiiug/dev-wpa-config': minor
---

Six primitives d'interface promues depuis les apps : `Button`, `TextField` /
`SelectField` / `TextAreaField`, `Skeleton` / `SkeletonGroup`, `Sheet`, `Stat`,
`Badge`.

Aucune API inventée : chacune reprend ce sur quoi plusieurs apps avaient
convergé (quatre d'entre elles avaient le même jeu de variantes de bouton, deux
avaient le même fichier `Field` à la variable CSS près). La version partagée
referme les trous d'accessibilité que chaque copie laissait passer :

- `Button` — cible tactile de 2,75 rem à TOUTES les tailles, `aria-busy` +
  désactivation pendant `loading` (anti double-clic), `type="button"` par défaut ;
- `Field` — `aria-describedby` référence l'aide ET l'erreur, au lieu de faire
  disparaître la consigne au moment où elle sert ;
- `Skeleton` — barres `aria-hidden`, `role="status"` porté par le seul conteneur ;
- `Sheet` — piège de focus, focus restitué à la fermeture, scroll de fond
  restauré, safe-area iOS ;
- `Stat` — `<dl>/<dt>/<dd>`, tendance signalée par une flèche ET un libellé lu ;
- `Badge` — axe `tone` sémantique × `variant`.

`components.css` habille les six. Le texte des pastilles est **dérivé** du ton
plutôt que pris brut : mesuré sur les 14 thèmes du showroom, un ambre ou un vert
de marque posés tels quels tombaient à 2:1. Le mélange avec `--dwc-text` remonte
le pire cas à 5,3:1 en conservant la teinte. Nouveau token de contrat
`--dwc-info`.

`react` et `react-dom` deviennent des devDependencies du paquet : les tests de
rendu des composants étaient jusqu'ici toujours ignorés faute de dépendances, et
ne prouvaient donc rien.
