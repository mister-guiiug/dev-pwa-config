import type { FC, ReactNode } from 'react';

/** La clé de stockage du choix, au format du parc. */
export declare const CONSENT_KEY: string;

/** Le choix mémorisé, s'il y en a un. */
export declare function readConsentChoice(): 'granted' | 'denied' | null;

/** Mémorise un choix. Rend `false` si la valeur n'est pas reconnue. */
export declare function writeConsentChoice(
  choice: 'granted' | 'denied'
): boolean;

/**
 * Oublie le choix — le bandeau reposera la question. Ne révoque PAS un
 * consentement déjà donné : un script évalué ne se décharge pas.
 */
export declare function clearConsentChoice(): boolean;

export interface ConsentChoice {
  /** `null` tant que rien n'a été décidé. */
  choice: 'granted' | 'denied' | null;
  /** Un identifiant de mesure est configuré. */
  configured: boolean;
  /** Il y a quelque chose à mesurer ET rien n'a été décidé. */
  needed: boolean;
  accept: () => void;
  refuse: () => void;
  /** Oublie le choix, sans révoquer le tag déjà chargé. */
  reset: () => void;
}

/**
 * L'état du consentement et les deux gestes qui le changent. Initialise la
 * mesure si l'application ne l'a pas déjà fait.
 */
export declare function useConsentChoice(options?: {
  gaMeasurementId?: string;
  gtmContainerId?: string;
}): ConsentChoice;

export interface ConsentBannerProps {
  gaMeasurementId?: string;
  gtmContainerId?: string;
  /** Lien vers la page de confidentialité, facultatif. */
  policyHref?: string;
  className?: string;
  title?: ReactNode;
  message?: ReactNode;
  acceptLabel?: string;
  refuseLabel?: string;
  policyLabel?: string;
}

/**
 * Bandeau de consentement à la mesure d'audience. Ne rend RIEN quand aucun
 * identifiant n'est configuré, ou quand le choix est déjà fait.
 */
export declare const ConsentBanner: FC<ConsentBannerProps>;

export default ConsentBanner;
