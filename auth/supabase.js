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
 *   - `mfaRequired` : le niveau d'assurance, calculé SUR PLACE depuis la
 *     session (`assuranceLevelFromSession`). Il passait par
 *     `getAuthenticatorAssuranceLevel()`, sous un commentaire qui affirmait
 *     « aucun appel réseau » — c'était faux, cette méthode commence par
 *     `getSession()`.
 *
 * LES ERREURS SONT RENDUES, PAS LEVÉES : `{ ok, error }` avec le code stable
 * ET le message d'origine — c'est ce couple que `frAuthError`
 * (`auth/errors-fr`) sait traduire. Refuser un mot de passe est un évènement
 * ordinaire, pas une exception (même choix que `push/`, où refuser les
 * notifications n'est pas une panne).
 */
import { assuranceLevelFromSession, mfaChallengeNeeded } from './mfa.js';
import {
  navigateurHorsLigne,
  storedSupabaseSession,
} from './stored-session.js';

/**
 * COMBIEN DE TEMPS ON ACCEPTE D'ATTENDRE `auth.getSession()`.
 *
 * Ce n'est pas une lecture : jeton d'accès périmé, elle part le RENOUVELER,
 * avec des reprises à intervalle croissant bornées par la fenêtre de
 * rafraîchissement de Supabase — une trentaine de secondes. `navigator.onLine`
 * ne suffit pas à s'en prémunir : il est vrai derrière un portail captif comme
 * sur un Wi-Fi qui ne route rien.
 *
 * Passé ce délai, on rend la session écrite sur l'appareil. Ce n'est pas un
 * pis-aller : c'est la même session, simplement pas encore renouvelée, et
 * `onAuthStateChange` corrigera — `TOKEN_REFRESHED` au retour du réseau,
 * `SIGNED_OUT` si le jeton de rafraîchissement a été révoqué.
 */
const ATTENTE_SESSION_MS = 5_000;

/** Marqueur d'attente dépassée, distinct de `null` (« pas de session »). */
const TROP_LONG = Symbol('attente dépassée');

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
  const { client, sessionTimeoutMs = ATTENTE_SESSION_MS } = options ?? {};
  if (!client?.auth) {
    throw new Error('auth/supabase: un client Supabase est requis');
  }
  /** @type {any} L'API `auth` v2 du client injecté. */
  const auth = client.auth;

  /**
   * La session, SANS JAMAIS DÉPENDRE DU RÉSEAU POUR L'OBTENIR.
   *
   * Trois chemins, du plus sûr au plus lent :
   *   1. le navigateur se dit hors ligne → on lit le stockage, point ;
   *   2. sinon on demande à Supabase, mais l'attente est BORNÉE — un réseau
   *      présent-mais-mort coûtait une demi-minute de sablier ;
   *   3. l'appel lève → le stockage, comme au premier chemin.
   *
   * Une session illisible reste une session absente : les cinq apps relevées
   * lisent `data.session` sans regarder l'erreur.
   */
  const lireSession = async () => {
    if (navigateurHorsLigne()) return storedSupabaseSession();
    let minuteur;
    try {
      const issue = await Promise.race([
        auth.getSession().then(r => r?.data?.session ?? null),
        new Promise(resoudre => {
          minuteur = setTimeout(() => resoudre(TROP_LONG), sessionTimeoutMs);
        }),
      ]);
      return issue === TROP_LONG ? storedSupabaseSession() : issue;
    } catch {
      return storedSupabaseSession();
    } finally {
      clearTimeout(minuteur);
    }
  };

  return {
    getSession: lireSession,

    /** Câble `onAuthStateChange` et rend le désabonnement. */
    onAuthStateChange(callback) {
      const { data } = auth.onAuthStateChange((event, session) =>
        callback(event, session ?? null)
      );
      return () => data?.subscription?.unsubscribe?.();
    },

    /**
     * Le défi TOTP est-il encore à franchir ? Lecture VRAIMENT locale : le
     * claim `aal` du jeton et les facteurs de la session, sans appel réseau.
     *
     * Ce commentaire affirmait déjà « aucun appel réseau » alors que le code
     * appelait `getAuthenticatorAssuranceLevel()` — qui commence par
     * `getSession()`. C'est cette phrase, plus que le code, qui a laissé
     * `mister-doc` bloquer une demi-minute au démarrage hors ligne.
     *
     * LE DÉFI N'EST PAS CONTOURNÉ POUR AUTANT : une session en `aal1` avec un
     * facteur vérifié rend toujours `true`, sans réseau comme avec.
     */
    async mfaRequired(session) {
      // LA SESSION QUE LE PORT TIENT DÉJÀ. Son contrat la passe en argument
      // (`mfaRequired?(session)`) : la redemander serait un second appel pour
      // une donnée en main — et, hors ligne, une seconde attente.
      return mfaChallengeNeeded(
        assuranceLevelFromSession(session ?? (await lireSession()))
      );
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
