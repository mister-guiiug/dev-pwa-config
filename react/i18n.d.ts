import type { FC, ReactNode } from 'react';
import type { I18nPaths } from './i18n-core.js';

export type { I18nPaths } from './i18n-core.js';
export { createTranslator, plural } from './i18n-core.js';
export type { PluralForms } from './i18n-core.js';
import type { PluralForms } from './i18n-core.js';

export interface I18nConfig<M, L extends string> {
  /** Un dictionnaire de messages par locale (toutes de même forme `M`). */
  messages: Record<L, M>;
  /** Locales prises en charge, ex. `['fr', 'en']`. */
  locales: readonly L[];
  /** Locale de repli si la détection échoue et pour les clés manquantes. */
  fallbackLocale: L;
  /**
   * Clé localStorage de persistance du choix de langue. Défaut `'dwc_locale'` :
   * les apps de la famille partagent une origine, la langue choisie suit donc
   * l'utilisateur de l'une à l'autre (une valeur hors `locales` est ignorée).
   * Passer sa propre clé pour isoler l'app — ou, en migrant une copie locale,
   * reprendre la clé existante (motif famille : `'<app>_locale'`) pour ne pas
   * perdre le choix déjà stocké.
   */
  storageKey?: string;
  /**
   * Étiquette BCP-47 complète par locale, quand la région compte
   * (`{ en: 'en-GB', es: 'es-MX' }`). Sans entrée, la locale sert telle quelle :
   * `Intl` traite déjà `'fr'` comme `fr-FR`.
   */
  localeTags?: Partial<Record<L, string>>;
  /** Devise de `fmt.currency()` (défaut `'EUR'`). */
  currency?: string;
  /**
   * Pose aussi `LabelsProvider` avec la locale courante, pour que les libellés
   * des composants du paquet suivent la langue (défaut `true`).
   */
  labels?: boolean;
}

/** Formateurs déjà liés à la locale courante — voir `format.js`. */
export interface I18nFormatters {
  /** L'étiquette réellement utilisée par `Intl`. */
  locale: string;
  currency: (value: number, code?: string) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  percent: (value: number, digits?: number) => string;
  date: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  dateTime: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  relative: (value: Date | string | number, now?: Date | number) => string;
  bytes: (value: number, digits?: number) => string;
  list: (
    values: readonly unknown[],
    options?: Intl.ListFormatOptions
  ) => string;
  /** Pluriel par `Intl.PluralRules`, dans la locale courante. */
  plural: (
    count: number,
    forms: PluralForms,
    params?: Record<string, string | number>
  ) => string;
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
  /** Étiquette BCP-47 complète utilisée par `Intl` (`'fr'`, `'en-GB'`…). */
  localeTag: string;
  /** Sens d'écriture, posé sur `<html dir>` par le provider. */
  dir: 'ltr' | 'rtl';
  /** Formateurs liés à la locale : `fmt.number(v)`, `fmt.date(d)`… */
  fmt: I18nFormatters;
}

/** `'rtl'` ou `'ltr'` pour une étiquette de langue. */
export declare function directionOf(tag: string): 'ltr' | 'rtl';

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
