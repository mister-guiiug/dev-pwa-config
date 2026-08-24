import type { MapEngineOptions, MapProvider } from './index.js';

/**
 * Adaptateur Leaflet du port `MapProvider` (rendu DOM, ~42 ko gzip).
 *
 * Peer optionnel `leaflet` requis, et l'app doit importer
 * `leaflet/dist/leaflet.css`. Les marqueurs exposent les classes
 * `dwc-map-marker` / `dwc-map-pin` / `dwc-map-cluster`, à styler côté app.
 *
 * @throws si la source de tuiles est vectorielle (non gérée par Leaflet).
 */
export declare function createLeafletMapProvider(
  engineOptions?: MapEngineOptions
): MapProvider;
