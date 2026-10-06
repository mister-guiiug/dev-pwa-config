---
'@mister-guiiug/dev-pwa-config': patch
---

`Sparkline` ne fait plus avertir React. Le trait passait `'stroke-width'`, `'stroke-linecap'` et `'stroke-linejoin'` en kebab-case : le SVG rendu était juste, mais React signalait chaque attribut à chaque rendu (« Invalid DOM property `stroke-width`. Did you mean `strokeWidth`? »), soit trois erreurs par graphique dans la console des apps qui l'affichent. Les props passent en `strokeWidth`, `strokeLinecap` et `strokeLinejoin`, qui rendent exactement les mêmes attributs. Un test vérifie que le rendu se fait sans aucun avertissement.

Rien à changer dans les apps : la montée suffit.
