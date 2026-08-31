import type { FC, ReactNode } from 'react';
import type { ApplyUpdateOptions } from '../sw-update.js';
import type { RegisterSW, UseUpdatePrompt } from './use-update-prompt.js';
import type { UpdatePromptBannerProps } from './update-prompt-banner.js';

export interface AppUpdatesProps {
  /** `registerSW` de `virtual:pwa-register`, donné UNE fois pour tout l'arbre. */
  registerSW?: RegisterSW;
  snoozeHours?: number;
  /** Clé localStorage du report (défaut `dwc_sw_update_snoozed_until`). */
  snoozeKey?: string;
  /** L'enregistrement du service worker a échoué : une panne qui, sinon, est muette. */
  /**
   * Le SEUL rappel du mode `registerType: 'autoUpdate'` — et le fournir change
   * ce que fait `vite-plugin-pwa` : sans lui il recharge la page tout seul,
   * avec lui il rend la main. C'est le seul moyen de différer un rechargement
   * qui tomberait au mauvais moment. En mode `prompt`, il n'est jamais appelé.
   */
  onNeedReload?: () => void;
  onRegisterError?: (error: unknown) => void;
  /** Le service worker est enregistré ; `registration` sert à le revérifier. */
  onRegisteredSW?: (
    swUrl: string,
    registration?: ServiceWorkerRegistration
  ) => void;
  /** Forme historique de `onRegisteredSW`, sans l'URL du script. */
  onRegistered?: (registration?: ServiceWorkerRegistration) => void;
  /**
   * Vérification périodique d'une nouvelle version : `'1h'`, `'30m'`, `'45s'`
   * ou un nombre de millisecondes. Sans elle, une PWA installée ouverte
   * plusieurs jours ne découvre rien avant son prochain démarrage à froid.
   */
  checkEvery?: string | number;
  /** `false` pour placer le bandeau soi-même. */
  banner?: boolean;
  /**
   * Le reste de l'habillage du bandeau. Ce que le FOURNISSEUR tient déjà en
   * est retiré : `registerSW`, le report et les rappels d'enregistrement se
   * donnent une seule fois, ici.
   */
  bannerProps?: Omit<
    UpdatePromptBannerProps,
    | 'registerSW'
    | 'snoozeHours'
    | 'snoozeKey'
    | 'onRegisterError'
    | 'onRegisteredSW'
    | 'onRegistered'
    | 'onNeedReload'
  >;
  updateOptions?: ApplyUpdateOptions;
  children?: ReactNode;
}

/** Millisecondes d'un intervalle `'1h'` / `'30m'` / `'45s'` ; `0` si illisible. */
export declare function parseInterval(value: string | number): number;

/** Un enregistrement, un bandeau, et le bouton posable n'importe où. */
export declare const AppUpdates: FC<AppUpdatesProps>;

/** L'état partagé, ou `null` hors fournisseur. */
export declare function useAppUpdates(): UseUpdatePrompt | null;
