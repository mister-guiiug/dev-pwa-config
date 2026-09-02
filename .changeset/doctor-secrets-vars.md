---
'@mister-guiiug/dev-wpa-config': minor
---

`pwa-doctor` relève trois écarts de plus sur les secrets et les variables :
`secrets: inherit` dans un caller (le workflow appelé reçoit tout le trousseau),
une `VITE_*` rangée en secret (Vite la copie dans le bundle : le secret masque
les journaux, pas la valeur), et un `.env.example` absent ou incomplet au regard
des `VITE_*` que le code lit. Le README porte la règle : la question n'est pas
« est-ce sensible ? » mais « le navigateur le voit-il ? ».
