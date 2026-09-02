// Icônes SVG inline partagées par les composants `/react` (AppFooter,
// FamilyApps). Inline + `createElement` pour garder les composants sans
// dépendance d'icônes (lucide-react 1.x ne fournit plus les marques).
//
// Module INTERNE : non listé dans les `exports` du package.
import { createElement as h } from 'react';

/** Logo GitHub (16×16, `fill: currentColor`). */
export function GithubIcon() {
  return h(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 16 16',
      'aria-hidden': 'true',
      fill: 'currentColor',
    },
    h('path', {
      d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z',
    })
  );
}

/** Tasse de café (16×16, contour `currentColor`). */
export function CoffeeIcon() {
  return h(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    h('path', { d: 'M18 8h1a4 4 0 0 1 0 8h-1' }),
    h('path', { d: 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z' }),
    h('line', { x1: 6, y1: 1, x2: 6, y2: 4 }),
    h('line', { x1: 10, y1: 1, x2: 10, y2: 4 }),
    h('line', { x1: 14, y1: 1, x2: 14, y2: 4 })
  );
}

/** Flèche « lien externe » (14×14, contour `currentColor`). */
export function ExternalLinkIcon() {
  return h(
    'svg',
    {
      width: 14,
      height: 14,
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    h('path', { d: 'M7 17 17 7M7 7h10v10' })
  );
}

/** Croix de fermeture (18×18, contour `currentColor`). */
export function CloseIcon() {
  return h(
    'svg',
    {
      width: 18,
      height: 18,
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    h('path', { d: 'M18 6 6 18M6 6l12 12' })
  );
}

/**
 * Base commune des trois icônes de thème : même boîte, même trait.
 * @param {...import('react').ReactNode} children
 */
function themeIcon(...children) {
  return h(
    'svg',
    {
      width: 18,
      height: 18,
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    ...children
  );
}

/** Soleil — thème clair. */
export function SunIcon() {
  return themeIcon(
    h('circle', { cx: 12, cy: 12, r: 4 }),
    h('path', {
      d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
    })
  );
}

/** Lune — thème sombre. */
export function MoonIcon() {
  return themeIcon(h('path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }));
}

/** Écran — thème système, celui du système d'exploitation. */
export function SystemIcon() {
  return themeIcon(
    h('rect', { x: 2, y: 4, width: 20, height: 13, rx: 2 }),
    h('path', { d: 'M8 21h8M12 17v4' })
  );
}

/**
 * Chevron vers la gauche : le retour d'`AppHeader`.
 * @param {{ size?: number }} [props]
 */
export function BackIcon(props = {}) {
  const { size = 20 } = props;
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    h('path', { d: 'm15 18-6-6 6-6' })
  );
}
