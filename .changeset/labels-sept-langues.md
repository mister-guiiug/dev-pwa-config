---
'@mister-guiiug/dev-wpa-config': minor
---

Les libellés du socle en sept langues, et `offlineMessage` sur `useActionGuard`

`react/labels` ne portait que `fr` et `en`, et **retombait en silence sur le
français** pour toute autre locale. Or la famille en parle sept :
`miss-contraction` (7), `miss-dice` (6), `mister-qowa` (5), `miss-badminton`
(3). Huit fichiers-pont dans sept apps — `AppUpdatesProvider` × 2 (le même
fichier à 82 %), `AppLabelsProvider`, `SocleLabels`, `SocleProviders`,
`SocleLabelsBridge`, `useNetworkGuard` × 2 — n'existaient que pour surcharger
ce que le socle ne savait pas dire. `miss-badminton` surchargeait jusqu'au
français « pour que le repli devienne inatteignable ».

Les 54 libellés existent désormais en `es`, `de`, `it`, `pt` et `nl`, avec la
terminologie déjà en production dans ces apps (« Más tarde », « Neu laden »,
« Riprova », « Tentar novamente », « Herladen »). Le test de parité couvre les
sept dictionnaires : une clé absente dans l'un d'eux fait échouer `npm test`.

**`labelsFor(locale)`** : une étiquette régionale retombe sur sa langue avant
de retomber sur le français — `pt-BR` donne du portugais, ce que
`createI18n` peut transmettre tel quel.

**`useActionGuard({ online: true, offlineMessage })`** : le motif « hors
ligne » ne pouvait venir que des libellés du paquet. `mister-puzzle` et
`mister-qowa` enveloppaient le hook dans un `useNetworkGuard` de trente à
cinquante lignes pour lui redonner sa phrase — et puzzle, qui écrit son i18n
à la main sans `LabelsProvider`, ne peut être servi par aucune langue de plus.
Une prop, comme `message` sur une vérification injectée.
