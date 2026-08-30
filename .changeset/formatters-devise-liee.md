---
'@mister-guiiug/dev-wpa-config': minor
---

`format` — la devise liée à `createFormatters` survit enfin aux options.

**Le défaut.** `formatCurrency` reconnaît des options à la place de la devise
depuis #100. `createFormatters(…).currency` les lui transmettait telles quelles,
donc à cette place — et `formatCurrency` retombait alors sur son propre défaut,
`'EUR'`, sans jamais voir la devise que la fabrique avait liée :

```js
const fmt = createFormatters('fr-FR', { currency: 'USD' });
fmt.currency(1234); // « 1 234,00 $US »
fmt.currency(1234, { maximumFractionDigits: 0 }); // « 1 234 € »  ← USD perdu
```

Un montant en dollars s'affichait EN EUROS. Aucune erreur, aucun avertissement,
le symbole ment simplement sur le montant — c'est très exactement le défaut que
ce module reproche aux copies qu'il remplace, et le seul de la famille où le
silence produit une valeur fausse plutôt qu'un format inchangé.

Les options sont désormais reconnues à cette place, puis réappliquées PAR-DESSUS
la devise liée. `{ currency: … }` passé dans les options l'emporte toujours,
comme partout ailleurs dans le module.

**`currency()` gagne une 3ᵉ place.** `fmt.currency(1234, 'GBP', { … })` : un
code explicite ET des options. La forme était ignorée en silence, faute d'être
transmise.

**Ce que le `.d.ts` taisait.** La signature annonçait `code?: string`, si bien
que la forme qui marchait déjà au runtime était refusée à la compilation
(`TS2345`). Elle accepte maintenant les deux places, et la prose de
`formatCurrency` mentionne enfin sa 4ᵉ position — locale et devise nommées,
options par-dessus — que seule la signature laissait deviner et qu'aucun test ne
couvrait.

Correctif vérifié par mutation : rétablir la transmission directe fait tomber le
test qui nomme la devise liée.
