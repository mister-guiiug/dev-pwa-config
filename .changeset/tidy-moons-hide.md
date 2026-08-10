---
'@mister-guiiug/dev-wpa-config': patch
---

`components.css` : neutralise l'attribut `hidden`.

L'attribut `hidden` ne masque que via la feuille de style du navigateur — la
moindre règle d'auteur posant un `display` le neutralise. Presque tous les
composants habillés ici déclarent un `display`, si bien qu'une app basculant
`hidden` (plutôt que de démonter le composant) voyait l'élément rester à
l'écran. Symptôme observé : la feuille modale du showroom s'affichait par-dessus
la page dès le chargement, alors qu'elle portait bien `hidden`.

Une règle `[data-dwc][hidden] { display: none }` couvre tout le jeu. Elle est
placée en dernier et un test l'y maintient : à spécificité égale, c'est l'ordre
qui tranche.
