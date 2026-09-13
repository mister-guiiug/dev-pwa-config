---
'@mister-guiiug/dev-pwa-config': minor
---

**`pwa-ci.yml` accepte `run-coverage`, et refuse de le faire à moitié.**

Le réutilisable lance `npm run test`, et rien d'autre. Or Vitest ne mesure
aucune couverture sans `--coverage`, donc n'en compare aucun seuil : un
`thresholds` inscrit dans `vitest.config.ts` n'était VÉRIFIÉ que si le script
`test` du dépôt portait lui-même le drapeau. Relevé du 13/09/2026 pendant la
montée du parc en Vitest 5 : **six dépôts déclaraient des seuils, un seul les
jouait** (`mister-footcoach`). Les cinq autres écrivaient un script
`test:coverage` que personne n'appelait — et **trois échouaient à leur propre
plancher depuis toujours**, sans qu'aucun job ne rougisse. Ce n'est pas une
dette qu'on oublie de payer : c'est une garantie que rien ne tenait.

`run-coverage: true` joue `npm run test:coverage`. L'entrée est opt-in, comme
`run-doctor` — un socle ne rend pas rouges les CI qu'il sert — mais elle
**échoue** quand le script manque, ou quand elle est demandée avec
`run-tests: false`, au lieu de retomber en silence sur `npm run test` : une
garde qui se tait reproduirait exactement la panne qu'elle répare. Le journal
distingue les deux régimes par le nom de l'étape, plutôt que de les cacher
derrière un `if` de script.

Cette version existe pour que l'étiquette mobile `v4` avance : une correction
de workflow réutilisable n'atteint aucun des dix-neuf consommateurs tant que
rien n'est publié. `CONTRIBUTING.md` disait le contraire — « pas de changeset
pour les workflows » — et c'est corrigé ici.
