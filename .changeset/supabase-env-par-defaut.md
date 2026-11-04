---
'@mister-guiiug/dev-pwa-config': patch
---

`createSupabaseClientFactory` lit l'environnement Vite du bundle quand l'app ne passe pas `env`. Il lisait `{}`, sur la croyance que Vite ne remplace `import.meta.env` que dans le code de l'application : c'est faux, il le substitue aussi dans les dépendances, en build comme en développement. Trois applications nées du squelette, qui ne passait pas `env`, affichaient « configuration manquante » en production alors que l'adresse du projet était dans le bundle (mister-settle, miss-holi-voyage, miss-arcade). Un `env` passé l'emporte toujours ; hors de Vite (Node, Vitest), rien ne change.
