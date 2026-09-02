---
'@mister-guiiug/dev-wpa-config': minor
---

`format` : les quatre règles que cinq apps réécrivaient par-dessus

Le module est adopté — genius, uwh, lookhouse, supaboss, quota l'importent.
Chacune garde pourtant un `format.ts` de 50 à 80 lignes, et chacune explique
en en-tête ce qu'elle y ajoute. Quatre règles, dont une écrite deux fois :

- **`formatSigned(value, options)`** — « + » explicite, signe moins
  typographique (U+2212, qu'`Intl` ne produit pas), et un mot pour zéro.
  `miss-uwh` (`formatSignedEuro`) et `miss-genius` (`formatDelta`) l'avaient
  chacune écrite ; elles diffèrent sur zéro — rien pour un solde nul, « = »
  pour un delta nul —, d'où `zero`. En devise (`currency`), en nombre, ou par
  un rendu injecté (`format: abs => …`).
- **`decimals`** sur `formatNumber` et `formatCurrency` — un mot pour
  `minimumFractionDigits` + `maximumFractionDigits`. C'est le réglage du club
  qu'uwh honorait dans `formatEuro`, et que `formatCurrency` ne prenait pas.
- **`formatPercentage(…, 'auto')`** — une décimale sous 10 %, aucune
  au-dessus : la règle de supaboss (« 7,5 % » lisible, « 42 % » sans faux
  « ,0 »). Des options en 2ᵉ place aussi : `{ decimals: 'auto' }`.
- **`formatRelativeTime(date, { never })`** — un mot pour une date absente,
  parce qu'une mesure jamais faite n'est pas « il y a 0 seconde »
  (supaboss). Au passage, `null` et `undefined` sont une absence : l'ancienne
  forme les convertissait en 1970 et rendait « il y a 56 ans ». Les formes
  positionnelles historiques ne bougent pas.

La date courte numérique de supaboss (`30/08/2026 16:05`) était déjà là :
`formatDateTime(d, { dateStyle: 'short', timeStyle: 'short' })`.
