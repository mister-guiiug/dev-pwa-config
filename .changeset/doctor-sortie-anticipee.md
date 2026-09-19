---
'@mister-guiiug/dev-pwa-config': patch
---

`liens-famille` : une sortie anticipée aiguille, elle aussi

Le contrôle reprochait « code source + soutien sur tous les écrans » à une
coquille qui n'en montre qu'un. `sansCondition` ne lisait que les **120
caractères collés devant la balise** : un `&&`, un ternaire ou un `)return` à
cet endroit-là, il les voit ; un `if (mode !== 'roll') return <Jeu />;` vingt
lignes plus haut, non.

C'est la forme d'une application sans routeur qui aiguille par sortie
anticipée. Mesuré sur `miss-dice` le 19/09/2026 : **1 090 caractères** entre le
garde et la balise, commentaires retirés — et ses liens ne touchent jamais un
plateau de jeu, contrairement à ce que la dette affirmait.

Le contrôle reconnaît désormais un `if` dont le corps REND quelque chose, dans
une fenêtre bornée à 2 000 caractères. Trois garde-fous, tenus par des tests :

- **le motif est étroit** — `if (!pret) return null;` n'aiguille rien, et un
  pied de page rendu après lui est bien sur tous les écrans ;
- **le jeton est tempéré** (`(?:(?!return)[^{}])`) — un simple `[^{}]`
  enjambait le `return null;` du garde pour atteindre le `return (<div>` de la
  ligne suivante, et tout garde, même muet, dédouanait la coquille ;
- **la fenêtre est bornée** — au-delà, l'aiguillage appartient sans doute à un
  autre composant du même fichier.

Se tromper ne cache rien : une coquille clémentée à tort ne devient pas « en
règle », elle retombe dans le compte des écrans, citée par son nom. Vérifié sur
les vingt dépôts du parc, avant et après : **un seul verdict change**, celui
qui était faux.
