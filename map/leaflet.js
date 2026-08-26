import { osmRasterTiles } from './index.js';

/**
 * Adaptateur Leaflet du port `MapProvider`.
 *
 * PROVENANCE : mister-family-map (premier moteur retenu, remplacé par MapLibre
 * dans cette app ; conservé ici parce qu'il reste le bon choix quand le poids
 * prime sur le rendu — 42 ko contre 253).
 *
 * Peer OPTIONNEL : `leaflet` (+ sa feuille de style
 * `leaflet/dist/leaflet.css`, à importer par l'app). N'importer ce
 * sous-chemin que si c'est le moteur retenu — sinon Leaflet est embarqué
 * pour rien.
 *
 * Leaflet ne rend que du raster : une source `vector` est refusée
 * explicitement plutôt que silencieusement ignorée.
 *
 * Leaflet touche `window` dès son import : il est donc chargé PARESSEUSEMENT,
 * au montage. Ce module reste ainsi importable côté serveur (SSR, tests) et le
 * moteur n'est téléchargé que si une carte est réellement affichée.
 */

/** Icône composée d'éléments stylables en CSS — aucun asset à servir. */
function markerIcon(L, marker) {
  const count = marker.count ?? 1;
  const isCluster = count > 1;
  const size = isCluster ? 40 : 34;
  const inner = isCluster
    ? `<span class="dwc-map-cluster" aria-hidden="true">${count}</span>`
    : '<span class="dwc-map-pin" aria-hidden="true"></span>';
  return L.divIcon({
    html: inner,
    className: 'dwc-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, isCluster ? size / 2 : size],
  });
}

export function createLeafletMapProvider(engineOptions = {}) {
  const tiles = engineOptions.tiles ?? osmRasterTiles();
  if (tiles.kind !== 'raster') {
    throw new Error(
      'Leaflet ne rend que des tuiles raster — utiliser /map/maplibre pour un style vectoriel.'
    );
  }

  /** @type {any} */ let L = null;
  let map = null;
  let markerLayer = null;
  let onMarkerClick;

  const toViewport = m => {
    const center = m.getCenter();
    const b = m.getBounds();
    return {
      center: { lat: center.lat, lng: center.lng },
      zoom: m.getZoom(),
      bounds: {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      },
    };
  };

  return {
    async mount(container, options) {
      ({ default: L } = await import('leaflet'));
      onMarkerClick = options.onMarkerClick;
      map = L.map(container, {
        center: [options.center.lat, options.center.lng],
        zoom: options.zoom,
        zoomControl: true,
      });
      L.tileLayer(tiles.url, {
        attribution: tiles.attribution,
        maxZoom: tiles.maxZoom ?? 19,
        tileSize: tiles.tileSize ?? 256,
      }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);

      // `onViewportChange` NE DIT QUE LES DÉPLACEMENTS. La première version
      // émettait aussi la vue initiale, par `whenReady` — et une carte qui
      // finit de s'initialiser n'a rien changé, elle rapporte son état de
      // départ. Confondre les deux fait de la carte un SECOND ÉCRIVAIN de
      // l'état qu'elle est censée refléter : un écran qui écrit le centre dans
      // un formulaire voyait la saisie de l'utilisateur écrasée dès que
      // l'initialisation se terminait après elle. Voir `onReady`.
      if (options.onViewportChange) {
        map.on('moveend', () => {
          if (map) options.onViewportChange(toViewport(map));
        });
      }
      if (options.onReady) {
        map.whenReady(() => {
          if (map) options.onReady(toViewport(map));
        });
      }
    },

    setMarkers(markers) {
      if (!L || !markerLayer) return;
      markerLayer.clearLayers();
      for (const marker of markers) {
        L.marker([marker.coordinates.lat, marker.coordinates.lng], {
          icon: markerIcon(L, marker),
          alt: marker.label,
          keyboard: true,
        })
          .on('click', () => onMarkerClick?.(marker.id))
          .addTo(markerLayer);
      }
    },

    panTo(center, zoom) {
      map?.setView([center.lat, center.lng], zoom ?? map.getZoom());
    },

    getViewport() {
      return map ? toViewport(map) : null;
    },

    destroy() {
      map?.remove();
      map = null;
      markerLayer = null;
      onMarkerClick = undefined;
      L = null;
    },
  };
}
