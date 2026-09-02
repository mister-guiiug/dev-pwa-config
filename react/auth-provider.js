import {
  createContext,
  createElement as h,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { createAuthClient } from '../auth/index.js';
import { useAuth } from './use-auth.js';

/**
 * Le fournisseur de session : ce qui manquait entre le port et les écrans.
 *
 * PROMU, PAS INVENTÉ. Quatre apps portent un `AuthProvider` — miss-uwh
 * (161 l.), mister-footcoach (62), mister-doc (218), miss-lookhouse (119) —
 * et les quatre exposent la même chose : la session, un drapeau de
 * chargement, `signIn(email, password)` et `signOut()`. Le paquet avait le
 * PORT (`auth/index`, la machine à états), un INSTANTANÉ React
 * (`react/use-auth`) et une GARDE (`react/auth-gate`). Aucune des six apps
 * n'avait adopté `useAuth` : il leur manquait exactement ce fichier — un
 * contexte qui tient le client et expose les actions.
 *
 * Le contrat est celui de footcoach, le plus simple, rebâti sur le port :
 *
 *   const adapter = supabaseAuthAdapter({ client: supabase });
 *   <AuthProvider adapter={adapter}>…</AuthProvider>
 *
 *   const { status, user, signIn, signOut } = useAuthContext();
 *
 * LES ACTIONS RENDENT `{ ok, error }`, JAMAIS UNE EXCEPTION : refuser un mot
 * de passe est un évènement ordinaire (même choix que l'adaptateur). `error`
 * est le couple `{ code, message }` que `frAuthError` (`auth/errors-fr`)
 * sait traduire. La session, elle, arrive par `onAuthStateChange` — les
 * actions ne la posent pas, le port le fait.
 *
 * SANS ADAPTATEUR (mode local d'uwh et lookhouse), l'état est figé
 * `signed-out` et chaque action rend `{ ok: false, error: { code:
 * 'local-mode' } }` — le « Mode local : inscription indisponible » de
 * lookhouse, sans exception ni écran vide. Combiné à `bypass` sur
 * `AuthGate`, l'app passe ; la sécurité réelle reste la RLS.
 *
 * @param {{
 *   adapter?: object | null,
 *   onEvent?: (event: string, session: unknown) => void,
 *   children?: import('react').ReactNode,
 * }} props `adapter` est lu à la CRÉATION du client — le mémoriser, pas le
 *   recréer à chaque rendu. `onEvent` reçoit chaque évènement brut (c'est là
 *   qu'uwh purge les données locales sur `SIGNED_OUT`).
 */
export function AuthProvider(props = {}) {
  const { adapter = null, onEvent, children } = props;

  // `onEvent` peut changer d'identité à chaque rendu (une closure) sans que
  // le client doive être recréé : on lit toujours la dernière.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const client = useMemo(
    () =>
      adapter
        ? createAuthClient({
            adapter,
            onEvent: (event, session) => onEventRef.current?.(event, session),
          })
        : null,
    [adapter]
  );

  const snapshot = useAuth(client);

  const value = useMemo(() => {
    const localMode = () => ({
      ok: false,
      session: null,
      error: {
        code: 'local-mode',
        message: 'Mode local : connexion indisponible.',
      },
    });
    const unsupported = name => ({
      ok: false,
      session: null,
      error: {
        code: 'unsupported',
        message: `auth: l'adaptateur n'expose pas ${name}`,
      },
    });
    const call = async (name, args) => {
      if (!adapter) return localMode();
      if (typeof adapter[name] !== 'function') return unsupported(name);
      try {
        return await adapter[name](args);
      } catch (thrown) {
        return {
          ok: false,
          session: null,
          error: {
            code: null,
            message: thrown instanceof Error ? thrown.message : String(thrown),
          },
        };
      }
    };

    return {
      status: snapshot.status,
      session: snapshot.session,
      user: snapshot.user,
      /** Le port a fini sa première lecture : on peut décider. */
      ready: snapshot.status !== 'loading',
      signedIn: snapshot.status === 'signed-in',
      client,
      /** Connexion e-mail + mot de passe. */
      signIn: (email, password) =>
        call('signInWithPassword', { email, password }),
      /** Inscription ; `needsConfirmation` si l'e-mail doit être confirmé. */
      signUp: options => call('signUp', options),
      /** Lien magique : la session arrivera par `onAuthStateChange`. */
      signInWithOtp: options => call('signInWithOtp', options),
      signInAnonymously: () => call('signInAnonymously', undefined),
      /** Clôt la session, puis relit l'état (le port le fait). */
      async signOut() {
        if (!client) return;
        await client.signOut();
      },
      refresh: () => (client ? client.refresh() : Promise.resolve(snapshot)),
    };
  }, [adapter, client, snapshot]);

  return h(AuthContext.Provider, { value }, children);
}

const AuthContext = createContext(null);

/**
 * La session et ses actions. HORS de `AuthProvider`, on lève : un écran de
 * connexion sans fournisseur est une erreur de câblage, pas un état.
 */
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useAuthContext : aucun <AuthProvider> au-dessus de ce composant.'
    );
  }
  return ctx;
}
