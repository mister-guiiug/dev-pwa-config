---
'@mister-guiiug/dev-wpa-config': patch
---

Déclarer les peers optionnelles que le code promettait déjà : `@sentry/react` et `firebase`.

`react/observability.js` lazy-importe `@sentry/react` et se documente « peer optionnelle » depuis sa promotion ; `realtime/firebase.js` et `push/firebase.js` ouvrent sur « Peer OPTIONNEL : `firebase` ». Aucun des trois n'était déclaré dans `package.json` : un `npm ls`, un audit de graphe ou un outil de renouvellement ne pouvaient pas savoir que ces modules attendent quelque chose — ni dans quelle plage.

`@sentry/react` entre en `>=8.0.0` (le module n'appelle que `init` et `captureException`, stables depuis longtemps ; les apps mesurées sont en `^8.45.0`) et `firebase` en `>=9.0.0` (l'API injectée — `onSnapshot`, `getToken` — est la forme modulaire de la v9 ; les apps sont en `^11`/`^12`). Les deux sont `optional: true` : rien n'est installé ni exigé chez qui n'utilise pas ces transports.

`firebase` est déclaré bien que jamais importé par le paquet — les objets sont **injectés** (`onSnapshot`, `messaging`, `getToken`…), précisément pour que le paquet ne décide pas de la version à la place de l'app. La déclaration optionnelle ne change rien à ça : elle dit seulement, au bon endroit, la plage avec laquelle ces adaptateurs savent travailler.
