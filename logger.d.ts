export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Seuil global : les lignes en dessous ne sont ni tracées ni affichées. */
export declare function setLogLevel(level: LogLevel): LogLevel;
export declare function getLogLevel(): LogLevel;

export interface LoggerOptions {
  /** Affiche aussi la ligne dans la console (défaut : `true`). */
  console?: boolean;
  /** Identifiant joint à chaque ligne (défaut : l'identifiant de session). */
  correlation?: () => string;
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): unknown;
  info(message: string, data?: Record<string, unknown>): unknown;
  warn(message: string, data?: Record<string, unknown>): unknown;
  error(message: string, data?: Record<string, unknown>): unknown;
}

/**
 * Un journal nommé. Chaque ligne part dans le MÊME fil d'Ariane que
 * `breadcrumb` — pas de second tampon, pas de second transport — estampillée
 * du nom et de l'identifiant de corrélation.
 */
export declare function createLogger(
  namespace: string,
  options?: LoggerOptions
): Logger;
