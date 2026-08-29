/**
 * MFA TOTP (double authentification) par-dessus un client Supabase INJECTÉ.
 *
 * PROVENANCE : `mister-doc/src/backend/mfa.ts`, éprouvé en production — la
 * référence MFA de la famille — recoupé par `miss-uwh/src/auth/AuthContext.tsx`
 * (enrôlement depuis `MfaCard`, défi depuis `MfaChallenge`). Facteur **TOTP**
 * uniquement (application type Google Authenticator / Authy) : disponible sur
 * le plan gratuit, sans SMS. Les facteurs sont stockés et vérifiés côté
 * Supabase (`auth.mfa_factors`) — aucune table applicative.
 *
 * La 2FA est **opt-in** : seul un compte ayant un facteur TOTP *vérifié* est
 * soumis au défi au login (`mfaChallengeNeeded`), ce qui exclut tout
 * verrouillage massif.
 *
 * L'ENRÔLEMENT REND CE QUE SUPABASE DONNE, tel quel : `qrCode` est une data
 * URL SVG (`data:image/svg+xml;…`) à afficher dans un `<img>` — la CSP doit
 * autoriser `img-src data:` — `secret` la saisie manuelle de secours, `uri`
 * le lien `otpauth://`. C'est exactement ce qu'affichent la `MfaCard` d'uwh
 * et le `TwoFactorEnrollForm` de doc.
 *
 * LES ERREURS GARDENT LE MESSAGE SUPABASE D'ORIGINE. doc traduisait à la
 * source (`frAuthError`) ; ici la traduction est une décision d'AFFICHAGE, et
 * la carte est livrée à côté : `frAuthError(e)` de `auth/errors-fr` reconnaît
 * ces messages par sous-chaîne.
 *
 * LIMITE ASSUMÉE : PAS de codes de récupération. Ceux de doc
 * (`generate_mfa_recovery_codes`, `use_mfa_recovery_code`) sont des RPC
 * **applicatives** — table et fonctions SQL de l'app — PAS une API Supabase
 * Auth. Les généraliser ici reviendrait à imposer un schéma ; une app qui en
 * veut copie le SQL de doc et les câble chez elle.
 */

/**
 * Vrai si la session doit encore franchir l'étape TOTP : facteur vérifié
 * (`next` atteint `aal2`) mais session encore au mot de passe seul
 * (`current` = `aal1`).
 *
 * @param {{ current: string | null, next: string | null }} level
 */
export function mfaChallengeNeeded(level) {
  return level?.current === 'aal1' && level?.next === 'aal2';
}

/**
 * L'API TOTP, liée au client Supabase de l'app — jamais un second.
 *
 * @param {{ client: { auth: { mfa: object } } }} options
 */
export function createTotpMfa(options) {
  const { client } = options ?? {};
  if (!client?.auth) {
    throw new Error('auth/mfa: un client Supabase est requis');
  }
  /** @returns {any} L'API `auth.mfa` du client, vérifiée à l'appel. */
  const api = () => {
    const mfa = client.auth.mfa;
    if (!mfa) {
      throw new Error('auth/mfa: ce client Supabase n’expose pas `auth.mfa`');
    }
    return mfa;
  };

  /**
   * Niveau d'assurance courant / atteignable. Lecture **locale** de la
   * session (claim `aal` du JWT + facteurs) : aucun appel réseau, donc sûr
   * hors-ligne — l'appelant qui échoue retombe sur « pas de défi ».
   */
  async function getAssuranceLevel() {
    const { data, error } = await api().getAuthenticatorAssuranceLevel();
    if (error) throw new Error(error.message);
    return { current: data.currentLevel, next: data.nextLevel };
  }

  /** Les facteurs du compte (appel réseau). */
  async function listFactors() {
    const { data, error } = await api().listFactors();
    if (error) throw new Error(error.message);
    return { all: data?.all ?? [], totp: data?.totp ?? [] };
  }

  /**
   * Identifiant du premier facteur TOTP **vérifié**, ou `null`. Le filtre sur
   * `status` est explicite (uwh) : `data.totp` ne liste que les vérifiés en
   * v2, mais un enrôlement abandonné ne doit jamais passer pour un facteur
   * actif.
   */
  async function verifiedTotpFactorId() {
    const { totp } = await listFactors();
    return totp.find(f => f.status === 'verified')?.id ?? null;
  }

  return {
    getAssuranceLevel,
    listFactors,
    verifiedTotpFactorId,

    /** Vrai si le défi TOTP est encore à franchir (lecture locale). */
    async challengeNeeded() {
      return mfaChallengeNeeded(await getAssuranceLevel());
    },

    /**
     * Démarre un enrôlement : rend le QR, le secret et l'URI à confirmer.
     * Les facteurs TOTP **non vérifiés** d'un enrôlement précédent abandonné
     * sont d'abord nettoyés (doc) — sans ça ils s'accumulent et finissent en
     * conflit de nom.
     */
    async enrollTotp() {
      try {
        const { all } = await listFactors();
        const stale = all.filter(
          f => f.factor_type === 'totp' && f.status !== 'verified'
        );
        await Promise.all(stale.map(f => api().unenroll({ factorId: f.id })));
      } catch {
        // Best-effort : un nettoyage raté ne bloque pas l'enrôlement.
      }

      const { data, error } = await api().enroll({ factorType: 'totp' });
      if (error || !data) {
        throw new Error(error?.message ?? 'auth/mfa: enrôlement impossible');
      }
      return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      };
    },

    /**
     * Confirme l'enrôlement avec le code à 6 chiffres : le facteur devient
     * « vérifié », la session passe en `aal2`.
     */
    async confirmEnrollment(factorId, code) {
      const { error } = await api().challengeAndVerify({
        factorId,
        code: String(code).trim(),
      });
      if (error) throw new Error(error.message);
    },

    /**
     * Annule un enrôlement en cours (retire le facteur non vérifié).
     * Best-effort : le prochain enrôlement nettoiera de toute façon les
     * facteurs orphelins.
     */
    async cancelEnrollment(factorId) {
      try {
        await api().unenroll({ factorId });
      } catch {
        /* voir ci-dessus */
      }
    },

    /** Retire UN facteur, strictement : l'échec remonte. */
    async unenroll(factorId) {
      const { error } = await api().unenroll({ factorId });
      if (error) throw new Error(error.message);
    },

    /**
     * Défi TOTP au login : élève la session de `aal1` à `aal2` avec le code
     * à 6 chiffres. Appeler ensuite `refresh()` du client d'authentification
     * si l'adaptateur n'émet pas d'évènement (Supabase émet
     * `MFA_CHALLENGE_VERIFIED`, donc rien à faire avec `auth/supabase`).
     */
    async challengeTotp(code) {
      const factorId = await verifiedTotpFactorId();
      if (!factorId) throw new Error('Aucun facteur TOTP à vérifier.');
      const { error } = await api().challengeAndVerify({
        factorId,
        code: String(code).trim(),
      });
      if (error) throw new Error(error.message);
    },

    /** Désactive la 2FA : retire TOUS les facteurs TOTP du compte. */
    async disableTotp() {
      const { all } = await listFactors();
      const totp = all.filter(f => f.factor_type === 'totp');
      for (const f of totp) {
        const { error } = await api().unenroll({ factorId: f.id });
        if (error) throw new Error(error.message);
      }
    },
  };
}
