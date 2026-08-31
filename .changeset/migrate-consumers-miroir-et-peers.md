---
'@mister-guiiug/dev-wpa-config': patch
---

`migrate-consumers` — l'outil qui écrit dans les dix-sept dépôts faisait deux
choses qu'on ne lui demandait pas.

**Il proposait de modifier un miroir.** `mister-family-map` est publié à la main
depuis `elowner-ax/bac-sable` ; une PR y est interdite. L'auto-découverte le
trouvait pourtant, puisqu'il déclare bien le paquet — et lancé avec `--write`,
le script y écrivait une modification qu'un `npm run mirror` suivant aurait
**écrasée en silence**, donc sans que personne ne la voie jamais.

**Il alignait les peerDependencies sans qu'on le demande.** Anodin tant que le
parc est homogène — il ne l'est pas. Sur `mister-quota`, seule app Electron et
restée en arrière, « aligner le plancher du socle » proposait **cinq montées
majeures** : React 18→19, Vite 5→8, TypeScript 5→6, Vitest 2→4, ESLint 8→9.
Une migration de cadre complète, dans le même geste, et sans la nommer. C'est
désormais `--peers`, un drapeau explicite.

Les deux défauts ont la même forme : un outil qui fait PLUS que demandé, dans
un geste qu'on croit sûr.

La décision passe dans `scripts/migrate-plan.mjs` — le script est un outil dont
le point d'entrée balaie les dossiers frères dès qu'on le charge, ce qu'il
décide est de la donnée. Même séparation que `adoption-equivalents.mjs`, et
c'est ce qui rend les deux gardes testables : elles sont vérifiées par mutation.
