/**
 * Appairage — codes courts et liens profonds, pour relier deux appareils.
 *
 * PROMU, PAS INVENTÉ. Trois apps font « rejoindre » par un code court, chacune
 * avec SON alphabet et SON tirage :
 *
 *   - mister-qowa : PIN numérique de 8 chiffres (`src/firebase/api.ts`,
 *     `randomPin`), diffusé en lien `…#/join?pin=…` et en QR ;
 *   - mister-molkky : code de 6 caractères « façon Crockford », sans I/O/0/1
 *     (`src/live/liveMatch.ts`, `makeCode` + `normalizeCode`) ;
 *   - miss-ticket-pwa : le MÊME alphabet de 32 caractères (`src/lib/pairing.ts`)
 *     — mais tiré par `Math.random` — et un schéma d'URL maison
 *     `missticket:pair?token=…&id=…`, parsé à la main.
 *
 * DEUX CONTRADICTIONS TRANCHÉES :
 *
 * 1. **Le tirage.** `Math.random` (miss-ticket) est prédictible — un code
 *    d'appairage est un secret, même modeste. Ici : `crypto.getRandomValues`,
 *    injectable pour les tests. Et les octets au-delà du dernier multiple de
 *    la taille de l'alphabet sont REJETÉS puis retirés : `octet % 10`
 *    favoriserait 0–5 (256 = 25 × 10 + 6) ; avec le rejet, chaque caractère
 *    est équiprobable, quel que soit l'alphabet.
 *
 * 2. **La normalisation.** Le `normalizeCode` de mister-molkky échange I ↔ 1
 *    et O ↔ 0 — alors qu'aucun des quatre n'appartient à son alphabet. La
 *    moitié utile (`0 → O`, `1 → I`) est du code mort, son premier filtre
 *    ayant déjà retiré les chiffres ; la moitié vivante (`I → 1`, `O → 0`)
 *    pousse HORS de l'alphabet : le code corrompu garde la bonne longueur et
 *    la recherche échoue en silence. Ici, une confusion n'est corrigée QUE
 *    vers un caractère de l'alphabet (Crockford : I/L → 1, O → 0) ; sinon
 *    elle est simplement écartée, et la saisie continue.
 *
 * SANS DÉPENDANCE, SANS DOM. Le QR se génère dans `./qr` (peer optionnelle
 * `qrcode`) et se scanne dans `./react/use-qr-scanner` (peer optionnelle
 * `qr-scanner`).
 */

/**
 * @typedef {{ chars: string, aliases?: Readonly<Record<string, string>> }} PairingAlphabet
 *   `chars` : caractères autorisés ; `aliases` : confusions de LECTURE
 *   ramenées vers l'alphabet à la normalisation (après mise en majuscules).
 */

/**
 * Alphabets éprouvés par les trois apps sources.
 *
 * - `numeric` : le PIN de mister-qowa — saisissable au pavé numérique ;
 * - `crockford32` : le base32 de Crockford, LE VRAI (0-9 + lettres sans
 *   I/L/O/U) — les confusions se CORRIGENT au lieu d'être perdues ;
 * - `antiConfusion` : l'alphabet commun à mister-molkky et miss-ticket-pwa —
 *   32 caractères sans 0/O ni 1/I : rien à confondre, rien à corriger.
 */
export const ALPHABETS = Object.freeze({
  numeric: Object.freeze({ chars: '0123456789', aliases: Object.freeze({}) }),
  crockford32: Object.freeze({
    chars: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
    aliases: Object.freeze({ I: '1', L: '1', O: '0' }),
  }),
  antiConfusion: Object.freeze({
    chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    aliases: Object.freeze({}),
  }),
});

/** @type {Readonly<Record<string, PairingAlphabet>>} */
const BY_NAME = ALPHABETS;

/**
 * @param {string | PairingAlphabet | undefined} alphabet
 * @returns {PairingAlphabet}
 */
function resolveAlphabet(alphabet) {
  if (alphabet === undefined) return ALPHABETS.antiConfusion;
  const resolved = typeof alphabet === 'string' ? BY_NAME[alphabet] : alphabet;
  if (
    !resolved ||
    typeof resolved.chars !== 'string' ||
    resolved.chars.length < 2
  ) {
    throw new Error(
      `Alphabet inconnu ou invalide : ${JSON.stringify(alphabet)} — nommés : ` +
        `${Object.keys(ALPHABETS).join(', ')} ; personnalisé : ` +
        `{ chars, aliases? } d'au moins 2 caractères.`
    );
  }
  if (resolved.chars.length > 256) {
    throw new Error(
      'Alphabet invalide : 256 caractères au plus (tirage par octet).'
    );
  }
  return resolved;
}

/** Tirage par défaut : des octets cryptographiques. */
function cryptoRandom(count) {
  const bytes = new Uint8Array(count);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Engendre un code court aléatoire, équiprobable sur son alphabet.
 *
 * @param {number} length Nombre de caractères (entier ≥ 1).
 * @param {{ alphabet?: string | PairingAlphabet,
 *   random?: (count: number) => Uint8Array | number[] }} [options]
 *   `alphabet` : un nom d'`ALPHABETS` (défaut `antiConfusion`, le choix de
 *   deux apps sur trois) ou un alphabet personnalisé. `random` : source
 *   d'octets injectable (tests) ; défaut `crypto.getRandomValues`.
 * @returns {string}
 */
export function generateCode(length, options = {}) {
  const { alphabet, random = cryptoRandom } = options;
  const { chars } = resolveAlphabet(alphabet);
  if (!Number.isInteger(length) || length < 1) {
    throw new Error(
      `Longueur de code invalide : ${length} (entier ≥ 1 attendu).`
    );
  }
  // Zone équiprobable : au-delà du dernier multiple de la taille de
  // l'alphabet, l'octet est rejeté et retiré à nouveau — sans quoi `% taille`
  // favorise le début de l'alphabet (voir l'en-tête).
  const limit = 256 - (256 % chars.length);
  let code = '';
  while (code.length < length) {
    const bytes = random(length - code.length);
    if (!bytes || bytes.length === 0) {
      throw new Error('`random` doit renvoyer au moins un octet par appel.');
    }
    for (const byte of bytes) {
      if (code.length === length) break;
      if (byte >= limit) continue; // rejeté : hors de la zone équiprobable
      code += chars[byte % chars.length];
    }
  }
  return code;
}

/**
 * Normalise une saisie vers l'alphabet : majuscules, confusions corrigées
 * (`aliases`), tout le reste écarté — espaces, tirets, émojis de collage.
 *
 * À brancher tel quel sur le `onChange` d'un champ de code (l'usage de
 * mister-molkky, `JoinLiveView`), avec `maxLength` pour borner la saisie.
 *
 * @param {string} input
 * @param {{ alphabet?: string | PairingAlphabet, maxLength?: number }} [options]
 * @returns {string}
 */
export function normalizeCode(input, options = {}) {
  const { alphabet, maxLength } = options;
  const { chars, aliases = {} } = resolveAlphabet(alphabet);
  let code = '';
  for (const raw of String(input ?? '').toUpperCase()) {
    const ch = aliases[raw] ?? raw;
    if (!chars.includes(ch)) continue;
    code += ch;
    if (maxLength !== undefined && code.length >= maxLength) break;
  }
  return code;
}

/* ── Liens profonds ─────────────────────────────────────────────────────── */

// Schéma d'URI (RFC 3986) : une lettre, puis lettres/chiffres/`+`/`-`/`.`.
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/i;
// L'action est opaque mais doit rester saine dans un QR : ni séparateur de
// requête, ni fragment, ni blanc.
const ACTION_PATTERN = /^[^?#\s]+$/;

/**
 * Construit un lien profond `schéma:action?clé=valeur`.
 *
 * GÉNÉRALISE le schéma maison de miss-ticket-pwa
 * (`missticket:pair?token=…&id=…`) sans en coder le nom en dur : chaque app
 * choisit son schéma et ses actions. Les valeurs sont encodées par
 * `URLSearchParams` — `parseDeepLink` (et le parseur d'origine) décodent
 * pareil ; `undefined` et `null` sont omis.
 *
 * @param {string} scheme
 * @param {string} action
 * @param {Record<string, string | number | boolean | null | undefined>} [params]
 * @returns {string}
 */
export function buildDeepLink(scheme, action, params = {}) {
  if (typeof scheme !== 'string' || !SCHEME_PATTERN.test(scheme)) {
    throw new Error(
      `Schéma invalide : « ${scheme} » (une lettre, puis lettres/chiffres/+/-/.).`
    );
  }
  if (typeof action !== 'string' || !ACTION_PATTERN.test(action)) {
    throw new Error(
      `Action invalide : « ${action} » (sans « ? », « # » ni blanc).`
    );
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return `${scheme}:${action}${query ? `?${query}` : ''}`;
}

/**
 * Parse un lien profond `schéma:action?clé=valeur`. Renvoie `null` si la
 * forme n'y est pas : le contenu d'un QR scanné est souvent tout autre chose,
 * et l'appelant n'a qu'UN cas d'échec à gérer — le contrat du `parseQRCode`
 * de miss-ticket-pwa.
 *
 * @param {string} raw
 * @param {{ scheme?: string, action?: string }} [expected] Filtres
 *   optionnels : schéma attendu (insensible à la casse) et action attendue
 *   (exacte) — toute autre valeur rend `null`.
 * @returns {{ scheme: string, action: string,
 *   params: Record<string, string> } | null}
 */
export function parseDeepLink(raw, expected = {}) {
  const text = String(raw ?? '').trim();
  const colon = text.indexOf(':');
  if (colon < 1) return null;
  const scheme = text.slice(0, colon).toLowerCase();
  if (!SCHEME_PATTERN.test(scheme)) return null;

  const rest = text.slice(colon + 1);
  const hash = rest.indexOf('#');
  const noFragment = hash === -1 ? rest : rest.slice(0, hash);
  const question = noFragment.indexOf('?');
  const action = question === -1 ? noFragment : noFragment.slice(0, question);
  const query = question === -1 ? '' : noFragment.slice(question + 1);
  if (!ACTION_PATTERN.test(action)) return null;

  if (expected.scheme !== undefined && scheme !== expected.scheme.toLowerCase())
    return null;
  if (expected.action !== undefined && action !== expected.action) return null;

  // Première occurrence retenue (le contrat de `URLSearchParams.get`). Et
  // `Object.fromEntries` POSE des propriétés propres : une clé `__proto__`
  // forgée dans un lien reste une donnée, elle ne mute pas l'objet.
  const entries = new Map();
  for (const [key, value] of new URLSearchParams(query)) {
    if (!entries.has(key)) entries.set(key, value);
  }
  return { scheme, action, params: Object.fromEntries(entries) };
}
