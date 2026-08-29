export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export declare function isValidLatitude(lat: number): boolean;
export declare function isValidLongitude(lng: number): boolean;
/** Un couple complet et plausible. */
export declare function isValidCoordinates(
  c: Coordinates | null | undefined
): boolean;

/** Distance orthodromique (haversine), en kilomètres. */
export declare function distanceKm(a: Coordinates, b: Coordinates): number;

/**
 * Un point est-il dans la zone visible ? Gère l'antiméridien : une boîte qui
 * le chevauche a `west > east`, et la longitude se teste en OU.
 */
export declare function isInBoundingBox(
  c: Coordinates,
  box: BoundingBox
): boolean;

/** « 350 m », « 2,4 km », « 12 km » — virgule décimale française. */
export declare function formatDistance(km: number): string;
