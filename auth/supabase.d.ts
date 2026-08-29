import type { AuthAdapter } from './index.js';

/** `{ code, message }` — le couple que `frAuthError` sait traduire. */
export interface SupabaseAuthError {
  /** Code stable de l'API Auth (`invalid_credentials`…), ou `null`. */
  code: string | null;
  /** Message d'origine, en anglais. */
  message: string;
}

/**
 * L'adaptateur rendu : le contrat du port, plus les variantes de connexion
 * Supabase v2. Les erreurs sont RENDUES, pas levées.
 */
export interface SupabaseAuthAdapter extends AuthAdapter {
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{
    ok: boolean;
    session: unknown;
    error: SupabaseAuthError | null;
  }>;
  /** Lien magique / OTP : la session arrivera par `onAuthStateChange`. */
  signInWithOtp(params: {
    email: string;
    emailRedirectTo?: string;
  }): Promise<{ ok: boolean; error: SupabaseAuthError | null }>;
  /**
   * `needsConfirmation` : confirmation e-mail activée sur le projet → aucune
   * session renvoyée, l'utilisateur doit cliquer le lien reçu (carbook).
   */
  signUp(params: {
    email: string;
    password: string;
    emailRedirectTo?: string;
    /** Alimente `user_metadata` (le `full_name` de doc). */
    data?: Record<string, unknown>;
  }): Promise<{
    ok: boolean;
    session: unknown;
    needsConfirmation: boolean;
    error: SupabaseAuthError | null;
  }>;
  /**
   * Session anonyme, avec le repli de molkky : connexions anonymes
   * désactivées au niveau du projet → `ok: false`, jamais une exception.
   */
  signInAnonymously(): Promise<{
    ok: boolean;
    session: unknown;
    user: unknown;
    error: SupabaseAuthError | null;
  }>;
  signOut(): Promise<{ ok: boolean; error: SupabaseAuthError | null }>;
}

export interface SupabaseAuthAdapterOptions {
  /**
   * Le client Supabase de l'app — jamais un second. Non typé à dessein : le
   * paquet ne dépend pas de `@supabase/supabase-js` (peer OPTIONNEL), et
   * recopier sa signature la figerait à une version.
   */
  client: { auth: object };
}

/** Adaptateur Supabase Auth v2 pour `createAuthClient` (`auth/index`). */
export declare function supabaseAuthAdapter(
  options: SupabaseAuthAdapterOptions
): SupabaseAuthAdapter;
