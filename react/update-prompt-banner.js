import { createElement as h } from 'react';
import { useUpdatePrompt } from './use-update-prompt.js';
import { useLabels } from './labels.js';
import { useAppUpdates } from './app-updates.js';

/**
 * Bandeau « Mise à jour disponible », branché sur `useUpdatePrompt`.
 *
 * Le relevé des seize apps donne six bandeaux quasi identiques (miss-genius,
 * miss-uwh, mister-qowa, mister-doc, mister-footcoach, mister-molkky) : un
 * titre, un bouton qui recharge, un bouton qui reporte. Deux d'entre eux
 * n'offrent AUCUNE sortie autre que la mise à jour (footcoach n'a pas de second
 * bouton du tout) ; celui-ci en propose toujours une.
 *
 * Non stylé : cibler `[data-dwc="update-banner"]`.
 *
 * @param {{ registerSW?: Function, snoozeHours?: number, title?: string,
 *   updateLabel?: string, updatingLabel?: string, snoozeLabel?: string,
 *   dismissLabel?: string, className?: string,
 *   updateOptions?: import('../sw-update.js').ApplyUpdateOptions }} props
 */
function Banner(props) {
  const {
    snoozeHours = 0,
    title,
    updateLabel,
    updatingLabel,
    snoozeLabel,
    dismissLabel,
    className,
  } = props;

  const labels = useLabels('update');
  const { visible, updating, update, snooze, dismiss } = props;
  if (!visible) return null;

  const secondaryLabel =
    snoozeHours > 0
      ? (snoozeLabel ?? labels.snooze)
      : (dismissLabel ?? labels.dismiss);
  const onSecondary = snoozeHours > 0 ? snooze : dismiss;

  return h(
    'div',
    { className, role: 'status', 'data-dwc': 'update-banner' },
    h('span', { 'data-dwc': 'update-banner-title' }, title ?? labels.title),
    h(
      'button',
      {
        type: 'button',
        // `aria-disabled` plutôt que `disabled` : un bouton retiré du parcours
        // pendant l'opération renvoie le focus sur `<body>` (même choix que
        // `Button`). Le double clic est bloqué par la garde, pas par le DOM.
        onClick: () => {
          if (updating) return;
          void update();
        },
        'aria-disabled': updating || undefined,
        'aria-busy': updating || undefined,
        'data-dwc': 'update-banner-update',
      },
      updating
        ? (updatingLabel ?? labels.updating)
        : (updateLabel ?? labels.update)
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

/** Autonome : c'est CE composant qui monte le hook, et lui seul. */
function StandaloneBanner(props) {
  const state = useUpdatePrompt({
    registerSW: props.registerSW,
    snoozeHours: props.snoozeHours ?? 0,
    updateOptions: props.updateOptions,
  });
  return h(Banner, { ...props, ...state });
}

/**
 * Aiguillage. Sous `AppUpdates`, le bandeau lit l'état du fournisseur : écarter
 * le bandeau et cliquer le bouton des réglages parlent alors du même état.
 * Hors fournisseur, il s'enregistre lui-même à partir de `registerSW`.
 *
 * @param {import('./update-prompt-banner.js').UpdatePromptBannerProps} props
 */
export function UpdatePromptBanner(props = {}) {
  const shared = useAppUpdates();
  if (!shared) return h(StandaloneBanner, props);
  return h(Banner, { ...props, ...shared });
}
