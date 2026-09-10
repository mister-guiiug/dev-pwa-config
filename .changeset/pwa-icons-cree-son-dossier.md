---
'@mister-guiiug/dev-pwa-config': patch
---

**`pwa-icons` créait ses fichiers mais pas son dossier.**

Viser un sous-dossier (`--out public/icons`) échouait sur un
`sharp: No such file or directory` qui ne nomme pas le dossier manquant. Le
défaut ne se voyait pas avec la valeur par défaut — `public` existe toujours —
mais c'est exactement ce que demande la convention d'icônes du socle :
`pwaBaseOptions` déclare `icons/icon-192.png`, dans un SOUS-DOSSIER.

Cette combinaison a laissé **deux dépôts installer une application sans logo
sur Android** (`mister-settle` et le squelette lui-même) : leur script écrivait
à la racine de `public/` faute de pouvoir viser `public/icons`, le manifeste
promettait `icons/…`, et Chrome — qui n'a que le manifeste pour trouver une
icône — recevait trois 404 et fabriquait une pastille à la lettre.
