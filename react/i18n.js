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
 * - `setLocale` persiste dans localStorage et met à jour `lang`/`dir` sur `<html>`.
 * - `t(path, params)` (voir i18n-core) : dot-notation, repli, interpolation `{nom}`.
 * - `fmt.*` : nombres, dates, monnaie, pluriel — DÉJÀ liés à la locale courante.
 *
 * `fmt` REFERME LE DÉFAUT LE PLUS RÉPANDU DU DOMAINE. Mesure sur les seize
 * apps : **78 sites de formatage à locale figée** — 27 `Intl.*('xx-XX', …)` et
 * 51 `toLocale*('fr-FR')`. Le contexte rendait `{ locale, setLocale, t, m,
 * locales }` : la langue, mais aucun formateur. Le pont entre « la langue
 * choisie » et « comment on écrit les nombres » n'existait pas, donc chaque
 * écran le refaisait — ou, 78 fois, l'oubliait. `fmt.number(v)` ne nomme
 * aucune locale et suit `setLocale` sans que rien d'autre change.
 *
 * LE PROVIDER POSE AUSSI `LabelsProvider`. Les libellés des composants du
 * paquet (`Fermer`, `Réessayer`…) vivent dans un contexte séparé, qu'il
 * fallait câbler à la main (`<LabelsProvider locale={locale}>`) — un geste que
 * rien ne rappelait, et que personne ne faisait. Il est fait ici, sauf
 * `labels: false`.
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
import { createFormatters, setDefaultLocale } from '../format.js';
import { createTranslator, plural } from './i18n-core.js';
import { LabelsProvider } from './labels.js';

export { createTranslator, plural } from './i18n-core.js';

// Langues écrites de droite à gauche, pour les navigateurs sans
// `Intl.Locale#textInfo` (Safari < 17). Liste courte et volontairement
// incomplète : elle n'est qu'un repli.
const RTL = new Set(['ar', 'fa', 'he', 'ps', 'ur', 'yi']);

/** `'rtl'` ou `'ltr'` pour une étiquette de langue. */
export function directionOf(tag) {
  try {
    const locale = new Intl.Locale(tag);
    // `getTextInfo()` est la forme normalisée ; `textInfo` la forme d'origine,
    // encore la seule sur plusieurs navigateurs en service.
    const info = locale.getTextInfo?.() ?? locale.textInfo;
    if (info?.direction) return info.direction;
  } catch {
    /* étiquette invalide ou API absente : on retombe sur la liste */
  }
  return RTL.has(
    String(tag ?? '')
      .slice(0, 2)
      .toLowerCase()
  )
    ? 'rtl'
    : 'ltr';
}

/**
 * @param {import('./i18n.js').I18nConfig<any, string>} config
 * @returns {{ I18nProvider: (props: { children: unknown }) => unknown, useI18n: () => any }}
 */
export function createI18n(config) {
  const {
    messages,
    locales,
    fallbackLocale,
    storageKey,
    localeTags = {},
    currency = 'EUR',
    labels = true,
  } = config;
  const known = new Set(locales);
  const Context = createContext(null);

  // `'fr'` seul est une étiquette BCP-47 valide, et `Intl` la traite déjà comme
  // `fr-FR`. On ne fabrique donc PAS de région par défaut : `new
  // Intl.Locale('pt').maximize()` donne `pt-BR`, ce qu'une app portugaise ne
  // demandait pas. `localeTags` sert à épingler quand la région compte
  // (`{ en: 'en-GB' }`).
  const tagOf = locale => localeTags[locale] ?? locale;

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

    const localeTag = tagOf(locale);
    const dir = directionOf(localeTag);

    useEffect(() => {
      const root = document.documentElement;
      root.lang = locale;
      // `dir` était absent partout : une locale RTL rendait la page en LTR.
      root.dir = dir;
      // Le formatage du paquet (`format.js`) suit la langue de l'app sans
      // qu'aucun appel soit réécrit — c'est tout l'intérêt.
      setDefaultLocale(localeTag);
    }, [locale, localeTag, dir]);

    const value = useMemo(() => {
      const m = messages[locale] ?? messages[fallbackLocale];
      const t = createTranslator(messages, locale, fallbackLocale);
      const fmt = {
        ...createFormatters(localeTag, { currency }),
        /** Pluriel par `Intl.PluralRules`, pas par un ternaire sur `> 1`. */
        plural: (count, forms, params) =>
          plural(count, forms, localeTag, params),
      };
      return { locale, localeTag, dir, setLocale, t, m, locales, fmt };
    }, [locale, localeTag, dir, setLocale]);

    const tree = createElement(Context.Provider, { value }, props.children);
    return labels ? createElement(LabelsProvider, { locale }, tree) : tree;
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
