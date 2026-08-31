import { useCallback, useEffect, useState } from 'react';

const DEFAULT_KEY = 'dwc_theme';
const THEMES = new Set(['light', 'dark', 'system']);

/** Normalise une valeur stockée : toute valeur hors `light|dark|system` → défaut. */
function sanitizeTheme(value, fallback) {
  return THEMES.has(value) ? value : fallback;
}

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
  );
}

function resolveTheme(theme) {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return theme;
}

function applyTheme(resolved, attribute) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (attribute === 'class') {
    root.classList.toggle('dark', resolved === 'dark');
  } else {
    root.setAttribute('data-theme', resolved);
  }
  root.style.colorScheme = resolved;
}

/**
 * Lit la préférence stockée, en migrant depuis d'anciennes clés au besoin.
 *
 * HUIT CLÉS distinctes ont été mesurées dans la famille (`'theme'` ×4,
 * `'lh_theme'`, `'mb_theme'`, `'mc_theme'`, `'mm_theme'`,
 * `'mister-doc:theme'`, `'mister_puzzle_theme'`) face au `'dwc_theme'` du
 * paquet. La liste annonçait `'mc-theme'` (tiret) là où l'app écrit
 * `'mc_theme'` (souligné) : s'y fier posait un `legacyKeys` inopérant, donc
 * exactement la perte que ce repli existe pour empêcher. Sans cette lecture de repli, adopter le
 * hook perd le choix de l'utilisateur — silencieusement, et une seule fois,
 * donc sans que personne ne remonte le bug.
 */
function readStoredTheme(storageKey, legacyKeys, fallback) {
  try {
    const own = window.localStorage.getItem(storageKey);
    if (THEMES.has(own)) return own;
    for (const key of legacyKeys) {
      if (typeof key !== 'string' || !key || key === storageKey) continue;
      const value = window.localStorage.getItem(key);
      if (THEMES.has(value)) {
        // Réécrite sous la clé neuve : la migration n'a lieu qu'une fois.
        window.localStorage.setItem(storageKey, value);
        return value;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Thème unifié `light | dark | system`, persistant, applique `data-theme`
 * (ou la classe `.dark`) sur `<html>` et suit les préférences système.
 *
 * @param {{ defaultTheme?: 'light'|'dark'|'system', storageKey?: string,
 *   attribute?: 'data-theme'|'class', legacyKeys?: string[] }} [options]
 */
export function useTheme(options = {}) {
  const {
    defaultTheme = 'system',
    storageKey = DEFAULT_KEY,
    attribute = 'data-theme',
    legacyKeys = [],
  } = options;

  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    // Valeur stockée validée : une chaîne corrompue/étrangère ne doit pas se
    // propager dans `colorScheme`/`data-theme`.
    return readStoredTheme(storageKey, legacyKeys, defaultTheme);
  });

  const [resolved, setResolved] = useState(() => resolveTheme(theme));

  useEffect(() => {
    const r = resolveTheme(theme);
    setResolved(r);
    applyTheme(r, attribute);
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      /* ignore */
    }
  }, [theme, attribute, storageKey]);

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const r = systemPrefersDark() ? 'dark' : 'light';
      setResolved(r);
      applyTheme(r, attribute);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [theme, attribute]);

  const setTheme = useCallback(
    t => setThemeState(sanitizeTheme(t, defaultTheme)),
    [defaultTheme]
  );
  const toggle = useCallback(
    () =>
      setThemeState(prev => (resolveTheme(prev) === 'dark' ? 'light' : 'dark')),
    []
  );

  return { theme, resolved, setTheme, toggle };
}
