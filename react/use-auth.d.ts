import type { AuthClient, AuthSnapshot } from '../auth/index.js';

/**
 * L'état de session dans React, branché sur le port `auth/index`.
 *
 * `client` est rendu par `createAuthClient` — créé une fois, pas à chaque
 * rendu. `null` fige l'état à `signed-out` (mode local : combiné à `bypass`
 * sur `AuthGate`, l'app passe et la sécurité réelle reste la RLS).
 */
export declare function useAuth<S = unknown, U = unknown>(
  client: AuthClient<S, U> | null | undefined
): AuthSnapshot<S, U>;
