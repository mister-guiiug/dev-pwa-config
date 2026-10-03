---
'@mister-guiiug/dev-pwa-config': patch
---

L'invite d'installation range son état sous une clé PAR APPLICATION, `dwc_pwa_install:/<dépôt>/` (nouvel export `installStateKey(scope?)` de `./install`). Elle utilisait jusqu'ici `dwc_pwa_install`, une clé commune aux vingt sites de la famille : ils partagent l'origine `mister-guiiug.github.io`, donc un seul `localStorage`.

Installer une app y écrivait « fait » pour toutes, et plus aucune autre ne proposait l'installation (signalé sur Android le 03/10/2026). Le reste suivait : afficher l'invite dans une app taisait les autres pendant trente jours, et les trois invites prévues valaient pour toute la famille. C'est le défaut déjà payé par le consentement (4.17.1) et par le report de mise à jour.

L'ancienne clé n'est pas reprise, car son contenu peut être l'état d'une autre app : chaque app repart d'une cadence neuve. Rien à changer dans les apps, la montée suffit. Une app qui passe son propre `storageKey` garde sa clé.
