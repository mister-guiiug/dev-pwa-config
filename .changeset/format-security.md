---
'@mister-guiiug/dev-wpa-config': minor
---

Deux modules recopiés sont promus — en corrigeant ce qu'ils avaient faux.

**`./format`.** Six apps ont un `format.ts`, et **trois portent exactement la
même liste de dix fonctions** (miss-carbook, miss-contraction, mister-puzzle) :
du copier-coller, pas une convergence. `Intl.NumberFormat` apparaît dans treize
apps sur seize. Trois défauts tombent à la promotion : une valeur non finie
affichait « NaN € » et rend désormais une chaîne vide ; `slugify` s'appuyait sur
`[^\w-]` pour faire tomber les diacritiques — un effet de bord — et laissait
« bonjour- » pour « Bonjour ! » ; `formatRelativeTime` prend une référence de
temps, donc se teste.

**`./security`.** Trois apps portent un `src/utils/security.ts`, dont **deux
identiques à l'octet**, et dont l'en-tête dit déjà « Utilitaires de sécurité pour
tous les projets ». Deux corrections de fond : `sanitizeHtml` créait un élément
DOM pour lire son `innerHTML` — inutilisable en test Node, en service worker ou
en rendu serveur, et le nom promettait un nettoyage qui n'a jamais eu lieu ; elle
devient `escapeHtml`, pure, avec sa limite écrite. Et `isBotRequest`, qui
reniflait l'agent utilisateur, n'est pas reprise : un agent se déclare ce qu'il
veut.

**Un déni de service, dans la fonction la plus anodine.** `isValidEmail`
utilisait `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, dont les deux dernières classes se
recouvrent : un point appartient à `[^\s@]`. Sur une saisie qui ÉCHOUE, le
moteur explore chaque découpage possible — 19 ms pour 4 ko, **1 s pour 32 ko**,
×4 à chaque doublement. Un champ où l'on colle une adresse suffisait à figer
l'onglet. La validation se fait désormais en un seul parcours, sans expression
régulière, avec le même verdict sur onze cas limites. Le test échoue en 3 974 ms
sur l'ancienne version.
