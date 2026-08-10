---
'@mister-guiiug/dev-wpa-config': minor
---

`components.css` : contraste forcé et impression.

Deux rendus que le fichier ne traitait pas, et que personne ne regarde. Ils
remplacent les couleurs sans prévenir, alors que tout l'habillage repose sur des
variables et des `color-mix()`.

**Contraste forcé** (`forced-colors: active`). Trois régressions, vérifiées et
non déduites. `transparent` n'est pas remplacé par le navigateur : le bouton
primaire perdait son aplat et gardait un contour invisible — il devenait un
texte flottant. `box-shadow` est supprimée : le panneau modal, seul composant
sans bordure, se confondait avec son propre voile devenu opaque. Enfin le
squelette de chargement et la pastille de synchro n'existaient que par leur
couleur de fond. Le survol passe désormais par `Highlight` / `HighlightText`
plutôt que par un `filter: brightness()` — non forcé, il délavait la palette
choisie par l'utilisateur — et l'état désactivé par `GrayText` plutôt qu'une
opacité, elle non plus pas forcée. Aucun `forced-color-adjust: none` : figer nos
teintes reviendrait à passer outre le réglage.

**Impression**. Les navigateurs suppriment les fonds mais gardent la couleur du
texte : un libellé en `--dwc-primary-contrast` s'imprimait blanc sur blanc. Le
texte posé sur un aplat repasse en encre système, les bannières d'installation
et de mise à jour ne s'impriment plus, et les animations sont figées — un
squelette s'imprimait à l'opacité qu'il avait au moment du rendu.

Deux tests empêchent la récidive plutôt que de constater la présence des blocs :
tout contour transparent doit avoir sa contrepartie en contraste forcé, et tout
texte posé sur un aplat la sienne à l'impression.

Showroom : bac à sable de props (aperçu et appel React réécrits ensemble),
audit de contraste forcé avec émulation avant / après, feuille d'impression, et
section Rive dans la stack.
