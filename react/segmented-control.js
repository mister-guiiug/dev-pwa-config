import { createElement as h } from 'react';

/**
 * Contrôle segmenté (onglets « pilule »).
 *
 * PROMU depuis `mister-doc`, qui l'a écrit pour remplacer CINQ variantes
 * réimplémentées à la main (login, congé, thème, période, calendrier) — le
 * même motif existe dans d'autres apps sous d'autres noms.
 *
 * `role="tablist"` / `role="tab"` : le contrôle change une VUE, pas une
 * valeur de formulaire — pour un choix de valeur, préférer des boutons radio.
 * La navigation clavier native (Tab entre boutons) suffit ici : chaque
 * segment est un vrai `<button>`.
 *
 * Non stylé : cibler `[data-dwc="segmented"]` et `[data-dwc="segmented-tab"]`
 * (`components.css` fournit la base ; `data-size` et `data-full-width`
 * portent les variantes, `aria-selected` l'état actif).
 *
 * @param {{ value: string, onChange: (value: string) => void,
 *   options: Array<{ value: string, label: import('react').ReactNode }>,
 *   size?: 'sm' | 'md', ariaLabel?: string, fullWidth?: boolean,
 *   className?: string }} props
 */
export function SegmentedControl(props = {}) {
  const {
    value,
    onChange,
    options = [],
    size = 'md',
    ariaLabel,
    fullWidth = false,
    className,
  } = props;

  return h(
    'div',
    {
      role: 'tablist',
      'aria-label': ariaLabel,
      className,
      'data-dwc': 'segmented',
      'data-size': size,
      'data-full-width': fullWidth ? '' : undefined,
    },
    options.map(option =>
      h(
        'button',
        {
          key: option.value,
          type: 'button',
          role: 'tab',
          'aria-selected': option.value === value,
          'data-dwc': 'segmented-tab',
          onClick: () => onChange?.(option.value),
        },
        option.label
      )
    )
  );
}
