---
'@mister-guiiug/dev-pwa-config': patch
---

`optionalPeers` : `@testing-library/jest-dom` accepte la 8 (`^6.0.0 || ^7.0.0 || ^8.0.0`). La 8.0.0, sortie le 19/11/2026, est celle qui prend vitest 5 en charge (testing-library/jest-dom#742) ; elle exige `vitest >=5 <6`, ce que tout le parc a déjà. Rien ne change pour une app restée en 7 : la pair est optionnelle, npm ne la vérifie pas.

Migration : aucune. Renovate propose la 8 dans chaque app ; elle s'installe sans toucher au `vitest-setup` du socle.
