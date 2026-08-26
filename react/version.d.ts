import type { FC, ReactNode } from 'react';
import type { BuildInfo } from '../version.js';

export interface AppVersionState extends BuildInfo {
  /** La version vue au démarrage précédent, ou `''`. */
  previous: string;
  firstRun: boolean;
  changed: boolean;
  /** La version a MONTÉ depuis le démarrage précédent. */
  justUpdated: boolean;
  /** La version publiée, si un sondage l'a découverte. */
  latest: string;
  updateAvailable: boolean;
  checking: boolean;
  /** Sonde `version.json` maintenant. Rend `null` si le sondage échoue. */
  checkNow: () => Promise<BuildInfo | null>;
}

export interface VersionProviderProps {
  /** Force l'info de build (défaut : `globalThis.__DWC_BUILD__`). */
  info?: unknown;
  /** URL du manifeste (défaut `version.json`). */
  checkUrl?: string;
  /**
   * Sondage périodique : `'1h'`, `'30m'`, `'45s'` ou un nombre de
   * millisecondes. Absent, AUCUNE requête n'est émise.
   */
  checkEvery?: string | number;
  /** Clé de mémorisation de la version précédente. */
  storageKey?: string;
  /** `false` pour ne rien mémoriser : `justUpdated` reste alors faux. */
  remember?: boolean;
  fetch?: typeof fetch;
  children?: ReactNode;
}

/** Une déclaration en haut de l'arbre ; le contexte pour tout le reste. */
export declare const VersionProvider: FC<VersionProviderProps>;

/** L'état de version. Hors fournisseur : la version, sans surveillance. */
export declare function useAppVersion(): AppVersionState;
