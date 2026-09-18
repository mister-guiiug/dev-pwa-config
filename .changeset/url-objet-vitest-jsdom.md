---
'@mister-guiiug/dev-pwa-config': patch
---

`vitest-setup` rétablit `URL.createObjectURL`, que le couple Vitest 5 / jsdom 30.1 a cassée.

**jsdom n'a jamais implémenté cette API.** C'est Vitest qui la fournit dans son environnement jsdom, et pour retrouver l'objet d'implémentation d'un Blob il prend **le premier symbole propre** de l'instance — sa propre source commente ce passage par « this is cursed » :

```js
const implSymbol = Object.getOwnPropertySymbols(
  Object.getOwnPropertyDescriptors(new window.Blob())
)[0];
```

jsdom 30.0.1 exposait un `Symbol(impl)`. **jsdom 30.1.0 n'en expose plus aucun** : `implSymbol` vaut `undefined`, `blob[undefined]` aussi, et l'appel lève `Cannot read properties of undefined (reading '_buffer')`. Aucune version de Vitest publiée ne corrige cela à ce jour (5.0.1 est la dernière).

Tout test qui passe par `downloadBlob`, `downloadJson`, `downloadCsv` ou `downloadPdf` du socle tombe donc dès que jsdom 30.1 est installé — **avec une pile qui accuse le socle**, alors que le défaut est dans le harnais. Isolé à la seule variable le 18/09/2026 sur `miss-uwh` : jsdom 30.0.1 vert, 30.1.0 rouge, tout le reste égal. Un seul dépôt du parc y touchait ce jour-là ; les dix-neuf autres attendaient leur tour — exactement la forme du trou `AnimationEvent` de jsdom 30.

**La garde SONDE plutôt que d'écraser.** Elle appelle `createObjectURL` une fois sur un Blob jetable : si l'appel rend une chaîne, elle ne touche à rien. Le jour où Vitest cessera de chercher un symbole, le correctif s'effacera de lui-même, sans qu'il faille y revenir — c'est aussi pour cela qu'il ne teste pas la seule présence de la méthode, qui est bien là et qui lève.

`urlObjetUtilisable()` et `installeUrlObjet()` sont exportées pour être éprouvées : le socle n'a ni Vitest ni jsdom 30.1 en dépendance, et le test simule donc l'OBSERVABLE — une `createObjectURL` qui lève — qui est précisément ce que la garde sonde. Vérifié à la main que le test tombe sans le correctif, sur la même erreur qu'en production.
