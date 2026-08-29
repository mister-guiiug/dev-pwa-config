/**
 * Authentification — le PORT, agnostique du service.
 *
 * PROVENANCE : CINQ implémentations indépendantes, toutes en production.
 *
 *   - `mister-doc/src/auth/AuthContext.tsx` (+ `backend/mfa.ts`) — la
 *     référence MFA : hydratation par `getSession`, ré-hydratation par
 *     `onAuthStateChange`, défi TOTP décidé par le niveau d'assurance ;
 *   - `miss-uwh/src/auth/AuthContext.tsx` — même câblage, plus `needsMfa`
 *     et la purge des données locales à la déconnexion (appareil partagé) ;
 *   - `miss-lookhouse/src/auth/useAuth.tsx` — la version allégée, avec un
 *     drapeau `active` contre la réponse `getSession` arrivée trop tard ;
 *   - `miss-carbook/src/hooks/useAuth.ts` — trente lignes, même câblage,
 *     même drapeau (`mounted`) ;
 *   - `mister-molkky/src/cloudSync.ts` — la session anonyme, avec repli
 *     silencieux quand le projet la désactive ;
 *   - et `bac-sable/src/shared/api/local/local-backend.ts`, dont l'adaptateur
 *     LOCAL prouve que le contrat tient en quatre méthodes : lire la session,
 *     écouter ses changements, se connecter, se déconnecter.
 *
 * LA CONVERGENCE. Quatre apps recopient EXACTEMENT le même câblage :
 * `getSession()` initial → hydrater, `onAuthStateChange` → ré-hydrater,
 * désabonnement au démontage. Et trois pièges s'y règlent mal, ou à moitié :
 *
 * 1. **La course.** La réponse de `getSession` peut arriver APRÈS un premier
 *    évènement de session : l'appliquer écraserait un état plus récent par un
 *    état périmé. lookhouse et carbook la ferment par un drapeau de montage,
 *    doc et uwh ne la ferment pas. Ici, chaque hydratation porte un numéro,
 *    et seule la plus récente s'applique.
 * 2. **Le blocage hors-ligne.** Décider `needs-mfa` demande une lecture du
 *    niveau d'assurance ; si elle échoue (hors-ligne), l'app ne doit PAS se
 *    verrouiller. doc l'avait compris : l'échec retombe sur « pas de défi ».
 * 3. **La déconnexion sans évènement.** `signOut` relit la session après
 *    coup : un adaptateur qui n'émet pas d'évènement transitionne quand même.
 *
 * AUCUNE NOTION DE RÔLE MÉTIER, et c'est une décision. La promotion de
 * `react/use-action-guard.js` l'a montré : les rôles ne se généralisent pas —
 * doc a une fiche médecin (`approved`, `is_admin`), uwh dix rôles de club
 * (`tresorier`, `entraineur`…), bac-sable des rôles de démo dérivés de
 * l'e-mail. Trois vocabulaires, aucun commun. Le port s'arrête à « qui est
 * connecté » ; « qui a le droit » reste à l'app, outillé par
 * `react/use-action-guard.js` (vérifications injectées, motifs affichables).
 *
 * La SÉCURITÉ RÉELLE n'est pas ici non plus : une garde d'interface se
 * contourne dans l'inspecteur. Elle est côté serveur, dans les politiques RLS
 * — uwh et lookhouse l'écrivent en toutes lettres dans leur `AuthGate`.
 *
 * Le SERVICE reste un adaptateur (`auth/supabase`, ou le vôtre en quatre
 * méthodes), comme le transport l'est pour `realtime/` et `push/`.
 */

/** États de session, du démarrage à l'accès accordé. */
export const AUTH_STATUS = {
  /** Session en cours de lecture : ne rien décider encore. */
  loading: 'loading',
  signedOut: 'signed-out',
  signedIn: 'signed-in',
  /** Session ouverte, mais une étape MFA doit encore être franchie. */
  needsMfa: 'needs-mfa',
};

/**
 * Le client d'authentification, branché sur un ADAPTATEUR.
 *
 * Le contrat d'adaptateur — deux méthodes requises, le reste optionnel :
 *
 *   getSession()                     → Promise<session | null>
 *   onAuthStateChange((event, session) => void) → désabonnement
 *   mfaRequired?(session)            → la session doit-elle encore franchir
 *                                      une étape MFA ? (best-effort)
 *   signOut?()                       → clôt la session côté service
 *   signIn*(…)                       → les variantes de connexion (mot de
 *                                      passe, OTP, anonyme…) restent des
 *                                      méthodes de l'adaptateur : leurs effets
 *                                      reviennent par `onAuthStateChange`,
 *                                      le port n'a pas à les connaître.
 *
 * @param {{
 *   adapter: {
 *     getSession: () => Promise<unknown>,
 *     onAuthStateChange: (callback: Function) => (() => void),
 *     mfaRequired?: (session: unknown) => Promise<boolean> | boolean,
 *     signOut?: () => Promise<unknown> | void,
 *   },
 *   onEvent?: (event: string, session: unknown) => void,
 * }} options `onEvent` reçoit chaque évènement brut : c'est là que uwh purge
 *   les données locales sur `SIGNED_OUT` (appareil partagé).
 */
export function createAuthClient(options) {
  const { adapter, onEvent } = options ?? {};
  if (
    typeof adapter?.getSession !== 'function' ||
    typeof adapter?.onAuthStateChange !== 'function'
  ) {
    throw new Error(
      'auth: un adaptateur `getSession` + `onAuthStateChange` est requis ' +
        '(voir auth/supabase)'
    );
  }

  let snapshot = Object.freeze({
    status: AUTH_STATUS.loading,
    session: null,
    user: null,
  });
  const listeners = new Set();
  let unsubscribe = null;
  let started = false;
  /** Numéro d'hydratation : seule la plus récente a le droit de s'appliquer. */
  let epoch = 0;

  const emit = next => {
    // Même statut, même session : ne pas notifier. `useSyncExternalStore`
    // compare les instantanés par identité — notifier sans changement, c'est
    // re-rendre pour rien à chaque `TOKEN_REFRESHED` silencieux.
    if (next.status === snapshot.status && next.session === snapshot.session) {
      return;
    }
    snapshot = Object.freeze(next);
    for (const listener of listeners) listener(snapshot);
  };

  /** Traduit une session (ou son absence) en état, MFA comprise. */
  async function derive(session, at) {
    if (!session) {
      if (at === epoch) {
        emit({ status: AUTH_STATUS.signedOut, session: null, user: null });
      }
      return;
    }
    let needsMfa = false;
    if (adapter.mfaRequired) {
      try {
        needsMfa = Boolean(await adapter.mfaRequired(session));
      } catch {
        // Hors-ligne, ou API absente : un échec de lecture du niveau
        // d'assurance ne verrouille JAMAIS l'app (comportement de doc —
        // l'utilisateur consulte son planning en cache, il ne saisit pas un
        // code TOTP sans réseau).
        needsMfa = false;
      }
    }
    // Une réponse périmée ne s'applique pas : pendant le `await`, un
    // évènement plus récent a pu prendre la main.
    if (at !== epoch) return;
    emit({
      status: needsMfa ? AUTH_STATUS.needsMfa : AUTH_STATUS.signedIn,
      session,
      user: session.user ?? null,
    });
  }

  /** Relit la session et recalcule l'état. */
  async function refresh() {
    const at = ++epoch;
    let session = null;
    try {
      session = (await adapter.getSession()) ?? null;
    } catch {
      // Une session illisible est une session absente : les cinq apps
      // relevées lisent `data.session` sans jamais regarder l'erreur.
      session = null;
    }
    await derive(session, at);
    return snapshot;
  }

  return {
    /** L'instantané courant — stable tant que rien n'a changé. */
    getSnapshot: () => snapshot,

    /** Abonne aux changements d'état. Rend le désabonnement. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /**
     * Écoute les évènements puis lit la session. Idempotent : le deuxième
     * appel (remontage React, `StrictMode`) ne double pas l'abonnement.
     */
    async start() {
      if (started) return snapshot;
      started = true;
      // S'abonner AVANT de lire : un évènement qui tombe pendant la lecture
      // initiale est pris en compte, et son numéro d'hydratation plus récent
      // écarte la réponse `getSession` devenue périmée.
      unsubscribe = adapter.onAuthStateChange((event, session) => {
        onEvent?.(event, session ?? null);
        const at = ++epoch;
        void derive(session ?? null, at);
      });
      return refresh();
    },

    /** Se désabonne. Les évènements suivants ne changent plus l'état. */
    stop() {
      started = false;
      epoch += 1; // invalide les hydratations en vol
      unsubscribe?.();
      unsubscribe = null;
    },

    refresh,

    /**
     * Clôt la session, puis RELIT l'état au lieu de le supposer : l'évènement
     * `SIGNED_OUT` fait généralement le travail, mais un adaptateur qui
     * n'émet pas transitionne quand même.
     */
    async signOut() {
      await adapter.signOut?.();
      return refresh();
    },
  };
}
