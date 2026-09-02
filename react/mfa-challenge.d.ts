import type { ElementType, FC, ReactNode } from 'react';

export interface MfaChallengeProps {
  /** Le code TOTP saisi (rogné). L'appelant fait `challengeTotp`. */
  onVerify?: (code: string) => void;
  /**
   * Le code de secours saisi. La voie n'est proposée que si fourni : les
   * codes de secours sont applicatifs, pas une API Supabase Auth.
   */
  onRecover?: (code: string) => void;
  /** L'échappatoire : sans téléphone ni codes, on doit pouvoir sortir. */
  onSignOut?: () => void;
  busy?: boolean;
  /** Une chaîne DÉJÀ traduite, rendue dans un `role="alert"`. */
  error?: string | null;
  /** Défaut : « Vérification en deux étapes ». `null` retire le titre. */
  title?: ReactNode | null;
  titleAs?: ElementType;
  /** Longueur du code TOTP (défaut 6). */
  digits?: number;
  /** Longueur minimale d'un code de secours (défaut 8). */
  recoveryMinLength?: number;
  className?: string;
}

/**
 * Défi MFA au login : TOTP, code de secours en option, déconnexion. Promu de
 * mister-doc et miss-uwh. Non stylé : cibler `[data-dwc="mfa-challenge"]`.
 */
export declare const MfaChallenge: FC<MfaChallengeProps>;
