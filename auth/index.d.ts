export type AuthStatus =
  /** Session en cours de lecture : ne rien décider encore. */
  | 'loading'
  | 'signed-out'
  | 'signed-in'
  /** Session ouverte, mais une étape MFA doit encore être franchie. */
  | 'needs-mfa';

export declare const AUTH_STATUS: {
  readonly loading: 'loading';
  readonly signedOut: 'signed-out';
  readonly signedIn: 'signed-in';
  readonly needsMfa: 'needs-mfa';
};

/**
 * Le contrat d'adaptateur : deux méthodes requises, le reste optionnel. Les
 * variantes de connexion (`signInWithPassword`, `signInWithOtp`,
 * `signInAnonymously`…) restent des méthodes de l'adaptateur — leurs effets
 * reviennent par `onAuthStateChange`, le port n'a pas à les connaître.
 */
export interface AuthAdapter<S = unknown> {
  getSession(): Promise<S | null>;
  /** Rend le désabonnement. */
  onAuthStateChange(
    callback: (event: string, session: S | null) => void
  ): () => void;
  /**
   * La session doit-elle encore franchir une étape MFA ? Best-effort : un
   * échec (hors-ligne) est traité comme « pas de défi », jamais comme un
   * verrou.
   */
  mfaRequired?(session: S): Promise<boolean> | boolean;
  signOut?(): Promise<unknown> | void;
}

export interface AuthSnapshot<S = unknown, U = unknown> {
  status: AuthStatus;
  session: S | null;
  /** `session.user` si la session en porte un, sinon `null`. */
  user: U | null;
}

export interface CreateAuthClientOptions<S = unknown> {
  adapter: AuthAdapter<S>;
  /**
   * Chaque évènement brut, avant la transition d'état : c'est là que uwh
   * purge les données locales sur `SIGNED_OUT` (appareil partagé).
   */
  onEvent?: (event: string, session: S | null) => void;
}

export interface AuthClient<S = unknown, U = unknown> {
  /** L'instantané courant — stable tant que rien n'a changé. */
  getSnapshot(): AuthSnapshot<S, U>;
  /** Abonne aux changements d'état. Rend le désabonnement. */
  subscribe(listener: (snapshot: AuthSnapshot<S, U>) => void): () => void;
  /** Écoute les évènements puis lit la session. Idempotent. */
  start(): Promise<AuthSnapshot<S, U>>;
  /** Se désabonne. Les évènements suivants ne changent plus l'état. */
  stop(): void;
  /** Relit la session et recalcule l'état. */
  refresh(): Promise<AuthSnapshot<S, U>>;
  /** Clôt la session côté service, puis relit l'état. */
  signOut(): Promise<AuthSnapshot<S, U>>;
}

/**
 * Machine d'état de session (`loading` → `signed-out` | `signed-in` |
 * `needs-mfa`) au-dessus d'un adaptateur. Aucune notion de rôle métier : les
 * rôles ne se généralisent pas — voir `react/use-action-guard`.
 */
export declare function createAuthClient<S = unknown, U = unknown>(
  options: CreateAuthClientOptions<S>
): AuthClient<S, U>;
