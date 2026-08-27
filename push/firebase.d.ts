import type { PushTransport } from './index.js';

export interface FirebasePushOptions {
  /** L'instance `Messaging` de l'app. */
  messaging: unknown;
  /** `getToken` importé de `firebase/messaging`. */
  getToken: (messaging: unknown, options: unknown) => Promise<string | null>;
  deleteToken?: (messaging: unknown) => Promise<boolean>;
  vapidKey: string;
  /** FCM ne conserve pas les jetons : à vous de les ranger. */
  save: (
    payload: { token: string; endpoint: string | null },
    context?: Record<string, unknown>
  ) => Promise<unknown>;
  remove: (
    payload: { token: string | null; endpoint: string | null },
    context?: Record<string, unknown>
  ) => Promise<unknown>;
  serviceWorkerRegistration?: ServiceWorkerRegistration;
}

/**
 * Transport Firebase Cloud Messaging : enregistre un JETON, pas un point de
 * terminaison. `firebase-messaging-sw.js` cohabite avec le worker PWA — ne pas
 * tenter de les fusionner.
 */
export declare function firebasePushTransport(
  options: FirebasePushOptions
): PushTransport;
