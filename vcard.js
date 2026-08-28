/**
 * vCard 4.0 (RFC 6350) — le format de contact que tout le monde écrit de
 * travers.
 *
 * QUATRE RÈGLES QU'ON DÉCOUVRE EN PRODUCTION, jamais en développement :
 *
 * 1. **CRLF, pas LF.** La RFC l'impose ligne par ligne. Un fichier en LF
 *    s'importe très bien sur Android et se fait refuser par certains clients
 *    Apple — le genre de bug qui ne se reproduit que sur le téléphone de
 *    quelqu'un d'autre.
 *
 * 2. **Le pliage se compte en OCTETS, pas en caractères** (§3.2), et il ne
 *    doit JAMAIS couper au milieu d'un caractère multi-octets. Une ligne de
 *    75 « e » se plie au bon endroit ; la même en « é » — deux octets chacun —
 *    se plie deux fois plus tôt, et un pliage naïf coupe l'accent en deux,
 *    produisant un mojibake que le client importe sans broncher. Pour des
 *    noms français, ce n'est pas un cas limite : c'est le cas courant.
 *
 * 3. **Cinq caractères s'échappent dans une valeur texte** : la contre-oblique,
 *    la virgule, le point-virgule, et le retour à la ligne (en `\n`
 *    littéral). La virgule et le point-virgule ne sont pas décoratifs — ils
 *    SÉPARENT les composants d'un champ structuré. Un « Dupont, Jean » non
 *    échappé devient deux valeurs.
 *
 * 4. **`FN` est OBLIGATOIRE.** `N` (le nom structuré) ne suffit pas : un
 *    contact sans `FN` est refusé, ou s'affiche vide. C'est la première chose
 *    qu'oublient les générateurs qui partent du nom de famille.
 *
 * ORDRE IMPOSÉ : `BEGIN`, puis `VERSION` immédiatement, puis le reste, puis
 * `END`. Ce n'est pas une convention de présentation.
 *
 * SANS DÉPENDANCE, SANS DOM. Le résultat se télécharge avec
 * `download.js` → `downloadText(vcf, 'contacts.vcf', 'text/vcard')`.
 */

const CRLF = '\r\n';
/** §3.2 : 75 octets, la continuation commençant par une espace. */
const FOLD_OCTETS = 75;

/** Longueur en octets d'un caractère UTF-8, sans encoder toute la chaîne. */
function octetLength(char) {
  const code = char.codePointAt(0);
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  if (code < 0x10000) return 3;
  return 4;
}

/**
 * Plie une ligne à 75 octets, sans jamais couper un caractère en deux.
 *
 * On avance CARACTÈRE par caractère en comptant les OCTETS — c'est la seule
 * façon d'obtenir les deux à la fois. Découper la chaîne à 75 avec `slice()`
 * compterait des unités UTF-16 ; encoder puis découper les octets couperait au
 * milieu d'un « é ».
 */
export function foldLine(line, limit = FOLD_OCTETS) {
  const pieces = [];
  let current = '';
  let bytes = 0;

  // `[...line]` itère par POINT DE CODE : un emoji reste entier.
  for (const char of String(line)) {
    const size = octetLength(char);
    // Les lignes suivantes commencent par une espace, qui compte dans la limite.
    const budget = pieces.length === 0 ? limit : limit - 1;
    if (bytes + size > budget) {
      pieces.push(current);
      current = char;
      bytes = size;
    } else {
      current += char;
      bytes += size;
    }
  }
  pieces.push(current);

  return pieces
    .map((piece, index) => (index === 0 ? piece : ` ${piece}`))
    .join(CRLF);
}

/** Échappe une valeur texte (§3.4). L'ordre compte : la contre-oblique d'abord. */
export function escapeValue(value) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? isoDate(value) : String(value);
  return (
    text
      .replace(/\\/g, '\\\\')
      .replace(/\n|\r\n?/g, '\\n')
      .replace(/,/g, '\\,')
      // DEUX contre-obliques dans la source pour UNE dans la sortie : `'\;'` en
      // JavaScript vaut `';'` tout court, et l'échappement ne ferait rien.
      .replace(/;/g, '\\;')
  );
}

function isoDate(date) {
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * Un champ structuré : ses composants séparés par `;`, chacun échappé.
 *
 * Les composants absents restent VIDES et présents — `N:Dupont;Jean;;;` a
 * cinq places, toujours. En retirer une décale tout ce qui suit.
 */
function structured(parts, count) {
  const filled = Array.from({ length: count }, (_, i) => escapeValue(parts[i]));
  return filled.join(';');
}

/** Une ligne `NOM;PARAM=…:valeur`, pliée. */
function property(name, value, params = {}) {
  const attributes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, v]) => `;${key}=${Array.isArray(v) ? v.join(',') : v}`)
    .join('');
  return foldLine(`${name}${attributes}:${value}`);
}

/**
 * Un contact en vCard 4.0.
 *
 * @param {{
 *   firstName?: string, lastName?: string, middleName?: string,
 *   prefix?: string, suffix?: string, fullName?: string,
 *   organization?: string, title?: string, note?: string,
 *   birthday?: string|Date, url?: string, uid?: string,
 *   emails?: Array<string|{value: string, type?: string}>,
 *   phones?: Array<string|{value: string, type?: string}>,
 *   addresses?: Array<{street?: string, city?: string, region?: string,
 *     postalCode?: string, country?: string, type?: string}>,
 *   categories?: string[],
 * }} contact
 */
export function toVCard(contact = {}) {
  const {
    firstName = '',
    lastName = '',
    middleName = '',
    prefix = '',
    suffix = '',
    organization,
    title,
    note,
    birthday,
    url,
    uid,
    emails = [],
    phones = [],
    addresses = [],
    categories = [],
  } = contact;

  // `FN` EST OBLIGATOIRE : sans lui le contact est refusé ou s'affiche vide.
  // On le compose quand il manque plutôt que d'écrire une vCard invalide.
  const fullName =
    contact.fullName ??
    [prefix, firstName, middleName, lastName, suffix]
      .filter(part => String(part ?? '').trim() !== '')
      .join(' ');

  const lines = [
    'BEGIN:VCARD',
    // VERSION vient IMMÉDIATEMENT après BEGIN — ce n'est pas de la mise en forme.
    'VERSION:4.0',
    property('FN', escapeValue(fullName)),
    property(
      'N',
      structured([lastName, firstName, middleName, prefix, suffix], 5)
    ),
  ];

  if (organization) {
    lines.push(property('ORG', escapeValue(organization)));
  }
  if (title) lines.push(property('TITLE', escapeValue(title)));

  for (const entry of emails) {
    const { value, type } = normalizeEntry(entry);
    if (value)
      lines.push(property('EMAIL', escapeValue(value), { TYPE: type }));
  }

  for (const entry of phones) {
    const { value, type } = normalizeEntry(entry);
    if (value) lines.push(property('TEL', escapeValue(value), { TYPE: type }));
  }

  for (const address of addresses) {
    lines.push(
      property(
        'ADR',
        // Sept composants imposés : boîte postale, complément, rue, ville,
        // région, code postal, pays. Les deux premiers restent vides.
        structured(
          [
            '',
            '',
            address.street,
            address.city,
            address.region,
            address.postalCode,
            address.country,
          ],
          7
        ),
        { TYPE: address.type }
      )
    );
  }

  if (url) lines.push(property('URL', escapeValue(url)));
  if (birthday) {
    lines.push(
      property(
        'BDAY',
        birthday instanceof Date ? isoDate(birthday) : escapeValue(birthday)
      )
    );
  }
  if (categories.length > 0) {
    // Les valeurs multiples se séparent par une virgule NON échappée : c'est
    // pour ça que la virgule est échappée DANS chaque valeur.
    lines.push(property('CATEGORIES', categories.map(escapeValue).join(',')));
  }
  if (note) lines.push(property('NOTE', escapeValue(note)));
  if (uid) lines.push(property('UID', escapeValue(uid)));

  lines.push('END:VCARD');
  return lines.join(CRLF) + CRLF;
}

function normalizeEntry(entry) {
  return typeof entry === 'string' ? { value: entry } : (entry ?? {});
}

/**
 * Plusieurs contacts dans un seul fichier `.vcf`.
 *
 * Les vCards se concaténent, sans séparateur ni enveloppe : chacune porte son
 * `BEGIN`/`END`, et c'est ce que les clients attendent.
 */
export function toVCards(contacts, options = {}) {
  const { map } = options;
  return [...(contacts ?? [])]
    .map(contact => toVCard(map ? map(contact) : contact))
    .join('');
}

/** Le type MIME et l'extension, pour `downloadText`. */
export const VCARD_MIME = 'text/vcard;charset=utf-8';

/**
 * Déplie les lignes d'un fichier vCard.
 *
 * Le dépliage vient AVANT toute analyse : une propriété coupée en trois par le
 * pliage n'est pas trois propriétés, et un analyseur qui lit ligne à ligne
 * sans déplier perd silencieusement la fin des valeurs longues.
 */
export function unfoldLines(text) {
  return String(text ?? '')
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .split(/\r\n|\n|\r/);
}
