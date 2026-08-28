/**
 * Tableaux Markdown — qui restent des tableaux une fois rendus.
 *
 * CE QUI CASSE UN TABLEAU MARKDOWN, et qu'un `join('|')` naïf ne voit pas :
 *
 *   - une BARRE VERTICALE dans une cellule (« 8 | 10 », « a|b ») coupe la
 *     ligne en colonnes supplémentaires. Le tableau se décale, ou disparaît ;
 *   - un RETOUR À LA LIGNE dans une cellule termine la ligne du tableau :
 *     tout ce qui suit devient du texte ordinaire. C'est le défaut le plus
 *     déroutant, parce qu'il n'apparaît qu'avec une description un peu longue ;
 *   - une cellule VIDE dans la première colonne rend certains rendus
 *     ambigus ; une espace insécable suffit à les tenir.
 *
 * POURQUOI ALIGNER LES COLONNES. Un tableau Markdown est lu tel quel au moins
 * autant qu'il est rendu — dans une revue de code, un `git diff`, un README.
 * Les colonnes alignées coûtent une passe de calcul et rendent la source
 * lisible ; c'est ce que fait Prettier sur les tableaux de ce dépôt, et ce que
 * la plupart des générateurs oublient.
 *
 * Les COLONNES viennent de `./columns.js` : la même déclaration que le CSV et
 * le JSON.
 */
import { applyColumns, cellValue, resolveColumns } from './columns.js';

/** Espace insécable : une cellule vide qui reste une cellule. */
const NBSP = ' ';

/**
 * Échappe une valeur pour une cellule de tableau.
 *
 * Le retour à la ligne devient `<br>` — accepté par tous les rendus courants,
 * et la seule façon de garder un texte multiligne DANS une cellule.
 */
export function escapeCell(value, options = {}) {
  const { multiline = '<br>' } = options;
  if (value === null || value === undefined) return '';

  let text;
  if (value instanceof Date) {
    text = Number.isNaN(value.getTime()) ? '' : value.toISOString();
  } else if (typeof value === 'number' && !Number.isFinite(value)) {
    text = '';
  } else {
    text = String(value);
  }

  return text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r\n|\r|\n/g, multiline)
    .trim();
}

/**
 * Largeur MINIMALE de la ligne de séparation, par alignement.
 *
 * Trois tirets au moins — c'est ce qu'exige la syntaxe — et les deux-points
 * comptent dans la largeur : `:-:` fait bien trois caractères.
 */
const MIN_RULE = { none: 3, left: 3, right: 3, center: 3 };

/**
 * Un tableau d'objets en tableau Markdown.
 *
 * @param {readonly object[]} rows
 * @param {{ columns?: Array<string|object>, align?: 'left'|'center'|'right'|'none',
 *   pad?: boolean, multiline?: string, empty?: string }} [options]
 */
export function toMarkdownTable(rows, options = {}) {
  const { pad = true, empty = '_Aucune donnée._' } = options;
  const list = [...(rows ?? [])];
  const columns = resolveColumns(list, options.columns);

  if (columns.length === 0) return empty;

  const header = columns.map(column => escapeCell(column.header, options));
  const body = list.map(row =>
    columns.map(column => escapeCell(cellValue(column, row), options))
  );

  // Une largeur par colonne : le plus long de l'en-tête et des cellules, avec
  // un plancher de 3 — la ligne de séparation a besoin de `---`.
  const widths = columns.map((column, index) =>
    pad
      ? Math.max(
          3,
          header[index].length,
          ...body.map(cells => cells[index].length)
        )
      : 0
  );

  const line = cells =>
    `| ${cells.map((cell, i) => (cell || NBSP).padEnd(widths[i])).join(' | ')} |`;

  // La règle d'alignement est ÉTIRÉE à la largeur de la colonne, sans quoi la
  // ligne de séparation ne s'aligne pas sur les autres — et un tableau dont
  // les trois lignes n'ont pas la même longueur ne se lit plus en source.
  const alignment = columns.map((column, index) => {
    const kind = column.align ?? options.align ?? 'none';
    const width = pad
      ? Math.max(widths[index], MIN_RULE[kind])
      : MIN_RULE[kind];
    if (kind === 'left') return `:${'-'.repeat(width - 1)}`;
    if (kind === 'right') return `${'-'.repeat(width - 1)}:`;
    if (kind === 'center') return `:${'-'.repeat(width - 2)}:`;
    return '-'.repeat(width);
  });

  return [line(header), `| ${alignment.join(' | ')} |`, ...body.map(line)].join(
    '\n'
  );
}

/**
 * Une liste de définitions : un titre, puis les champs en gras.
 *
 * Pour ce qu'un tableau rend illisible — une fiche de lieu avec dix champs
 * dont trois descriptions. Un tableau à dix colonnes ne se lit sur aucun
 * téléphone ; une liste, si.
 */
export function toMarkdownList(rows, options = {}) {
  const { title, level = 3, empty = '_Aucune donnée._' } = options;
  const records = applyColumns(rows, options);
  if (records.length === 0) return empty;

  return records
    .map(record => {
      const entries = Object.entries(record).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      );
      const heading = title
        ? `${'#'.repeat(level)} ${escapeInline(String(record[title] ?? ''))}\n\n`
        : '';
      const body = entries
        .filter(([key]) => key !== title)
        .map(
          ([key, value]) =>
            `- **${escapeInline(key)}** : ${escapeInline(value)}`
        )
        .join('\n');
      return heading + body;
    })
    .join('\n\n');
}

/**
 * Échappe ce qui a un sens en Markdown HORS tableau.
 *
 * Volontairement étroit : `*`, `_`, `` ` ``, `[`, `]` et la contre-oblique.
 * Échapper tout ce qui peut avoir un sens rendrait le texte illisible en
 * source, pour se prémunir de cas qui n'arrivent pas dans une valeur de champ.
 */
export function escapeInline(value) {
  return String(value ?? '').replace(/([\\*_`[\]])/g, '\\$1');
}
