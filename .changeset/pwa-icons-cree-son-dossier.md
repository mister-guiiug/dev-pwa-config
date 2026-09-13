---
'@mister-guiiug/dev-pwa-config': patch
---

**`pwa-icons` créait ses fichiers mais pas son dossier.**

Viser un sous-dossier (`--out public/icons`) échouait sur un `sharp: No such
file or directory` qui ne nomme pas le dossier manquant. Le défaut ne se voyait
pas avec la valeur par défaut — `public` existe toujours — mais c'est
exactement ce que demande la convention d'icônes du socle : `pwaBaseOptions`
déclare `icons/icon-192.png`, dans un SOUS-DOSSIER.

Mesuré sur les vingt-et-un sites du parc en ligne : **`pwa-starter-kit` sert un
manifeste dont les trois icônes répondent 404**. Ses icônes sont bien là, mais
un cran plus haut (`icon-192.png` répond 200) — son script vise `--out public`,
ce qui est précisément le contournement que ce défaut imposait. Chrome n'a que
le manifeste pour trouver une icône : il reçoit trois 404 et fabrique une
pastille à la lettre.

Le squelette pourra revenir à `--out public/icons` une fois ce correctif
publié.
