export declare const IMAGE_MAX_BYTES: number;
export declare const IMAGE_ACCEPTED_TYPES: string[];
/** Plafond d'affichage : au-delà, un écran n'y gagne plus rien. */
export declare const IMAGE_MAX_DIMENSION: number;
/**
 * Point de départ de la compression, délibérément au-dessus du plafond
 * d'affichage : viser un budget d'octets autorise à partir plus haut.
 */
export declare const IMAGE_COMPRESS_START_DIMENSION: number;
/** Qualités essayées à taille constante, de la meilleure à la plus basse. */
export declare const COMPRESS_QUALITIES: readonly number[];

export type ImageValidationError = 'type' | 'size';

/**
 * Surface dessinable rendue par `render` et consommée par `encode`. Opaque :
 * seul le couple de coutures en connaît la nature (un `HTMLCanvasElement`
 * dans le navigateur, ce que vous voulez en test).
 */
export type ImageFrame = unknown;

/** Les coutures qui isolent le DOM — à ne fournir qu'en test. */
export interface ImageSeams {
  /** Défaut : `createImageBitmap`. */
  decode?: (file: Blob) => Promise<{
    width: number;
    height: number;
    close?: () => void;
  }>;
  /** Défaut : un `<canvas>` dessiné à la taille voulue. */
  render?: (
    bitmap: { width: number; height: number },
    width: number,
    height: number
  ) => ImageFrame;
  /** Défaut : `canvas.toBlob`. Rend `null` si le format est refusé. */
  encode?: (
    frame: ImageFrame,
    quality: number,
    type: string
  ) => Promise<Blob | null>;
}

/** Contrôle de type et de taille. PUR : ne lit que `type` et `size`. */
export declare function validateImageFile(
  file: { type: string; size: number },
  options?: { maxBytes?: number; acceptedTypes?: readonly string[] }
): ImageValidationError | null;

/**
 * Géométrie du redimensionnement. PURE : jamais d'agrandissement, plancher à
 * 1 px sur chaque côté, rapport d'aspect conservé.
 */
export declare function fitWithin(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number };

/**
 * Ré-encode l'image (redimensionnée si besoin) sans métadonnées — EXIF, GPS
 * et numéro de série disparaissent par construction. Nécessite le DOM.
 */
export declare function stripImageMetadata(
  file: Blob,
  options?: {
    maxDimension?: number;
    type?: string;
    quality?: number;
  } & ImageSeams
): Promise<Blob>;

/**
 * Redimensionne et ré-encode en JPEG jusqu'à passer sous `maxBytes` :
 * qualités dégressives d'abord, réduction de dimension ensuite. Les GIF
 * animés deviennent une image fixe. Nécessite le DOM.
 */
export declare function compressImageToMaxBytes(
  file: File,
  maxBytes?: number,
  options?: {
    maxDimension?: number;
    /** Horloge du `lastModified` produit — injectable pour des tests stables. */
    now?: () => number;
  } & ImageSeams
): Promise<File>;
