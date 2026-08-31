import type { FC, ReactNode } from 'react';
import type { ApplyUpdateOptions } from '../sw-update.js';
import type { RegisterSW } from './use-update-prompt.js';

export interface UpdatePromptBannerProps {
  /** `registerSW` de `virtual:pwa-register` ; sans lui le bandeau ne s'affiche jamais. */
  registerSW?: RegisterSW;
  /** Si > 0, le bouton secondaire reporte la mise à jour de N heures. */
  snoozeHours?: number;
  /**
   * Clé localStorage du report (défaut `dwc_sw_update_snoozed_until`). À
   * renseigner pour reprendre le report d'une bannière écrite à la main, sans
   * quoi la migration oublie tout report en cours.
   */
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
   * Nombre de sorties offertes à côté de « Recharger ».
   *
   * - `'auto'` (défaut) — une seule : le report si `snoozeHours > 0`, sinon
   *   l'écartement pour la session.
   * - `'both'` — les deux, quand `snoozeHours > 0` : le report d'abord (bouton
   *   inchangé, `data-dwc="update-banner-dismiss"`), puis un second qui écarte
   *   pour la seule session (`data-dwc="update-banner-ignore"`). Sans report à
   *   offrir, se comporte exactement comme `'auto'`.
   */
  secondaryActions?: 'auto' | 'both';
  /**
   * Rend aussi le message « prêt hors ligne » quand le service worker le
   * signale et qu'AUCUNE mise à jour n'attend. Rendu à part
   * (`data-dwc="offline-ready"`), jamais en même temps que la mise à jour.
   *
   * Ne s'appelle pas `offlineReady` : l'état du hook porte déjà ce nom sur les
   * mêmes props et écraserait l'interrupteur.
   */
  showOfflineReady?: boolean;
  title?: ReactNode;
  updateLabel?: string;
  updatingLabel?: string;
  snoozeLabel?: string;
  dismissLabel?: string;
  /** Seconde sortie de `secondaryActions: 'both'` (défaut « Ignorer »). */
  ignoreLabel?: string;
  /** Texte du message « prêt hors ligne ». */
  offlineReadyTitle?: ReactNode;
  /** Bouton qui referme le message « prêt hors ligne » (défaut « OK »). */
  offlineReadyLabel?: string;
  className?: string;
  updateOptions?: ApplyUpdateOptions;
}

/** Bandeau « Mise à jour disponible », branché sur `useUpdatePrompt`. */
export declare const UpdatePromptBanner: FC<UpdatePromptBannerProps>;
