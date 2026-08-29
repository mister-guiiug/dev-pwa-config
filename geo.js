/**
 * Géographie pure — validation, distance, boîte englobante, affichage.
 *
 * PROMU, PAS INVENTÉ. `mister-family-map/src/shared/lib/geo.ts`, à
 * l'identique : soixante lignes en production, testées chez la source. Deux
 * faits rendent la promotion évidente plutôt que confortable :
 *
 *   1. le SOCLE en avait déjà besoin lui-même. `./similarity` exige une
 *      fonction de distance injectée — ses propres tests en fabriquaient une
 *      approximative à la main (`Math.hypot` sur des degrés) faute d'avoir la
 *      vraie sous la main. Ils utilisent désormais celle-ci ;
 *   2. `map/` regroupe des marqueurs, calcule des grilles, mais ne sait pas
 *      mesurer un kilomètre. La deuxième app à faire une carte aurait réécrit
 *      ces lignes — antiméridien oublié, comme presque tout le monde.
 *
 * L'ANTIMÉRIDIEN N'EST PAS UN CAS D'ÉCOLE. Une boîte englobante qui chevauche
 * la ligne de changement de date a `west > east` ; le test naïf
 * `lng >= west && lng <= east` rend alors FAUX pour tous les points qu'elle
 * contient. Aucune app de la famille ne cartographie le Pacifique aujourd'hui,
 * mais le bug serait silencieux : une liste vide, pas une erreur.
 *
 * SANS DÉPENDANCE, SANS DOM.
 */

/** @typedef {{ lat: number, lng: number }} Coordinates */
/** @typedef {{ north: number, south: number, east: number, west: number }} BoundingBox */

export function isValidLatitude(lat) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng) {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

/** Un couple complet et plausible. */
export function isValidCoordinates(c) {
  return Boolean(c) && isValidLatitude(c.lat) && isValidLongitude(c.lng);
}

const EARTH_RADIUS_KM = 6371;

/** Distance orthodromique (haversine), en kilomètres. */
export function distanceKm(a, b) {
  const toRad = degrees => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Un point est-il dans la zone visible ?
 *
 * Gère l'antiméridien : une boîte qui le chevauche a `west > east`, et
 * l'appartenance en longitude devient un OU, pas un ET.
 */
export function isInBoundingBox(c, box) {
  const inLat = c.lat >= box.south && c.lat <= box.north;
  const inLng =
    box.west <= box.east
      ? c.lng >= box.west && c.lng <= box.east
      : c.lng >= box.west || c.lng <= box.east;
  return inLat && inLng;
}

/**
 * « 350 m » sous le kilomètre, « 2,4 km » jusqu'à dix, « 12 km » au-delà.
 *
 * La virgule décimale est française — comme le reste des libellés de la
 * famille. Pour un autre format, `./format` est là.
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}
