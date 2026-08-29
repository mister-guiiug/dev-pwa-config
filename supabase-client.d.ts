import type { WithCorrelationOptions } from './correlation.js';

/**
 * Les variables lues par défaut — à passer telles quelles au `requires` d'un
 * backend déclaré avec `createBackendSelector` (./backend.js).
 */
export declare const SUPABASE_ENV_KEYS: readonly [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

export interface SupabaseEnvKeys {
  /** Défaut : `'VITE_SUPABASE_URL'`. */
  urlKey?: string;
  /** Défaut : `'VITE_SUPABASE_ANON_KEY'`. */
  anonKeyKey?: string;
}

export interface SupabaseConfig {
  url: string | null;
  anonKey: string | null;
  /** Les variables absentes ou blanches — le juge est `missingConfig` (./backend.js). */
  missing: string[];
}

/** Lit la configuration Supabase d'un environnement (`import.meta.env`). */
export declare function supabaseConfig(
  env?: Record<string, unknown>,
  options?: SupabaseEnvKeys
): SupabaseConfig;

export interface SupabaseClientFactoryOptions extends SupabaseEnvKeys {
  /** `import.meta.env` de l'app. */
  env?: Record<string, unknown>;
  /**
   * Fusionné sur `{ persistSession: true, autoRefreshToken: true }` — l'union
   * des cinq apps. `persistSession: false`, `flowType: 'pkce'`… se passent ici.
   */
  auth?: Record<string, unknown>;
  /** Le reste des options `createClient` (realtime, db, global…). */
  clientOptions?: {
    auth?: Record<string, unknown>;
    global?: Record<string, unknown>;
  } & Record<string, unknown>;
  /** Implémentation de `fetch` à donner au client (tests, plateformes). */
  fetch?: typeof fetch;
  /**
   * Enveloppe le `fetch` du client via ./correlation.js : chaque requête part
   * avec `X-Correlation-Id` + `X-Session-Id`. `true`, ou les options de
   * `withCorrelation`.
   */
  correlated?: boolean | WithCorrelationOptions;
  /**
   * Sert aux tests et aux bundlers qui exigent un import statique ; par
   * défaut, `@supabase/supabase-js` (peer optionnelle) est importé à la
   * demande, au premier `getClient()`.
   */
  loader?: () => Promise<Record<string, unknown>>;
}

export interface SupabaseClientFactory<C = unknown> {
  /** `true` quand les deux variables sont présentes et non blanches. */
  isConfigured(): boolean;
  /** Les variables manquantes — vide quand tout est là. */
  missing(): string[];
  /**
   * Le client, créé au premier appel puis partagé — c'est la promesse qui est
   * gardée, deux appels concurrents ne créent qu'un client. Rejette quand la
   * configuration manque, avec les variables en clair dans le message.
   */
  getClient(): Promise<C>;
  /** Oublie le client (tests, changement de configuration d'essai). */
  reset(): void;
}

/**
 * La fabrique : configuration lue tout de suite, client créé au premier
 * `getClient()` — rien ne s'exécute à l'import, doctrine anti-écran-blanc.
 * `C` se donne à l'appel : `createSupabaseClientFactory<SupabaseClient>(…)`.
 */
export declare function createSupabaseClientFactory<C = unknown>(
  options?: SupabaseClientFactoryOptions
): SupabaseClientFactory<C>;
