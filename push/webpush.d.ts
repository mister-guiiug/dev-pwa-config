import type { PushTransport } from './index.js';

export interface HttpPushOptions {
  subscribeUrl: string;
  /** Défaut : `subscribeUrl`, en DELETE. */
  unsubscribeUrl?: string;
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
  vapidKey?: string;
  fetch?: typeof fetch;
}

/**
 * Deux appels HTTP vers votre serveur, sans SDK ni fournisseur. Les en-têtes de
 * corrélation sont joints automatiquement.
 */
export declare function httpPushTransport(
  options: HttpPushOptions
): PushTransport;
