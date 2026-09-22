---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-doctor` : un morceau hors précache ne doit pas porter d'empreinte

Nouvelle règle **`chunk-hors-precache`** (famille « build », niveau **défaut**),
qui lit les artefacts de `dist/` et non la configuration.

**Le défaut qu'elle attrape a rendu Sentry muet sur dix-neuf dépôts sans que
personne le voie.** Signalé en production sur `mister-qowa` le 22/09/2026 :
« Échec du chargement pour le module dont la source est
`.../assets/sentry-EYLFX1f0.js` », HTTP 404.

Le mécanisme, mesuré sur le site en ligne — 42 entrées `assets/` précachées, 32
morceaux référencés par l'entrée, **un seul écart** :

1. le service worker sert la coquille **précachée** jusqu'à ce que l'utilisateur
   accepte la mise à jour ;
2. cette coquille demande l'**ancienne** empreinte du morceau non précaché ;
3. le déploiement suivant a remplacé `assets/` — le fichier n'existe plus.

Tout ce qui est précaché survit ; c'est précisément ce qui en est exclu qui casse.
Or l'exclusion est JUSTE : 158 kB gzip de SDK que personne ne doit télécharger
sans DSN. Ce n'est pas l'exclusion qu'il faut défaire, c'est l'empreinte.

**Et ça ne se voit pas.** `initSentry` enveloppe son import dans un `try/catch` :
l'application ne casse pas, elle cesse de rapporter ses erreurs sans le dire. Un
rapporteur éteint par le déploiement qui vient de l'installer.

## Le remède, côté app

```js
chunkFileNames: chunk =>
  chunk.name === 'sentry' ? 'assets/sentry.js' : 'assets/[name]-[hash].js',
```

et les **deux** motifs qui visaient le nom mis d'accord — le filtre de
`modulePreload.resolveDependencies` et le `globIgnores` de Workbox — sans quoi
les 158 kB rentrent, respectivement, dans le `modulepreload` de l'entrée et dans
le précache. En silence, les deux.

Rien n'est perdu au cache : GitHub Pages répond `Cache-Control: max-age=600` sur
**tous** les fichiers, empreinte ou pas.

## Ce que la règle ne fait pas

**Sans service worker, elle se tait** — et ce n'est pas une facilité : sans
précache il n'y a pas de coquille périmée, donc aucun ancien nom à demander.
L'invariant est vide, pas contourné. Le test le prouve dans les deux sens, sur le
même build.

Éprouvée sur un cas réel avant publication : le build de `mister-settle` avant
correctif rend `1 défaut` en nommant `sentry-DajRfw-G.js`, celui d'après rend
`0 défaut`.
