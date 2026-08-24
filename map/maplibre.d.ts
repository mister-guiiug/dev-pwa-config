import type { MapEngineOptions, MapProvider } from './index.js';

export interface MapLibreEngineOptions extends MapEngineOptions {
  /**
   * URL du worker MapLibre. Renseignée automatiquement (asset empaqueté par
   * Vite) : à ne surcharger que hors Vite, ou pour servir le worker depuis un
   * emplacement contrôlé.
   */
  workerUrl?: string;
}

/**
 * Adaptateur MapLibre GL du port `MapProvider` (rendu WebGL, ~253 ko gzip).
 *
 * Peer optionnel `maplibre-gl` (^6) requis, et l'app doit importer
 * `maplibre-gl/dist/maplibre-gl.css`. Accepte les tuiles raster comme un style
 * vectoriel. Les marqueurs exposent les classes `dwc-map-marker` /
 * `dwc-map-pin` / `dwc-map-cluster`, à styler côté app.
 *
 * Le montage rejette si WebGL est indisponible ou si la carte n'a pas chargé
 * dans le délai imparti : l'app doit prévoir un repli (liste, message).
 */
export declare function createMapLibreMapProvider(
  engineOptions?: MapLibreEngineOptions
): MapProvider;
