---
'@mister-guiiug/dev-pwa-config': minor
---

**`/qr` repose sur `uqr` et non plus sur `qrcode` — et `qrToDataUrl` rend un SVG.**

Le relevé des librairies dormantes du 14/09/2026 a sorti quatre paquets QR du parc, pour **deux besoins seulement** :

| Paquet                           | Rôle       | Dernière version | Dernier commit amont  |
| -------------------------------- | ---------- | ---------------- | --------------------- |
| `react-qr-reader` `3.0.0-beta-1` | scan       | il y a 1 670 j   | 1 022 j — 149 tickets |
| `qr-scanner` `1.4.2`             | scan       | 1 391 j          | 897 j                 |
| `qrcode` `1.5.4`                 | génération | 769 j            | 752 j                 |
| `qrcode.react` `4.2.0`           | génération | 642 j            | le jour même          |

Le socle avait déjà unifié les deux besoins derrière `/qr` et `/react/use-qr-scanner` — mais sur deux fondations à l'arrêt. Celle de la génération change ici.

**Pourquoi `uqr`.** Sept candidats mesurés, bundle esbuild minifié puis gzippé :

```
qrcode  (actuel)  9,5 ko gzip   3 dépendances transitives   à l'arrêt
uqr               4,1 ko gzip   AUCUNE                      publié il y a 164 j
@nuintun/qrcode   —             1                           461 ko décompressés
qrcode-generator  —             0                           dév. sans version, 543 ko
```

`uqr` livre aussi ses propres types : `@types/qrcode`, que molkky et qowa déclarent, devient inutile.

**L'API ne change pas.** `qrToDataUrl` et `qrToSvg` gardent leur nom, leur signature et le **vocabulaire d'options de `qrcode`** — `errorCorrectionLevel`, `margin`, `color.dark`, `width`, `scale` — que trois applications emploient déjà. La traduction vers `uqr` se fait dans le module, une fois pour toutes : `ecc` partage le même alphabet `L|M|Q|H`, `border` vaut `margin` (en modules), `blackColor`/`whiteColor` valent `color.dark`/`color.light`. Seul `width` n'a pas d'équivalent — `uqr` raisonne en pixels PAR MODULE — il est donc posé après coup sur la racine du SVG.

**Un seul changement visible : `qrToDataUrl` rend une data-URL SVG, plus PNG.** Les trois appelants la posent dans un `<img src>`, où les deux marchent. Le SVG y est plus net à l'impression comme sur grand écran, et plus léger : 14 587 octets contre 20 421 pour le PNG 512 équivalent en base64. Qui attendrait un PNG binaire — un `fetch` puis `toBlob`, un envoi serveur — doit en tenir compte.

**Vérifié par un aller-retour réel**, et pas seulement contre un faux module : SVG rendu par le vrai `uqr`, rastérisé par `sharp`, relu par `jsQR` — le contenu décodé est identique à celui encodé, y compris aux couleurs de la famille. `errorCorrectionLevel` et `margin` ont été éprouvés par leur effet mesurable sur la taille du QR, pas par la forme de l'appel.

Ce rejeu a d'ailleurs pris un test en défaut : `assert.doesNotMatch(svg, /width=/)` passait au vert quoi qu'il arrive, `uqr` rendant un `<rect width="…">` par module. L'assertion porte maintenant sur la balise racine seule.

**Le scan ne bouge pas.** `BarcodeDetector`, l'API native, est absente de Chrome sous Windows (mesuré) et de Safari ; le ponyfill retomberait sur 1,04 Mo de WebAssembly là où `qr-scanner` pèse ~29 ko. Pour un écran d'un seul dépôt, l'échange serait mauvais. La décision est inscrite dans `react/use-qr-scanner.js` avec son seuil de révision.
