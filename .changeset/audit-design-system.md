---
'@mister-guiiug/dev-pwa-config': minor
---

Les cinq actions de l'audit du design system du 06/09/2026.

**Cinq jetons avaient des replis divergents.** `--dwc-danger` valait `#b91c1c`
dans douze règles et `#b42318` dans quatre : une app qui ne déclare pas ses
jetons voyait **deux rouges côte à côte**. Idem pour `success`, `info`,
`primary-soft` (dont un repli `rgb(0 0 0 / 8%)`, noir sur noir en thème sombre)
et `border-strong`. Le garde-fou qui devait l'empêcher s'en tenait aux replis
sans parenthèses — il est remplacé par un lecteur à parenthèses équilibrées.

**Douze marqueurs `data-dwc` étaient émis sans une seule règle.** Le bandeau
« prêt hors ligne » d'`UpdatePromptBanner` sortait entièrement nu, `UpdateButton`
et son indice aussi. Le libellé de `BottomNav` déborde désormais en points de
suspension au lieu de pousser son voisin, et le contenu libre d'`EmptyState`
n'est plus comprimé au centre.

**`LoginForm` et `MfaChallenge` prennent le nom de leur titre**
(`aria-labelledby`), comme `Sheet` et `ConfirmDialog` : un lecteur d'écran
annonçait « formulaire » sur un écran qui n'a que ça.

**`tone` est le mot de la famille**, `variant` la forme. `ErrorBanner` accepte
`tone` (`severity` continue de marcher et reste l'attribut rendu), `Toast`
accepte `tone="danger"` à côté de `"error"`. En l'écrivant, un vrai défaut est
apparu : un `danger` tombait dans les **deux** régions vivantes — rendu et
annoncé deux fois.

**`Sparkline`, `BarChart` et `Gauge` ont enfin des tests** — seul composant
visuel sans aucun, avec trois adoptants — une fiche de catalogue et une
démonstration dans la vitrine.
