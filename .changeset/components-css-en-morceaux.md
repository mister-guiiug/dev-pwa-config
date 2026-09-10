---
'@mister-guiiug/dev-pwa-config': minor
---

**`components.css` est aussi publié par composant : une app n'importe plus que
ce qu'elle monte.**

**Tailwind 4 n'élague pas ce qui est écrit à la main dans `@layer components`**
— vérifié sur un build réel, pas déduit : une page qui n'utilise aucun
composant du paquet reçoit quand même **141 des 143 sélecteurs `[data-dwc]`**,
soit 5,3 kB gzip et 42,6 kB bruts. Le fichier entier partait avec chaque
application, quels que soient les composants montés.

Les mêmes règles sont donc publiées en 24 morceaux, `components/base.css` puis
un fichier par composant :

```css
@import '@mister-guiiug/dev-pwa-config/components/base.css';
@import '@mister-guiiug/dev-pwa-config/components/button.css';
@import '@mister-guiiug/dev-pwa-config/components/field.css';
```

Mesure de l'écart, même build : **2,6 kB gzip** pour une app à onze sections
sur vingt-sept, contre 5,3 pour le fichier entier — **2,7 kB gzip et 26,7 kB
bruts**. C'est modeste, et c'est dit tel quel : l'estimation qui a lancé ce
chantier parlait de 8 à 12 kB gzip, la mesure l'a ramenée au tiers. Ce n'est
pas un chantier de performance ; c'est la fin d'un gaspillage sans
contrepartie.

**`components.css` ne bouge pas** : il reste le fichier entier, et le défaut
recommandé pour une app qui monte l'essentiel du catalogue. Les morceaux sont
des DÉRIVÉS engendrés par `npm run sync`, jamais une seconde source à
maintenir : le test les recompose règle pour règle et refuse la moindre perte,
et la CI refuse une découpe périmée. `base.css` porte les quatre sections
transversales (bases partagées, animations, contraste forcé, impression) : il
s'importe toujours en premier.
