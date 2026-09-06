---
'@mister-guiiug/dev-pwa-config': patch
---

**Le lien « Signaler un problème » était illisible, et rien ne pouvait le voir.**

`AppFooter issues` (4.4.0) pose `[data-dwc='footer-issues']` à côté de
`footer-source` et `footer-sponsor` ; `components.css` n'habillait que les deux
premiers. Le troisième héritait donc de la couleur du texte courant : sur un
fond sombre, noir sur violet nuit — **contraste 1,08**, relevé « serious » par
axe sur mister-qowa. Huit applications l'affichent en production.

Il rejoint ses deux voisins dans les trois règles qui les concernent : la cible
tactile de 2,75 rem, la couleur et la mise en ligne, et l'état survolé.

**Le garde qui manquait.** Rien ne croisait les marqueurs que `react/` ÉMET avec
ceux que la feuille habille — un défaut invisible à la compilation, au test
unitaire et à la relecture du composant, visible seulement à l'écran et
seulement en thème sombre. `test/components-css.test.mjs` fait désormais ce
croisement, avec la liste écrite des cinq marqueurs volontairement sans règle
(`visually-hidden` et `skip-link`, habillés par classe dans `tokens.css` ;
`app-version-label` et `family-apps`, qui héritent ou délèguent à leurs
enfants ; `sparkline-last`, peint par son attribut `fill`) — chacun avec ce qui
l'habille à la place. Un second test refuse une dispense devenue inutile, pour
que la liste ne survive pas à ce qu'elle protège.

Vérifié par falsification : en retirant les trois règles, le garde échoue en
nommant `footer-issues (react/app-footer.js)`.
