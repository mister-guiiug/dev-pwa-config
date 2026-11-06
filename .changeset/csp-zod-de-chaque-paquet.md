---
'@mister-guiiug/dev-pwa-config': patch
---

`vite-csp` : un paquet qui porte sa propre copie de zod la reçoit au build, au lieu du zod de l'application. L'alias `/^zod$/` de `cspPlugin` réécrivait TOUT `import … from 'zod'` vers le module `jitless`, qui réexporte le zod de l'app. Sur miss-devises (07/11/2026), CopilotKit, `@ag-ui/client` et `@a2ui/web_core` embarquent zod 3 dans leur `node_modules` et recevaient zod 4. Le copilote plantait au chargement (« Cannot read properties of undefined (reading 'call') »), en production seulement.

`resolveId` voit l'importeur du module virtuel. Si Node donnerait à cet importeur un autre zod que celui de l'app, il rend l'entrée ES de cette copie. Le code de l'application, et tout paquet qui partage son zod, gardent le module `jitless`. L'alias reste en place, et le plugin reste sans `enforce: 'pre'`.

Une application qui contournait le défaut par un greffon local (miss-devises, `zodDeChaquePaquet`) peut le retirer après la montée.
