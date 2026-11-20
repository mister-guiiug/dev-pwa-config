import type { FC, ReactNode } from 'react';
import type { I18nApi, I18nConfig, LabelDictionaries } from './i18n.js';

export type { I18nPaths, PluralForms } from './i18n-core.js';
export type {
  I18nApi,
  I18nConfig,
  I18nFormatters,
  LabelDictionaries,
} from './i18n.js';
export { createTranslator, plural } from './i18n-core.js';

/**
 * La configuration de `react/i18n` — à une option près, `labels`, qui ne
 * résout ici que les langues qu'on passe.
 */
export interface I18nLiteConfig<M, L extends string> extends Omit<
  I18nConfig<M, L>,
  'labels'
> {
  /**
   * Les libellés des composants du paquet, par locale : `{ en }` avec
   * `import en from '@mister-guiiug/dev-pwa-config/react/labels-en'`. Le
   * français est toujours là, sans rien passer ; seules les langues passées
   * entrent dans le bundle.
   *
   * Une locale de `locales` sans dictionnaire rend le français, et le dit en
   * développement. `true` (le défaut) : le français seul. `false` : aucun
   * provider.
   */
  labels?: boolean | LabelDictionaries<L>;
}

/** `'rtl'` ou `'ltr'` pour une étiquette de langue. */
export declare function directionOf(tag: string): 'ltr' | 'rtl';

/**
 * `createI18n` de `react/i18n`, sans les sept langues de libellés : le
 * français, plus les dictionnaires passés dans `labels`. Appeler une fois au
 * niveau module.
 */
export function createI18n<M, L extends string>(
  config: I18nLiteConfig<M, L>
): {
  I18nProvider: FC<{ children: ReactNode }>;
  useI18n: () => I18nApi<M, L>;
};
