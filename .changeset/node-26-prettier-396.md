---
'@mister-guiiug/dev-pwa-config': patch
---

Node 26.2.0 partout dans la CI, et Prettier 3.9.6.

Le contenu publié ne bouge qu'à deux endroits : `pwa-doctor` conseille
désormais d'écrire « 26.2.0 » dans un `.nvmrc` manquant, et les déclarations
`.d.ts` sont reformatées par Prettier 3.9.6 (unions sur une ligne quand elles
tiennent, `extends` collé, rupture avant `await import`) — aucun changement de
type ni de comportement.

Ce qui compte pour les consommateurs est ailleurs, et n'arrive que par cette
publication : les réutilisables (`pwa-ci`, `pwa-deploy`, `pwa-lighthouse`,
`pwa-worker-deploy`, `npm-publish`) et l'action `setup-pwa` prennent
`node-version: '26.2.0'` par défaut. L'étiquette mobile `v4` ne suit qu'une
release — sans elle, la modification resterait dans ce dépôt.

`engines.node` reste `>=22`, délibérément : le relever serait une rupture, donc
un `v5` et une migration des `uses:` sur vingt et un dépôts, pour un plancher
que rien dans ce paquet n'exige. La matrice de CI éprouve donc les deux bouts —
22, qu'on promet, et 26.2.0, qu'on épingle.

Le détour `npx --yes npm@11` du job « squelette » disparaît : il contournait
l'Arborist de npm 10.9.8 (Node 22) sur une dépendance `file:`, et Node 26.2.0
embarque npm 11.13.0.
