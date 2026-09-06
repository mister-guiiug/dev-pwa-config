---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-doctor` — le contrôle `liens-famille` reconnaît maintenant la coquille
d'une application **sans routeur**.

Trois apps du parc basculent d'écran sur un état, sans `<Routes>` ni
`<Outlet>` : `miss-dice`, `miss-ticket-pwa`, `mister-puzzle`. Cherchée à ces
marqueurs seuls, leur coquille n'existait pas, et le contrôle leur reprochait
éternellement une place qu'elles tiennent. Il prend désormais aussi ce que
l'**entrée** monte : `main.tsx` rend `<App />`, et ce composant-là est la
coquille, routeur ou pas.

Il suit l'**import**, pas l'export : `export default App` ne porte pas de nom
exportable, et c'est la forme de deux des trois.
