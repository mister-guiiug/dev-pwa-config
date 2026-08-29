import { useEffect, useSyncExternalStore } from 'react';

/**
 * L'état de session dans React, branché sur le PORT (`auth/index.js`).
 *
 * PROVENANCE. Quatre apps portent chacune leur pont React vers Supabase Auth
 * — `AuthProvider` de mister-doc et miss-uwh, `useAuth` de miss-lookhouse et
 * miss-carbook — et les quatre recopient le même câblage `useState` +
 * `useEffect` + drapeau de montage. Ici, la machine vit dans le port et le
 * hook n'est QUE le raccord : `useSyncExternalStore` lit l'instantané, la
 * course de la réponse périmée est déjà fermée côté port, et deux composants
 * qui consomment le même client voient le même état sans Provider.
 *
 * SANS CLIENT (`null`), l'état est figé `signed-out` : c'est le mode local de
 * lookhouse et uwh — prêt immédiatement, pas de session — combiné à `bypass`
 * sur `AuthGate`, l'app passe et la sécurité réelle reste la RLS.
 */

/** @type {import('../auth/index.js').AuthSnapshot} */
const NO_CLIENT_SNAPSHOT = Object.freeze({
  status: 'signed-out',
  session: null,
  user: null,
});
const subscribeToNothing = () => () => {};
const readNoClient = () => NO_CLIENT_SNAPSHOT;

/**
 * @param {import('../auth/index.js').AuthClient | null | undefined} client
 *   Client rendu par `createAuthClient` — créé UNE fois au niveau module ou
 *   mémorisé, pas à chaque rendu. `null` en mode local.
 * @returns {import('../auth/index.js').AuthSnapshot} `{ status, session,
 *   user }` — `status` vaut `'loading'`, `'signed-out'`, `'signed-in'` ou
 *   `'needs-mfa'`.
 */
export function useAuth(client) {
  const snapshot = useSyncExternalStore(
    client ? client.subscribe : subscribeToNothing,
    client ? client.getSnapshot : readNoClient,
    client ? client.getSnapshot : readNoClient
  );

  // Démarrer est idempotent : le remontage (StrictMode) ne double rien, et
  // le client survit au composant — d'autres écrans le lisent peut-être.
  // On ne l'arrête donc PAS au démontage.
  useEffect(() => {
    void client?.start();
  }, [client]);

  return snapshot;
}
