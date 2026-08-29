/**
 * Adaptateur Supabase Auth (API v2).
 *
 * Peer OPTIONNEL : `@supabase/supabase-js`. Le client est INJECTÉ — l'app en
 * a déjà un, et en créer un second dupliquerait la session et son
 * rafraîchissement de jetons.
 *
 * PROVENANCE, méthode par méthode :
 *
 *   - `getSession` / `onAuthStateChange` : le câblage commun aux quatre
 *     contexts relevés (doc, uwh, lookhouse, carbook) ;
 *   - `signInWithPassword` / `signUp` : doc et carbook (dont
 *     `needsConfirmation` : confirmation e-mail activée → pas de session
 *     renvoyée à l'inscription) ;
 *   - `signInWithOtp` : le lien magique de `miss-carbook/PseudoGate.tsx`,
 *     avec `emailRedirectTo` ;
 *   - `signInAnonymously` : `mister-molkky/cloudSync.ts`, y compris le REPLI
 *     silencieux — connexions anonymes désactivées au niveau du projet →
 *     l'appel échoue OU lève, et ni l'un ni l'autre ne doit remonter comme
 *     une panne ;
 *   - `mfaRequired` : la lecture locale du niveau d'assurance de
 *     `mister-doc/backend/mfa.ts` (aucun appel réseau).
 *
 * LES ERREURS SONT RENDUES, PAS LEVÉES : `{ ok, error }` avec le code stable
 * ET le message d'origine — c'est ce couple que `frAuthError`
 * (`auth/errors-fr`) sait traduire. Refuser un mot de passe est un évènement
 * ordinaire, pas une exception (même choix que `push/`, où refuser les
 * notifications n'est pas une panne).
 */
import { mfaChallengeNeeded } from './mfa.js';

/** `{ code, message }` — le couple que `frAuthError` sait traduire. */
const toError = error =>
  error
    ? {
        code: typeof error.code === 'string' ? error.code : null,
        message:
          typeof error.message === 'string' ? error.message : String(error),
      }
    : null;

/**
 * @param {{ client: { auth: object } }} options Le client Supabase de l'app.
 */
export function supabaseAuthAdapter(options) {
  const { client } = options ?? {};
  if (!client?.auth) {
    throw new Error('auth/supabase: un client Supabase est requis');
  }
  /** @type {any} L'API `auth` v2 du client injecté. */
  const auth = client.auth;

  return {
    /**
     * La session courante, ou `null`. Une session illisible est une session
     * absente : les cinq apps relevées lisent `data.session` sans regarder
     * l'erreur.
     */
    async getSession() {
      try {
        const { data } = await auth.getSession();
        return data?.session ?? null;
      } catch {
        return null;
      }
    },

    /** Câble `onAuthStateChange` et rend le désabonnement. */
    onAuthStateChange(callback) {
      const { data } = auth.onAuthStateChange((event, session) =>
        callback(event, session ?? null)
      );
      return () => data?.subscription?.unsubscribe?.();
    },

    /**
     * Le défi TOTP est-il encore à franchir ? Lecture **locale** de la
     * session (claim `aal` + facteurs) : aucun appel réseau. L'échec remonte
     * — c'est le port qui le traduit en « pas de défi » (on ne verrouille
     * jamais l'app hors-ligne).
     */
    async mfaRequired() {
      if (!auth.mfa?.getAuthenticatorAssuranceLevel) return false;
      const { data, error } = await auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw new Error(error.message);
      return mfaChallengeNeeded({
        current: data?.currentLevel ?? null,
        next: data?.nextLevel ?? null,
      });
    },

    /** Connexion e-mail + mot de passe. */
    async signInWithPassword({ email, password }) {
      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      });
      return {
        ok: !error,
        session: data?.session ?? null,
        error: toError(error),
      };
    },

    /**
     * Lien magique / OTP par e-mail. Rien à attendre en retour : la session
     * arrivera par `onAuthStateChange` quand le lien sera ouvert.
     */
    async signInWithOtp({ email, emailRedirectTo }) {
      const { error } = await auth.signInWithOtp({
        email,
        ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
      });
      return { ok: !error, error: toError(error) };
    },

    /**
     * Inscription. `needsConfirmation` (carbook) : la confirmation e-mail est
     * activée sur le projet → aucune session renvoyée, l'utilisateur doit
     * cliquer le lien reçu. `data` alimente `user_metadata` (le `full_name`
     * de doc).
     */
    async signUp({ email, password, emailRedirectTo, data: metadata }) {
      const options = {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        ...(metadata ? { data: metadata } : {}),
      };
      const { data, error } = await auth.signUp({
        email,
        password,
        ...(Object.keys(options).length ? { options } : {}),
      });
      return {
        ok: !error,
        session: data?.session ?? null,
        needsConfirmation: !error && !data?.session,
        error: toError(error),
      };
    },

    /**
     * Session anonyme — un `auth.uid()` stable sans créer de compte. REPLI DE
     * MOLKKY : connexions anonymes désactivées au niveau du projet → `ok:
     * false`, jamais une exception. L'appelant décide si l'app fonctionne
     * sans (molkky : oui, la synchro est un bonus).
     */
    async signInAnonymously() {
      try {
        const { data, error } = await auth.signInAnonymously();
        if (error || !data?.user) {
          return {
            ok: false,
            session: null,
            user: null,
            error: toError(error) ?? {
              code: null,
              message: 'auth/supabase: connexion anonyme sans utilisateur',
            },
          };
        }
        return {
          ok: true,
          session: data.session ?? null,
          user: data.user,
          error: null,
        };
      } catch (thrown) {
        return { ok: false, session: null, user: null, error: toError(thrown) };
      }
    },

    /** Clôt la session. L'évènement `SIGNED_OUT` suivra. */
    async signOut() {
      const { error } = await auth.signOut();
      return { ok: !error, error: toError(error) };
    },
  };
}
