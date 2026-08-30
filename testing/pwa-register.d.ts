/** Les options que vite-plugin-pwa passe à `registerSW`. */
export interface PwaRegisterOptions {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration?: ServiceWorkerRegistration) => void;
  onRegisteredSW?: (
    swUrl: string,
    registration?: ServiceWorkerRegistration
  ) => void;
  onRegisterError?: (error: unknown) => void;
}

/**
 * Le `registerSW` du module virtuel, avec un corps.
 *
 * `let` : `swStub.reset()` le remplace par une fonction NEUVE, faute de quoi
 * `useUpdatePrompt` — qui mémorise sa connexion par identité de fonction —
 * garderait `needRefresh` d'un test au suivant.
 */
export declare let registerSW: (
  options?: PwaRegisterOptions
) => (reloadPage?: boolean) => Promise<void>;

export interface PwaRegisterStub {
  /** Nombre d'appels à `registerSW` depuis le dernier `reset()`. */
  readonly calls: number;
  /** Vrai dès que quelqu'un a injecté `registerSW`. */
  readonly registered: boolean;
  /** Les options du dernier enregistrement. */
  readonly options: PwaRegisterOptions | undefined;
  /** Les `reloadPage` passés à l'`updateSW` rendu par `registerSW`. */
  readonly reloads: (boolean | undefined)[];
  /** Une nouvelle version attend. Lève si `onNeedRefresh` n'a pas été posé. */
  needRefresh(): void;
  /** La coquille est en cache. Lève si `onOfflineReady` n'a pas été posé. */
  offlineReady(): void;
  /** L'enregistrement échoue. Lève si `onRegisterError` n'a pas été posé. */
  registerError(error?: unknown): void;
  /** Le worker est enregistré. Lève si `onRegisteredSW` n'a pas été posé. */
  registeredSW(swUrl?: string, registration?: ServiceWorkerRegistration): void;
  /** État vierge et identité neuve pour `registerSW` — à mettre en `beforeEach`. */
  reset(): void;
}

/** La télécommande du service worker, côté test. */
export declare const swStub: PwaRegisterStub;
