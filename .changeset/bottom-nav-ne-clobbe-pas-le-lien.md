---
'@mister-guiiug/dev-pwa-config': patch
---

`BottomNav` cesse d'écraser les props d'un `linkComponent` maison — régression
de la 6.3.1.

**Ce qui cassait.** La 6.3.1 passait `'aria-busy': attend ? 'true' : undefined`
et `'data-pending'` au composant de lien **dans tous les cas**, y compris quand
l'app ne délègue pas la navigation. Sur le `<a>` par défaut, cela ne coûte
rien : React n'écrit pas un attribut dont la valeur est `undefined`. Mais un
`linkComponent` MAISON reçoit ces props en objet et les étale :

```jsx
const LienDeMenu = ({ to, ...reste }) => (
  <Link to={to} aria-busy={enAttente === to} {...reste} />
);
```

L'étalement vient **après**, la clé **existe**, et sa valeur `undefined` écrase
celle de l'app. **Quatre dépôts du parc écrivent exactement cette ligne** —
mister-settle, miss-genius, mister-doc, mister-footcoach, c'est-à-dire ceux qui
avaient dû contourner cette barre avant qu'elle sache attendre. La 6.3.1 leur a
éteint leur propre `aria-busy`. Mesuré dans les deux sens sur mister-settle :
`App.nav.test.tsx` vert en 6.2.0, rouge en 6.3.1, même fichier, seule la plage
change.

**Ce qui change.** Une clé n'est posée que quand ce composant a un avis. Sans
`navigate`, il n'en a aucun sur l'attente ; sans `load`, aucun sur l'intention.
Il se tait donc, et le lien de l'app garde ce qu'il écrit.

`aria-current` et `data-current` restent posés dans les deux états, et c'est
délibéré : l'état courant, lui, est calculé ici — c'est même le défaut que
cette barre existe pour fermer.

**Pourquoi le test ne l'a pas vu.** L'en-tête promettait « sans `navigate`,
rien ne change : pas un attribut de plus », et un test le vérifiait — sur le
lien PAR DÉFAUT. C'était vrai du DOM et faux des props. Deux tests montent
désormais un composant de lien maison, dans les deux états : sans `navigate`
l'app garde son `aria-busy`, avec `navigate` la barre le reprend.
