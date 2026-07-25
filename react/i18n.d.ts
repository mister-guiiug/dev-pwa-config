import type { FC, ReactNode } from 'react';
import type { I18nPaths } from './i18n-core.js';

export type { I18nPaths } from './i18n-core.js';
export { createTranslator } from './i18n-core.js';

export interface I18nConfig<M, L extends string> {
  /** Un dictionnaire de messages par locale (toutes de même forme `M`). */
  messages: Record<L, M>;
  /** Locales prises en charge, ex. `['fr', 'en']`. */
  locales: readonly L[];
  /** Locale de repli si la détection échoue et pour les clés manquantes. */
  fallbackLocale: L;
  /** Clé localStorage de persistance du choix de langue (ex. `'app_locale'`). */
  storageKey: string;
}

export interface I18nApi<M, L extends string> {
  /** Locale courante. */
  locale: L;
  /** Change la locale (persiste + met à jour `document.documentElement.lang`). */
  setLocale: (locale: L) => void;
  /**
   * Traduit une clé dot-notation. Le compilateur refuse une clé inexistante ;
   * les `params` interpolent les placeholders `{nom}` (validés à l'exécution).
   */
  t: (path: I18nPaths<M>, params?: Record<string, string | number>) => string;
  /** Le dictionnaire de la locale courante (accès direct si besoin). */
  m: M;
  /** Liste des locales prises en charge (pour un sélecteur de langue). */
  locales: readonly L[];
}

/**
 * Construit un i18n isolé (contexte + provider + hook) à partir d'un
 * dictionnaire de messages typé. Appeler une fois au niveau module.
 */
export function createI18n<M, L extends string>(
  config: I18nConfig<M, L>
): {
  I18nProvider: FC<{ children: ReactNode }>;
  useI18n: () => I18nApi<M, L>;
};
