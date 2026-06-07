import { useCallback, useEffect, useState } from 'react';

const DEFAULT_KEY = 'dwc_theme';

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
 * Thème unifié `light | dark | system`, persistant, applique `data-theme`
 * (ou la classe `.dark`) sur `<html>` et suit les préférences système.
 *
 * @param {{ defaultTheme?: 'light'|'dark'|'system', storageKey?: string,
 *   attribute?: 'data-theme'|'class' }} [options]
 */
export function useTheme(options = {}) {
  const {
    defaultTheme = 'system',
    storageKey = DEFAULT_KEY,
    attribute = 'data-theme',
  } = options;

  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      return window.localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
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

  const setTheme = useCallback(t => setThemeState(t), []);
  const toggle = useCallback(
    () =>
      setThemeState(prev => (resolveTheme(prev) === 'dark' ? 'light' : 'dark')),
    []
  );

  return { theme, resolved, setTheme, toggle };
}
