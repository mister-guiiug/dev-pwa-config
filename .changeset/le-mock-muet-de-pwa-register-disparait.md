---
'@mister-guiiug/dev-wpa-config': minor
---

**`vitest-setup` ne mocke plus `virtual:pwa-register` du tout.** La 3.28.0 avait
rendu ce mock conditionnel — il tentait le module réel avant de retomber sur un
stub muet — ce qui suffisait à débloquer les apps mais laissait la cause en
place. Le repli n'était pas seulement inutile : il était **inatteignable**.

Un `vi.mock` agit à l'exécution ; un module source qui écrit
`import { registerSW } from 'virtual:pwa-register'` est refusé bien avant, à la
**transformation** (`Failed to resolve import "virtual:pwa-register"`), ce
module virtuel n'existant que dans un build servi par vite-plugin-pwa. Pour que
la fabrique du mock soit seulement appelée, il faut donc que le spécificateur se
résolve — c'est-à-dire qu'un `resolve.alias` le désigne — et dans ce cas
`importOriginal()` réussit toujours. La branche muette ne pouvait s'exécuter que
si le double lui-même levait à l'évaluation, où elle aurait **masqué** l'erreur.

Ce qu'il faisait, en revanche, était réel : une fois `pwaRegisterAlias` posé, le
spécificateur désigne le FICHIER `testing/pwa-register`, et le mock l'écrasait
(`No "swStub" export is defined on the "virtual:pwa-register" mock`). Suivre la
documentation rendait la fonctionnalité documentée inutilisable, et l'app
retombait sur le faux témoin muet que ce double existe pour supprimer. Relevé
par `mister-molkky` (#18), `miss-badminton` (#19) et `miss-dice` (#9), qui ont
tous dû écrire un `vi.unmock('virtual:pwa-register')` en tête de chaque fichier
de test. **Ce contournement peut être supprimé.**

**Rien ne régresse dans le parc**, et c'est vérifié plutôt que supposé.
Quinze des dix-sept apps posent l'alias : pour elles le mock n'était déjà plus
qu'un passe-plat. Les deux autres ne peuvent pas en dépendre — `miss-lookhouse`
n'importe jamais le module virtuel, et le seul importateur de `miss-contraction`
(`src/main.tsx`) n'est atteint par aucun test. Une épreuve sous Vitest 4 donne
les quatre cases : **avec** alias, les tests passent avec comme sans le mock
(liaison vivante de `registerSW` comprise, donc `swStub.reset()` continue de
renouveler l'identité) ; **sans** alias, ils échouent à la résolution dans les
deux cas, avec le même message.

`virtual:pwa-register/react` garde son mock : `pwaRegisterAlias` le capte aussi
(les alias Vite s'appliquent par préfixe) mais le mène à un chemin inexistant,
donc il n'écrase rien. C'est exactement la règle que verrouille le nouveau test
de `test/pwa-register-stub.test.mjs` — non pas « pas de mock », mais « aucun
mock dont l'alias fasse un fichier QUI EXISTE ». Il relève les appels réellement
enregistrés en chargeant `vitest-setup` avec un faux `vitest`, plutôt que de
relire le source, et il échoue bien dès qu'on remet l'ancien mock.
