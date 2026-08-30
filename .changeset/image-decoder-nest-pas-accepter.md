---
'@mister-guiiug/dev-wpa-config': patch
---

`image` — décoder n'est pas accepter, et c'est enfin écrit.

**L'écart.** `compressImageToMaxBytes` documente le GIF (« les GIF animés
deviennent une image fixe ») pendant que `IMAGE_ACCEPTED_TYPES`, dans le MÊME
fichier, le refuse. L'adoption de `miss-carbook` (#16) l'a relevé : le module
sait traiter un format que son propre validateur rejette par défaut.

**L'arbitrage : le défaut ne bouge pas.** Élargir la liste ici la changerait pour
tout le monde. `bac-sable` appelle `validateImageFile(file)` **sans option**,
sous un `accept="image/jpeg,image/png,image/webp"` et un message qui annonce
« Formats acceptés : JPEG, PNG, WebP » — un défaut plus permissif lui ferait
accepter en silence ce que son propre écran refuse, et la régression partirait
telle quelle vers le miroir public `mister-family-map`. `mister-puzzle`, lui,
liste déjà `'image/gif'` explicitement : le défaut élargi ne lui apporterait
qu'un doublon. Une régression réelle contre zéro gain.

Ce qui manquait n'était donc pas la permission, c'était la RAISON. Elle est
maintenant dans l'en-tête de `image.js`, dans `image.d.ts` — la surface que les
trois apps TypeScript lisent réellement dans leur éditeur, et qui ne disait rien
— et dans un test qui empêche qu'on « corrige » l'incohérence en déplaçant le
défaut.

**Un correctif au passage.** Le message d'échec de lecture disait « Essayez un
autre fichier (JPEG, PNG, WebP ou GIF) » : il PROMETTAIT à l'utilisateur final un
format que le défaut de ce module refuse, et qu'une app comme `bac-sable` refuse
à l'écran. Ce module ne connaît pas la liste de son appelant ; il ne nomme plus
que le plancher, que toute app accepte par construction — « Essayez une photo
JPEG ou PNG. »
