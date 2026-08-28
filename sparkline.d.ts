export interface SeriesPoint {
  x: number;
  /** `null` = mesure manquante, qui n'est PAS un zéro. */
  y: number | null;
}

export interface SeriesOptions<T = unknown> {
  xOf?: (entry: T, index: number) => number;
  yOf?: (entry: T, index: number) => number | null;
}

export type Series<T = unknown> = ReadonlyArray<number | null | undefined | T>;

/** Normalise `[1,2,3]`, `[{y}]` ou `[{x,y}]` en points, trous conservés. */
export declare function toPoints<T>(
  series: Series<T>,
  options?: SeriesOptions<T>
): SeriesPoint[];

export interface ExtentOptions {
  min?: number;
  /** Forcer l'inclusion de zéro : juste pour un décompte, mensonger pour un prix. */
  baseline?: 'zero';
  max?: number;
}

/** Bornes de la série. Une série constante reçoit une amplitude de 1. */
export declare function extent(
  points: readonly SeriesPoint[],
  options?: ExtentOptions
): { min: number; max: number } | null;

export interface ProjectOptions<T> extends SeriesOptions<T>, ExtentOptions {
  width?: number;
  height?: number;
  padding?: number;
}

export interface Projection {
  /** Un segment par tronçon continu : une série trouée en donne plusieurs. */
  segments: Array<Array<{ x: number; y: number }>>;
  points: Array<{ x: number; y: number; value: number }>;
  /** Le dernier point tracé — la valeur d'aujourd'hui. */
  last: { x: number; y: number; value: number } | null;
  extent: { min: number; max: number } | null;
  width: number;
  height: number;
}

export declare function project<T>(
  series: Series<T>,
  options?: ProjectOptions<T>
): Projection;

/** Un segment en attribut `points` de `<polyline>`. */
export declare function toPolyline(
  segment: ReadonlyArray<{ x: number; y: number }>
): string;

export interface Bar {
  index: number;
  value: number | null;
  /** Part de la plus haute, entre 0 et 1. */
  ratio: number;
  missing: boolean;
}

export declare function bars<T>(
  values: Series<T>,
  options?: ProjectOptions<T>
): Bar[];

export interface DescribeOptions<T> extends SeriesOptions<T> {
  label?: string;
  unit?: string;
  format?: (value: number) => string;
}

/** L'alternative textuelle — calculée ici, sinon elle n'est jamais écrite. */
export declare function describeSeries<T>(
  series: Series<T>,
  options?: DescribeOptions<T>
): string;
