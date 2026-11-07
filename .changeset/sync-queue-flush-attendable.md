---
'@mister-guiiug/dev-pwa-config': patch
---

`sync-queue` : deux corrections relevées par miss-arcade (07/11/2026).

**`flush()` pendant un drain rend la promesse du drain en cours**, au lieu de `{ done: 0 }` tout de suite. Ce drain relit la file à chaque tour et emporte aussi ce qui a été enfilé entre-temps : `await flush()` veut désormais dire « la file a été poussée ». C'est ce que lisaient déjà trois consommateurs, à tort jusqu'ici : miss-uwh pousse avant de tirer l'état du serveur, miss-lookhouse écrit `flush().then(tirerSiDu)`, et le `drained` du squelette (et de miss-holi-voyage) était remplacé à chaque écriture par la promesse vide. Il n'y a toujours qu'un drain à la fois.

**Une file effacée du stockage ne ressort plus de la mémoire.** Le reflet mémoire servait de valeur par défaut à chaque lecture. Après « Supprimer mes données » (effacement par préfixe), la file revenait donc au tour suivant et partait vers le serveur avec ce que l'utilisateur venait d'effacer. Le reflet ne sert plus qu'après une écriture refusée (quota, mode privé), son seul rôle.
