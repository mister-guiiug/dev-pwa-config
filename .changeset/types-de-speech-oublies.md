---
'@mister-guiiug/dev-pwa-config': patch
---

Les types de `speech` suivent enfin son code

La 6.7.0 a publié `listVoices`, `onVoicesChanged` et l'option `voiceName` de
`speak` dans `speech.js`, mais `speech.d.ts` est resté celui de la 6.6.1 : la
nouvelle API était **invisible depuis TypeScript**. Un consommateur recevait
`has no exported member 'listVoices'` et `Expected 1-2 arguments, but got 3`.

Les `.d.ts` de ce paquet sont écrits à la main — rien ne les régénère — et le
test de parité existant ne vérifiait que **l'existence** du fichier. Il en
compare désormais les **noms exportés**, ce qui a révélé cinq autres décalages,
tous déclarés au passage : `urlObjetUtilisable` et `installeUrlObjet`
(`./vitest-setup`), `paletteFromCss`, `pngDimensions` et `manifestScreenshots`
(`./vite-pwa`).

Aucun changement d'exécution : ce correctif n'ajoute que des déclarations.
