---
'@mister-guiiug/dev-pwa-config': patch
---

`vite-pwa` : `googleFontsCaching()` est déclarée avec la forme de ses règles, au lieu de `Array<Record<string, unknown>>`. Publiée ainsi en 6.32.0, la déclaration faisait échouer le `tsc -b` des applications qui étalaient ces règles dans `workbox.runtimeCaching` (« not assignable to type 'RuntimeCaching[]' »). Sept apps sur vingt-deux l'ont vu au premier build.

`types/vue-du-consommateur.d.ts` vérifie désormais, à chaque `typecheck` du socle, que ce que `vite-pwa` déclare est assignable à ce que Workbox et Rolldown attendent. Un miroir minimal remplace leurs types, dont le socle ne dépend pas. La garde échoue sur l'ancienne déclaration.
