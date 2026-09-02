import type { FC, ReactNode } from 'react';
import type { AuthClient, AuthSnapshot, AuthStatus } from '../auth/index.js';

/** Le couple que `frAuthError` (`auth/errors-fr`) sait traduire. */
export interface AuthActionError {
  code: string | null;
  message: string;
}

/** Ce qu'une action rend — jamais une exception. */
export interface AuthActionResult<S = unknown> {
  ok: boolean;
  session?: S | null;
  user?: unknown;
  /** Inscription : l'e-mail doit être confirmé, aucune session renvoyée. */
  needsConfirmation?: boolean;
  error: AuthActionError | null;
}

export interface AuthContextValue<S = unknown, U = unknown>
  extends AuthSnapshot<S, U> {
  status: AuthStatus;
  /** Le port a fini sa première lecture : on peut décider. */
  ready: boolean;
  signedIn: boolean;
  /** `null` sans adaptateur (mode local). */
  client: AuthClient<S, U> | null;
  signIn(email: string, password: string): Promise<AuthActionResult<S>>;
  signUp(options: {
    email: string;
    password: string;
    emailRedirectTo?: string;
    data?: Record<string, unknown>;
  }): Promise<AuthActionResult<S>>;
  signInWithOtp(options: {
    email: string;
    emailRedirectTo?: string;
  }): Promise<AuthActionResult<S>>;
  signInAnonymously(): Promise<AuthActionResult<S>>;
  signOut(): Promise<void>;
  refresh(): Promise<AuthSnapshot<S, U>>;
}

export interface AuthProviderProps {
  /**
   * L'adaptateur du service (`supabaseAuthAdapter`, ou le vôtre). Lu à la
   * création du client : le mémoriser, pas le recréer à chaque rendu. `null`
   * en mode local — l'état est figé `signed-out`, chaque action rend
   * `{ ok: false, error: { code: 'local-mode' } }`.
   */
  adapter?: object | null;
  /** Chaque évènement brut du service (`SIGNED_OUT` → purger le local). */
  onEvent?: (event: string, session: unknown) => void;
  children?: ReactNode;
}

/**
 * Le fournisseur de session : tient le client du port, expose l'état et les
 * actions. Promu de quatre `AuthProvider` d'apps ; le contrat de footcoach.
 */
export declare const AuthProvider: FC<AuthProviderProps>;

/** La session et ses actions. Lève hors de `AuthProvider`. */
export declare function useAuthContext<
  S = unknown,
  U = unknown,
>(): AuthContextValue<S, U>;
