---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-screenshots` : l'aperçu sert le build sous SA base, lue dans `dist/index.html` (`--base` pour l'imposer, `--dist` pour un autre dossier). Servi sous `/`, un build fait pour `/mister-x/` demandait ses actifs à `/mister-x/assets/…`, recevait des 404 et rendait une page blanche — les captures du squelette étaient deux rectangles blancs. Le bin refuse maintenant d'écrire une page vide, compte les 404 et sort en erreur.
