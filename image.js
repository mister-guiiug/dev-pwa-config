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
 * - `mister-puzzle` : redimensionnement JPEG avant écriture dans une base
 *   JSON. **Sa migration (#15) a corrigé cette ligne, qui disait « couvert
 *   par les deux précédentes ».** Deux besoins ne le sont pas : sa sortie
 *   doit être une CHAÎNE (data URL — Firebase RTDB ne stocke pas de binaire),
 *   et son budget se compte en CARACTÈRES de base64, pas en octets — le
 *   gonflement de 4/3 doit être traduit avant d'appeler
 *   `compressImageToMaxBytes`. Le dernier maillon reste donc chez elle.
 *   Sa copie, elle, bornait la LARGEUR seule : un portrait 800 × 20000
 *   passait sans réduction et se faisait refuser à l'écriture.
 *
 * Le canvas est ISOLÉ DERRIÈRE DEUX COUTURES (`render` et `encode`), et la
 * géométrie est une fonction pure (`fitWithin`). C'est ce qui rend la
 * DÉCISION testable — quelle taille, quelle qualité, quand s'arrêter — sans
 * simuler un canvas, c'est-à-dire sans écrire un test qui ne prouverait que
 * son propre bouchon. Le dessin lui-même reste hors de portée d'un test Node,
 * et c'est assumé.
 *
 * La validation d'autorité (taille, type, règles du bucket) reste côté serveur.
 */

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Les trois formats que TOUT navigateur sait décoder ET ré-encoder. C'est un
 * PLANCHER SÛR, pas une liste exhaustive — et il reste volontairement étroit.
 *
 * Deux apps l'élargissent, chacune pour une bonne raison : `miss-carbook`
 * ajoute `image/gif`, `mister-puzzle` y joint AVIF, HEIC et HEIF pour ne pas
 * refuser les photos d'iPhone qui passaient jusque-là. Les élargir ICI
 * changerait ce que les autres apps acceptent **sans qu'elles l'aient
 * demandé** — un formulaire se met à accepter des fichiers que son bucket
 * refusera. La liste s'élargit donc au site d'appel :
 *
 *     validateImageFile(file, {
 *       acceptedTypes: [...IMAGE_ACCEPTED_TYPES, 'image/gif'],
 *     });
 */
export const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Plafond d'AFFICHAGE : au-delà, un écran n'y gagne plus rien. */
export const IMAGE_MAX_DIMENSION = 2048;

/**
 * Point de DÉPART de la compression, délibérément au-dessus du plafond
 * d'affichage — et c'est la seule raison pour laquelle les deux constantes
 * diffèrent.
 *
 * `stripImageMetadata` produit une image finale : elle plafonne à
 * `IMAGE_MAX_DIMENSION`. `compressImageToMaxBytes` vise un budget d'OCTETS et
 * réduit par paliers : partir plus haut laisse une chance à une photo déjà
 * légère de garder son détail, sans jamais empêcher la descente. La valeur
 * vient de `miss-carbook`, dont la compression est promue ici — l'unifier
 * silencieusement à 2048 dégraderait ses photos existantes.
 */
export const IMAGE_COMPRESS_START_DIMENSION = 2560;

/**
 * Géométrie du redimensionnement, PURE : la seule décision de taille du
 * module, donc la seule à devoir être prouvée.
 *
 * Trois garanties, chacune un piège réel :
 *  - **jamais d'agrandissement** — `scale` est borné à 1, sans quoi une
 *    vignette de 80 px ré-encodée en 2048 pèserait plus que l'originale pour
 *    zéro détail supplémentaire ;
 *  - **plancher à 1 px** — une image 1 × 5000 arrondit sa petite dimension à
 *    0, et un canvas de largeur 0 fait échouer `toBlob` sans rien dire ;
 *  - **rapport d'aspect conservé**, les deux côtés arrondis depuis la même
 *    échelle.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} maxDimension
 * @returns {{ width: number, height: number }}
 */
export function fitWithin(width, height, maxDimension) {
  const longest = Math.max(width, height);
  const scale = longest > 0 ? Math.min(1, maxDimension / longest) : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

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
 * @param {{ maxDimension?: number, type?: string, quality?: number,
 *   decode?: Function, render?: Function, encode?: Function }} [options]
 *   Les trois dernières sont les coutures : ne les fournir qu'en test.
 * @returns {Promise<Blob>}
 */
export async function stripImageMetadata(file, options = {}) {
  const {
    maxDimension = IMAGE_MAX_DIMENSION,
    type = 'image/webp',
    quality = 0.85,
    decode = createImageBitmap,
    render = renderToCanvas,
    encode = encodeCanvas,
  } = options;
  const bitmap = await decode(file);
  const { width, height } = fitWithin(
    bitmap.width,
    bitmap.height,
    maxDimension
  );
  let frame;
  try {
    frame = render(bitmap, width, height);
  } finally {
    bitmap.close?.();
  }
  const blob = await encode(frame, quality, type);
  if (!blob) throw new Error('[dwc] Échec du ré-encodage de l’image.');
  return blob;
}

/* ── Les deux coutures : tout ce que ce module sait du DOM ──────────────── */

/**
 * Dessine le bitmap à la taille voulue et rend la surface prête à encoder.
 * Le canvas est créé UNE fois par taille, puis réutilisé pour toutes les
 * qualités essayées — redessiner un grand bitmap dix fois par palier serait
 * la partie coûteuse.
 */
function renderToCanvas(bitmap, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[dwc] Canvas 2D indisponible.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

/** @returns {Promise<Blob | null>} `null` quand le navigateur refuse le format. */
function encodeCanvas(canvas, quality, type = 'image/jpeg') {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), type, quality);
  });
}

/* ── Les paliers de la compression ─────────────────────────────────────── */

/**
 * Qualités essayées à taille constante, de la meilleure à la plus basse.
 * On dégrade la QUALITÉ avant la TAILLE : un artefact JPEG se voit moins
 * qu'une image floue une fois agrandie à l'écran.
 */
export const COMPRESS_QUALITIES = [
  0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.48, 0.4, 0.32, 0.25,
];

/** Réduction appliquée quand aucune qualité ne suffit (≈ −28 % par palier). */
const COMPRESS_SHRINK_FACTOR = 0.72;

/** En deçà, l'image n'est plus une photo : mieux vaut échouer en le disant. */
const COMPRESS_MIN_DIMENSION = 320;

/** Garde-fou : la descente s'arrête d'elle-même bien avant ce compte. */
const COMPRESS_MAX_ROUNDS = 14;

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
 * @param {{ maxDimension?: number, decode?: Function, render?: Function,
 *   encode?: Function, now?: () => number }} [options]
 * @returns {Promise<File>} Rejette si aucun compromis taille/détail n'aboutit.
 */
export async function compressImageToMaxBytes(
  file,
  maxBytes = IMAGE_MAX_BYTES,
  options = {}
) {
  const {
    maxDimension = IMAGE_COMPRESS_START_DIMENSION,
    decode = createImageBitmap,
    render = renderToCanvas,
    encode = encodeCanvas,
    now = () => Date.now(),
  } = options;

  let bitmap = null;
  try {
    bitmap = await decode(file);
  } catch {
    throw new Error(
      '[dwc] Impossible de lire cette image. Essayez un autre fichier (JPEG, PNG, WebP ou GIF).'
    );
  }

  const w = bitmap.width;
  const h = bitmap.height;
  if (!w || !h) {
    bitmap.close?.();
    throw new Error('[dwc] Image invalide (dimensions nulles).');
  }

  const stem = fileBaseName(file.name);
  let maxDim = Math.min(maxDimension, Math.max(w, h));

  try {
    for (let round = 0; round < COMPRESS_MAX_ROUNDS; round++) {
      const size = fitWithin(w, h, maxDim);
      const frame = render(bitmap, size.width, size.height);

      for (const quality of COMPRESS_QUALITIES) {
        const blob = await encode(frame, quality, 'image/jpeg');
        if (blob && blob.size > 0 && blob.size <= maxBytes) {
          return new File([blob], `${stem}.jpg`, {
            type: 'image/jpeg',
            lastModified: now(),
          });
        }
      }

      if (maxDim <= COMPRESS_MIN_DIMENSION) break;
      maxDim = Math.floor(maxDim * COMPRESS_SHRINK_FACTOR);
    }
  } finally {
    bitmap.close?.();
  }

  throw new Error(
    `[dwc] Impossible d’obtenir une image sous ${Math.round(maxBytes / 1024 / 1024)} Mo avec un détail acceptable. Choisissez une photo plus petite ou recadrez-la.`
  );
}
