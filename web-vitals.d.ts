export type WebVitalName = 'TTFB' | 'FCP' | 'LCP' | 'CLS' | 'INP';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor' | 'unknown';

export interface WebVitalReport {
  name: string;
  value: number;
  rating: string;
  id: string;
}

/** Métriques relevées, dans l'ordre où elles deviennent disponibles. */
export declare const WEB_VITALS: WebVitalName[];

/** Seuils « bon / à améliorer » publiés par web.dev. */
export declare const THRESHOLDS: Record<WebVitalName, [number, number]>;

/** Verdict d'une valeur pour une métrique donnée. */
export declare function rate(name: string, value: number): WebVitalRating;

export interface InitWebVitalsOptions {
  onMetric?: (metric: WebVitalReport) => void;
  /** Appelé par métrique en échec ; `'import'` si la bibliothèque manque. */
  onError?: (name: string, error: unknown) => void;
  /** Point d'injection de `web-vitals` (tests, import statique imposé). */
  loader?: () => Promise<Record<string, unknown>>;
}

/**
 * Enregistre les cinq métriques, chacune indépendamment.
 * @returns celles réellement enregistrées — une liste courte est un signal.
 */
export declare function initWebVitals(
  options?: InitWebVitalsOptions
): Promise<string[]>;
