---
'@mister-guiiug/dev-wpa-config': minor
---

Exports Markdown, JSON et vCard — et un modèle de colonnes partagé.

**`./columns`** — la déclaration de colonnes est désormais commune au CSV, au Markdown et au JSON : une déclaration, trois formats, le même contenu. `toJson` traite d'une seule façon ce que `JSON.stringify` traite de deux (`undefined` disparaît d'un objet mais devient `null` dans un tableau ; `NaN` et `Infinity` deviennent `null` sans prévenir).

**`./markdown`** — tableaux qui restent des tableaux : la barre verticale est échappée (sinon elle coupe la ligne en colonnes), le retour à la ligne devient `<br>` (sinon il termine le tableau), et les colonnes sont alignées dans la SOURCE — un tableau Markdown est lu tel quel autant qu'il est rendu. Plus `toMarkdownList` pour ce qu'un tableau à dix colonnes rend illisible sur un téléphone.

**`./vcard`** — vCard 4.0 (RFC 6350), avec les quatre règles qu'on découvre en production : CRLF et non LF, `FN` obligatoire, les cinq caractères à échapper, et surtout **le pliage compté en OCTETS** (§3.2) qui ne doit jamais couper un caractère en deux. Un pliage naïf coupe les accents en mojibake — pour des noms français, ce n'est pas un cas limite.
