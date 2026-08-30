---
'@mister-guiiug/dev-wpa-config': patch
---

Trois finitions relevées par la campagne d'adoption du 30 août. Chacune avait
obligé une migration à poser un contournement chez elle.

`components.css` réduisait le mouvement du seul `sheet-panel` sous
`prefers-reduced-motion`, alors que `confirm-panel` et `toast` portent la même
entrée `dwc-rise` : une alerte et un message surgissaient malgré le réglage
système. mister-puzzle (#14) avait dû reposer la règle côté app.

Le commentaire du mode mono-action de `ConfirmDialog` présentait le `flex: 1` du
bouton unique comme le rendu que mister-puzzle et mister-cim10 dessinaient à la
main. C'est faux pour mister-cim10, dont l'alerte était compacte et alignée à
droite — sa migration (#27) a dû poser un écart local. Le commentaire dit
désormais le vrai, et rappelle qu'une identité d'app se reprend en deux lignes
de CSS non « layered ».

Le `.d.ts` de l'écran de secours ne déclarait pas toutes les props réellement
acceptées : miss-supaboss (#30) avait dû passer la référence de corrélation en
spread commenté. Aucun changement de comportement, le type dit ce que le code
fait déjà.
