/**
 * Le modèle de COLONNES, partagé par tous les formats d'export.
 *
 * POURQUOI CE MODULE EXISTE. `toCsv`, `toMarkdownTable` et l'export JSON
 * posent tous la même question : quelles colonnes, dans quel ordre, sous quel
 * en-tête, avec quelle transformation ? Écrire la réponse trois fois donnerait
 * trois comportements légèrement différents — et c'est toujours la troisième
 * qui oublie de gérer les valeurs manquantes.
 *
 * UNE DÉCLARATION, QUATRE FORMATS. L'app décrit ses colonnes une fois :
 *
 *     const COLONNES = [
 *       'nom',
 *       { key: 'note', header: 'Note /5', map: v => v.toFixed(1) },
 *     ];
 *     toCsv(lignes, { columns: COLONNES });
 *     toMarkdownTable(lignes, { columns: COLONNES });
 *     toJson(lignes, { columns: COLONNES });
 *
 * L'ORDRE DES CLÉS N'EST PAS UN CONTRAT. Sans colonnes déclarées, l'ordre
 * vient de `Object.keys` — un détail d'implémentation. Un export dont les
 * colonnes bougent d'une version à l'autre casse les tableurs de ceux qui s'en
 * servent, et le bug arrive des mois plus tard, chez quelqu'un d'autre.
 */

/**
 * Normalise une déclaration de colonnes.
 *
 * Sans déclaration, l'UNION des clés de toutes les lignes — pas les clés de la
 * première : une ligne à laquelle il manque un champ ne doit pas amputer le
 * tableau, et une ligne qui en a un de plus ne doit pas le perdre.
 */
export function resolveColumns(rows, columns) {
  const declared = columns ?? [
    ...new Set((rows ?? []).flatMap(row => Object.keys(row ?? {}))),
  ];
  return declared.map(column =>
    typeof column === 'string'
      ? { key: column, header: column }
      : { header: column.key, ...column }
  );
}

/** La valeur d'une cellule, transformation appliquée. */
export function cellValue(column, row) {
  const raw = row?.[column.key];
  return column.map ? column.map(raw, row) : raw;
}

/**
 * Les lignes réduites aux colonnes déclarées, en objets simples.
 *
 * C'est aussi l'export JSON : un tableau d'objets plats, sans classe, sans
 * référence circulaire, prêt pour `JSON.stringify`.
 */
export function applyColumns(rows, options = {}) {
  const columns = resolveColumns(rows, options.columns);
  return [...(rows ?? [])].map(row =>
    Object.fromEntries(
      columns.map(column => [column.header, cellValue(column, row)])
    )
  );
}

/**
 * Export JSON, indenté et stable.
 *
 * CE QUE ÇA AJOUTE À `JSON.stringify`. Les mêmes colonnes que les autres
 * formats, donc le même contenu — et le traitement des valeurs que
 * `JSON.stringify` rend incohérentes : `undefined` disparaît d'un objet mais
 * devient `null` dans un tableau, `NaN` et `Infinity` deviennent `null` sans
 * prévenir, et une `Date` part en ISO alors qu'un objet quelconque part en
 * `{}`. Ici tout ce qui n'est pas représentable devient `null`, une fois, et
 * c'est écrit.
 *
 * `indent: 2` par défaut : un export qu'on ouvre pour le lire, pas pour
 * l'économiser. Passer `0` pour le format compact.
 */
export function toJson(rows, options = {}) {
  const { indent = 2 } = options;
  const records = applyColumns(rows, options).map(record =>
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, jsonSafe(value)])
    )
  );
  return JSON.stringify(records, null, indent);
}

function jsonSafe(value) {
  if (value === undefined) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value;
}
