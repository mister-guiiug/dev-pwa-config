---
'@mister-guiiug/dev-pwa-config': patch
---

`bottom-nav-muette` ne se déclenche que si l'app charge la feuille du socle.

Première écriture du contrôle, quelques heures plus tôt : il flaguait `miss-contraction`, qui n'importe **aucune** feuille du socle. Là-bas il n'y a pas de dégagement à zéro — il n'y a pas de dégagement du tout. L'app place sa barre et ses bandeaux elle-même, de bout en bout, et `placement="fixed"` n'y aurait rien réparé : il aurait posé l'attribut sans qu'aucune règle ne le lise.

Un contrôle dont le conseil ne s'applique pas est pire qu'un contrôle absent : il fait écrire une prop pour éteindre un voyant.

La condition est désormais celle qui rend le défaut réel — `components.css` ou `components/bottom-nav.css` importé, puisque c'est ce morceau qui porte `--_dwc-bottom-clearance`. Sur les dix-neuf apps du parc, le contrôle ne nomme plus que `mister-cim10`, où il est exact et mesuré.

Les cinq cas de silence du test portent tous la feuille du socle désormais : sans elle, ils passaient pour la mauvaise raison.
