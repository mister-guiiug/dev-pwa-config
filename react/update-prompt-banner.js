import { createElement as h } from 'react';
import { useUpdatePrompt } from './use-update-prompt.js';

/**
 * Bandeau « Mise à jour disponible » prêt à l'emploi, branché sur useUpdatePrompt.
 * Couplé à vite-plugin-pwa (virtual:pwa-register/react) → import par sous-chemin
 * dédié, HORS barrel.
 *
 * @param {{ snoozeHours?: number, title?: string, updateLabel?: string,
 *   snoozeLabel?: string, dismissLabel?: string, className?: string }} props
 */
export function UpdatePromptBanner(props = {}) {
  const {
    snoozeHours = 0,
    title = 'Mise à jour disponible',
    updateLabel = 'Recharger',
    snoozeLabel,
    dismissLabel = 'Plus tard',
    className,
  } = props;
  const { visible, update, snooze, dismiss } = useUpdatePrompt({ snoozeHours });
  if (!visible) return null;

  const secondaryLabel =
    snoozeHours > 0 ? (snoozeLabel ?? dismissLabel) : dismissLabel;
  const onSecondary = snoozeHours > 0 ? snooze : dismiss;

  return h(
    'div',
    { className, role: 'status', 'data-dwc': 'update-banner' },
    h('span', { 'data-dwc': 'update-banner-title' }, title),
    h(
      'button',
      {
        type: 'button',
        onClick: () => void update(),
        'data-dwc': 'update-banner-update',
      },
      updateLabel
    ),
    h(
      'button',
      {
        type: 'button',
        onClick: onSecondary,
        'data-dwc': 'update-banner-dismiss',
      },
      secondaryLabel
    )
  );
}
