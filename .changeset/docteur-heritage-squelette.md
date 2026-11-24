---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-doctor` : nouvelle dette `herite-du-squelette`. Le générateur (`create-lg-pwa-app`) recopie les visuels du squelette (favicon, icônes, captures du manifeste, image de partage) et en note désormais l'empreinte SHA-256 dans `pwaDoctor.heritage`. Le docteur nomme à chaque build ceux qui sont encore identiques, les regroupe par dossier, et donne le geste dans l'ordre (`npm run icons`, `npm run screenshots`, `npx pwa-og-image`). Quand le dernier est refait, il le dit (info `heritage-solde`) et le refus posé à la naissance se signale périmé. Le 24/11/2026, miss-arcade, miss-bonus-quest et miss-holi-voyage servaient encore l'image de partage du squelette (« PWA Starter Kit » sur la carte du hub), et miss-bonus-quest et mister-contrib ses captures, sans que rien ne le dise. Sans `pwaDoctor.heritage`, le contrôle se tait : aucune app existante n'est touchée.
