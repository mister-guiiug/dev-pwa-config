/** Même jour civil (fuseau local). */
export declare function isSameDay(a: Date, b: Date): boolean;

/** Minuit local du jour de `d` (nouvelle instance). */
export declare function startOfDay(d: Date): Date;

/** 23:59:59.999 local du jour de `d` (nouvelle instance). */
export declare function endOfDay(d: Date): Date;

/** `d` décalée de `days` jours (nouvelle instance ; `days` peut être négatif). */
export declare function addDays(d: Date, days: number): Date;

/** Deux intervalles fermés se recouvrent-ils ? */
export declare function rangesOverlap(
  aFrom: Date,
  aTo: Date,
  bFrom: Date,
  bTo: Date
): boolean;

/** `YYYY-MM-DD` en fuseau LOCAL (pas d'aller-retour UTC). */
export declare function toIsoDate(d: Date): string;

/** `Date` à minuit local depuis `YYYY-MM-DD`, ou `null` si invalide. */
export declare function fromIsoDate(iso: string): Date | null;
