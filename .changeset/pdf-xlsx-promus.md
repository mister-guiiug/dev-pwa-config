---
'@mister-guiiug/dev-wpa-config': minor
---

Exports PDF et Excel — promus de mister-doc, où ils tournent en production.

**`./pdf`** — `mister-doc/src/lib/pdf.ts` fabriquait déjà un vrai binaire `application/pdf` sans bibliothèque : A4 portrait, Helvetica, repère haut-gauche comme à l'écran, et surtout une table `xref` dont les offsets sont relevés sur les octets réellement écrits — ce qui rend le fichier ouvrable par les lecteurs stricts, pas seulement les tolérants. Deux changements à la promotion : `downloadPdf` passe par `downloadBlob` (`./download`), et `buildPdf([])` rend une page vide au lieu de lever — le repli que les deux consommateurs d'origine recopiaient chacun.

**`./xlsx`** — `mister-doc/src/lib/xlsx.ts` et ses tests : un vrai classeur Office Open XML (archive ZIP « stored », CRC32 calculé, parties XML minimales, date figée donc export déterministe), avec des cellules numériques réellement typées — donc sommables — et l'en-tête en gras. C'est le fichier que l'utilisateur demande quand il dit « en Excel », et que le CSV `excel-fr` ne remplace pas.

Qui attend ces modules : miss-contraction pour l'export du suivi à présenter à la maternité, mister-cim10 pour ses relevés de codage, mister-footcoach pour l'export RGPD des données des joueuses, et miss-uwh — qui produit son bilan comptable en chargeant SheetJS par CDN, et pourra s'en passer.
