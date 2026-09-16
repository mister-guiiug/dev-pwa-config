import type { FC, ReactNode } from 'react';

/** Ce que Google conserve des données détaillées, en mois. */
export declare const RETENTION_DEFAUT: number;

/**
 * Les sept formes du marqueur affiché quand une mention de l'exploitant
 * manque, en un seul motif — de quoi écrire « aucune mention ne manque » sans
 * charger les sept dictionnaires.
 */
export declare const MARQUEUR_MOTIF: RegExp;

export interface PrivacyNoticeProps {
  /**
   * Le responsable du traitement : qui édite cette application, et où le
   * joindre. **Mention de l'exploitant** — sans elle, le panneau affiche
   * `[À compléter]` à l'écran plutôt que de se taire.
   */
  controller?: ReactNode;
  /**
   * L'adresse où exercer ses droits (accès, rectification, effacement,
   * opposition). **Mention de l'exploitant**, même règle que `controller`.
   */
  contact?: string;
  /**
   * Conservation des données détaillées, en mois — ce qui est réglé dans la
   * propriété GA4, pas une valeur décorative. Défaut : 14, la valeur posée sur
   * les vingt propriétés du compte le 16/09/2026. Le défaut de GA4, lui, est de
   * 2 mois : une app qui n'aurait pas été relevée doit passer `2`.
   */
  retentionMonths?: number;
  /** Comme pour le bandeau : l'identifiant, pour que la sortie sache quoi couper. */
  gaMeasurementId?: string;
  gtmContainerId?: string;
  /** Portée du consentement ; sinon le chemin de base de l'app. */
  scope?: string;
  className?: string;
  /** Classe passée à `ConsentSettings`, rendu en fin de panneau. */
  settingsClassName?: string;
  title?: ReactNode;
}

/**
 * Le panneau qui dit ce que la mesure d'audience fait — un composant, pas une
 * route : trois apps du parc n'ont aucun routeur, et `mister-doc` a écrit sa
 * politique en dialogue. Il informe et n'ajoute aucune surface de décision : le
 * choix se fait au bandeau, et se reprend par `ConsentSettings`, rendu ici même.
 *
 * Non stylé : cibler `[data-dwc="privacy-notice"]`.
 */
export declare const PrivacyNotice: FC<PrivacyNoticeProps>;

export default PrivacyNotice;
