export interface ErrorEntry {
  ts: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export type ErrorForwarder = (
  error: Error,
  context: Record<string, unknown>
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
  loader?: () => Promise<any>;
}

/** Résout vers le module Sentry initialisé, ou null si dsn absent / échec. */
export declare function initSentry(
  options?: InitSentryOptions
): Promise<unknown | null>;
