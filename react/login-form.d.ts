import type { ElementType, FC, ReactNode } from 'react';

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormProps {
  /** Reçoit `{ email, password }` — l'e-mail rogné. L'appelant fait `signIn`. */
  onSubmit?: (values: LoginFormValues) => void;
  /** Pose `aria-busy` sur le bouton et ignore une seconde soumission. */
  busy?: boolean;
  /** Une chaîne DÉJÀ traduite (`frAuthError`), rendue dans un `role="alert"`. */
  error?: string | null;
  /** `signup` : `autoComplete="new-password"` et `minLength`. */
  mode?: 'signin' | 'signup';
  /** Défaut : « Connexion » / « Créer un compte ». `null` retire le titre. */
  title?: ReactNode | null;
  titleAs?: ElementType;
  emailLabel?: string;
  passwordLabel?: string;
  submitLabel?: string;
  /** Défaut 8, appliqué en mode `signup` seulement. */
  minPasswordLength?: number;
  initialEmail?: string;
  className?: string;
  /** Des champs de plus, AVANT le bouton (le nom affiché à l'inscription). */
  children?: ReactNode;
  /** APRÈS le bouton : passkey, mot de passe oublié, confidentialité. */
  footer?: ReactNode;
}

/**
 * Formulaire de connexion présentationnel — quatre apps avaient le même.
 * Non stylé : cibler `[data-dwc="login-form"]`.
 */
export declare const LoginForm: FC<LoginFormProps>;
