---
'@mister-guiiug/dev-wpa-config': patch
---

`pwaSeoPlugin` exclut désormais `react/observability` du pré-bundling Vite.

Ce module charge Sentry (peer **optionnelle**) par un import dynamique au
spécificateur volontairement non littéral, précisément pour rester
inanalysable. L'optimiseur de dépendances replie malgré tout la concaténation
en littéral — visible dans la sortie générée — et `vite:import-analysis` échoue
alors à résoudre `@sentry/react` dans les apps qui ne l'ont pas installé :
**500 sur toute la page en dev**, écran blanc. Le build de production n'était
pas concerné, ce qui rendait le défaut d'autant plus déroutant.

Trois apps avaient déjà écrit cette exclusion à la main, chacune de son côté.
Elle appartient au paquet : c'est son propre module qui est en cause. Les apps
qui n'utilisent pas `pwaSeoPlugin` doivent la déclarer elles-mêmes.
