import type { FC, ReactNode } from 'react';

export interface ConsentSectionProps {
  /**
   * La clé PostHog — la MÊME qu'au bandeau. Sans elle (et sans `initAnalytics`
   * préalable), la section ne rend rien : il n'y a rien à mesurer.
   */
  posthogKey?: string;
  posthogHost?: string;
  /**
   * Le MÊME `loader` qu'au bandeau. Le hook initialise la mesure si personne
   * ne l'a fait : sans lui, un visiteur arrivé directement sur les réglages
   * ferait charger un spécificateur que le navigateur ne résout pas.
   */
  loader?: () => Promise<unknown>;
  /** Nom d'app joint aux événements ; sinon le chemin de base. */
  appName?: string;
  /** Portée du consentement ; sinon le chemin de base de l'app. */
  scope?: string;
  /** Âge maximal du choix, en jours. Défaut 395 (treize mois). 0 désactive. */
  maxAgeDays?: number;
  /** Version des finalités : un choix d'une autre version est reposé. */
  purposeVersion?: number;
  className?: string;
  /** Niveau du titre, selon l'écran qui accueille la section. Défaut 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Remplace le titre (« Mesure d'audience »). */
  title?: ReactNode;
  /** Remplace le texte qui dit ce qui est mesuré, par qui, et où. */
  description?: ReactNode;
}

/**
 * La mesure d'audience dans un écran de réglages ou « À propos » : ce qui est
 * mesuré, l'état du choix, et le geste qui le change.
 *
 * - accepté : « Retirer mon consentement » refuse sur place, en un clic, sans
 *   reposer la question ;
 * - refusé : « Modifier mon choix » rouvre la question au bandeau, qui vient à
 *   l'écran et prend le focus — l'accord ne se donne qu'au bandeau ;
 * - pas encore répondu : aucun bouton, le bandeau pose la question.
 *
 * Ne rend RIEN sans identifiant de mesure. Libellés par `LabelsProvider`
 * (groupe `consent`), en sept langues.
 *
 * Non stylé, sinon la cible tactile du bouton : cibler
 * `[data-dwc="consent-section"]`.
 */
export declare const ConsentSection: FC<ConsentSectionProps>;

export default ConsentSection;
