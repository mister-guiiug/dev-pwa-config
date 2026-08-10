---
'@mister-guiiug/dev-wpa-config': minor
---

Nouvel export opt-in `./components.css` : habillage prêt à l'emploi des
composants `/react`.

Les composants ne posent que des attributs `data-dwc` et restent non stylés — en
pratique, 11 apps sur 13 ont réécrit à la main les mêmes 12 à 23 sélecteurs, et 7
ont réimplémenté `EmptyState` plutôt que d'habiller celui du paquet.

`@import '@mister-guiiug/dev-wpa-config/components.css'` donne une base correcte
en clair comme en sombre sans aucune configuration (replis via les couleurs
système CSS `Canvas` / `CanvasText` / `GrayText`, qui suivent `color-scheme`, et
`light-dark()` pour les quatre tons d'état). Pour passer aux couleurs de l'app,
brancher le contrat `--dwc-*` : treize variables, une fois.

Aucune couleur de marque n'est imposée et rien n'est verrouillé : tout est en
`@layer components`, donc les utilitaires Tailwind et le CSS non « layered » de
l'app l'emportent. Toutes les commandes respectent la cible tactile de 2,75 rem.

Additif : aucun changement sur les exports existants.
