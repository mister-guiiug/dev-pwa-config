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
   * Vérification périodique d'une nouvelle version : `'1h'`, `'30m'`, `'45s'`
   * ou un nombre de millisecondes. Sans elle, une PWA installée ouverte
   * plusieurs jours ne découvre rien avant son prochain démarrage à froid — le
   * bandeau n'apparaît alors jamais.
   *
   * N'a d'effet QUE sur un bandeau autonome, qui possède l'enregistrement.
   * Sous `AppUpdates`, c'est le fournisseur qui la tient : écrire `checkEvery`
   * ici serait sans effet, et l'y poser deux fois doublerait l'intervalle.
   */
  checkEvery?: string | number;
  /**
   * Nombre de sorties offertes à côté de « Mettre à jour ».
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
  /**
   * `'fixed'` : le bandeau flotte en bas de la fenêtre, dégagé de la barre
   * basse s'il y en a une — sans dépendre de sa présence. Sans lui, il reste
   * dans le flux, sauf sous une `BottomNav placement="fixed"` qui déclenche la
   * règle conditionnelle du socle.
   */
  placement?: 'static' | 'fixed';
  /** Défaut « Mise à jour disponible ». */
  title?: ReactNode;
  /** Défaut « Mettre à jour ». */
  updateLabel?: string;
  /** Pendant l'opération (défaut « Mise à jour… »). */
  updatingLabel?: string;
  /**
   * Bouton du report, quand `snoozeHours > 0`. Défaut « Plus tard ({hours} h) » ;
   * `{hours}` est rempli avec `snoozeHours`, dans ce libellé comme dans celui
   * du socle. Sans le gabarit, il sort tel quel.
   */
  snoozeLabel?: string;
  /** Bouton d'écartement pour la session, quand `snoozeHours` vaut 0 (défaut « Plus tard »). */
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
