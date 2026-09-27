import { createElement as h } from 'react';
import { ThemeToggle } from './theme-toggle.js';
import { useLabels } from './labels-core.js';

/**
 * Groupe de préférences chrome : thème (+ slot langue / densités).
 *
 * PROMU, PAS INVENTÉ. Le hub et plusieurs apps juxtaposent bascule de thème
 * et bascule de langue dans un même groupe accessible. Le squelette ne pose
 * que `ThemeToggle` dans l'en-tête ; les apps qui ont une langue exposent
 * leurs boutons en `children`.
 *
 * @param {{
 *   children?: import('react').ReactNode,
 *   label?: string,
 *   className?: string,
 *   themeToggle?: object|false,
 * }} props
 *   `themeToggle={false}` retire la bascule (groupe langue seul).
 */
export function ChromePrefs(props = {}) {
  const { children, label, className, themeToggle } = props;
  const labels = useLabels('theme');
  const groupLabel = label ?? labels.label ?? 'Thème';

  return h(
    'div',
    {
      role: 'group',
      'aria-label': groupLabel,
      'data-dwc': 'chrome-prefs',
      className,
    },
    themeToggle === false ? null : h(ThemeToggle, themeToggle ?? {}),
    children ?? null
  );
}
