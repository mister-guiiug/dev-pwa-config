export declare const IMAGE_MAX_BYTES: number;
export declare const IMAGE_ACCEPTED_TYPES: string[];
export declare const IMAGE_MAX_DIMENSION: number;

export type ImageValidationError = 'type' | 'size';

/** Contrôle de type et de taille. PUR : ne lit que `type` et `size`. */
export declare function validateImageFile(
  file: { type: string; size: number },
  options?: { maxBytes?: number; acceptedTypes?: readonly string[] }
): ImageValidationError | null;

/**
 * Ré-encode l'image (redimensionnée si besoin) sans métadonnées — EXIF, GPS
 * et numéro de série disparaissent par construction. Nécessite le DOM.
 */
export declare function stripImageMetadata(
  file: Blob,
  options?: { maxDimension?: number; type?: string; quality?: number }
): Promise<Blob>;

/**
 * Redimensionne et ré-encode en JPEG jusqu'à passer sous `maxBytes`.
 * Les GIF animés deviennent une image fixe. Nécessite le DOM.
 */
export declare function compressImageToMaxBytes(
  file: File,
  maxBytes?: number,
  options?: { maxDimension?: number }
): Promise<File>;
