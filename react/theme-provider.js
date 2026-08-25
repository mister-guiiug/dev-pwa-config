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
 *
 * LA BARRE DU NAVIGATEUR SUIT AUSSI. Cinq apps sur quinze resynchronisent
 * `<meta name="theme-color">` au changement de thème ; les dix autres gardent
 * une barre claire en mode sombre. Les balises `media` engendrées par
 * `pwaSeoPlugin` couvrent le thème SYSTÈME dès le premier rendu ; elles ne
 * peuvent rien pour un choix explicite contraire au système. C'est ce que ce
 * fournisseur ajoute, en posant une balise sans `media` — donc gagnante — avec
 * la couleur du schéma réellement affiché.
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
 * La balise `theme-color` que ce fournisseur contrôle. Marquée, pour qu'un
 * second montage la réutilise au lieu d'en empiler une par rendu.
 */
function setMetaThemeColor(color) {
  if (typeof document === 'undefined') return;
  const head = document.head;
  if (!head) return;
  let meta = head.querySelector('meta[data-dwc="theme-color"]');
  if (!color) {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('data-dwc', 'theme-color');
    // En DERNIER : quand plusieurs balises correspondent, c'est la dernière
    // applicable qui l'emporte, et celle-ci doit battre les balises `media`.
    head.append(meta);
  }
  meta.setAttribute('content', color);
}

/**
 * @param {{ appId?: string, children?: import('react').ReactNode,
 *   defaultTheme?: 'light'|'dark'|'system', storageKey?: string,
 *   attribute?: 'data-theme'|'class', paint?: boolean,
 *   legacyKeys?: string[], themeColor?: { light?: string, dark?: string } }} props
 */
export function ThemeProvider(props = {}) {
  const {
    appId,
    children,
    defaultTheme = 'system',
    storageKey,
    attribute = 'data-theme',
    paint = true,
    legacyKeys,
    themeColor,
  } = props;

  const state = useTheme({ defaultTheme, storageKey, attribute, legacyKeys });
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

  // La couleur explicite l'emporte ; sinon le fond de la palette, qui est
  // déjà la couleur que l'utilisateur voit derrière la barre.
  const light = themeColor?.light ?? palette?.light?.bg;
  const dark = themeColor?.dark ?? palette?.dark?.bg;

  useEffect(() => {
    const color = state.resolved === 'dark' ? dark : light;
    if (!color) return undefined;
    setMetaThemeColor(color);
    // Au démontage, on retire NOTRE balise : sans ça, une app qui démonte le
    // fournisseur (un test, un rendu conditionnel) garderait une couleur figée
    // qui continue de battre les balises `media`.
    return () => setMetaThemeColor(null);
  }, [state.resolved, light, dark]);

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
