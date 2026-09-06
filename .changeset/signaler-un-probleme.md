---
'@mister-guiiug/dev-pwa-config': minor
---

**Signaler un problème avec le contexte.** Nouveau module `issue-report` : `issueReportUrl` compose l'URL de `issues/new` du dépôt avec le gabarit `bug.yml` que le dépôt `.github` du compte prête à tous, et ses champs préremplis — version et commit (lus dans ce que `vite-version` injecte), écran courant, navigateur, système, appareil, app installée (`describeEnvironment`). `AppFooter` gagne `issues` (opt-in) : un troisième lien, « Signaler un problème », en sept langues, dont l'URL est recalculée au clic. Aucune application du parc n'avait de signalement structuré.
