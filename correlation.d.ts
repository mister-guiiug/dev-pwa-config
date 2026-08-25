export declare const DEFAULT_CORRELATION_HEADER: string;
export declare const DEFAULT_SESSION_HEADER: string;

/** Identifiant stable pour l'onglet (sessionStorage), généré si absent. */
export declare function getSessionId(): string;

/** Repart d'un identifiant de session neuf, et le renvoie. */
export declare function resetSessionId(): string;

/** Un identifiant neuf, pour une requête ou une opération. */
export declare function newRequestId(): string;

export interface CorrelationHeaderOptions {
  requestId?: string;
  correlationHeader?: string;
  sessionHeader?: string;
}

/** En-têtes à joindre à une requête sortante. */
export declare function correlationHeaders(
  options?: CorrelationHeaderOptions
): Record<string, string>;

/**
 * Ce que les autres canaux doivent porter pour être rapprochables : à passer à
 * `setSessionContext` (erreurs, Sentry) et `setUserProperties` (télémétrie).
 */
export declare function correlationContext(): { correlationSessionId: string };

export interface CorrelatedRequestInfo {
  requestId: string;
  url: string;
  method: string;
}

export interface WithCorrelationOptions {
  correlationHeader?: string;
  sessionHeader?: string;
  onRequest?: (info: CorrelatedRequestInfo) => void;
  onResponse?: (
    info: CorrelatedRequestInfo & { status: number; durationMs: number }
  ) => void;
  onError?: (
    error: unknown,
    info: CorrelatedRequestInfo & { durationMs: number }
  ) => void;
}

/**
 * Enveloppe `fetch` : un identifiant de requête par appel, posé en en-tête.
 * Les observateurs ne filtrent rien — l'erreur d'origine est relancée telle
 * quelle, et une exception dans un observateur n'affecte pas la requête.
 */
export declare function withCorrelation(
  fetchImpl?: typeof fetch,
  options?: WithCorrelationOptions
): typeof fetch;

export interface InstallCorrelationOptions extends WithCorrelationOptions {
  /** Associe l'identifiant au profil analytique (opt-in). */
  analytics?: boolean;
  /** `false` pour ne pas produire de `fetch` enveloppé. */
  fetch?: typeof fetch | false;
}

/** Pose l'identifiant dans les erreurs, la télémétrie et les requêtes. */
export declare function installCorrelation(
  options?: InstallCorrelationOptions
): Promise<{ sessionId: string; fetch: typeof fetch | null }>;
