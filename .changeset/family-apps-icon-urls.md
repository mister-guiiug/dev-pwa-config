---
'@mister-guiiug/dev-wpa-config': patch
---

fix(family-apps) : corrige les URLs d'icônes du catalogue (404 sur les vignettes « Nos autres applications »)

Le défaut `${appUrl}icon-192.png` ne correspondait qu'à 2 apps sur 12 — les
autres servent leur icône sous un autre nom (`pwa-192.png`, `icons/icon-192.png`,
`logo.svg`, `icon.svg`, `logo.png`) ou seulement `favicon.svg`. Résultat :
des `GET … 404` (ex. `miss-carbook/icon-192.png`) et des vignettes en repli
initiale.

- Défaut d'icône → `favicon.svg` (racine, présent pour la majorité, SVG net).
- Nouvelle surcharge `icon: 'chemin/relatif'` jointe à `appUrl` pour les apps
  au nommage différent (genius/uwh `icons/icon-192.png`, contraction `icon.svg`,
  footcoach `logo.svg`, molkky `logo.png`).
- **mister-cim10** : suppression de la surcharge de casse `mister-CIM10`
  (le site Pages est servi en **minuscules** `mister-cim10` ; l'ancienne URL
  donnait un 404 sur le lien ET l'icône).

Les 12 URLs d'icônes sont vérifiées 200 en production. Aucune API publique
changée (le composant `FamilyApps` gère déjà le repli si une icône échoue).
