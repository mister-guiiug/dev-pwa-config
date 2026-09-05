---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-doctor` ne compte plus comme un défaut le commentaire qui met en garde contre ce défaut.

Deux contrôles lisaient le fichier comme du texte plat : `secrets: inherit` dans les workflows, et `'fr-FR'` codé en dur dans les sources. Un `ci.yml` qui explique « pas de `secrets: inherit` ici » était donc signalé, et un module i18n qui documente pourquoi le parc ne doit plus figer sa locale l'était aussi. Un contrôle qu'on ne peut pas expliquer sans le déclencher pousse à ne rien expliquer.

Les commentaires YAML (`#`), de bloc et de ligne sont retirés avant la recherche. Le motif de bloc est tempéré : la forme paresseuse enjambe les fins de commentaire et avalerait le fichier entier depuis son premier bloc de documentation.

Les deux cas sont sortis du squelette `pwa-starter-kit`, premier consommateur écrit pour être exemplaire — c'est exactement le rôle qu'on attend de lui.
