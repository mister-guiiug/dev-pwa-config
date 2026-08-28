/**
 * CSV : le construire, pas seulement le télécharger.
 *
 * LE MANQUE, MESURÉ. `download.js` sait envoyer une chaîne CSV au navigateur —
 * son commentaire dit « CSV, Markdown, journal… ». Il ne sait pas la
 * FABRIQUER. Or huit apps sur dix-sept produisent des tableaux (bilans,
 * statistiques, compteurs, historiques) et mister-cim10 exporte déjà en TXT,
 * CSV et PDF. Chacune sérialise donc à la main, et la sérialisation à la main
 * casse toujours sur les mêmes trois caractères.
 *
 * CE QUI CASSE, ET POURQUOI ÇA NE SE VOIT PAS EN DÉVELOPPEMENT :
 *
 *   - une VIRGULE dans un nom de lieu (« Parc, côté sud ») décale toute la
 *     ligne d'une colonne ;
 *   - un GUILLEMET dans un commentaire (« le "petit" toboggan ») casse le
 *     champ, et RFC 4180 veut qu'il soit doublé, pas échappé par une
 *     contre-oblique ;
 *   - un RETOUR À LA LIGNE dans une description coupe la ligne en deux —
 *     c'est légal en CSV, à condition que le champ soit entre guillemets.
 *
 * Les jeux de démonstration n'ont ni virgule, ni guillemet, ni retour à la
 * ligne. Le fichier est donc parfait chez le développeur et décalé chez
 * l'utilisateur.
 *
 * LE PIÈGE FRANÇAIS, EN PLUS. Excel en locale française lit le
 * POINT-VIRGULE, pas la virgule, et écrit les décimales avec une VIRGULE. Un
 * export « correct » au sens RFC s'ouvre donc en une seule colonne chez la
 * moitié des utilisateurs. Et sans BOM UTF-8, les accents deviennent du
 * charabia. Le dialecte `excel-fr` traite les trois d'un coup.
 *
 * CE QUE ÇA N'EST PAS : un tableur. Pas de formules, pas de types, pas de
 * feuilles. Du texte tabulaire qui s'ouvre correctement des deux côtés.
 *
 * Les COLONNES viennent de `./columns.js`, partagées avec l'export Markdown et
 * JSON : une déclaration, trois formats, le même contenu.
 */
import { cellValue, resolveColumns } from './columns.js';

/** Séparateurs reconnus à la lecture, par ordre de fréquence constatée. */
const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'];

/**
 * Dialectes prêts à l'emploi.
 *
 * `rfc4180` pour une machine, `excel-fr` pour un humain sous Excel français.
 * Le choix n'est pas cosmétique : il décide si le fichier s'ouvre en colonnes
 * ou en une seule.
 */
export const DIALECTS = {
  rfc4180: {
    delimiter: ',',
    newline: '\r\n',
    bom: false,
    decimalComma: false,
  },
  'excel-fr': {
    delimiter: ';',
    newline: '\r\n',
    // Sans BOM, Excel lit l'UTF-8 comme du Latin-1 : « Café » devient « CafÃ© ».
    bom: true,
    decimalComma: true,
  },
  unix: { delimiter: ',', newline: '\n', bom: false, decimalComma: false },
};

/** Le BOM UTF-8, en tête de fichier. */
export const UTF8_BOM = '﻿';

function resolveDialect(options = {}) {
  const base = DIALECTS[options.dialect ?? 'rfc4180'] ?? DIALECTS.rfc4180;
  return { ...base, ...options };
}

/**
 * Un champ, échappé selon RFC 4180.
 *
 * On n'entoure de guillemets QUE ce qui l'exige — un fichier tout guillemeté
 * est valide mais illisible à l'œil, et la relecture d'un export fait partie
 * du travail.
 */
export function escapeField(value, options = {}) {
  const { delimiter, decimalComma } = resolveDialect(options);

  if (value === null || value === undefined) return '';

  let text;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    text = String(value);
    // La virgule décimale n'a de sens que si le séparateur ne l'est pas —
    // sinon on fabrique soi-même l'ambiguïté qu'on prétend éviter.
    if (decimalComma && delimiter !== ',') text = text.replace('.', ',');
  } else if (value instanceof Date) {
    // ISO 8601 : la seule écriture qu'un tableur et un script lisent pareil.
    text = Number.isNaN(value.getTime()) ? '' : value.toISOString();
  } else if (typeof value === 'boolean') {
    text = value ? 'true' : 'false';
  } else {
    text = String(value);
  }

  const mustQuote =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    // Un champ qui commence ou finit par une espace la perd sans guillemets.
    text !== text.trim();

  if (!mustQuote) return text;
  // RFC 4180 : le guillemet se DOUBLE. Une contre-oblique ne veut rien dire ici.
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Un tableau d'objets en CSV.
 *
 * @param {readonly object[]} rows
 * @param {{ columns?: Array<string|{key:string,header?:string,map?:Function}>,
 *   dialect?: 'rfc4180'|'excel-fr'|'unix', delimiter?: string, newline?: string,
 *   bom?: boolean, decimalComma?: boolean, header?: boolean }} [options]
 */
export function toCsv(rows, options = {}) {
  const dialect = resolveDialect(options);
  const list = [...(rows ?? [])];

  // Les colonnes DÉCLARÉES priment : l'ordre des clés d'un objet est un détail
  // d'implémentation, et un export dont les colonnes bougent d'une version à
  // l'autre casse les tableurs de ceux qui s'en servent.
  const columns = resolveColumns(list, options.columns);

  const lines = [];
  if (options.header !== false) {
    lines.push(
      columns.map(c => escapeField(c.header, dialect)).join(dialect.delimiter)
    );
  }
  for (const row of list) {
    lines.push(
      columns
        .map(c => escapeField(cellValue(c, row), dialect))
        .join(dialect.delimiter)
    );
  }

  const body = lines.join(dialect.newline);
  return dialect.bom ? UTF8_BOM + body : body;
}

/**
 * Le séparateur le plus probable d'un texte CSV.
 *
 * Compte les candidats HORS guillemets sur les premières lignes : compter
 * partout ferait gagner la virgule dès qu'un champ cité en contient une.
 */
export function detectDelimiter(text, candidates = CANDIDATE_DELIMITERS) {
  const sample = String(text ?? '').slice(0, 64 * 1024);
  let best = candidates[0];
  let bestScore = -1;

  for (const candidate of candidates) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < sample.length; i += 1) {
      const char = sample[i];
      if (char === '"') quoted = !quoted;
      else if (!quoted && char === candidate) count += 1;
    }
    if (count > bestScore) {
      bestScore = count;
      best = candidate;
    }
  }
  return bestScore > 0 ? best : candidates[0];
}

/**
 * Lit un CSV en tableau de lignes (tableaux de chaînes).
 *
 * Analyseur caractère par caractère : une expression régulière ne sait pas
 * distinguer un séparateur d'un séparateur DANS un champ cité, et c'est
 * exactement le cas qui casse en production.
 */
export function parseCsv(text, options = {}) {
  let input = String(text ?? '');
  if (input.startsWith(UTF8_BOM)) input = input.slice(1);
  if (input === '') return [];

  const delimiter = options.delimiter ?? detectDelimiter(input);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      // CRLF compte pour UNE fin de ligne.
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  // La dernière ligne n'a pas forcément de fin de ligne.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Lit un CSV en tableau d'objets, la première ligne servant d'en-têtes.
 *
 * Les colonnes en trop sont ignorées et les manquantes valent `''` : un
 * fichier retouché à la main ne doit pas faire tomber l'import.
 */
export function fromCsv(text, options = {}) {
  const rows = parseCsv(text, options);
  if (rows.length === 0) return [];
  const [headers, ...body] = rows;
  return body
    .filter(row => row.some(cell => cell !== ''))
    .map(row =>
      Object.fromEntries(headers.map((header, i) => [header, row[i] ?? '']))
    );
}
