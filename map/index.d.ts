/** Coordonnées géographiques en degrés décimaux (WGS 84). */
export interface MapCoordinates {
  lat: number;
  lng: number;
}

/** Emprise rectangulaire (degrés décimaux). */
export interface MapBoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Marqueur à afficher. `count > 1` désigne un groupe (cluster). */
export interface MapMarker {
  id: string;
  coordinates: MapCoordinates;
  label: string;
  count?: number;
}

/** État de la caméra, remonté à chaque déplacement. */
export interface MapViewport {
  center: MapCoordinates;
  zoom: number;
  bounds: MapBoundingBox;
}

/** Tuiles raster (image par tuile) — compatibles Leaflet ET MapLibre. */
export interface RasterTileSource {
  kind: 'raster';
  /** Gabarit d'URL avec `{z}` `{x}` `{y}`. */
  url: string;
  /** Attribution affichée en permanence (HTML restreint). */
  attribution: string;
  maxZoom?: number;
  tileSize?: number;
  /** Origines supplémentaires à déclarer (CSP, cache) : sprites, glyphes… */
  extraHosts?: string[];
}

/** Style vectoriel — moteur MapLibre uniquement. */
export interface VectorTileSource {
  kind: 'vector';
  /** URL d'un style MapLibre SANS clé d'API. */
  styleUrl: string;
  maxZoom?: number;
  attribution?: string;
  extraHosts?: string[];
}

export type TileSource = RasterTileSource | VectorTileSource;

export interface MapProviderOptions {
  center: MapCoordinates;
  zoom: number;
  onMarkerClick?: (id: string) => void;
  onViewportChange?: (viewport: MapViewport) => void;
}

/**
 * Port cartographique : c'est la SEULE surface que les écrans connaissent.
 * Changer de moteur = changer d'import d'adaptateur, rien d'autre.
 */
export interface MapProvider {
  /** Monte la carte. Rejette si le moteur est indisponible (WebGL absent…). */
  mount(container: HTMLElement, options: MapProviderOptions): Promise<void>;
  setMarkers(markers: readonly MapMarker[]): void;
  panTo(center: MapCoordinates, zoom?: number): void;
  getViewport(): MapViewport | null;
  destroy(): void;
}

export type MapProviderFactory = () => MapProvider;

/** Options communes à tous les adaptateurs de moteur. */
export interface MapEngineOptions {
  /** Source de tuiles. Défaut : `osmRasterTiles()`. */
  tiles?: TileSource;
  /** Délai (ms) au-delà duquel le montage est considéré en échec. */
  mountTimeoutMs?: number;
}

export declare const OSM_ATTRIBUTION: string;
export declare const CLUSTER_ID_PREFIX: string;

export declare function osmRasterTiles(
  overrides?: Partial<Omit<RasterTileSource, 'kind'>>
): RasterTileSource;

export declare function vectorTiles(
  styleUrl: string,
  overrides?: Partial<Omit<VectorTileSource, 'kind' | 'styleUrl'>>
): VectorTileSource;

/** Origines (schéma + hôte) réellement contactées par la source de tuiles. */
export declare function tileSourceHosts(tileSource: TileSource): string[];

/**
 * Directives CSP à fusionner dans `cspPlugin()`. Déclare les hôtes de tuiles
 * dans `connect-src` (MapLibre charge par `fetch`) ET `img-src` (Leaflet et
 * le repli `<img>` de MapLibre).
 */
export declare function mapCspDirectives(tileSource: TileSource): {
  connectSrc: string[];
  imgSrc: string[];
};

export interface MapTileCachingOptions {
  cacheName?: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

/** Entrée `runtimeCaching` workbox : cache borné des tuiles déjà affichées. */
export declare function mapTileRuntimeCaching(
  tileSource: TileSource,
  options?: MapTileCachingOptions
): {
  urlPattern: RegExp;
  handler: 'CacheFirst';
  options: {
    cacheName: string;
    expiration: { maxEntries: number; maxAgeSeconds: number };
    cacheableResponse: { statuses: number[] };
  };
};

export interface ClusterInput<T> {
  id: string;
  coordinates: MapCoordinates;
  item: T;
}

export interface Cluster<T> {
  coordinates: MapCoordinates;
  items: Array<ClusterInput<T>>;
}

export declare function cellSizeForZoom(
  zoom: number,
  disableAtZoom?: number
): number;

export declare function clusterByGrid<T>(
  points: ReadonlyArray<ClusterInput<T>>,
  zoom: number,
  options?: { disableAtZoom?: number }
): Array<Cluster<T>>;

export declare function clustersToMarkers<T>(
  clusters: ReadonlyArray<Cluster<T>>,
  labelOf?: (input: ClusterInput<T>) => string
): MapMarker[];

/** `true` si l'identifiant vient d'un groupe (à ne pas traiter comme un item). */
export declare function isClusterId(id: string): boolean;

/**
 * Plugin Vite indispensable dès que `/map/maplibre` est utilisé : il sort ce
 * sous-chemin du pré-bundling, qui ne sait pas interpréter le suffixe
 * `?worker&url` par lequel l'adaptateur résout le worker MapLibre. Sans lui,
 * `vite dev` échoue au démarrage (le build de production, lui, fonctionne).
 */
export declare function mapVitePlugin(): {
  name: string;
  config: () => { optimizeDeps: { exclude: string[] } };
};
