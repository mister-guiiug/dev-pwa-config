import type { FC, ReactNode } from 'react';

/**
 * @deprecated Vestige de GA4 (14 mois). Le parc mesure avec PostHog depuis le
 * 19/09/2026 : ce chiffre ne décrit plus rien, et n'est plus le défaut du
 * panneau.
 */
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
   * Conservation des données détaillées, en mois — ce qui est réglé dans le
   * projet PostHog, pas une valeur décorative. **Aucun défaut** : sans elle, le
   * panneau affiche `[À compléter]` à la place. Annoncer une durée non vérifiée
   * serait une information fausse, au même titre qu'un responsable inventé.
   */
  retentionMonths?: number;
  /**
   * Le DSN Sentry de l'application — celui-là même que `initSentry` reçoit.
   * **Sa seule fonction ici est de savoir s'il y a quelque chose à dire** : la
   * section « erreurs » ne s'affiche que s'il est renseigné. Le DSN est
   * publiable par conception (il est déjà dans le bundle), mais rien n'en est
   * rendu à l'écran.
   */
  sentryDsn?: string;
  /**
   * À quel titre les rapports d'erreur sont émis. **Mention de l'exploitant**,
   * même règle que `controller` : ces rapports partent hors du consentement —
   * `initSentry` s'exécute au chargement du module, avant toute question — donc
   * le fondement ne peut pas être « votre consentement », et le socle ne peut
   * pas le choisir à la place du responsable du traitement.
   */
  errorBasis?: ReactNode;
  /** Comme pour le bandeau : l'identifiant, pour que la sortie sache quoi couper. */
  posthogKey?: string;
  posthogHost?: string;
  loader?: () => Promise<unknown>;
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
