---
'@mister-guiiug/dev-pwa-config': minor
---

`react/i18n-lite` : la même `createI18n`, au même contrat, sans les sept langues de libellés des composants. Le français est toujours là ; on ajoute une ligne par langue parlée (`labels: { en }`, avec `import en from '…/react/labels-en'`). `react/i18n` importait `react/labels` statiquement, donc les sept dictionnaires partaient dans l'accueil de chaque app quelles que soient ses `locales`, même avec `labels: false`. Mesuré sur `mister-uwh-tactic` (app fr et en) : environ 48 kB bruts de libellés dans un morceau `i18n` de 83.

Les dictionnaires sont passés, pas chargés à la demande : les libellés d'un bouton ne peuvent pas arriver après lui, un `import()` resterait dans le précache du service worker, et les tests jsdom des apps (en `en-US`) rendraient un premier écran vide. Une locale déclarée sans dictionnaire rend le français et le dit en développement.

`react/i18n` ne change pas de comportement : sans `labels`, il résout toujours les sept langues. Il s'appuie désormais sur `react/i18n-lite` (une seule implémentation) et accepte aussi la forme objet de `labels`.

Migration : facultative, deux lignes par app. Remplacer l'import par `react/i18n-lite` et passer `labels: { en }` (une entrée par locale autre que le français). Une app qui ne fait rien garde ses sept langues, et leur poids.
