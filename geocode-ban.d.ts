export declare const BAN_BASE_URL: string;

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
  postcode: string | null;
  city: string | null;
  score: number;
}

/** Extrait le meilleur résultat d'une FeatureCollection GeoJSON de la BAN. */
export declare function parseBanResponse(json: unknown): GeocodeResult | null;

/** Géocode une requête libre (« 69007 Lyon »). `null` si rien d'exploitable. */
export declare function geocode(
  query: string,
  options?: { signal?: AbortSignal; baseUrl?: string; fetchImpl?: typeof fetch }
): Promise<GeocodeResult | null>;
