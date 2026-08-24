import { osmRasterTiles } from './index.js';

/**
 * Adaptateur MapLibre GL du port `MapProvider`.
 *
 * PROVENANCE : mister-family-map, où il a remplacé Leaflet — bascule qui n'a
 * coûté qu'un fichier, ce qui a validé le port et motivé cette promotion.
 *
 * Peer OPTIONNEL : `maplibre-gl` (^6). L'app doit importer
 * `maplibre-gl/dist/maplibre-gl.css`.
 *
 * Le moteur (~253 ko gzip) est chargé PARESSEUSEMENT, au montage : ce module
 * reste importable côté serveur (SSR, tests) et le poids n'est téléchargé que
 * si une carte est réellement affichée.
 */

const DEFAULT_MOUNT_TIMEOUT_MS = 10_000;

/**
 * MapLibre 6 résout sinon son worker via `new URL('./maplibre-gl-worker.mjs',
 * import.meta.url)` : une URL calculée à l'exécution que le bundler n'émet PAS
 * → 404 et carte morte en PRODUCTION uniquement (en développement, Vite sert
 * node_modules tel quel, donc le bug est invisible). Le suffixe Vite
 * `?worker&url` fait empaqueter le worker AVEC ses dépendances et renvoie
 * l'URL de l'asset réellement publié.
 */
async function resolveWorkerUrl(override) {
  if (override) return override;
  const mod = await import(
    'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
  );
  return mod.default;
}

/** Style raster monté EN LOCAL : aucune requête de style, montage hors ligne. */
function rasterStyle(tiles) {
  return {
    version: 8,
    sources: {
      base: {
        type: 'raster',
        tiles: [tiles.url],
        tileSize: tiles.tileSize ?? 256,
        maxzoom: tiles.maxZoom ?? 19,
        attribution: tiles.attribution,
      },
    },
    layers: [{ id: 'base', type: 'raster', source: 'base' }],
  };
}

/** Marqueur = <button> : focusable et activable au clavier, contrairement à un div. */
function markerElement(marker) {
  const isCluster = (marker.count ?? 1) > 1;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dwc-map-marker';
  button.setAttribute('aria-label', marker.label);
  const inner = document.createElement('span');
  inner.className = isCluster ? 'dwc-map-cluster' : 'dwc-map-pin';
  inner.setAttribute('aria-hidden', 'true');
  if (isCluster) inner.textContent = String(marker.count);
  button.append(inner);
  return button;
}

export function createMapLibreMapProvider(engineOptions = {}) {
  const tiles = engineOptions.tiles ?? osmRasterTiles();
  const mountTimeoutMs =
    engineOptions.mountTimeoutMs ?? DEFAULT_MOUNT_TIMEOUT_MS;

  /** @type {any} */ let engine = null;
  let map = null;
  let markers = [];
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

  const clearMarkers = () => {
    for (const marker of markers) marker.remove();
    markers = [];
  };

  return {
    async mount(container, options) {
      engine = await import('maplibre-gl');
      const { AttributionControl, MapLibreMap, NavigationControl } = engine;
      // `workerUrl` permet de reprendre la main hors Vite (autre bundler, CDN).
      engine.setWorkerUrl(await resolveWorkerUrl(engineOptions.workerUrl));

      return new Promise((resolve, reject) => {
        let settled = false;
        let instance;
        try {
          // Lève si WebGL est indisponible (GPUInitializationError).
          instance = new MapLibreMap({
            container,
            style:
              tiles.kind === 'vector' ? tiles.styleUrl : rasterStyle(tiles),
            center: [options.center.lng, options.center.lat],
            zoom: options.zoom,
            maxZoom: tiles.maxZoom ?? 19,
            // L'attribution vient de la source et reste toujours affichée.
            attributionControl: false,
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        map = instance;
        onMarkerClick = options.onMarkerClick;

        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error('Carte indisponible : délai de montage dépassé.'));
        }, mountTimeoutMs);

        instance.addControl(new AttributionControl({ compact: true }));
        instance.addControl(new NavigationControl(), 'bottom-right');

        if (options.onViewportChange) {
          instance.on('moveend', () => {
            options.onViewportChange(toViewport(instance));
          });
        }

        instance.once('load', () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          options.onViewportChange?.(toViewport(instance));
          resolve();
        });

        // Une tuile en échec (hors ligne, CSP, serveur injoignable) ne doit
        // JAMAIS faire échouer le montage : la carte reste manipulable, seul
        // le fond manque. Un vrai échec se voit à l'exception du constructeur
        // (WebGL absent) ou à l'absence de `load` — d'où le délai ci-dessus.
        instance.on('error', () => {});
      });
    },

    setMarkers(next) {
      if (!map || !engine) return;
      const { Marker } = engine;
      clearMarkers();
      for (const marker of next) {
        const element = markerElement(marker);
        element.addEventListener('click', event => {
          // Sinon MapLibre interprète le clic comme un début de déplacement.
          event.stopPropagation();
          onMarkerClick?.(marker.id);
        });
        markers.push(
          new Marker({
            element,
            anchor: (marker.count ?? 1) > 1 ? 'center' : 'bottom',
          })
            .setLngLat([marker.coordinates.lng, marker.coordinates.lat])
            .addTo(map)
        );
      }
    },

    panTo(center, zoom) {
      map?.jumpTo({
        center: [center.lng, center.lat],
        zoom: zoom ?? map.getZoom(),
      });
    },

    getViewport() {
      return map ? toViewport(map) : null;
    },

    destroy() {
      clearMarkers();
      map?.remove();
      map = null;
      engine = null;
      onMarkerClick = undefined;
    },
  };
}
