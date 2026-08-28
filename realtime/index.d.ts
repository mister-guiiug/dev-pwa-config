export type ChannelStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  /** Connexion perdue, reconnexion programmée. */
  | 'retrying'
  /** Abandonné : plus aucune tentative n'est prévue. */
  | 'closed';

export declare const STATUS: Record<
  'idle' | 'connecting' | 'live' | 'retrying' | 'closed',
  ChannelStatus
>;

export interface BackoffOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Part de dispersion, 0 à 1. Défaut : `0.3`. */
  jitter?: number;
}

/**
 * Délai avant la n-ième tentative : exponentiel, plafonné, DISPERSÉ — sans
 * dispersion, tous les clients coupés par la même panne reviennent à la même
 * milliseconde et refont tomber le serveur.
 */
export declare function backoffDelay(
  attempt: number,
  options?: BackoffOptions
): number;

export interface Subscription {
  close(): void;
  /** `false` = connexion morte. Sondée au réveil de l'onglet. */
  alive?(): boolean;
}

export interface TransportHandlers<M> {
  onMessage: (message: M) => void;
  onError: (error: unknown) => void;
}

/** Un transport : s'abonner, et rendre de quoi se désabonner. */
export interface RealtimeTransport<M, C = unknown> {
  connect(handlers: TransportHandlers<M>): Promise<Subscription>;
  /** Le repère porté par un message, qui bornera le prochain rattrapage. */
  cursorOf?(message: M): C | null;
  /** Ce qui a changé depuis `since`. Appelé APRÈS chaque reconnexion. */
  catchUp?(since: C | null): Promise<M[]> | M[];
}

export interface ChannelOptions<M, C = unknown>
  extends BackoffOptions,
    Partial<RealtimeTransport<M, C>> {
  connect: RealtimeTransport<M, C>['connect'];
  onMessage?: (message: M) => void;
  onStatus?: (status: ChannelStatus, info?: Record<string, unknown>) => void;
  /** Repère de départ, quand l'app en garde un d'une session précédente. */
  since?: C | null;
  /** Tentatives avant abandon. Défaut : `Infinity`. */
  maxAttempts?: number;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  env?: unknown;
}

export interface Channel<C = unknown> {
  readonly status: ChannelStatus;
  readonly cursor: C | null;
  start(): Promise<Channel<C>>;
  /** Ferme définitivement : aucune reconnexion ne sera tentée. */
  stop(): void;
}

/**
 * Un canal résilient au-dessus d'un transport : reconnexion à retrait
 * exponentiel, rattrapage du trou après coupure, sonde au réveil de l'onglet.
 */
export declare function createChannel<M, C = unknown>(
  options: ChannelOptions<M, C>
): Channel<C>;
