/**
 * Erreurs d'authentification en français.
 *
 * PROVENANCE : fusion de deux cartes éprouvées, écrites indépendamment.
 *
 *   - `mister-doc/src/lib/authErrors.ts` — raisonne par SOUS-CHAÎNE du
 *     message anglais (les libellés Supabase varient légèrement selon la
 *     version) et retombe sur un générique français : jamais de texte
 *     technique à l'écran ;
 *   - `miss-carbook/src/lib/authEmailErrors.ts` — raisonne par CODE stable
 *     de l'API Auth (`invalid_credentials`, `over_email_send_rate_limit`…),
 *     plus robuste quand le code est là, et rend `null` pour laisser
 *     l'appelant décider de l'inconnu.
 *
 * LA FUSION : les codes d'abord (carbook — un code stable ne ment pas), les
 * sous-chaînes ensuite (doc — il n'y a pas toujours de code). Le repli par
 * défaut est celui de doc (toujours une phrase française) ; `fallback: null`
 * restitue le comportement de carbook.
 *
 * ÉCART ASSUMÉ : carbook rendait `null` sur une erreur réseau et laissait son
 * dialogue générique la raconter ; la carte fusionnée la traduit, comme doc.
 * Les textes retenus sont ceux de doc, sauf le plafond d'envoi d'e-mails, où
 * celui de carbook dit quoi FAIRE (patienter, vérifier les indésirables).
 */

export const GENERIC_AUTH_ERROR_FR = 'Une erreur est survenue. Réessayez.';

/** Extrait le code stable (`error.code`) s'il existe. */
function codeOf(error) {
  if (error && typeof error === 'object' && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}

/** Extrait le message, quel que soit l'emballage (string, Error, objet). */
function messageOf(error) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }
  return '';
}

/**
 * Message utilisateur français pour une erreur d'authentification Supabase.
 *
 * Accepte ce que les apps ont vraiment sous la main : le message seul (doc),
 * l'objet d'erreur complet avec son code (carbook), une `Error`, ou rien.
 *
 * @param {unknown} error
 * @param {{ fallback?: string | null }} [options] `fallback: null` rend
 *   `null` pour une erreur inconnue (comportement carbook : l'appelant
 *   affiche alors son propre générique, avec le détail technique à part).
 */
export function frAuthError(error, options = {}) {
  const fallback =
    options.fallback !== undefined ? options.fallback : GENERIC_AUTH_ERROR_FR;
  const code = codeOf(error);
  const m = messageOf(error).toLowerCase();
  if (!code && !m) return fallback;

  /* ── Identifiants ─────────────────────────────────────────── (doc + carbook) */
  if (
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    m.includes('invalid login credentials') ||
    m.includes('invalid email or password')
  ) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (code === 'email_not_confirmed' || m.includes('email not confirmed')) {
    return 'E-mail non confirmé : vérifiez votre boîte de réception.';
  }
  // AVANT « already exists » : un facteur existant n'est pas un compte
  // existant. Dans l'ordre de doc, « A factor … already exists » tombait dans
  // la branche compte — ce cas était inatteignable.
  if (m.includes('factor') && (m.includes('already') || m.includes('exists'))) {
    return 'Un facteur d’authentification existe déjà. Rechargez la page.';
  }
  if (
    code === 'user_already_registered' ||
    code === 'user_already_exists' ||
    m.includes('user already registered') ||
    m.includes('already been registered') ||
    m.includes('already exists')
  ) {
    return 'Un compte existe déjà avec cet e-mail.';
  }
  if (
    code === 'weak_password' ||
    m.includes('password should be at least') ||
    m.includes('password is too short') ||
    m.includes('weak password')
  ) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }

  /* ── MFA / double authentification (code TOTP à 6 chiffres) ───────── (doc) */
  if (
    code === 'mfa_verification_failed' ||
    m.includes('invalid totp') ||
    m.includes('invalid code') ||
    m.includes('code is invalid') ||
    (m.includes('totp') && m.includes('invalid')) ||
    (m.includes('mfa') && (m.includes('invalid') || m.includes('fail')))
  ) {
    return (
      'Code à 6 chiffres incorrect ou expiré. Réessayez avec le code ' +
      'affiché dans votre application.'
    );
  }
  if (m.includes('aal2') || m.includes('assurance level')) {
    return 'Vérification en deux étapes requise pour cette action.';
  }

  /* ── E-mail ──────────────────────────────────────────────── (carbook + doc) */
  if (
    code === 'email_address_invalid' ||
    m.includes('unable to validate email') ||
    m.includes('invalid email') ||
    (m.includes('email') && m.includes('invalid'))
  ) {
    return 'Adresse e-mail invalide.';
  }
  // Le plafond d'ENVOI d'e-mails (lien magique, confirmation) avant la
  // limitation générique : le texte de carbook dit quoi faire.
  if (code === 'over_email_send_rate_limit') {
    return (
      'Trop de demandes d’e-mail pour le moment (limite Supabase). ' +
      'Patientez plusieurs minutes, vérifiez vos courriers indésirables si ' +
      'un lien a déjà été envoyé, puis réessayez.'
    );
  }
  if (
    m.includes('rate limit') ||
    m.includes('for security purposes') ||
    m.includes('too many')
  ) {
    return 'Trop de tentatives. Patientez quelques instants avant de réessayer.';
  }
  if (
    code === 'signup_disabled' ||
    m.includes('signups not allowed') ||
    m.includes('signup is disabled')
  ) {
    return 'Les inscriptions sont désactivées pour le moment.';
  }

  /* ── Réseau ──────────────────────────────────────────────────────── (doc) */
  if (
    m.includes('failed to fetch') ||
    m.includes('network') ||
    m.includes('load failed')
  ) {
    return 'Erreur réseau : vérifiez votre connexion.';
  }

  return fallback;
}
