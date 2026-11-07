---
'@mister-guiiug/dev-pwa-config': patch
---

`issue-report` : `currentRoute()`, donc `currentIssueReportUrl()` et le lien « Signaler un problème » d'`AppFooter`, ne recopie plus de secret de l'adresse dans l'issue, qui est PUBLIQUE. Avant, la requête et le fragment partaient tels quels. Relevé du 07/11/2026 :

- miss-carbook garde son jeton d'invitation dans `?invite=…` quand l'acceptation échoue, c'est-à-dire précisément au moment où l'on signale un problème ;
- mister-settle (`#/invitation/<jeton>`), mister-miss-koh (`#/partage/…/<jeton>`) et miss-holi-voyage (`#/rejoindre/<code>`) le portent dans la route ;
- un retour d'authentification peut porter `#access_token=…`.

Ce qui est gardé, segment par segment : un chemin lisible, c'est-à-dire un mot en minuscules ou un segment de moins de 6 caractères. Tout autre segment (code, UUID, jeton) devient `…`. Les paramètres gardent leur nom et perdent leur valeur. La route d'une application en `#` passe au même filtre, et un fragment qui n'est pas une route est retiré.

Aucune application n'a de geste à faire : la montée suffit.
