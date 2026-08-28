import type { RealtimeTransport } from './index.js';

export interface LocalRealtimeOptions {
  /** Nom du canal — partagé par les onglets qui doivent s'entendre. */
  name: string;
  env?: unknown;
}

export interface LocalTransport<M> extends RealtimeTransport<M> {
  /** Diffuse aux AUTRES onglets. */
  post(payload: M): void;
}

/**
 * Les autres onglets, sans serveur : `BroadcastChannel`, avec repli sur
 * l'évènement `storage`. Pour les cinq apps local-first — et comme transport
 * réel dans les tests.
 */
export declare function localRealtimeTransport<M = unknown>(
  options: LocalRealtimeOptions
): LocalTransport<M>;
