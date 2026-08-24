---
'@mister-guiiug/dev-wpa-config': minor
---

feat(map) : socle cartographique multi-moteurs derrière un port `MapProvider`

Nouveaux sous-chemins :

- `/map` — agnostique du moteur : port `MapProvider`, sources de tuiles
  (`osmRasterTiles`, `vectorTiles`), regroupement par grille (`clusterByGrid`,
  `clustersToMarkers`, `isClusterId`) et helpers d'intégration
  (`mapCspDirectives`, `mapTileRuntimeCaching`).
- `/map/leaflet` — adaptateur Leaflet (peer optionnelle `leaflet`).
- `/map/maplibre` — adaptateur MapLibre GL (peer optionnelle `maplibre-gl` ^6).

Le moteur se choisit **par l'import** : un seul adaptateur est embarqué. Il est
chargé paresseusement au montage, donc les modules restent importables côté
serveur et le poids n'est téléchargé que si une carte s'affiche.

Trois pièges de production sont pris en charge par le paquet : l'URL du worker
MapLibre (introuvable en prod alors que le dev fonctionne), les tuiles chargées
par `fetch` qui relèvent de `connect-src` et non d'`img-src`, et les échecs de
tuiles qui ne doivent jamais faire échouer le montage.
