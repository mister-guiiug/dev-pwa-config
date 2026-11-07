---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-deploy.yml` vérifie le site EN LIGNE après chaque déploiement (job `verifier`, actif par défaut). Jusqu'ici, aucune panne de production n'avait été vue par une machine : le jeu public de miss-arcade est resté cassé trois jours, trois apps ne démarraient plus hors ligne depuis des semaines, le hub a bloqué l'installation de vingt apps pendant six jours — chaque fois, un audit ou le hasard.

- Le job attend que `<page_url>version.json` porte le commit déployé (`versionPlugin`), `verify-timeout` minutes au plus (10). Sans `version.json`, la page est visitée quand même, avec un avertissement.
- Puis Chromium ouvre la page, service worker bloqué, cache du CDN contourné, et exige : que React ait monté (le contenu servi aux robots `[data-dwc="served-content"]` a disparu et une racine React a rendu un élément, ou `verify-selector` est visible), aucune violation CSP appliquée, aucune requête de même origine en échec (≥ 400). Un échec rend le run rouge ; capture et rapport en artefact `verification-apres-deploiement`.
- La visite est en lecture seule : analytique, création de session et écritures vers un tiers sont bloquées.
- En option, `verify-e2e: true` joue les specs `@critical` (`verify-e2e-grep`) contre l'URL publiée : le `baseURL` de `playwright.config.*` est remplacé, son `webServer` retiré. Les specs doivent naviguer en relatif (`./`) et rester sans écriture.
- IndexNow ne signale plus qu'un déploiement vérifié (ou dont la vérification est éteinte).

Jouée le 07/11/2026 sur les vingt-trois apps publiées : toutes vertes, sans un avertissement. Migration : aucune — chaque app l'a à la prochaine publication (étiquette `v6`). `verify: false` l'éteint ; `verify-selector` la précise.
