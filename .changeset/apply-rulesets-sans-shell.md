---
'@mister-guiiug/dev-wpa-config': patch
---

`apply-rulesets` n'assemble plus de ligne de commande

CodeQL le signalait depuis le 24/08 (`js/indirect-command-line-injection`,
alerte 8, gravité moyenne) : le nom de dépôt venu de `process.argv` descendait
jusqu'à `execSync`, en traversant une chaîne de commande.

```
node scripts/apply-rulesets.mjs 'x; commande'
```

`execSync` reçoit une ligne de commande, donc un interpréteur : tout ce qui s'y
retrouve peut en sortir. `execFileSync` prend un exécutable et un **tableau**
d'arguments, passés tels quels au processus — il n'y a plus de chaîne à
découper, donc plus rien à échapper. **La classe entière de défaut disparaît**,
pas seulement ce cas-ci.

L'outil valide en outre son argument contre le catalogue. Ce n'est pas la
correction — c'en est une seconde, utile à autre chose : une faute de frappe
partait jusqu'ici en requête et rendait un 404 attrapé par le `try`, donc un
`✗` au milieu d'une sortie verte. C'est exactement la panne que l'en-tête du
script raconte — `miss-ticket` pour `miss-ticket-pwa` — et elle laissait croire
un ruleset appliqué.

Outillage de développement du dépôt : rien de publié ne change.
