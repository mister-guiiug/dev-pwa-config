import type { Store } from './storage.js';
import type { BackoffOptions } from './realtime/index.js';

export interface SyncQueueEntry<P = unknown> {
  id: string;
  payload: P;
  /** Clé d'entité (`keyOf`), ou `null` — deux entrées de même clé fusionnent. */
  key: string | null;
  /** Échecs subis par cette entrée, tous drains confondus. */
  attempts: number;
  /** ISO 8601 — l'instant de l'enfilage. */
  enqueuedAt: string;
  /** Le dernier échec, pour l'écran de réglages. */
  lastError?: string;
}

export interface DrainResult {
  /** Entrées envoyées et retirées. */
  done: number;
  /** Entrées gardées pour un rejeu (échec transitoire) — 0 ou 1 par drain. */
  retried: number;
  /** Entrées parties en lettre morte pendant ce drain. */
  dead: number;
}

export interface SyncQueueOptions<P = unknown> {
  /**
   * La persistance ET la source de vérité — `createStore(prefix)` de
   * ./storage.js : c'est le préfixe de l'app qui évite que deux files servies
   * depuis le même domaine se marchent dessus.
   */
  store: Store;
  /** Pousse une écriture vers le transport (Supabase, Firebase, HTTP…). */
  process: (payload: P, entry: SyncQueueEntry<P>) => Promise<unknown>;
  /**
   * Clé d'entité d'une écriture ; `null` = jamais fusionnée. Les entrées en
   * attente sur la même clé sont remplacées par la plus récente (upsert
   * idempotent).
   */
  keyOf?: (payload: P) => string | null;
  /**
   * Un échec vaut-il rejeu ? Défaut : `defaultShouldRetry` (./react/net.js) —
   * un 4xx hors 408/429 ne réussira pas mieux en réessayant.
   */
  shouldRetry?: (error: unknown, attempts: number) => boolean;
  /** Échecs cumulés avant lettre morte, même « transitoires » (défaut 5). */
  maxAttempts?: number;
  /** Taille maximale de la file (défaut 200). Au-delà, `enqueue` rend `null`. */
  maxQueueSize?: number;
  /** Clés dans le `store` (défauts : `'queue'` et `'dead'`). */
  queueKey?: string;
  deadKey?: string;
  /** Réglage du retrait — transmis à `backoffDelay` (./realtime). */
  backoff?: BackoffOptions;
  /** Défaut : `navigator.onLine !== false`. Injectable (tests). */
  isOnline?: () => boolean;
  /** Appelé quand une entrée part en lettre morte. */
  onDead?: (entry: SyncQueueEntry<P>, error: unknown) => void;
  /**
   * Appelé après chaque évolution — de quoi alimenter un indicateur
   * d'interface (`react/sync-status-badge`) sans que la file connaisse React.
   */
  onChange?: (status: { pending: number; dead: number }) => void;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  /** Porte `addEventListener('online')` pour `start()`. Défaut : `globalThis`. */
  env?: unknown;
}

export interface SyncQueue<P = unknown> {
  /** L'entrée créée, ou `null` quand le plafond est atteint. */
  enqueue(payload: P): SyncQueueEntry<P> | null;
  /** Les entrées en attente, dans l'ordre d'envoi. */
  list(): SyncQueueEntry<P>[];
  pending(): number;
  /** Les écritures refusées durablement — à montrer, pas à cacher. */
  deadLetters(): SyncQueueEntry<P>[];
  /** Retire une entrée en attente (abandonnée par l'app). */
  remove(id: string): void;
  /** Draine en série, ordre préservé. Un drain déjà en cours : ne fait rien. */
  flush(): Promise<DrainResult>;
  /**
   * Relance les lettres mortes en tête de file, compteurs remis à zéro ; une
   * entité déjà modifiée depuis garde sa version la plus fraîche. Rend le
   * nombre d'entrées relancées.
   */
  requeueDead(): number;
  /** Abandonne définitivement les lettres mortes. */
  clearDead(): void;
  /** Vide tout — file ET lettres mortes — et annule le rejeu programmé. */
  clear(): void;
  /** Draine tout de suite, puis rejoue à chaque retour en ligne. */
  start(): Promise<DrainResult>;
  /** Cesse d'écouter le réseau et annule le rejeu programmé. La file reste. */
  stop(): void;
}

/**
 * File d'écritures hors-ligne : persistante (Store injecté), drain sérialisé,
 * rejeu automatique en retrait exponentiel dispersé (`backoffDelay` de
 * ./realtime), lettres mortes rejouables, plafond. Le chemin MONTANT —
 * `realtime/` est le descendant ; `react/use-offline-queue` en est la variante
 * React.
 */
export declare function createSyncQueue<P = unknown>(
  options: SyncQueueOptions<P>
): SyncQueue<P>;
