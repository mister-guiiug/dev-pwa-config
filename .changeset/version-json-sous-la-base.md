---
'@mister-guiiug/dev-pwa-config': patch
---

**`version.json` est cherché sous la base du build, et un pied de page suffit pour le sonder.** `vite-version` injecte désormais la base (`/miss-genius/`) avec la version ; `versionManifestUrl` en dérive une URL absolue — un `version.json` relatif partait à côté de la page depuis un lien profond d'une app qui route par chemin, et recevait 404 en silence. Hors `VersionProvider`, `AppVersion updates` (le défaut) sonde `version.json` une fois au montage (`checkUrl`, `checkEvery`, `fetch`) : une PWA installée ouverte sur la coquille du service worker sait qu'une version l'attend, sans câbler le fournisseur — dix-sept apps ne l'avaient pas posé. `useAppVersion(options)` porte ce sondage ; `readBuildInfo().base` est nouveau.
