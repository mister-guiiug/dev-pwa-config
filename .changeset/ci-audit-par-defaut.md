---
'@mister-guiiug/dev-pwa-config': minor
---

**`run-npm-audit` passe à `true` par défaut : le parc n'avait plus aucun canal
de détection de vulnérabilités.**

Relevé du 13/09/2026, sur les vingt-huit dépôts :

| Canal                                    | Couverture                                                      |
| ---------------------------------------- | --------------------------------------------------------------- |
| Alertes de vulnérabilité Dependabot      | **0 / 28**                                                      |
| Mises à jour de sécurité Dependabot      | **0 / 28**                                                      |
| `dependabot.yml`                         | **0 / 28** — retirés, « doublon de renovate »                   |
| Renovate                                 | configuré **27 / 27**, jamais exécuté (`RENOVATE_TOKEN` absent) |
| Workflow `Security` (npm audit + CodeQL) | **1 / 28** — ce dépôt seul                                      |
| `run-npm-audit: true`                    | **1 / 20** — `mister-family-map`                                |

Dix-neuf apps sur vingt n'avaient donc **aucun** SCA, et rien pour les
prévenir par ailleurs. Le socle savait faire la vérification depuis le début ;
personne ne l'avait allumée.

Ce que ce silence cachait, trouvé en lançant `npm audit` à la main sur les 27
copies : `miss-supaboss` sert un backend Fastify avec un `@fastify/static`
visé par quatre avis de sévérité **haute** — traversée de chemin, contournement
de garde de route, contournement d'autorisation par URL non canonique. C'est le
service qui garde les PAT chiffrés en AES-GCM. Ni GitHub ni la CI ne l'ont
jamais signalé.

**Pourquoi ce défaut-ci, quand `run-coverage` reste opt-in.** Le changeset
précédent posait qu'« un socle ne rend pas rouges les CI qu'il sert », et c'est
toujours vrai d'un seuil de couverture : c'est un choix éditorial, propre à
chaque app. Une CVE de sévérité haute en dépendance de production n'en est pas
un. Et le défaut ne rend rouge que ce qui l'est déjà : **24 des 27 copies
auditées sont sans `high`/`critical` en production**, et parmi les dix-neuf
consommateurs du réutilisable, `miss-supaboss` est le seul concerné.

La sortie de secours reste écrite noir sur blanc : une app qui doit tenir le
temps d'un correctif pose `run-npm-audit: false` **avec sa raison**. Un refus
inscrit vaut mieux qu'une vérification muette — c'est le même principe que les
gardes d'adoption.

Le seuil ne bouge pas : `npm-audit-level` reste à `high`, et l'audit ne porte
que sur `--omit=dev`. La chaîne de développement n'entre pas dans le calcul.

Cette version existe aussi pour faire avancer l'étiquette mobile `v4` : un
changement de workflow réutilisable n'atteint aucun des dix-neuf consommateurs
tant que rien n'est publié.
