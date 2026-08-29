/** Niveau d'assurance : `aal1` = mot de passe, `aal2` = mot de passe + TOTP. */
export interface AssuranceLevel {
  current: string | null;
  next: string | null;
}

/**
 * Vrai si la session doit encore franchir l'étape TOTP (facteur vérifié mais
 * session encore `aal1`).
 */
export declare function mfaChallengeNeeded(level: AssuranceLevel): boolean;

/** Un facteur MFA tel que Supabase le liste. */
export interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
  [key: string]: unknown;
}

export interface TotpEnrollment {
  factorId: string;
  /**
   * QR prêt à afficher (`data:image/svg+xml;…`) — la CSP doit autoriser
   * `img-src data:`.
   */
  qrCode: string;
  /** Secret en clair, pour saisie manuelle si le QR n'est pas scannable. */
  secret: string;
  /** Lien `otpauth://`, pour les applications installées sur l'appareil. */
  uri: string;
}

export interface TotpMfa {
  /** Lecture locale de la session : aucun appel réseau, sûr hors-ligne. */
  getAssuranceLevel(): Promise<AssuranceLevel>;
  listFactors(): Promise<{ all: MfaFactor[]; totp: MfaFactor[] }>;
  /** Identifiant du premier facteur TOTP **vérifié**, ou `null`. */
  verifiedTotpFactorId(): Promise<string | null>;
  /** Vrai si le défi TOTP est encore à franchir (lecture locale). */
  challengeNeeded(): Promise<boolean>;
  /** Démarre un enrôlement (nettoie d'abord les facteurs non vérifiés). */
  enrollTotp(): Promise<TotpEnrollment>;
  /** Confirme l'enrôlement : facteur « vérifié », session `aal2`. */
  confirmEnrollment(factorId: string, code: string): Promise<void>;
  /** Annule un enrôlement en cours. Best-effort, ne lève jamais. */
  cancelEnrollment(factorId: string): Promise<void>;
  /** Retire UN facteur, strictement : l'échec remonte. */
  unenroll(factorId: string): Promise<void>;
  /** Défi au login : élève la session de `aal1` à `aal2`. */
  challengeTotp(code: string): Promise<void>;
  /** Désactive la 2FA : retire TOUS les facteurs TOTP du compte. */
  disableTotp(): Promise<void>;
}

export interface CreateTotpMfaOptions {
  /** Le client Supabase de l'app — jamais un second. */
  client: { auth: { mfa?: unknown } };
}

/**
 * MFA TOTP par-dessus le client Supabase injecté, fidèle à
 * `mister-doc/src/backend/mfa.ts`. Les erreurs gardent le message Supabase
 * d'origine : passer par `frAuthError` (`auth/errors-fr`) à l'affichage.
 * PAS de codes de récupération : ceux de doc sont des RPC applicatives, pas
 * une API Supabase Auth.
 */
export declare function createTotpMfa(options: CreateTotpMfaOptions): TotpMfa;
