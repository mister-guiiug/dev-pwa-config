---
'@mister-guiiug/dev-pwa-config': minor
---

**`pwa-doctor` : `secrets: inherit` passe de DETTE à DÉFAUT.** Le contrôle
existait — avec ses tests, et le dépouillement des commentaires qui distingue
la ligne de celui qui met en garde contre elle. Il n'a rien empêché : au
relevé du 06/09/2026, **dix-sept dépôts sur dix-sept** l'écrivaient, dans
quarante-sept fichiers. Aucune app ne lance `--strict`, donc la dette ne
coûtait rien — et une dette que rien ne force ne se paie jamais.

Ce que la ligne fait, elle : elle remet **tout le trousseau du dépôt** au
workflow appelé, à chaque exécution. Or `pwa-ci.yml` et `pwa-lighthouse.yml`
ne déclarent **aucun** secret (`secrets.GITHUB_TOKEN` est fourni d'office à un
workflow appelé), et `pwa-deploy.yml` n'en déclare qu'un,
`FIREBASE_SERVICE_ACCOUNT_KEY` — que le seul dépôt qui déploie sur Firebase
nomme désormais.

Le verdict s'écarte de la lettre de « quelqu'un en souffre aujourd'hui », et
l'assume : ce n'est pas une réponse du socle que l'app n'aurait pas prise
(c'est la définition de la dette), c'est une porte qui s'ouvre à chaque run.
La ligne du diagnostic le dit maintenant, et le code de sortie aussi.

**Rien à faire pour les apps du parc** : elles sont revenues à zéro par
campagne les 06 et 07/09/2026, et la ligne y est remplacée par le commentaire
qui explique son absence. Une app hors campagne verra son `Doctor` échouer :
le geste est écrit dans le diagnostic — nommer les secrets un par un, ou
retirer la ligne quand le réutilisable n'en déclare aucun.
