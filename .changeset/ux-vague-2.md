---
'@mister-guiiug/dev-wpa-config': patch
---

Showroom, UX vague 2 : copie, extraits d'usage, comparaison clair/sombre,
échecs d'accessibilité actionnables, tableaux en cartes sur mobile.

La page montrait le DOM produit et les sélecteurs à cibler, jamais l'appel du
composant — c'est pourtant ce qu'on vient copier. Quatorze extraits React sont
désormais injectés, chacun montrant les props qui comptent pour
l'accessibilité. Tokens, sélecteurs, couleurs et extraits sont copiables.

Les échecs de contraste ne se contentent plus d'un verdict : ils affichent les
deux couleurs en cause, proposent la couleur corrigée la plus proche — en
sachant distinguer les cas où c'est le FOND qu'il faut foncer, du blanc sur une
couleur de marque ne se rattrapant pas par le texte — et se localisent d'un
clic sur la page.

Sept tableaux sur onze débordaient horizontalement en 375 px : il n'en reste
qu'un, la matrice de boutons, dont l'aplatissement détruirait le croisement
variantes × tailles.

Aucun changement du contenu publié sur npm.
