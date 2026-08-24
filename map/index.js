/**
 * Socle cartographique AGNOSTIQUE du moteur de rendu.
 *
 * PROVENANCE — à la différence des autres promotions de ce paquet, celle-ci
 * vient d'UNE SEULE app (mister-family-map) et non d'une convergence
 * constatée : aucune autre app de la famille n'affiche de carte à ce jour.
 * Ce qui la justifie n'est donc pas « ce serait utile », mais le fait que les
 * trois pièges de production ci-dessous ont coûté une session de débogage
 * réelle — invisibles en développement, ils se repaieraient à l'identique dans
 * la deuxième app qui ferait une carte. Voir la PR pour la discussion.
 *
 * Deux axes indépendants, souvent confondus :
 *   1. le MOTEUR de rendu   → Leaflet (DOM) ou MapLibre GL (WebGL) ;
 *      un adaptateur par moteur, dans un sous-chemin dédié
 *      (`/map/leaflet`, `/map/maplibre`) pour n'embarquer que celui choisi.
 *   2. la SOURCE de tuiles  → OpenStreetMap raster, style vectoriel, tuiles
 *      auto-hébergées… décrite par un objet `TileSource` passé à l'adaptateur.
 *
 * Ce fichier ne dépend d'aucun moteur : il porte le contrat (`MapProvider`),
 * les sources de tuiles prêtes à l'emploi, le regroupement de marqueurs et les
 * helpers d'intégration (CSP, cache workbox).
 */

/** Attribution imposée par l'OpenStreetMap Foundation — jamais masquable. */
export const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Tuiles raster OpenStreetMap : gratuites, sans clé d'API ni compte, soumises
 * à la politique d'usage de l'OSMF (usage raisonnable, pas de préchargement
 * massif, attribution obligatoire).
 * @see https://operations.osmfoundation.org/policies/tiles/
 */
export function osmRasterTiles(overrides = {}) {
  return {
    kind: 'raster',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
    tileSize: 256,
    ...overrides,
  };
}

/**
 * Style vectoriel servi par une URL. À n'utiliser qu'avec un fournisseur SANS
 * clé d'API (aucun secret ne doit vivre dans le code d'une app cliente).
 * Le rendu vectoriel n'est pris en charge que par le moteur MapLibre.
 */
export function vectorTiles(styleUrl, overrides = {}) {
  if (typeof styleUrl !== 'string' || styleUrl === '') {
    throw new Error('vectorTiles(styleUrl) : URL de style manquante.');
  }
  if (/[?&](access_token|api_?key|key)=/i.test(styleUrl)) {
    throw new Error(
      'vectorTiles(styleUrl) : URL porteuse d’une clé d’API — un secret ne doit pas vivre dans le code client.'
    );
  }
  return { kind: 'vector', styleUrl, maxZoom: 20, ...overrides };
}

/** Hôtes distincts (origines) réellement contactés par une source de tuiles. */
export function tileSourceHosts(tileSource) {
  const urls =
    tileSource.kind === 'vector'
      ? [tileSource.styleUrl, ...(tileSource.extraHosts ?? [])]
      : [tileSource.url, ...(tileSource.extraHosts ?? [])];
  const hosts = new Set();
  for (const raw of urls) {
    if (typeof raw !== 'string') continue;
    // Les gabarits contiennent {z}/{x}/{y} : on ne garde que l'origine.
    const match = /^https?:\/\/[^/{}]+/i.exec(raw);
    if (match) hosts.add(match[0]);
  }
  return [...hosts];
}

/**
 * Directives CSP à fusionner dans `cspPlugin()` (`/vite-csp`).
 *
 * Piège classique : MapLibre récupère les tuiles par `fetch` — elles relèvent
 * donc de `connect-src`, alors que Leaflet les charge par `<img>` (`img-src`).
 * On déclare les deux : c'est la seule façon d'avoir une CSP valable quel que
 * soit le moteur, y compris pour le repli `<img>` des navigateurs sans
 * `createImageBitmap`.
 */
export function mapCspDirectives(tileSource) {
  const hosts = tileSourceHosts(tileSource);
  return { connectSrc: hosts, imgSrc: hosts };
}

/**
 * Entrée `runtimeCaching` workbox : cache BORNÉ des tuiles déjà affichées.
 * Ce n'est PAS une carte hors ligne — seules les zones déjà vues réapparaissent.
 */
export function mapTileRuntimeCaching(tileSource, options = {}) {
  const {
    cacheName = 'map-tiles',
    maxEntries = 200,
    maxAgeSeconds = 7 * 24 * 3600,
  } = options;
  const hosts = tileSourceHosts(tileSource);
  if (hosts.length === 0) {
    throw new Error(
      'mapTileRuntimeCaching : aucune origine détectée dans la source de tuiles.'
    );
  }
  const prefixes = hosts.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return {
    urlPattern: new RegExp(`^(?:${prefixes.join('|')})/`, 'i'),
    handler: 'CacheFirst',
    options: {
      cacheName,
      expiration: { maxEntries, maxAgeSeconds },
      cacheableResponse: { statuses: [0, 200] },
    },
  };
}

/**
 * Taille de cellule (en degrés) selon le zoom : plus on zoome, plus la grille
 * est fine ; au-delà de `disableAtZoom`, le regroupement est désactivé.
 */
export function cellSizeForZoom(zoom, disableAtZoom = 15) {
  if (zoom >= disableAtZoom) return 0;
  return 360 / 2 ** zoom / 4;
}

/**
 * Regroupement de marqueurs par grille — indépendant du moteur de carte.
 * Suffisant jusqu'à quelques milliers de points ; remplaçable par une lib
 * dédiée derrière la même signature si la volumétrie l'exige.
 */
export function clusterByGrid(points, zoom, options = {}) {
  const cell = cellSizeForZoom(zoom, options.disableAtZoom);
  if (cell === 0) {
    return points.map(p => ({ coordinates: p.coordinates, items: [p] }));
  }

  const buckets = new Map();
  for (const p of points) {
    const key = `${Math.floor(p.coordinates.lat / cell)}:${Math.floor(
      p.coordinates.lng / cell
    )}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(p);
    else buckets.set(key, [p]);
  }

  return [...buckets.values()].map(items => {
    const lat = items.reduce((s, p) => s + p.coordinates.lat, 0) / items.length;
    const lng = items.reduce((s, p) => s + p.coordinates.lng, 0) / items.length;
    return { coordinates: { lat, lng }, items };
  });
}

/**
 * Transforme des groupes en marqueurs prêts pour le port : un point seul garde
 * son identité, un groupe devient un marqueur compté à l'identifiant préfixé.
 */
export function clustersToMarkers(clusters, labelOf) {
  return clusters.map(cluster => {
    const [first] = cluster.items;
    if (cluster.items.length === 1 && first) {
      return {
        id: first.id,
        coordinates: first.coordinates,
        label: labelOf ? labelOf(first) : first.id,
      };
    }
    const { lat, lng } = cluster.coordinates;
    return {
      id: `${CLUSTER_ID_PREFIX}${lat.toFixed(3)}-${lng.toFixed(3)}`,
      coordinates: cluster.coordinates,
      label: `${cluster.items.length} éléments regroupés`,
      count: cluster.items.length,
    };
  });
}

/** Préfixe des identifiants de groupe — permet de les distinguer au clic. */
export const CLUSTER_ID_PREFIX = 'cluster-';

/** `true` si l'identifiant désigne un groupe et non un élément unique. */
export function isClusterId(id) {
  return typeof id === 'string' && id.startsWith(CLUSTER_ID_PREFIX);
}
