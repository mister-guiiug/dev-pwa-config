---
'@mister-guiiug/dev-pwa-config': patch
---

**Un tirer-pour-rafraîchir interrompu par le système ne rafraîchit plus.**

`usePullToRefresh` posait le MÊME gestionnaire sur `touchend` et sur
`touchcancel`. Or `touchcancel` ne dit pas « l'utilisateur a lâché » : il dit
que le système a repris la main — un appel qui arrive, une alerte, un geste de
bord, un doigt de trop. Un tirage interrompu au-delà du seuil lançait donc
`onRefresh` : sur les écrans où il recharge depuis le réseau, une requête que
personne n'avait demandée, au moment précis où l'attention est ailleurs.

`touchcancel` remet désormais l'état à zéro, sans rien décider ; `touchend`
seul rafraîchit. Le geste suivant repart proprement.

**Trouvé en écrivant le premier des sept tests** qui couvrent les sept
sous-chemins que le paquet publiait sans en éprouver un seul — `audio`,
`react/use-feedback`, `react/use-install-prompt`, `react/use-prefetch`,
`react/use-pull-to-refresh`, `react/use-qr-scanner`, `react/use-shake`. Les 144
sous-chemins JS du paquet sont maintenant ouverts par un test.
