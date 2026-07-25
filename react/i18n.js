/**
 * i18n minimal partagé — zéro dépendance runtime (pas de react-i18next), typé
 * par dérivation des clés du dictionnaire de messages.
 *
 * `createI18n(config)` construit un contexte isolé et renvoie `{ I18nProvider,
 * useI18n }`. Chaque app fournit son propre dictionnaire `messages` (une entrée
 * par locale, même forme) et appelle `createI18n` une fois au niveau module.
 *
 * - Locale initiale : localStorage[storageKey] si valide, sinon `navigator.language`
 *   (2 lettres) si connue, sinon `fallbackLocale`.
 * - `setLocale` persiste dans localStorage et met à jour `document.documentElement.lang`.
 * - `t(path, params)` (voir i18n-core) : dot-notation, repli, interpolation `{nom}`.
 *
 * Composants en `createElement` (pas de JSX) : le package est servi tel quel,
 * sans étape de build. La logique pure de traduction vit dans `i18n-core.js`.
 *
 * @example
 *   // src/i18n/index.ts
 *   import { createI18n } from '@mister-guiiug/dev-wpa-config/react/i18n';
 *   import { messages } from './messages';
 *   export const { I18nProvider, useI18n } = createI18n({
 *     messages, locales: ['fr', 'en'], fallbackLocale: 'fr', storageKey: 'app_locale',
 *   });
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createTranslator } from './i18n-core.js';

export { createTranslator } from './i18n-core.js';

/**
 * @param {import('./i18n.js').I18nConfig<any, string>} config
 * @returns {{ I18nProvider: (props: { children: unknown }) => unknown, useI18n: () => any }}
 */
export function createI18n(config) {
  const { messages, locales, fallbackLocale, storageKey } = config;
  const known = new Set(locales);
  const Context = createContext(null);

  function detectInitialLocale() {
    if (typeof window === 'undefined') return fallbackLocale;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && known.has(stored)) return stored;
    } catch {
      /* localStorage indisponible : on ignore */
    }
    const nav = window.navigator?.language?.slice(0, 2).toLowerCase();
    if (nav && known.has(nav)) return nav;
    return fallbackLocale;
  }

  function I18nProvider(props) {
    const [locale, setLocaleState] = useState(detectInitialLocale);

    const setLocale = useCallback(next => {
      setLocaleState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* localStorage indisponible : on ignore */
      }
    }, []);

    useEffect(() => {
      document.documentElement.lang = locale;
    }, [locale]);

    const value = useMemo(() => {
      const m = messages[locale] ?? messages[fallbackLocale];
      const t = createTranslator(messages, locale, fallbackLocale);
      return { locale, setLocale, t, m, locales };
    }, [locale, setLocale]);

    return createElement(Context.Provider, { value }, props.children);
  }

  function useI18n() {
    const ctx = useContext(Context);
    if (!ctx) {
      throw new Error('useI18n doit être utilisé dans son I18nProvider');
    }
    return ctx;
  }

  return { I18nProvider, useI18n };
}
