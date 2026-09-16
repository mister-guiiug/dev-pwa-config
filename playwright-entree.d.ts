export interface EcranEntreeOptions {
  /** Chemin à charger. Défaut : `/`. */
  url?: string;
  /** Vérifier qu'un service worker s'enregistre. Défaut : `true`. */
  serviceWorker?: boolean;
  /**
   * Vérifier que la question du consentement est posée, puis l'accepter.
   * Défaut : `true`. Mettre à `false` quand le build e2e n'a pas
   * d'identifiant de mesure — la vue de page devient alors invérifiable.
   */
  consentement?: boolean;
  /**
   * Vérifier qu'une vue de page part après l'accord. Défaut : la valeur de
   * `consentement`. Rien ne part avant l'accord : demander l'un sans l'autre
   * lève.
   */
  vueDePage?: boolean;
  /** Millisecondes d'attente par vérification. Défaut : 15 000. */
  timeout?: number;
}

/** Intercepte tout trafic vers Google : la garde lit `dataLayer`, pas le réseau. */
export function bloqueGoogle(page: unknown): Promise<void>;

/** Les vues de page présentes dans `dataLayer` (formes GA4 et GTM). */
export function litVuesDePage(
  page: unknown
): Promise<Array<Record<string, unknown>>>;

/** Nombre de service workers enregistrés ; `-1` si l'API est absente. */
export function litServiceWorkers(page: unknown): Promise<number>;

/**
 * Vérifie, sur l'écran d'entrée, les trois propriétés qui ont cassé trois fois
 * dans ce parc : la question du consentement est posée, une vue de page part,
 * un service worker s'enregistre.
 */
export function expectEcranEntreeCable(
  page: unknown,
  expect: unknown,
  options?: EcranEntreeOptions
): Promise<void>;
