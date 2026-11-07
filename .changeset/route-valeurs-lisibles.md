---
'@mister-guiiug/dev-pwa-config': patch
---

`issue-report` : `currentRoute()` garde la valeur d'un paramètre quand elle dit où l'on est. 6.34.0 retirait toutes les valeurs, et miss-ticket-pwa, qui range ses écrans en `?vue=…`, ne disait plus sur lequel on signalait.

Une valeur reste si c'est un mot en minuscules, composé ou non (`?vue=historique`, `?filtre=en-pause`), sous un nom qui ne porte ni secret ni texte saisi. Tout le reste devient `…` comme avant :

- un nombre, un identifiant, une majuscule, un texte encodé (`?id=4821`, `?partie=ABCDEF`, `?titre=deux%20mots`) ;
- toute valeur sous un nom qui porte un secret ou une saisie (`code`, `invite`, `pin`, `access_token`, `password`, `q`, `search`, `email`…), même lisible : `?code=bonjour` reste masqué.

Le chemin et le fragment ne changent pas. Aucune application n'a de geste à faire ; un test qui figeait `?vue=…` doit attendre la valeur.
