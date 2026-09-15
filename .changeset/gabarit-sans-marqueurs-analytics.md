---
'@mister-guiiug/dev-pwa-config': patch
---

Le gabarit `templates/index.html` ne porte plus les marqueurs `__ANALYTICS_HEAD__` / `__ANALYTICS_BODY__`, et `buildAnalyticsHtmlFragments` est marquée obsolète.

Ces marqueurs étaient remplacés à la build par le tag de Google dès qu'un identifiant était posé. Le tag partait alors au **chargement de la page**, avant tout accord — précédé d'un `consent default` tout refusé, donc sans collecte, mais chargé quand même. Les vingt et une apps du parc les ont retirés en septembre 2026 au profit de `react/consent-banner`, qui n'injecte rien avant un accord explicite. Les laisser dans le gabarit faisait naître chaque app neuve avec la voie qu'on venait de fermer.

Le socle portait deux réponses à une même question. Il n'en propose plus qu'une.

Rien ne casse : `buildAnalyticsHtmlFragments` et les options `gtmContainerId` / `gaMeasurementId` de `pwaSeoPlugin` restent exportées et fonctionnelles — les retirer serait un majeur. Elles portent désormais un `@deprecated` qui dit pourquoi, et vers quoi aller.
