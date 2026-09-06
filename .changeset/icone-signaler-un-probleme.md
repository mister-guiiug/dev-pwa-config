---
'@mister-guiiug/dev-pwa-config': patch
---

**« Signaler un problème » portait la flèche d'un autre rôle, et le contrat
d'icônes se contredisait lui-même.**

`DEFAULT_ICONS.issue` valait `ExternalLinkIcon` — le dessin d'`external` —
pendant que `LUCIDE_NAMES.issue` valait `Bug`. Une app avec `lucide-react`
affichait donc un insecte, une app sans affichait une flèche : **deux dessins
pour un rôle**, ce que ce module existe précisément pour empêcher (« deux
langages visuels dans la même interface, sans que personne l'ait décidé »).
Sur les neuf rôles, `issue` était le seul dans ce cas.

À l'écran, l'effet était pire que l'incohérence. La flèche dit « ce lien sort
du site », ce qui est vrai des **trois** liens du pied de page : elle ne
distinguait rien, et entre l'octocat de « Code source » et la tasse de
« M'offrir un café », elle se lisait comme un glyphe égaré plutôt que comme une
icône. Elle pesait aussi moins que ses deux voisines — 14 px de contour fin
contre 16.

`BugIcon` est un dessin original, à la taille des deux autres (16 px), et
volontairement pauvre en traits : un corps, deux antennes, quatre pattes. À
16 px, un thorax segmenté et six pattes deviennent une tache.

**Le garde qui manquait.** `themes-icons-rive.test.mjs` vérifiait déjà que les
deux tables ont les mêmes clés — ce qui était vrai, et ne suffisait pas. Un
nouveau test compare leur **partage** : deux rôles servis par le même repli
doivent l'être par le même nom lucide, et réciproquement. Un rôle qui emprunte
le dessin d'un autre d'un seul côté échoue désormais, nommément. Vérifié par
falsification : remettre `issue: ExternalLinkIcon` le fait rougir.

Une app qui fournit déjà ses propres icônes (`IconsProvider`) ne change de
rien, et celles sur lucide non plus — elles voyaient déjà un insecte.
