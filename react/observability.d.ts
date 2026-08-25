export interface ErrorEntry {
  ts: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  /** Les derniers gestes avant l'erreur, s'il y en a. */
  trail?: Breadcrumb[];
}

export type ErrorForwarder = (
  error: Error,
  context: Record<string, unknown>,
  breadcrumbs?: Breadcrumb[]
) => void;

export declare function getErrorLog(): ErrorEntry[];
export declare function clearErrorLog(): void;
export declare function setForwarder(fn: ErrorForwarder | null): void;
export declare function recordError(
  error: unknown,
  context?: Record<string, unknown>
): ErrorEntry;
export declare function installErrorReporter(options?: {
  forwarder?: ErrorForwarder;
}): void;

export interface InitSentryOptions {
  dsn?: string;
  release?: string;
  environment?: string;
  tracesSampleRate?: number;
  /**
   * Apps avec `@sentry/react` installé : `() => import('@sentry/react')`.
   * Rend l'import analysable/bundlable côté app ; sans loader, l'import
   * runtime non analysable ne fonctionne que si le module est résoluble
   * à l'exécution (cas hors bundler).
   */
  loader?: () => Promise<SentryLike>;
}

/**
 * Surface minimale attendue d'un module Sentry : ce que le paquet appelle
 * réellement, rien de plus. Typer `any` masquait le fait qu'un loader peut
 * renvoyer n'importe quoi et faire échouer `initSentry` en silence.
 */
export interface SentryLike {
  init(options: Record<string, unknown>): void;
  captureException(error: unknown, hint?: Record<string, unknown>): void;
}

/** Résout vers le module Sentry initialisé, ou null si dsn absent / échec. */
export declare function initSentry(
  options?: InitSentryOptions
): Promise<unknown | null>;

/** Une entrée du fil d'Ariane. */
export interface Breadcrumb {
  ts: string;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Fusionne des informations de session (app, version, langue, thème, réseau)
 * jointes à chaque erreur. Dix apps sur treize n'en envoyaient aucune.
 */
export declare function setSessionContext(
  context: Record<string, unknown>
): Record<string, unknown>;

/** Le contexte de session courant. */
export declare function getSessionContext(): Record<string, unknown>;

/**
 * Enregistre un geste. EN MÉMOIRE seulement (jamais `localStorage`) : un fil
 * d'Ariane porte beaucoup plus de données saisies qu'un journal d'erreurs.
 */
export declare function breadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): Breadcrumb;

/** Les derniers gestes, du plus ancien au plus récent. */
export declare function getBreadcrumbs(): Breadcrumb[];

/** Vide le fil d'Ariane. */
export declare function clearBreadcrumbs(): void;

/**
 * Fait passer `console.error`/`warn` dans le fil d'Ariane, sans remplacer la
 * console : la sortie d'origine est toujours appelée.
 *
 * @returns La restauration, idempotente.
 */
export declare function captureConsole(options?: {
  levels?: Array<'error' | 'warn' | 'log' | 'info'>;
}): () => void;

/** Ajoute des clés à masquer dans les contextes (`matricule`…). */
export declare function setRedactKeys(keys: string[]): void;

export interface InstallObservabilityOptions extends InitSentryOptions {
  /** Clés supplémentaires à masquer. */
  redactKeys?: string[];
  /** Mesure aussi les Web Vitals et les fait passer par le relais. */
  webVitals?: boolean | { loader?: () => Promise<Record<string, unknown>> };
  onMetric?: (metric: { name: string; value: number; rating: string }) => void;
  /** Contexte de session initial (app, version, environnement…). */
  context?: Record<string, unknown>;
  /**
   * Enveloppe `console.error`/`warn` vers le fil d'Ariane (défaut `true`).
   * `false` pour laisser la console intacte.
   */
  console?: boolean | { levels?: Array<'error' | 'warn' | 'log' | 'info'> };
}

/**
 * L'observabilité en un appel — erreurs, contexte, fil d'Ariane, relais Sentry
 * et performance. Tout est optionnel ; sans `dsn`, Sentry n'est jamais importé.
 */
export declare function installObservability(
  options?: InstallObservabilityOptions
): Promise<{ sentry: unknown; vitals: string[] }>;
