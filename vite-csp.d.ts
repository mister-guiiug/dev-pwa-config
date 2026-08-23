import type { Plugin } from 'vite';

export interface CspOptions {
  /**
   * `true` en dev (typiquement `command === 'serve'`) : conserve
   * `'unsafe-inline'` dans script-src pour le préambule Fast Refresh inline de
   * `@vitejs/plugin-react`, non hashable. En prod (`false`), script-src passe
   * aux hash SHA-256 des scripts inline.
   */
  dev?: boolean;
  /** Directive `connect-src` (hôtes backend). Défaut : `["'self'"]`. */
  connectSrc?: string[];
  /** Directive `img-src`. Défaut : `["'self'", 'data:', 'blob:']`. */
  imgSrc?: string[];
  /** Directive `font-src`. Défaut : `["'self'", 'data:']`. */
  fontSrc?: string[];
  /**
   * Directive `style-src`. Défaut : `["'self'", "'unsafe-inline'"]` — Tailwind et
   * vite-plugin-pwa injectent des styles inline ; hors périmètre du durcissement.
   */
  styleSrc?: string[];
  /**
   * Hôtes supplémentaires ajoutés à `script-src` AVANT les hash (ex. un CDN de
   * scripts externes). Les hash des scripts inline sont ajoutés automatiquement.
   */
  scriptSrc?: string[];
  /**
   * Directive `frame-src` (ce que la page a le droit d'encadrer).
   * Défaut : `["'none'"]`.
   */
  frameSrc?: string[];
  /**
   * Autorise les hôtes exigés par les fragments GTM / GA4 qu'injecte
   * `pwaSeoPlugin` : sans ça, activer les deux plugins coupe l'analytics sans
   * erreur de build (script externe et iframe de repli bloqués par
   * `default-src 'self'`). Défaut : `false`.
   */
  analytics?: boolean;
  /**
   * Ajoute ou écrase des directives arbitraires. Une valeur vide (`''`) retire
   * la directive.
   *
   * `frame-ancestors`, `report-uri` et `sandbox` sont REFUSÉS : un navigateur
   * les ignore dans une CSP posée par `<meta>`, les accepter ici donnerait une
   * protection illusoire. Elles demandent un en-tête HTTP.
   */
  extraDirectives?: Record<string, string>;
}

/** Hôtes exigés par les fragments analytics injectés par `pwaSeoPlugin`. */
export declare const ANALYTICS_HOSTS: {
  script: string[];
  img: string[];
  connect: string[];
  frame: string[];
};

/**
 * Plugin Vite : injecte la Content-Security-Policy dans le <head>, avec
 * `script-src` par hash SHA-256 des scripts inline (pas de `'unsafe-inline'` en
 * production). À placer APRÈS `pwaSeoPlugin`/analytics dans le tableau `plugins`.
 */
export function cspPlugin(options?: CspOptions): Plugin;
