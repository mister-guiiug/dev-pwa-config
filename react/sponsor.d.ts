import type { FC, ReactNode } from 'react';

export interface SponsorProviderProps {
  /**
   * URL de soutien pour toute l'app. `null` retire le lien partout ;
   * `undefined` (ou absent) laisse le catalogue de la famille répondre.
   */
  url?: string | null;
  /** Pseudo Buy Me a Coffee, sucre pour `url={sponsorUrl(handle)}`. */
  handle?: string;
  children?: ReactNode;
}

/** Déclare le lien de soutien une fois pour tout l'arbre. */
export declare const SponsorProvider: FC<SponsorProviderProps>;

/**
 * Résout le lien de soutien : la prop l'emporte, puis le contexte, puis le lien
 * de la famille. `null` est une réponse — « pas de lien » — et il est respecté.
 */
export declare function useSponsorUrl(prop?: string | null): string | null;
