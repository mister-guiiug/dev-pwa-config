import type { RealtimeTransport } from './index.js';

export interface SupabaseRealtimeOptions {
  /** Le client Supabase de l'app — jamais un second. */
  /**
   * Le client Supabase de l'app — jamais un second : une seconde connexion
   * temps réel compte dans le quota du projet. Non typé finement à dessein,
   * le paquet ne dépendant pas de `@supabase/supabase-js`.
   */
  client: {
    channel: (name: string) => unknown;
    removeChannel: (channel: unknown) => unknown;
    from: (table: string) => unknown;
  };
  table: string;
  schema?: string;
  /** `INSERT` | `UPDATE` | `DELETE` | `*`. Défaut : `*`. */
  event?: string;
  /** Filtre `postgres_changes`, ex. `city=eq.Lyon`. */
  filter?: string;
  /** Colonne qui borne le rattrapage. Défaut : `updated_at`. */
  cursorColumn?: string;
}

export interface SupabaseChange {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

/**
 * Abonnement `postgres_changes` + rattrapage par requête sur la colonne
 * curseur. Exige que la table soit dans la publication `supabase_realtime`
 * ET qu'une politique de lecture existe — sans elle l'abonnement se connecte
 * sans jamais rien recevoir.
 */
export declare function supabaseRealtimeTransport(
  options: SupabaseRealtimeOptions
): RealtimeTransport<SupabaseChange, string>;
