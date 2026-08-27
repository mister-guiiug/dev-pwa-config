import type { PushTransport } from './index.js';

export interface SupabasePushOptions {
  /** Le client Supabase de l'app — jamais un second. */
  client: {
    /**
     * Le constructeur de requête de Supabase. Non typé ici à dessein : le
     * paquet ne dépend pas de `@supabase/supabase-js` (peer OPTIONNEL), et
     * recopier sa signature la figerait à une version.
     */
    from: (table: string) => unknown;
    auth: { getUser: () => Promise<{ data?: { user?: { id?: string } } }> };
  };
  /** Défaut : `push_subscriptions`. */
  table?: string;
  /** Donné, calculé, ou lu dans la session si absent. */
  userId?: string | (() => Promise<string | null>);
  vapidKey?: string;
}

/**
 * Range les abonnements dans une table Supabase protégée par RLS. Supabase
 * n'envoie PAS les notifications : c'est à une Edge Function de le faire avec
 * `web-push`. Le SQL attendu est en tête du module.
 */
export declare function supabasePushTransport(
  options: SupabasePushOptions
): PushTransport;
