import {
  createContext,
  createElement as h,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { themeById } from '../themes.js';
import { useTheme } from './use-theme.js';

/**
 * Le thème en un seul endroit : la palette, l'état, et les variables.
 *
 * QUATRE PIÈCES SANS ASSEMBLAGE. Le paquet avait les données (`themes.js`,
 * dix-sept palettes), les valeurs neutres (`tokens.css`), l'état (`useTheme`)
 * et le contrôle (`ThemeToggle`) — et rien qui les relie. Chaque app recâblait
 * la jonction à la main, ou plus souvent ne la faisait pas : le contrat
 * `--dwc-*` n'avait qu'UN adoptant sur seize.
 *
 * UN DÉFAUT QUE CE FOURNISSEUR REFERME. `ThemeToggle` appelle `useTheme()`
 * pour son propre compte. Une app qui appelle aussi `useTheme()` obtient donc
 * DEUX instances du hook, qui écrivent toutes les deux `data-theme` sur
 * `<html>` — exactement le piège que le catalogue documente à l'entrée
 * `useTheme`, et que le composant introduisait lui-même. Sous ce fournisseur,
 * il n'y a plus qu'un écrivain ; hors fournisseur, `ThemeToggle` garde son
 * comportement autonome.
 *
 * CE QUI EST PEINT. `appId` résout une palette du catalogue, dont les couleurs
 * sont posées en variables `--dwc-*` sur `<html>` à chaque changement de
 * schéma. Sans `appId`, rien n'est peint : `tokens.css` (ou l'app) garde la
 * main, et le fournisseur ne sert plus qu'à unifier l'état.
 */

const ThemeContext = createContext(null);

/** Palette → contrat `--dwc-*`. Les noms du contrat, pas ceux de la palette. */
const VARIABLES = {
  bg: '--dwc-bg',
  surface: '--dwc-surface',
  surface2: '--dwc-surface-2',
  text: '--dwc-text',
  textSoft: '--dwc-text-soft',
  border: '--dwc-border',
  borderStrong: '--dwc-border-strong',
  primary: '--dwc-primary',
  primaryContrast: '--dwc-primary-contrast',
  primarySoft: '--dwc-primary-soft',
  success: '--dwc-success',
  warning: '--dwc-warning',
  danger: '--dwc-danger',
  info: '--dwc-info',
};

/**
 * @param {{ appId?: string, children?: import('react').ReactNode,
 *   defaultTheme?: 'light'|'dark'|'system', storageKey?: string,
 *   attribute?: 'data-theme'|'class', paint?: boolean }} props
 */
export function ThemeProvider(props = {}) {
  const {
    appId,
    children,
    defaultTheme = 'system',
    storageKey,
    attribute = 'data-theme',
    paint = true,
  } = props;

  const state = useTheme({ defaultTheme, storageKey, attribute });
  const palette = useMemo(() => (appId ? themeById(appId) : null), [appId]);

  useEffect(() => {
    if (!paint || !palette || typeof document === 'undefined') return;
    // La palette peut n'avoir qu'un schéma : on retombe sur celui qu'elle a.
    const scheme = palette[state.resolved] ?? palette.light ?? palette.dark;
    if (!scheme) return;
    const root = document.documentElement;
    for (const [key, variable] of Object.entries(VARIABLES)) {
      if (scheme[key]) root.style.setProperty(variable, scheme[key]);
    }
    if (palette.radius) root.style.setProperty('--dwc-radius', palette.radius);
  }, [palette, state.resolved, paint]);

  const value = useMemo(
    () => ({ ...state, appId: appId ?? null, palette }),
    [state, appId, palette]
  );
  return h(ThemeContext.Provider, { value }, children);
}

/**
 * L'état du thème, partagé. Rend `null` hors fournisseur — un appelant qui
 * doit fonctionner seul (comme `ThemeToggle`) retombe sur `useTheme()`.
 */
export function useThemeContext() {
  return useContext(ThemeContext);
}
