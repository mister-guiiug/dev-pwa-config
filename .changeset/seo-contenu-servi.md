---
'@mister-guiiug/dev-pwa-config': minor
---

`pwaSeoPlugin` : un contenu SERVI dans le point de montage, pour les robots qui n'exécutent pas le JavaScript

**Relevé du 23/09/2026 : les vingt apps du parc servaient un corps vide** — un
`<div id="app"></div>` que React remplit ensuite. Un robot qui n'exécute pas le
JavaScript (premier passage de Bing, robots des moteurs d'IA, aperçus de liens,
premier passage de Google) n'y lisait RIEN. Pré-rendre l'écran d'accueil
n'aurait pas suffi : pour `miss-uwh` et `mister-doc`, il ne montre qu'un
formulaire de connexion.

- **Au build**, le premier `<div id="…"></div>` VIDE du `<body>` (`app`, `root`,
  `react-root` dans le parc) reçoit le `<title>` de la page en `<h1>`, sa
  `meta description` et un lien vers l'accueil du parc — rien d'inventé.
- **React le remplace au premier rendu** : `createRoot().render()` vide le
  conteneur, et les vingt apps montent ainsi. Le visiteur voit le nom de l'app
  pendant le chargement plutôt qu'une page blanche.
- Une petite feuille en ligne le met en page (couleurs héritées du thème, lien
  souligné — WCAG 1.4.1). Toutes les CSP du parc gardent `'unsafe-inline'` en
  `style-src`.
- Un point de montage qui porte déjà du contenu n'est pas touché ; rien en
  développement ; `servedContent: false` coupe l'injection.
- Nouveaux exports : `injectServedContent`, `SERVED_CONTENT_STYLE`.

Vérifié sur trois pilotes, un par point de montage (`miss-dice` `#app`,
`mister-cim10` `#react-root`, `miss-uwh` `#root`) : le bloc est servi, React le
remplace (plus aucun bloc une fois l'app rendue, aucune erreur console), et
leurs suites e2e passent — 34, 13 et 6 tests, audits axe compris.
