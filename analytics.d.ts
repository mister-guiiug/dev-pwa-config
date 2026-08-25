/** Les signaux du mode consentement (v2). */
export declare const CONSENT_SIGNALS: string[];

export type ConsentValue = boolean | 'granted' | 'denied';

/**
 * Consentement : `'granted'` / `'denied'` pour tout, ou par domaine avec les
 * noms courts (`analytics`, `ads`, `functionality`, `personalization`) ou les
 * signaux Google eux-mêmes.
 */
export type Consent = 'granted' | 'denied' | Record<string, ConsentValue>;

export interface InitAnalyticsOptions {
  /** Conteneur GTM (`GTM-XXXXXXX`). Prioritaire sur `gaMeasurementId`. */
  gtmContainerId?: string;
  /** ID de mesure GA4 (`G-XXXXXXXXXX`). */
  gaMeasurementId?: string;
  /** Consentement connu au démarrage (choix déjà enregistré par l'app). */
  consent?: Consent;
  /**
   * `false` charge le tag sans attendre de consentement. Défaut `true` : rien
   * n'est injecté tant que `analytics_storage` n'est pas accordé.
   */
  requireConsent?: boolean;
  /** Surcharge de l'état par défaut, déclaré avant le chargement du tag. */
  consentDefaults?: Record<string, 'granted' | 'denied'>;
}

export interface AnalyticsState {
  mode: 'gtm' | 'ga4' | null;
  id: string | null;
  loaded: boolean;
}

/** Conteneur GTM valide, ou `null`. */
export declare function parseGtmContainerId(raw?: string): string | null;

/** ID de mesure GA4 valide, ou `null`. */
export declare function parseGaMeasurementId(raw?: string): string | null;

/** Pousse un objet dans `dataLayer` (forme GTM). */
export declare function dataLayerPush(payload: Record<string, unknown>): void;

/** Prépare la mesure. N'injecte rien tant que le consentement manque. */
export declare function initAnalytics(
  options?: InitAnalyticsOptions
): AnalyticsState;

/**
 * Met à jour le consentement, et charge le tag au premier accord. Un refus
 * postérieur coupe la collecte mais ne décharge pas le script déjà évalué.
 */
export declare function setAnalyticsConsent(
  consent: Consent
): Record<string, 'granted' | 'denied'>;

/** Un événement de mesure. `false` si le consentement manque. */
export declare function trackEvent(
  name: string,
  params?: Record<string, unknown>
): boolean;

/** Une vue de page. Défauts : chemin courant et titre du document. */
export declare function trackPageView(path?: string, title?: string): boolean;

/** Propriétés d'utilisateur. Jamais d'identifiant personnel ici. */
export declare function setUserProperties(
  properties: Record<string, unknown>
): boolean;

/** Le tag est-il réellement chargé ? */
export declare function isAnalyticsLoaded(): boolean;

/** L'identifiant en service (`GTM-…`, `G-…`) ou `null`. */
export declare function getAnalyticsId(): string | null;

/** Remet le module à zéro. Réservé aux tests. */
export declare function resetAnalytics(): void;
