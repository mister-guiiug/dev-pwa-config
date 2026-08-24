import { createElement as h } from 'react';
import { MoonIcon, SunIcon, SystemIcon } from './icons.js';
import { useLabels } from './labels.js';
import { interpolate } from './i18n-core.js';
import { useTheme } from './use-theme.js';

/**
 * Bascule de thème.
 *
 * PROMU, PAS INVENTÉ. Cinq apps portent un `ThemeToggle.tsx` (miss-carbook,
 * miss-lookhouse, miss-ticket-pwa, mister-cim10, mister-doc), de 18 à 73
 * lignes, toutes avec la même paire soleil / lune.
 *
 * TROIS DÉFAUTS CONSTATÉS :
 *
 * 1. **`type="button"` manquant** chez mister-doc et miss-lookhouse. Dans un
 *    `<form>`, changer de thème soumet le formulaire. Seule mister-cim10 le pose.
 * 2. **Aucun état annoncé.** Seule mister-cim10 pose `aria-pressed`. Ailleurs,
 *    un lecteur d'écran entend « Changer de thème » sans jamais savoir lequel
 *    est actif.
 * 3. **Le thème SYSTÈME est perdu.** Les cinq basculent entre clair et sombre.
 *    `useTheme` en a trois — `light`, `dark`, `system` — et une fois sorti de
 *    `system`, aucune de ces bascules ne permet d'y revenir : l'app cesse
 *    définitivement de suivre le réglage du système d'exploitation.
 *
 * D'OÙ UN CYCLE, PAS UNE BASCULE. Par défaut, le bouton parcourt les trois
 * états. Une app qui veut le comportement mesuré passe
 * `states={['light', 'dark']}` — et retrouve alors `aria-pressed`, qui n'a de
 * sens qu'à deux états.
 *
 * Non stylé : cibler `[data-dwc="theme-toggle"]` et `[data-theme-state]`.
 *
 * @param {{ states?: string[], className?: string, label?: string,
 *   showLabel?: boolean }} props
 */
export function ThemeToggle(props = {}) {
  const {
    states = ['light', 'dark', 'system'],
    className,
    label,
    showLabel = false,
  } = props;

  const labels = useLabels('theme');
  const { theme, setTheme } = useTheme();

  const cycle = states.length ? states : ['light', 'dark', 'system'];
  const index = Math.max(0, cycle.indexOf(theme));
  const next = cycle[(index + 1) % cycle.length];
  const current = cycle[index];

  const name = state => labels[state] ?? state;
  const accessibleName =
    label ??
    interpolate(labels.next, { current: name(current), next: name(next) });

  const ICONS = { light: SunIcon, dark: MoonIcon, system: SystemIcon };
  const Icon = ICONS[current] ?? SystemIcon;

  return h(
    'button',
    {
      // Manquant dans deux des cinq copies : sans lui, le bouton soumet le
      // formulaire qui l'entoure.
      type: 'button',
      className,
      onClick: () => setTheme(next),
      'aria-label': showLabel ? undefined : accessibleName,
      // `aria-pressed` n'a de sens qu'à deux états : à trois, « appuyé » ne
      // décrit rien. Le nom accessible porte alors l'état, et il est recalculé
      // à chaque rendu.
      'aria-pressed': cycle.length === 2 ? current === 'dark' : undefined,
      'data-dwc': 'theme-toggle',
      'data-theme-state': current,
    },
    h(
      'span',
      { 'data-dwc': 'theme-toggle-icon', 'aria-hidden': 'true' },
      h(Icon)
    ),
    showLabel
      ? h('span', { 'data-dwc': 'theme-toggle-label' }, accessibleName)
      : null
  );
}
