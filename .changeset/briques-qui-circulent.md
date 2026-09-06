---
'@mister-guiiug/dev-pwa-config': minor
---

Les briques qui circulent : la barre basse collée, les captures du manifeste, le port de développement au catalogue, le budget à cliquet, et deux défauts connus corrigés (étape 4 d'[AMELIORATIONS.md](AMELIORATIONS.md)).

- **`BottomNav placement="fixed"`** colle la barre au bas de la fenêtre, et **`PageContainer reserve="bottom-nav"`** réserve la place qu'elle occupe. Huit dépôts (sept apps et le squelette) recopiaient la même règle CSS avec la même réserve à côté. Défauts inchangés : rien ne bouge pour qui ne le demande pas.
- **`pwa-screenshots`** (nouveau bin) : les deux captures du manifeste — `narrow` 540×1170 et `wide` 1280×720 — prises sur le build servi par `vite preview`, ou sur une app déjà servie (`--url`, données réelles), avec un module `--prepare` pour mettre l'écran dans l'état voulu par l'interface. Trois scripts faisaient la même chose (squelette, mister-miss-koh, showroom). **`pwaBaseOptions` lit ensuite `public/screenshots/` et déclare les entrées au manifeste, aux tailles lues dans les fichiers** : rien à écrire.
- **`pwaBaseOptions` sans catalogue** : les couleurs du manifeste sont lues dans `src/index.css` (`--dwc-primary`, `--dwc-bg`) après l'explicite et le catalogue ; sans aucune source, un avertissement nomme les trois remèdes au lieu de laisser sortir un manifeste que Chrome refuse d'installer.
- **`definePwaPlaywrightConfig`** : `overrides.use` complète le `use` calculé au lieu de le remplacer — le squelette perdait `baseURL` en fixant sa locale.
- **`apps-catalog`** : `devPort` sur chaque app, unique (5201–5299 ; 1420 pour miss-ticket-pwa ; 5240 réservé au squelette), `devPortOf(id)`, `freeDevPort()` pour le générateur. `pwa-doctor` signale (info) un port déclaré qui n'est pas celui du catalogue.
- **`pwa-bundle-budget --ratchet`** propose un budget resserré (mesure + 10 %) quand le build a maigri, et `--write` l'écrit dans `package.json` — un budget se posait un jour de surpoids et n'en bougeait plus.
