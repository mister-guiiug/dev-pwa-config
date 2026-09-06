---
'@mister-guiiug/dev-pwa-config': patch
---

**`pwa-bindings` ne posait rien sur Windows — la seule plateforme pour laquelle
il existe.**

La 4.6.0 lançait `npm.cmd` en le nommant explicitement, pour éviter d'avoir à
demander un interpréteur. Or `npm` est un **fichier de commandes**, et depuis le
correctif de CVE-2024-27980 Node refuse de lancer un `.cmd` sans interpréteur :
`spawnSync` rend `EINVAL`. L'outil imprimait donc la bonne liste, épinglée, puis
échouait juste avant de l'installer — `[bindings] ❌ spawnSync npm.cmd EINVAL`.
Sur Linux et macOS, où `npm` est un exécutable ordinaire, rien n'était visible :
c'est exactement la plateforme où l'outil ne sert à rien.

Windows passe désormais par l'interpréteur, et par une **ligne unique** : avec un
tableau d'arguments, Node avertit (DEP0190) que les arguments d'un `shell: true`
ne sont pas échappés mais concaténés — un avertissement à chaque exécution.
La concaténation est sans danger ici, et c'est la validation qui le garantit :
chaque nom et chaque version a déjà passé `NOM_VALIDE` / `VERSION_VALIDE`, qui
n'admettent ni espace ni métacaractère. Ailleurs, aucun interpréteur n'est
demandé.

Le test qui échouait n'inspecte pas la forme de l'appel, il **l'exécute** : c'est
le seul contrôle qui pouvait voir le défaut, puisque la construction de la
commande était correcte de bout en bout.
