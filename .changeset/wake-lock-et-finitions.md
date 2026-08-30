---
'@mister-guiiug/dev-wpa-config': minor
---

`useWakeLock` (`/react/use-wake-lock`) : garder l'écran allumé, promu de
miss-contraction et de mister-molkky. L'union des deux copies, dont aucune
n'était complète — miss-contraction tenait sa sentinelle en `ref` mais ne
réacquérait jamais (le navigateur relâche d'autorité dès que l'onglet passe en
arrière-plan : au retour, l'écran s'éteignait en plein chronométrage) ;
mister-molkky écoutait bien `visibilitychange` mais gardait sa sentinelle en
fermeture, si bien qu'après une réacquisition c'était l'ancienne, déjà
relâchée, qu'il libérait au démontage. Ici : réacquisition au retour de
visibilité, libération au démontage comme à la retombée d'`active`, événement
`release` écouté, et un état exposé (`supported`, `held`) pour masquer un
réglage qui ne ferait rien (Firefox, iOS avant 16.4). Le hook ne lève jamais.
Le branchement sur un store de réglages reste applicatif :
`useWakeLock(reglages.ecranAllume && enCours)`.

Trois finitions relevées pendant la campagne d'adoption, chacune par la
migration qui a dû poser le contournement :

- **`components.css`, `prefers-reduced-motion`** — le bloc ne réduisait que
  `sheet-panel`, alors que `confirm-panel` et `toast` portent la même entrée
  `dwc-rise` : une alerte et un message surgissaient malgré le réglage.
  mister-puzzle (#14) avait dû reposer la règle côté app.
- **`ConfirmDialog`, commentaire du mode mono-action** — il présentait le
  `flex: 1` du bouton unique comme « le rendu des alertes que mister-puzzle et
  mister-cim10 dessinaient à la main ». C'est faux pour mister-cim10, dont
  l'alerte était compacte et alignée à droite ; sa migration (#27) a donc dû
  poser un écart local. Le commentaire dit maintenant le vrai, et rappelle
  qu'une identité d'app se reprend en deux lignes de CSS non « layered ».
- **`ObservabilityBoundary`, types incomplets** — `reference` et
  `referenceLabel` étaient lues par la frontière depuis toujours mais absentes
  du `.d.ts` : `tsc` refusait la référence de corrélation affichée dans l'écran
  de secours, et miss-supaboss (#30) avait dû la passer en spread commenté.
  Déclarées (`reference?: string | false` sur la façade), sans aucun changement
  de comportement, et un test de surface empêche la récidive.
