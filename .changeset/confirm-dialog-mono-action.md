---
'@mister-guiiug/dev-wpa-config': minor
---

`ConfirmDialog` : mode mono-action pour les alertes — `cancelLabel={null}`
(et non `undefined`, qui garde le repli « Annuler ») retire le bouton
Annuler. Le rôle `alertdialog` est conservé, le focus initial va sur
l'action unique, Échap et le voile valent un « OK » (`onConfirm`, garde
`loading` comprise), et le libellé par défaut devient « OK »
(`labels.confirm.ok`, surchargeable). `onCancel` devient optionnel ; en
deux-actions, rien ne change. Sous `components.css`, le bouton unique prend
toute la rangée (`:only-child`, aucun nouveau jeton).

Besoin remonté par trois apps pendant la campagne `components.css`, qui
n'avaient pas pu migrer leurs boîtes d'alerte face aux deux boutons
inconditionnels : l'`ErrorModal` de mister-puzzle, le mode « alert » du
`DialogProvider` de mister-cim10, et la boîte d'erreur de miss-carbook.
Les détails techniques dépliables de miss-carbook (+ bouton copier) restent
applicatifs : les passer en `children`.
