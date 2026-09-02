---
'@mister-guiiug/dev-wpa-config': patch
---

Le relevé d'adoption ne prend plus un fichier pour une façade parce qu'il
importe n'importe quoi du socle : il faut qu'il importe un symbole LIBÉRATEUR
du besoin, ou réexporte depuis le paquet. L'`AppHeader.tsx` de miss-uwh, qui
prend `Button` au socle et reste un en-tête écrit à la main, passait pour
adopté — avec quatorze autres copies. Le relevé passe de 19 à 34.

Deux sondes de dépôt (non publiées) : `scripts/probe-sites.mjs` lit les sites
publiés (manifeste, CSP, Open Graph, repli 404, poids du JS initial) ;
`scripts/dead-exports.mjs` relève les exports que personne n'appelle. Leurs
trouvailles du 02/09/2026 sont classées dans `PARC.md`.
