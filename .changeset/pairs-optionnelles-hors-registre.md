---
'@mister-guiiug/dev-pwa-config': minor
---

Les pairs optionnelles sortent de `peerDependencies`. GitHub Packages ne sert pas `peerDependenciesMeta` : le tarball le porte, les métadonnées du registre non (demande d'évolution chez GitHub depuis 2023). npm tenait donc les 23 pairs « optionnelles » pour obligatoires et les installait dans chaque app. Mesuré sur mister-miss-koh : 125 entrées de verrou et 228 Mo de `node_modules` en trop, dont Firebase et `@grpc/grpc-js`, dont les deux avis du 30/09 remontaient dans tout le parc.

- `peerDependencies` ne garde que les 11 pairs obligatoires, dont `web-vitals`, devenue obligatoire : le repli de `initWebVitals` est un import littéral, que Vite résout au build dans toute app qui embarque l'observabilité.
- Les 22 autres passent dans `optionalPeers`, plage inchangée, un champ que npm ignore et que `scripts/plafonds.mjs` et `migrate-consumers.mjs --peers` relisent. `peerDependenciesMeta` disparaît.
- Le README liste ces pairs, leur plage et les modules qui les attendent ; un test garde la table alignée sur `optionalPeers`.

**Avant de monter**, une app déclare ce que ses modules utilisent. Relevé du 01/10/2026 par le parseur de TypeScript, imports internes suivis : six apps sont concernées (`sharp`, commitlint, `uqr`, `@playwright/test`, `@axe-core/playwright`, `playwright`), chacune par sa PR. **Après la montée**, re-résoudre le verrou (`npx -y npm@11.19.1 install --package-lock-only --ignore-scripts`) pour en retirer les pairs qui n'y sont plus attendues.
