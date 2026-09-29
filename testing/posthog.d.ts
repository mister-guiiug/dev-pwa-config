/**
 * Une clé au format de PostHog, qui ne désigne aucun projet : sans clé,
 * `ConsentBanner` et `ConsentSection` ne rendent rien. À poser par
 * `vi.stubEnv('VITE_POSTHOG_KEY', CLE_DE_TEST)`.
 */
export declare const CLE_DE_TEST: string;

/** Ce que le double a reçu, dans l'ordre. */
export interface AppelsPosthog {
  init: { cle: string; options: Record<string, unknown> }[];
  capture: { event: string; params?: Record<string, unknown> }[];
  register: Record<string, unknown>[];
  optIn: number;
  optOut: number;
  /** Les gestes de consentement, dans l'ordre : `'granted'` / `'denied'`. */
  gestes: ('granted' | 'denied')[];
}

/** Le double de `posthog-js` : il enregistre au lieu d'envoyer. */
export interface FauxPosthog {
  appels: AppelsPosthog;
  init(cle: string, options?: Record<string, unknown>): void;
  capture(event: string, params?: Record<string, unknown>): void;
  register(props: Record<string, unknown>): void;
  opt_in_capturing(): void;
  opt_out_capturing(): void;
  /** Vrai après `opt_out_capturing`, jusqu'au prochain `opt_in_capturing`. */
  has_opted_out_capturing(): boolean;
}

/**
 * Le double de `posthog-js`, à rendre en `default` d'un
 * `vi.mock('posthog-js/dist/module.slim.js', …)`. Il se souvient d'un retrait
 * comme la vraie ; `retire: true` simule un retrait fait lors d'une visite
 * précédente.
 */
export declare function fauxPosthog(reglages?: {
  retire?: boolean;
}): FauxPosthog;
