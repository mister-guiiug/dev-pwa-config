---
'@mister-guiiug/dev-wpa-config': patch
---

Relevé d'adoption : trois des cinq dettes restantes n'existaient pas

Le relevé annonçait cinq doublons. En les ouvrant un par un, **trois étaient
des artefacts de l'instrument** — et l'un d'eux révèle un défaut qui pouvait
aussi mentir dans l'autre sens.

**`.claude` n'était pas ignoré.** Le balayage descendait dans les worktrees
d'agent : 98 fichiers source sous `miss-contraction/.claude`, 298 sous
`mister-footcoach`, 116 sous `mister-qowa` — du code de branches non
fusionnées. miss-contraction était comptée en dette sur `useI18n` pour un
`src/hooks/useI18n.ts` qui n'existe que là, donc dans aucune version de l'app.
Le tort symétrique est le dangereux : un worktree qui importe le paquet
ACQUITTE un besoin que `main` ne couvre pas. Vérifié — aucune app n'était dans
ce cas ce jour-là, mais rien ne l'en empêchait.

**`storage.ts` était devenu cent pour cent faux positifs.** La ligne était déjà
signalée comme la plus faible de la table, « conservée pour le vrai positif ».
Ce vrai positif était mister-cim10 — et il a migré. Restaient un adaptateur
`Storage` pour `zustand/persist` (mister-molkky) et de la persistance métier
(miss-contraction), ni l'un ni l'autre n'étant une sauvegarde.

La supprimer aurait perdu le rappel. Le besoin `backup` se détecte désormais
par ce que l'app **déclare** (`exports: ['createBackup', …]`) plutôt que par le
nom de ses fichiers : zéro détection sur le parc — le même chiffre que la
suppression, sans jeter ce qu'elle jetait. C'est la leçon des trois homonymes
(`Navbar.tsx`, `theme.ts`, `storage.ts`) appliquée au lieu d'être seulement
écrite.

**Les formes d'import : sept modules passaient pour morts.** Le relevé ne
connaissait que l'import nommé et le `@import` CSS. Or la couche outillage ne
s'importe presque jamais comme ça — un `prettier.config` réexporte, un
`setup.ts` importe pour l'effet de bord, un `tsconfig` hérite en JSON. Sept
sous-chemins étaient comptés à ZÉRO consommateur :

| sous-chemin           | vrai compte | forme                     |
| --------------------- | ----------- | ------------------------- |
| `/prettier`           | 16 / 17     | `export { default } from` |
| `/eslint-react`       | 16 / 17     | réexportation             |
| `/vitest-setup`       | 15 / 17     | `import '…'`              |
| `/tsconfig-app-react` | 15 / 17     | `"extends"`               |
| `/tsconfig-node`      | 15 / 17     | `"extends"`               |
| `/lint-staged`        | 14 / 17     | réexportation             |
| `/commitlint`         | 3 / 17      | réexportation             |

Le README affirmait « la couche outillage est adoptée » : c'était vrai, et
l'instrument affichait zéro. Un module qu'on ne sait pas mesurer passe pour
mort — et c'est ce chiffre qui décide quoi promouvoir ensuite.

La lecture des `tsconfig` est ancrée sur `extends`, pas sur le nom du paquet :
`miss-dice` le cite deux fois dans des **commentaires** (« Inlined from … »),
ayant recopié le contenu au lieu de l'étendre. Le compter serait exactement
l'inverse de la vérité.

Le balayage vit maintenant dans `scripts/adoption-scan.mjs`, testable — comme
`adoption-equivalents.mjs` et `migrate-plan.mjs` avant lui. Les trois défauts
corrigés ici vivaient dans du code que rien ne pouvait exercer.

Rien de publié ne change : outillage de développement du dépôt.
