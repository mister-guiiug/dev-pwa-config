---
'@mister-guiiug/dev-wpa-config': patch
---

`Sheet` et `ConfirmDialog` : le clic sur le voile ferme vraiment. Les deux
composants écoutaient le clic sur la racine avec une garde
`target === currentTarget`, mais le voile (`sheet-backdrop` /
`confirm-backdrop`) est un enfant qui recouvre toute la racine (`inset: 0`
dans `components.css`) : en navigateur, c'est LUI la cible du clic, la garde
échouait, et rien ne se fermait jamais. Invisible en jsdom — pas de
hit-testing, les tests dispatchaient sur la racine — le bug a été mesuré en
vrai navigateur par deux apps pendant la campagne `components.css`
(mister-footcoach#25, mister-molkky#14). Le gestionnaire accepte désormais
deux cibles, la racine OU le voile : les apps qui ont posé la rustine
`[data-dwc='sheet-backdrop'] { pointer-events: none; }` — chez elles le clic
traverse et atterrit sur la racine — ferment toujours, et pourront retirer
la rustine. Un clic dans le panneau ne ferme toujours pas ; la garde
`loading` du `ConfirmDialog` (deux-actions comme mono-action) est inchangée.
