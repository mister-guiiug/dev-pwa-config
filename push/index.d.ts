export declare const PERMISSION: {
  readonly granted: 'granted';
  readonly denied: 'denied';
  readonly prompt: 'default';
  readonly unsupported: 'unsupported';
};

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/** Clé VAPID base64url → octets, pour `applicationServerKey`. */
export declare function urlBase64ToUint8Array(base64Url: string): Uint8Array;

/** Octets → base64url, pour sérialiser une clé d'abonnement. */
export declare function uint8ArrayToUrlBase64(
  bytes: ArrayBuffer | Uint8Array
): string;

export type UnsupportedReason =
  | 'no-service-worker'
  | 'no-push-manager'
  /** iOS/iPadOS : le push exige que l'app soit ajoutée à l'écran d'accueil. */
  | 'requires-installed-app'
  | 'no-notification-api';

export interface PushSupport {
  supported: boolean;
  /** Pourquoi ça ne marche pas — de quoi écrire un message utile. */
  reason: UnsupportedReason | null;
  /** L'app tourne-t-elle en mode autonome (installée) ? */
  standalone: boolean;
}

/** Ce que ce navigateur sait faire, et sinon pourquoi. */
export declare function pushSupport(env?: unknown): PushSupport;

/** L'état de la permission, sans jamais la demander. */
export declare function permissionState(env?: unknown): PermissionState;

/** Demande la permission — sur un geste utilisateur. Ne redemande pas. */
export declare function requestPermission(
  env?: unknown
): Promise<PermissionState>;

export interface SerializedSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

/** Sérialise un `PushSubscription` au format attendu par les serveurs push. */
export declare function serializeSubscription(
  subscription: PushSubscription | null | undefined
): SerializedSubscription | null;

/**
 * Le contrat d'un transport. Trois méthodes, dont une facultative — une app
 * avec son propre backend en écrit un sans rien importer.
 */
export interface PushTransport {
  save(
    subscription: SerializedSubscription | null,
    context?: Record<string, unknown>
  ): Promise<unknown>;
  remove(
    subscription: SerializedSubscription | null,
    context?: Record<string, unknown>
  ): Promise<unknown>;
  /** La clé VAPID publique, quand le transport la connaît. */
  key?(): string | undefined | Promise<string | undefined>;
}

export interface PushClientOptions {
  transport: PushTransport;
  /** Prioritaire sur `transport.key()`. */
  vapidKey?: string;
  /** N'enregistrer un worker que si l'app n'en a pas déjà un. */
  serviceWorkerUrl?: string;
  scope?: string;
  env?: unknown;
}

export interface SubscribeResult {
  ok: boolean;
  /** `permission-denied`, `requires-installed-app`, `missing-vapid-key`… */
  reason: string | null;
  subscription: PushSubscription | null;
}

export interface PushClient {
  support(): PushSupport;
  permission(): PermissionState;
  requestPermission(): Promise<PermissionState>;
  /** L'abonnement en cours, ou `null`. N'en crée aucun. */
  current(): Promise<PushSubscription | null>;
  /** S'abonne et enregistre côté serveur. Ne lève pas : un refus n'est pas une panne. */
  subscribe(context?: Record<string, unknown>): Promise<SubscribeResult>;
  /** Se désabonne, côté serveur D'ABORD. */
  unsubscribe(
    context?: Record<string, unknown>
  ): Promise<{ ok: boolean; reason: string | null }>;
}

export declare function createPushClient(
  options: PushClientOptions
): PushClient;
