export interface CsvDialect {
  delimiter: string;
  newline: string;
  /** Écrire le BOM UTF-8 : sans lui, Excel lit l'UTF-8 comme du Latin-1. */
  bom: boolean;
  /** Écrire les décimales avec une virgule (ignoré si le séparateur en est une). */
  decimalComma: boolean;
}

export type CsvDialectName = 'rfc4180' | 'excel-fr' | 'unix';

/** `rfc4180` pour une machine, `excel-fr` pour un humain sous Excel français. */
export declare const DIALECTS: Record<CsvDialectName, CsvDialect>;

export declare const UTF8_BOM: string;

export interface CsvOptions extends Partial<CsvDialect> {
  dialect?: CsvDialectName;
}

/** Un champ échappé selon RFC 4180 (le guillemet se double, il ne s'échappe pas). */
export declare function escapeField(
  value: unknown,
  options?: CsvOptions
): string;

export interface CsvColumn<T> {
  key: string;
  /** En-tête affiché. Défaut : `key`. */
  header?: string;
  /** Transforme la valeur avant échappement. */
  map?: (value: unknown, row: T) => unknown;
}

export interface ToCsvOptions<T> extends CsvOptions {
  /**
   * Colonnes déclarées, dans l'ordre. Sans elles, l'ordre vient des clés des
   * objets — un détail d'implémentation qui casse les tableurs des
   * utilisateurs quand il bouge.
   */
  columns?: Array<string | CsvColumn<T>>;
  /** Écrire la ligne d'en-têtes. Défaut : `true`. */
  header?: boolean;
}

/** Sérialise un tableau d'objets. */
export declare function toCsv<T extends object>(
  rows: readonly T[],
  options?: ToCsvOptions<T>
): string;

/** Le séparateur le plus probable, compté hors guillemets. */
export declare function detectDelimiter(
  text: string,
  candidates?: readonly string[]
): string;

/** Lit un CSV en lignes brutes. Le séparateur est détecté s'il n'est pas donné. */
export declare function parseCsv(
  text: string,
  options?: { delimiter?: string }
): string[][];

/** Lit un CSV en objets, la première ligne servant d'en-têtes. */
export declare function fromCsv(
  text: string,
  options?: { delimiter?: string }
): Array<Record<string, string>>;
