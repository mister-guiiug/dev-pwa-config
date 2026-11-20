/**
 * `createI18n`, sans les sept langues de libellés : on ne paie que celles
 * qu'on passe.
 *
 * MÊME FONCTION, MÊME CONTRAT que `react/i18n` — détection de la langue, `t`,
 * `fmt`, `<html lang dir>`, robots — à une différence près : les libellés
 * des composants du paquet (`Fermer`, `Réessayer`…). `react/i18n` les résout
 * dans les sept langues du paquet, donc les embarque toutes ; ce module ne
 * porte que le français (celui de `react/labels-core`) et les dictionnaires
 * que l'application lui passe.
 *
 * POURQUOI UN SECOND MODULE, ET PAS UNE OPTION. Mesuré le 20/11/2026 sur
 * `mister-uwh-tactic` (socle 6.36.0) : le morceau `i18n` de l'accueil pesait
 * 83 kB bruts, dont environ 48 de dictionnaires de libellés — es, de, it,
 * pt, nl compris — pour une application qui ne parle que fr et en.
 * `react/i18n` importe `./labels.js` STATIQUEMENT pour son `labels: true` par
 * défaut, et aucune option ne retire un import statique : `labels: false`
 * laissait les sept langues dans le bundle, le bundler ne pouvant pas savoir
 * que la branche ne serait jamais prise. Seul un module qui n'importe pas
 * `./labels.js` du tout le garantit — c'est celui-ci, et
 * `test/react-labels-core.test.mjs` refuse qu'il l'importe un jour.
 *
 * POURQUOI DES DICTIONNAIRES, ET PAS UN CHARGEMENT À LA DEMANDE. Trois
 * raisons, dans l'ordre où elles pèsent :
 *   1. Les libellés d'un bouton ne peuvent pas arriver après lui. Charger
 *      l'anglais par `import()` impose soit un écran qui part en français puis
 *      bascule, soit un premier rendu suspendu — et chaque test jsdom d'une
 *      application, où `navigator.language` vaut `en-US`, rendrait un
 *      conteneur vide là où il attend un écran.
 *   2. Un `import()` ne retire rien à ce que l'utilisateur télécharge : le
 *      service worker précache chaque morceau émis, et `totalGzipKb` les
 *      compte tous. Seul un dictionnaire jamais importé disparaît vraiment.
 *   3. Une langue de libellés pèse 1 à 2 kB gzip : pas de quoi payer un aller
 *      et retour réseau pour l'éviter.
 *
 * L'USAGE — une ligne par langue autre que le français :
 *
 *   import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n-lite';
 *   import en from '@mister-guiiug/dev-pwa-config/react/labels-en';
 *
 *   export const { I18nProvider, useI18n } = createI18n({
 *     messages, locales: ['fr', 'en'], fallbackLocale: 'fr',
 *     labels: { en },
 *   });
 *
 * Une locale déclarée sans dictionnaire retombe sur le français, et LE DIT en
 * développement : le repli silencieux est le défaut que `react/labels` a
 * fermé en passant à sept langues, il n'est pas rouvert par la petite porte.
 * `labels: false` ne monte aucun provider, comme dans `react/i18n`.
 *
 * Composants en `createElement` (pas de JSX) : le package est servi tel quel,
 * sans étape de build. La logique pure de traduction vit dans `i18n-core.js`.
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
import { isCrawlerUserAgent } from '../crawler.js';
import { createFormatters, setDefaultLocale } from '../format.js';
import { isDev } from './dev-mode.js';
import { createTranslator, plural } from './i18n-core.js';
import {
  DEFAULT_LABELS,
  DEFAULT_LOCALE,
  LabelsProvider,
} from './labels-core.js';

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
 * Le dictionnaire de libellés d'une locale, ou `null`.
 *
 * `pt-BR`, `de-CH`, `es-419` : une étiquette régionale retombe sur sa langue
 * avant de retomber sur le français — la règle de `labelsFor` dans
 * `react/labels`, reprise ici pour que les deux entrées résolvent pareil.
 *
 * @param {Record<string, import('./labels-core.js').LabelGroups>} dictionaries
 * @param {string} locale
 */
function labelsOf(dictionaries, locale) {
  if (typeof locale !== 'string' || !locale) return null;
  const lower = locale.toLowerCase();
  return (
    dictionaries[locale] ??
    dictionaries[lower] ??
    dictionaries[lower.split(/[-_]/)[0]] ??
    null
  );
}

/**
 * @param {import('./i18n-lite.js').I18nLiteConfig<any, string>} config
 * @returns {{ I18nProvider: (props: { children: unknown }) => unknown, useI18n: () => any }}
 */
export function createI18n(config) {
  const {
    messages,
    locales,
    fallbackLocale,
    storageKey = 'dwc_locale',
    localeTags = {},
    currency = 'EUR',
    labels = true,
  } = config;
  const known = new Set(locales);
  const Context = createContext(null);

  // Le français est toujours là : c'est ce que `labels-core` embarque de
  // toute façon, et ce que les composants affichent hors provider. Un objet
  // passé l'enrichit ; `true` (le défaut) n'ajoute rien ; `false` ne monte
  // aucun provider.
  const dictionaries =
    labels === false
      ? null
      : {
          [DEFAULT_LOCALE]: DEFAULT_LABELS,
          ...(labels && typeof labels === 'object' ? labels : {}),
        };

  if (dictionaries && isDev()) {
    const missing = locales.filter(locale => !labelsOf(dictionaries, locale));
    if (missing.length) {
      // Court, parce qu'il est livré dans chaque app : il dit le geste, pas
      // l'histoire — celle-ci est en tête de ce fichier.
      console.warn(
        `[dwc] createI18n : composants en français pour ` +
          `${missing.map(l => `« ${l} »`).join(', ')}. Passer \`labels: { ` +
          `${missing.join(', ')} }\` (react/labels-${missing[0]}).`
      );
    }
  }

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
    // Un robot rend la page dans la langue du HTML statique, pas dans celle
    // qu'il annonce : le moteur de rendu de Google se dit `en-US`.
    if (isCrawlerUserAgent(window.navigator?.userAgent)) return fallbackLocale;
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
    if (!dictionaries) return tree;
    // Le dictionnaire est résolu ICI et passé au noyau : une locale sans
    // dictionnaire rend le français — déjà signalé à la création, une fois,
    // plutôt qu'à chaque rendu.
    return createElement(
      LabelsProvider,
      {
        locale,
        dictionary: labelsOf(dictionaries, locale) ?? DEFAULT_LABELS,
      },
      tree
    );
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
