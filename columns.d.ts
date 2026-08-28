export interface Column<T = unknown> {
  key: string;
  /** En-tête affiché. Défaut : `key`. */
  header?: string;
  /** Transforme la valeur avant écriture. */
  map?: (value: unknown, row: T) => unknown;
  /** Alignement, pour les formats qui en ont un (Markdown). */
  align?: 'left' | 'center' | 'right' | 'none';
}

export type ColumnSpec<T = unknown> = string | Column<T>;

export interface ColumnOptions<T = unknown> {
  /**
   * Colonnes déclarées, dans l'ordre. Sans elles, l'UNION des clés de toutes
   * les lignes — un export dont les colonnes bougent d'une version à l'autre
   * casse les tableurs de ceux qui s'en servent.
   */
  columns?: ReadonlyArray<ColumnSpec<T>>;
}

/** Normalise une déclaration de colonnes (chaînes comprises). */
export declare function resolveColumns<T>(
  rows: readonly T[] | undefined,
  columns?: ReadonlyArray<ColumnSpec<T>>
): Array<Required<Pick<Column<T>, 'key' | 'header'>> & Column<T>>;

/** La valeur d'une cellule, transformation appliquée. */
export declare function cellValue<T>(column: Column<T>, row: T): unknown;

/** Les lignes réduites aux colonnes, en objets simples. */
export declare function applyColumns<T>(
  rows: readonly T[],
  options?: ColumnOptions<T>
): Array<Record<string, unknown>>;

export interface JsonOptions<T> extends ColumnOptions<T> {
  /** Indentation. `0` pour le format compact. Défaut : `2`. */
  indent?: number;
}

/**
 * Export JSON : les mêmes colonnes que les autres formats, et un traitement
 * COHÉRENT de ce que `JSON.stringify` rend incohérent (`undefined`, `NaN`,
 * `Infinity`, les dates) — tout devient `null`, une fois, et c'est écrit.
 */
export declare function toJson<T>(
  rows: readonly T[],
  options?: JsonOptions<T>
): string;
