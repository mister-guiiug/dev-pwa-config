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
