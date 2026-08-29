---
'@mister-guiiug/dev-wpa-config': minor
---

Appairage : codes courts + QR, promus de mister-qowa, mister-molkky et
miss-ticket-pwa. `/pairing` (pur) : alphabets nommés (`numeric`,
`crockford32` avec correction des confusions, `antiConfusion`),
`generateCode` (aléa crypto injectable, tirage par rejet sans biais),
`normalizeCode` (les confusions ne sortent plus de l'alphabet), et
`buildDeepLink`/`parseDeepLink` pour les liens `schéma:action?clé=valeur`.
`/qr` : `qrToDataUrl`/`qrToSvg` par la peer optionnelle `qrcode`, chargée
paresseusement, erreur explicite si elle manque.
`/react/use-qr-scanner` : le cycle de vie caméra de la peer optionnelle
`qr-scanner` — câblage dans un effet, arrêt et destruction garantis.
