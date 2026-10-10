---
'@mister-guiiug/dev-pwa-config': patch
---

`pwaManifest` pose l'`id` du manifeste en URL absolue (`https://mister-guiiug.github.io/<app>/`), comme le hub : même identité WebAPK si le chemin du fichier manifeste change. `scope` et `start_url` restent des chemins.

`pwa-doctor` signale en dette un `id` encore relatif (`manifest-id-absolu`). `probe-sites --hub [--strict]` sonde le manifeste publié du catalogue et échoue si sa portée vaut `/` ou préfixe une app — la régression Android « déjà installée » quand le hub couvre toute l'origine.
