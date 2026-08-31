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

Le balayage vit maintenant dans `scripts/adoption-scan.mjs`, testable — comme
`adoption-equivalents.mjs` et `migrate-plan.mjs` avant lui. Les deux défauts
corrigés ici vivaient dans du code que rien ne pouvait exercer.

Rien de publié ne change : outillage de développement du dépôt.
