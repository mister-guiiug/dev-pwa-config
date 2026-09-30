---
'@mister-guiiug/dev-pwa-config': minor
---

Le bandeau de mise à jour : les gestes font bloc, et le principal se voit.

Relevé du 30/09/2026 sur mister-miss-koh, en 393 px : le titre et « Mettre à jour » remplissaient la ligne, et « Plus tard (4 h) » tombait seul sur la suivante, à gauche. Les deux boutons portaient le même habillage neutre. Neuf applications du parc avaient réécrit ces règles chez elles : huit peignaient « Mettre à jour » de leur couleur principale (miss-badminton, miss-contraction, miss-dice, miss-genius, mister-footcoach, mister-miss-koh, mister-molkky, mister-puzzle), quatre passaient le titre sur sa propre ligne, trois marquaient l'attente.

- **Les boutons sont groupés** dans `[data-dwc="update-banner-actions"]`, sur le modèle de `consent-actions` : à côté du titre quand la place le permet, dessous sinon, alignés à droite. Ils s'empilent plutôt que de déborder sur un très petit écran. L'ordre et le sélecteur de chaque bouton ne changent pas ; aucune application du parc ne visait les boutons comme enfants directs du bandeau (relevé sur les vingt et une).
- **« Mettre à jour » porte la couleur principale** (`--dwc-primary`, `--dwc-primary-contrast`, la paire de la variante `primary` de `Button`), en demi-gras, avec un survol. Le titre passe en demi-gras.
- **L'attente se voit** : `aria-busy` rend le bouton à 80 % et le curseur d'attente.
- **Contraste forcé et impression** : le survol devient `Highlight`, l'attente `GrayText` ; à l'impression, le libellé passe à l'encre système. La bordure prend la teinte du fond, jamais `transparent`.
