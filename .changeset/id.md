---
'@mister-guiiug/dev-wpa-config': minor
---

`id` — `createId`, `createUuid`, `isUuid`

Le besoin le plus banal qui soit, et **deux cent cinquante sites d'appel** dans
quatre apps : `miss-uwh` (`createId` + `createUuid`, 99), `mister-footcoach`
(75), `bac-sable` (`newId`, 46), `miss-genius` (`createId`, 30 — la copie de
celui d'uwh, à la lettre). Et le paquet le réécrivait lui-même : `sync-queue`
et `react/use-offline-queue` portaient chacun leur `newId()` avec le même
repli sur `crypto.randomUUID`. Les deux importent désormais d'ici.

`createUuid` est celui d'uwh, le seul des quatre à avoir le repli v4
**complet** — bits de version et de variante posés, ce qu'une colonne `uuid`
Postgres exige. `createId(prefix)` rend `id_3f9a2c1b`. `isUuid` valide la
forme.

Ce qui n'est PAS promu : `genId` de footcoach (compteur + horodatage, une
autre promesse) et `generateSecureId` de `security`, qui est un jeton
imprévisible sans repli — son commentaire, qui évoquait `randomUUID`, était
périmé et le dit maintenant.
