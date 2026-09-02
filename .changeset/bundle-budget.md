---
'@mister-guiiug/dev-wpa-config': minor
---

`pwa-bundle-budget` — un budget de bundle pour les seize apps

`miss-uwh` (`check-bundle-budget.mjs`, 60 l.) additionne le poids **gzip**
de tout le JS émis et échoue au-delà d'un total ; `mister-qowa`
(`check-bundle.mjs`, 25 l.) borne le poids **brut** du chunk principal. Deux
mesures pour la même intention — et le commentaire d'uwh raconte trois
montées de version où la mesure a changé une décision. Deux apps sur seize
l'avaient ; les quatorze autres grossissent sans le savoir.

Un bin, comme `pwa-icons` :

```json
"scripts": { "build": "tsc -b && vite build && pwa-bundle-budget" },
"bundleBudget": { "totalGzipKb": 255, "mainChunkKb": 300 }
```

Les deux mesures sont gardées, parce qu'elles ne disent pas la même chose :
le total gzip est ce que l'utilisateur télécharge, le chunk principal ce
qu'il attend avant le premier rendu. Le budget se lit dans `package.json` —
il doit être relu dans une PR, pas dans un script `npm` que personne
n'ouvre — et un budget sans aucune borne n'échoue jamais en silence : il le
dit. Tous les dépassements sont rendus d'un coup.

`measureBundle`, `checkBudget` et `readBudget` sont exportés et testés ; le
script ne mesure rien quand on l'importe.
