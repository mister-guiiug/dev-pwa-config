/**
 * Géocodage via la Base Adresse Nationale (`api-adresse.data.gouv.fr`) :
 * service public officiel, gratuit, sans clé. Convertit « ville / code
 * postal / adresse » en coordonnées GPS.
 *
 * PROMU depuis `miss-lookhouse/src/lib/geocoder.ts`. Le parsing de la réponse
 * est PUR (testable sans réseau) ; `geocode` n'ajoute que l'appel `fetch`.
 * La base et le fetch sont injectables (proxy d'entreprise, tests).
 */

export const BAN_BASE_URL = 'https://api-adresse.data.gouv.fr';

/**
 * Extrait le meilleur résultat d'une FeatureCollection GeoJSON de la BAN.
 * @param {unknown} json
 * @returns {{ lat: number, lng: number, label: string, postcode: string | null,
 *   city: string | null, score: number } | null}
 */
export function parseBanResponse(json) {
  const feature = json?.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!feature || !coords) return null;
  // GeoJSON : [longitude, latitude].
  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return {
    lat,
    lng,
    label: feature.properties?.label ?? '',
    postcode: feature.properties?.postcode ?? null,
    city: feature.properties?.city ?? null,
    score: feature.properties?.score ?? 0,
  };
}

/**
 * Géocode une requête libre (« 69007 Lyon »). `null` si rien d'exploitable.
 *
 * @param {string} query
 * @param {{ signal?: AbortSignal, baseUrl?: string,
 *   fetchImpl?: typeof fetch }} [options]
 */
export async function geocode(query, options = {}) {
  const {
    signal,
    baseUrl = BAN_BASE_URL,
    fetchImpl = globalThis.fetch,
  } = options;
  const q = String(query ?? '').trim();
  if (!q) return null;
  const url = `${baseUrl}/search/?q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetchImpl(url, signal ? { signal } : {});
  if (!res.ok) throw new Error(`[dwc] Géocodage indisponible (${res.status}).`);
  return parseBanResponse(await res.json());
}
