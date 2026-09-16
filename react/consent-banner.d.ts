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

export interface ConsentRecord {
  choice: 'granted' | 'denied';
  /** `null` pour un choix mémorisé avant que la date existe. */
  at: number | null;
  /** `null` si l'app ne versionne pas ses finalités. */
  version: number | null;
}

/**
 * Le choix mémorisé avec sa date et sa version. Trois formes de stockage se
 * lisent : `choix`, `choix;date`, `choix;date;version`.
 */
export declare function readConsentRecord(scope?: string): ConsentRecord | null;

/** Le choix mémorisé, s'il y en a un — sans regarder sa fraîcheur. */
export declare function readConsentChoice(
  scope?: string
): 'granted' | 'denied' | null;

/** Mémorise un choix, daté. Rend `false` si la valeur n'est pas reconnue. */
export declare function writeConsentChoice(
  choice: 'granted' | 'denied',
  scope?: string,
  options?: { version?: number; at?: number }
): boolean;

/**
 * Un choix a-t-il cessé de valoir ? Treize mois par défaut — la durée de vie
 * maximale admise pour un traceur. Un choix sans date n'est jamais périmé.
 */
export declare function consentPerime(
  record: ConsentRecord | null,
  regles?: { maxAgeDays?: number; purposeVersion?: number }
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
  /** Âge maximal du choix, en jours. Défaut 395 (treize mois). 0 désactive. */
  maxAgeDays?: number;
  /** Version des finalités : un choix d'une autre version est reposé. */
  purposeVersion?: number;
}): ConsentChoice;

export interface ConsentBannerProps {
  gaMeasurementId?: string;
  gtmContainerId?: string;
  /** Portée explicite de la clé ; sinon le chemin de base de l'app. */
  scope?: string;
  /** Âge maximal du choix, en jours. Défaut 395 (treize mois). 0 désactive. */
  maxAgeDays?: number;
  /** Version des finalités : un choix d'une autre version est reposé. */
  purposeVersion?: number;
  /** Lien vers la page de confidentialité, facultatif. */
  policyHref?: string;
  className?: string;
  /**
   * `'fixed'` : flotte au-dessus du contenu, dégagé de la barre basse s'il y
   * en a une. Par défaut le bandeau reste dans le flux, là où l'app le monte.
   */
  placement?: 'static' | 'fixed';
  title?: ReactNode;
  message?: ReactNode;
  /**
   * L'information dépliée SUR PLACE, pour les apps qui n'ont pas d'URL —
   * `PrivacyNotice` en général. Ce repli n'offre aucun choix : il informe, et
   * refuser reste à un clic, au même niveau qu'accepter. Rendu APRÈS les
   * actions, pour ne pas s'interposer entre la question et les réponses.
   */
  policy?: ReactNode;
  acceptLabel?: string;
  refuseLabel?: string;
  /** Sert au lien `policyHref` ET au résumé du repli `policy`. */
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
  maxAgeDays?: number;
  purposeVersion?: number;
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
