/**
 * PostHog, en Europe — le consentement d'abord.
 *
 * Décision : `pwa-starter-kit/docs/adr/0012-posthog-en-europe.md`.
 */

/**
 * Consentement. Le parc ne mesure QUE l'audience : `'granted'` / `'denied'` ou
 * un booléen suffisent. Les formes héritées du mode consentement de Google
 * (`{ analytics: true }`) restent acceptées pour que les applications n'aient
 * rien à réécrire.
 */
export type Consent =
  | 'granted'
  | 'denied'
  | boolean
  | Record<string, boolean | 'granted' | 'denied'>;

/** Le nuage EUROPÉEN de PostHog. Jamais `us.i.posthog.com`. */
export declare const HOTE_PAR_DEFAUT: string;

/**
 * Les réglages de vie privée posés à l'initialisation, en CODE et non dans une
 * console : `autocapture` et l'enregistrement de session désactivés, pas de
 * vue de page automatique (`usePageViews` s'en charge), pas de cookie
 * inter-sous-domaines (le parc est sous un suffixe public), et aucun profil de
 * personne pour un visiteur anonyme.
 */
export declare const OPTIONS_VIE_PRIVEE: Readonly<Record<string, unknown>>;

export interface InitAnalyticsOptions {
  /** Clé de projet PostHog (`phc_…`). Publique par conception. */
  posthogKey?: string;
  /** Hôte d'ingestion. Défaut : le nuage européen. */
  posthogHost?: string;
  /**
   * Nom de l'application, enregistré en super-propriété `app_name`. Par défaut
   * le premier segment du chemin de base — donc rien à passer pour une app
   * servie sous `/<dépôt>/`.
   */
  appName?: string;
  /** Consentement connu au démarrage (choix déjà enregistré par l'app). */
  consent?: Consent;
  /**
   * `false` charge le tag sans attendre de consentement. Défaut `true` : RIEN
   * n'est chargé tant que l'accord n'est pas donné.
   */
  requireConsent?: boolean;
  /**
   * `() => import('posthog-js')`. Rend l'import ANALYSABLE par Vite. Sans lui,
   * le module retombe sur un spécificateur non analysable — nécessaire tant
   * que la pair optionnelle n'est pas installée.
   */
  loader?: () => Promise<unknown>;
}

export interface AnalyticsState {
  id: string | null;
  loaded: boolean;
}

/** Clé de projet PostHog valide (`phc_…`), ou `null`. */
export declare function parsePosthogKey(raw?: string): string | null;

/**
 * Le nom de l'application déduit d'un chemin de base (`/mister-cim10/` →
 * `mister-cim10`), ou `null` à la racine. Par défaut, le chemin du build.
 */
export declare function nomDApp(base?: string): string | null;

/**
 * Le domaine le plus large où le navigateur accepte réellement un cookie, ou
 * `'none'` (cookie posé sur l'hôte exact). Mesuré par sonde : un suffixe
 * public comme `github.io` ne se devine pas en lisant le nom d'hôte.
 */
export declare function domaineDeCookie(doc?: Document, hote?: string): string;

/** Prépare la mesure. Ne CHARGE rien avant le consentement. */
export declare function initAnalytics(
  options?: InitAnalyticsOptions
): AnalyticsState;

/** Met à jour le consentement, et charge le tag au premier accord. */
export declare function setAnalyticsConsent(consent: Consent): boolean;

/** Un événement de mesure. Rend `false` tant que rien n'est accordé. */
export declare function trackEvent(
  name: string,
  params?: Record<string, unknown>
): boolean;

/** Une vue de page. Mise de côté et rejouée si l'accord n'est pas encore donné. */
export declare function trackPageView(path?: string, title?: string): boolean;

/** Propriétés d'utilisateur. Jamais d'identifiant personnel ici. */
export declare function setUserProperties(
  properties: Record<string, unknown>
): boolean;

/** Le tag est-il réellement chargé ? */
export declare function isAnalyticsLoaded(): boolean;

/** La clé de projet en service (`phc_…`) ou `null`. */
export declare function getAnalyticsId(): string | null;

/** Le client PostHog une fois chargé — `null` avant l'accord. */
export declare function getAnalyticsClient(): unknown;

/** Remet le module à zéro. Réservé aux tests. */
export declare function resetAnalytics(): void;
