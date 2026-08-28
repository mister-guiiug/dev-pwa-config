import type { ColumnOptions } from './columns.js';

export interface MarkdownOptions<T = unknown> extends ColumnOptions<T> {
  align?: 'left' | 'center' | 'right' | 'none';
  /** Aligner les colonnes dans la SOURCE. Défaut : `true`. */
  pad?: boolean;
  /** Ce qui remplace un retour à la ligne dans une cellule. Défaut : `<br>`. */
  multiline?: string;
  /** Rendu quand il n'y a rien. Défaut : `_Aucune donnée._`. */
  empty?: string;
}

/**
 * Échappe une valeur pour une cellule : la barre verticale coupe la ligne en
 * colonnes, le retour à la ligne termine le tableau.
 */
export declare function escapeCell(
  value: unknown,
  options?: Pick<MarkdownOptions, 'multiline'>
): string;

/** Un tableau d'objets en tableau Markdown, colonnes alignées dans la source. */
export declare function toMarkdownTable<T>(
  rows: readonly T[],
  options?: MarkdownOptions<T>
): string;

export interface MarkdownListOptions<T = unknown> extends ColumnOptions<T> {
  /** Colonne dont la valeur sert de titre. */
  title?: string;
  /** Niveau de titre. Défaut : `3`. */
  level?: number;
  empty?: string;
}

/**
 * Une liste de définitions, pour ce qu'un tableau rend illisible : dix
 * colonnes ne se lisent sur aucun téléphone.
 */
export declare function toMarkdownList<T>(
  rows: readonly T[],
  options?: MarkdownListOptions<T>
): string;

/** Échappe ce qui a un sens en Markdown hors tableau. */
export declare function escapeInline(value: unknown): string;
