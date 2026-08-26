---
'@mister-guiiug/dev-wpa-config': minor
---

Affichage et gestion de la version côté frontend.

Le paquet réclamait une version qu'il ne savait pas produire : `installObservability`
attendait `context.version`, les cinq modules de mise à jour pilotaient une bascule de
service worker sans jamais nommer un numéro, et `pwaSeoPlugin` proposait un `iconQuery`
recopié à la main. Quatre sous-chemins ferment le circuit.

- `./vite-version` — `versionPlugin()` : `__APP_VERSION__` / `__APP_BUILD_TIME__` /
  `__APP_COMMIT__` par `define`, `globalThis.__DWC_BUILD__` posé dans le `<head>` (le
  seul chemin qu'un module de `node_modules` puisse lire), et `version.json` à la racine
  du build, servi aussi par `vite dev`. À placer **avant** `cspPlugin`.
- `./version` — SemVer comparé (préversions comprises), `readBuildInfo`,
  `rememberVersion` (montée, rollback et première ouverture distingués) et
  `fetchAppVersion`, qui ne lève jamais. Sans React ni module virtuel.
- `./react/version` — `VersionProvider` / `useAppVersion` : version courante,
  précédente et publiée. Sans `checkEvery`, aucune requête n'est émise.
- `./react/app-version` — `AppVersion` : le numéro affiché, « mis à jour vers X » après
  une bascule réussie, « version Y disponible » en région `status`.

Trois modules existants s'y raccordent, sans rupture :

- `installObservability` renseigne seul `version`, `buildTime` et `commit` dans le
  contexte de session ; un `context` explicite garde le dernier mot.
- `AppFooter` accepte `version` (opt-in) ; absent, le rendu est inchangé.
- `pwaWorkbox` exclut `version.json` du précache — figé, il rendrait éternellement la
  version du build qui l'a figé.
