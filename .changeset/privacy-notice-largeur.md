---
'@mister-guiiug/dev-pwa-config': patch
---

`PrivacyNotice` (habillage de `components.css`) : le panneau prend toute la largeur offerte au lieu de tomber à 0 px. Depuis 6.29.0, il est son propre conteneur de requêtes (`container-type: inline-size`), et son contenu ne compte donc plus dans sa largeur : un parent qui ajuste ses enfants à leur contenu (`flex-col items-center`, rangée flex) le réduisait à rien. Relevé dans le pied de page de mister-puzzle : 0 px, le texte débordant sur une colonne de 140 px. Il pose désormais `inline-size: stretch` (`100%` en repli), marges déduites ; un `max-width` d'app le borne toujours. Un test de `components.css` exige qu'un conteneur de requêtes porte sa largeur.
