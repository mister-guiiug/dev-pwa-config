---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-doctor` attrape la barre basse collée par le CSS de l'app sans `placement="fixed"` — nouveau contrôle `bottom-nav-muette`, au niveau **défaut**.

`BottomNav` n'émet `data-placement="fixed"` que si l'app passe la prop. Or tout le dégagement du socle est gardé là-dessus : `--_dwc-bottom-clearance` et la position du bandeau de mise à jour vivent sous `:root:has([data-dwc='bottom-nav'][data-placement='fixed'])`. Une app qui colle sa barre dans **sa** feuille de style obtient donc une barre fixe et un dégagement **nul** : toutes les surfaces flottantes passent dessous.

Mesuré en production sur `mister-cim10` le 16/09/2026, en 375 × 812 : barre fixe de 56 px, `--_dwc-bottom-clearance` à `max(0px, 0px)`, bandeau de consentement recouvert et 79 px sous la ligne de flottaison. Même défaut sur `miss-contraction`, signalé par le propriétaire — un bouton « Mettre à jour » qu'aucun clic n'atteignait. Ce sont les deux seules apps du parc dans ce cas, et le contrôle les nomme toutes les deux.

Une garde CSS ne peut pas lire une position calculée. Ce contrôle le peut, parce qu'il lit les deux sources à la fois : c'est pourquoi `contexteDepot` collecte désormais aussi les feuilles de style de `src/` (`ctx.styles`, `ctx.cssText`).

**`sticky` n'est pas visé, et c'est délibéré.** Une barre collante reste dans le flux : elle réserve sa propre hauteur, et le dégagement du socle la compterait une seconde fois. `miss-genius` est dans ce cas ; la première écriture du contrôle le flaguait à tort, et lui conseiller `placement="fixed"` aurait changé sa mise en page au lieu de la réparer.
