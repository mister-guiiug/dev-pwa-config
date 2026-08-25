import type { FC, ReactNode } from 'react';
import type { ApplyUpdateOptions } from '../sw-update.js';
import type { RegisterSW, UseUpdatePrompt } from './use-update-prompt.js';
import type { UpdatePromptBannerProps } from './update-prompt-banner.js';

export interface AppUpdatesProps {
  /** `registerSW` de `virtual:pwa-register`, donné UNE fois pour tout l'arbre. */
  registerSW?: RegisterSW;
  snoozeHours?: number;
  /**
   * Vérification périodique d'une nouvelle version : `'1h'`, `'30m'`, `'45s'`
   * ou un nombre de millisecondes. Sans elle, une PWA installée ouverte
   * plusieurs jours ne découvre rien avant son prochain démarrage à froid.
   */
  checkEvery?: string | number;
  /** `false` pour placer le bandeau soi-même. */
  banner?: boolean;
  bannerProps?: Omit<UpdatePromptBannerProps, 'registerSW'>;
  updateOptions?: ApplyUpdateOptions;
  children?: ReactNode;
}

/** Millisecondes d'un intervalle `'1h'` / `'30m'` / `'45s'` ; `0` si illisible. */
export declare function parseInterval(value: string | number): number;

/** Un enregistrement, un bandeau, et le bouton posable n'importe où. */
export declare const AppUpdates: FC<AppUpdatesProps>;

/** L'état partagé, ou `null` hors fournisseur. */
export declare function useAppUpdates(): UseUpdatePrompt | null;
