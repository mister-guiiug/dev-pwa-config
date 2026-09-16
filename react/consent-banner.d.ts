import type { FC, ReactNode } from 'react';

/** La clé de stockage du choix, au format du parc. */
export declare const CONSENT_KEY: string;

/**
 * La clé RÉELLE, cloisonnée par application.
 *
 * `localStorage` est partagé par ORIGINE : les vingt sites de la famille vivent
 * sous `https://<compte>.github.io/`, donc une clé nue y serait commune.
 * `scope` explicite l'emporte ; sinon `import.meta.env.BASE_URL`.
 */
export declare function consentKey(scope?: string): string;

/** Le choix mémorisé, s'il y en a un. */
export declare function readConsentChoice(
  scope?: string
): 'granted' | 'denied' | null;

/** Mémorise un choix. Rend `false` si la valeur n'est pas reconnue. */
export declare function writeConsentChoice(
  choice: 'granted' | 'denied',
  scope?: string
): boolean;

/**
 * Oublie le choix — le bandeau reposera la question. Ne révoque PAS à lui seul
 * un consentement déjà donné : un script évalué ne se décharge pas. Le `reset`
 * du hook refuse AVANT d'oublier, pour cette raison.
 */
export declare function clearConsentChoice(scope?: string): boolean;

export interface ConsentChoice {
  /** `null` tant que rien n'a été décidé. */
  choice: 'granted' | 'denied' | null;
  /** Un identifiant de mesure est configuré. */
  configured: boolean;
  /** Il y a quelque chose à mesurer ET rien n'a été décidé. */
  needed: boolean;
  accept: () => void;
  refuse: () => void;
  /**
   * Refuse, puis oublie le choix : le bandeau repose la question et rien n'est
   * collecté entre-temps.
   */
  reset: () => void;
}

/**
 * L'état du consentement et les gestes qui le changent. Initialise la mesure si
 * l'application ne l'a pas déjà fait. Toutes les instances montées se
 * synchronisent : un choix fait dans le pied de page rappelle le bandeau.
 */
export declare function useConsentChoice(options?: {
  gaMeasurementId?: string;
  gtmContainerId?: string;
  scope?: string;
}): ConsentChoice;

export interface ConsentBannerProps {
  gaMeasurementId?: string;
  gtmContainerId?: string;
  /** Portée explicite de la clé ; sinon le chemin de base de l'app. */
  scope?: string;
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

export interface ConsentSettingsProps {
  gaMeasurementId?: string;
  gtmContainerId?: string;
  scope?: string;
  className?: string;
  /** Remplace l'état affiché (« Mesure d'audience : acceptée »). */
  stateLabel?: string;
  /** Remplace l'action affichée (« Modifier mon choix »). */
  actionLabel?: string;
}

/**
 * Le bouton qui RAPPELLE le bandeau, pour revenir sur son choix — à poser dans
 * un pied de page ou un écran de réglages. Ne rend RIEN sans identifiant, ni
 * tant qu'aucun choix n'a été fait (le bandeau pose alors la question
 * lui-même).
 */
export declare const ConsentSettings: FC<ConsentSettingsProps>;

export default ConsentBanner;
