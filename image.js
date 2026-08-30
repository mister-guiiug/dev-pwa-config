/**
 * Traitement d'images côté client : validation, suppression des métadonnées,
 * compression sous un budget d'octets.
 *
 * PROMU, PAS INVENTÉ — trois apps, trois approches réunies :
 * - `miss-carbook` : compression itérative (qualité dégressive puis
 *   redimensionnement) jusqu'à passer sous `maxBytes` ;
 * - `bac-sable` (mister-family-map) : ré-encodage canvas qui supprime par
 *   construction EXIF / GPS / numéro de série — seul le contenu visuel
 *   survit ;
 * - `mister-puzzle` : redimensionnement JPEG simple, couvert par les deux
 *   précédentes.
 *
 * Ces fonctions exigent le DOM (canvas). La validation d'autorité (taille,
 * type, règles du bucket) reste côté serveur.
 */

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_DIMENSION = 2048;

/**
 * Contrôle de type et de taille avant tout traitement. PUR (testable sans
 * DOM) : ne lit que `type` et `size`.
 *
 * @param {{ type: string, size: number }} file
 * @param {{ maxBytes?: number, acceptedTypes?: readonly string[] }} [options]
 * @returns {'type' | 'size' | null} La raison du refus, ou `null` si valide.
 */
export function validateImageFile(file, options = {}) {
  const { maxBytes = IMAGE_MAX_BYTES, acceptedTypes = IMAGE_ACCEPTED_TYPES } =
    options;
  if (!acceptedTypes.includes(file.type)) return 'type';
  if (file.size > maxBytes) return 'size';
  return null;
}

/**
 * Ré-encode l'image (redimensionnée si besoin) SANS métadonnées : le passage
 * par canvas ne conserve que les pixels — EXIF, GPS et numéro de série
 * disparaissent par construction.
 *
 * @param {Blob} file
 * @param {{ maxDimension?: number, type?: string, quality?: number }} [options]
 * @returns {Promise<Blob>}
 */
export async function stripImageMetadata(file, options = {}) {
  const {
    maxDimension = IMAGE_MAX_DIMENSION,
    type = 'image/webp',
    quality = 0.85,
  } = options;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('[dwc] Canvas 2D indisponible.');
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob
          ? resolve(blob)
          : reject(new Error('[dwc] Échec du ré-encodage de l’image.')),
      type,
      quality
    );
  });
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise(resolve => {
    canvas.toBlob(b => resolve(b), 'image/jpeg', quality);
  });
}

function fileBaseName(name) {
  const base = String(name ?? '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/\.[^.]+$/, '');
  return base.slice(0, 80) || 'photo';
}

/**
 * Redimensionne et ré-encode en JPEG jusqu'à ce que la taille soit
 * ≤ `maxBytes` : qualités dégressives d'abord, réduction de dimension
 * ensuite. Les GIF animés deviennent une image fixe (première frame).
 * Le ré-encodage supprime aussi les métadonnées (même mécanique que
 * `stripImageMetadata`).
 *
 * @param {File} file
 * @param {number} [maxBytes]
 * @param {{ maxDimension?: number }} [options]
 * @returns {Promise<File>} Rejette si aucun compromis taille/détail n'aboutit.
 */
export async function compressImageToMaxBytes(
  file,
  maxBytes = IMAGE_MAX_BYTES,
  options = {}
) {
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      '[dwc] Impossible de lire cette image. Essayez un autre fichier (JPEG, PNG, WebP ou GIF).'
    );
  }

  const w = bitmap.width;
  const h = bitmap.height;
  if (!w || !h) {
    bitmap.close();
    throw new Error('[dwc] Image invalide (dimensions nulles).');
  }

  const stem = fileBaseName(file.name);
  const qualities = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.48, 0.4, 0.32, 0.25];
  let maxDim = Math.min(options.maxDimension ?? 2560, Math.max(w, h));

  try {
    for (let round = 0; round < 14; round++) {
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('[dwc] Canvas 2D indisponible.');
      ctx.drawImage(bitmap, 0, 0, cw, ch);

      for (const q of qualities) {
        const blob = await canvasToJpegBlob(canvas, q);
        if (blob && blob.size > 0 && blob.size <= maxBytes) {
          return new File([blob], `${stem}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }
      }

      if (maxDim <= 320) break;
      maxDim = Math.floor(maxDim * 0.72);
    }
  } finally {
    bitmap.close();
  }

  throw new Error(
    `[dwc] Impossible d’obtenir une image sous ${Math.round(maxBytes / 1024 / 1024)} Mo avec un détail acceptable. Choisissez une photo plus petite ou recadrez-la.`
  );
}
