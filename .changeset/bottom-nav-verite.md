---
'@mister-guiiug/dev-wpa-config': patch
---

`react/bottom-nav` — l'en-tête disait faux sur une app, et taisait deux pièges
d'adoption.

**Le faux.** Il affirmait que « mister-puzzle a la même chose sous le nom
`Navbar` ». Vérification faite en migrant : son `Navbar.tsx` est un **en-tête
haut collant** — logo, progression, hamburger, menu de thème — et **ne porte
aucune destination**. L'app n'a d'ailleurs aucun routeur : deux écrans, choisis
par le hash de l'URL. `BottomNav` exige une liste statique de routes ; puzzle
n'en a pas. L'affirmation venait d'une ressemblance de nom de fichier, jamais
vérifiée, et elle a maintenu un dépôt sur une liste de migration pendant des
semaines.

Le relevé d'adoption portait la même erreur : `Navbar.tsx` est retiré de la
table des équivalences, où il ne produisait que des faux positifs — un seul
dépôt du parc porte ce nom, et c'est celui-là.

**Les deux tacites**, chacun payé deux fois (mister-cim10, puis
mister-footcoach) avant d'être écrit :

- **brancher `Link`, pas `NavLink`** — `NavLink` redéclare son propre
  `aria-current` **après** l'étalement des props, ce qui donne deux sources de
  vérité pour l'état actif ; et `end` ne lui est pas transmis ;
- **`currentPath` est obligatoire dès que le routeur a un `basename`** — le
  repli lit `window.location.pathname`, qui vaut `/mon-app/equipes` là où les
  `href` valent `/equipes` : **aucun onglet ne serait actif**, et seulement une
  fois déployé, jamais en développement.
