---
'@mister-guiiug/dev-pwa-config': patch
---

**`qr.d.ts` décrivait encore `qrcode` et une data-URL PNG.**

La 4.16.0 a fait passer `/qr` sur `uqr` et changé le rendu de `qrToDataUrl`
de PNG en SVG. Le fichier de types, lui, est resté en arrière : il annonçait
des options « passées telles quelles à `qrcode` », une data-URL PNG, et une
peer `qrcode` dont l'absence lèverait. C'est précisément ce qu'un consommateur
TypeScript lit au survol, donc la seule documentation que beaucoup verront.

Trois corrections, aucune ligne de code exécutée :

- Les types nomment `uqr`, le rendu SVG, et le fait que le vocabulaire
  `qrcode` est **traduit** et non transmis.
- **Les défauts sont ceux d'`uqr`, et ils diffèrent** : marge de 1 module au
  lieu de 4, correction d'erreur `'L'` au lieu de `'M'`. Mesuré contre le vrai
  `uqr`, pas lu dans sa documentation. Les deux écarts se voient au scanner et
  nulle part ailleurs ; ils sont désormais écrits sur les options concernées.
- Le commentaire de `qr.js` affirmait que le SVG donnait « une URL plus
  courte ». Mesuré sur trois longueurs d'URL, c'est l'inverse : de 2,4 à 3,2
  fois plus longue. La ligne dit maintenant le vrai, et ce que cela coûte.

L'exemple de `docs/DONNEES.md` passe `margin` et `errorCorrectionLevel`
explicitement, faute de quoi il enseignait à s'en remettre à des défauts qui
ont changé.
