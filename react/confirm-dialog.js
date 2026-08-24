import { createElement as h, useId, useRef } from 'react';
import { useLabels } from './labels.js';
import { useDialogBehaviour } from './use-dialog.js';

/**
 * Confirmation d'une action, en remplacement de `window.confirm`.
 *
 * PROMU, PAS INVENTÉ. **Sept apps sur seize** portent un `ConfirmDialog.tsx` —
 * miss-badminton, miss-genius, miss-uwh, mister-doc, mister-molkky, mister-qowa,
 * mister-quota — et les sept fichiers sont différents. Trois disent explicitement
 * remplacer `window.confirm`. Ce n'est pas une convergence d'idées : c'est le
 * même besoin, résolu sept fois.
 *
 * CE QUE LES COPIES SE CONTREDISENT, et ce qui est tranché ici :
 *
 * - **Le focus initial.** mister-doc et mister-qowa le posent sur *Annuler*, et
 *   le documentent comme « choix sûr pour une action destructive ».
 *   mister-quota pose `autoFocus` sur le bouton de CONFIRMATION — pour une
 *   suppression, une frappe sur Entrée détruit. Ici le focus va toujours sur
 *   Annuler.
 * - **Le rôle.** `alertdialog` chez miss-badminton et mister-qowa ; `dialog`
 *   partout ailleurs, par délégation à une feuille ou une modale.
 *   `alertdialog` est le rôle prévu pour une confirmation : c'est celui retenu.
 * - **Le nom accessible.** mister-quota pose `role="dialog"` sur le fond, sans
 *   `aria-label` ni `aria-labelledby` : la boîte n'a aucun nom. Ici le titre
 *   étiquette (`aria-labelledby`) et le message décrit (`aria-describedby`).
 * - **Le nom de la prop.** `danger` dans quatre apps, `destructive` dans deux.
 *   `destructive` est retenu — il dit l'effet, pas la couleur — et fait passer
 *   le libellé de confirmation à « Supprimer » quand rien n'est fourni.
 * - **La fermeture après confirmation.** miss-uwh appelle `onConfirm()` PUIS
 *   `onClose()` : une confirmation asynchrone ne peut pas garder la boîte
 *   ouverte le temps de sa requête. Ici, `onConfirm` seul décide.
 *
 * `loading` couvre ce cas : la boîte reste ouverte, les deux boutons deviennent
 * inertes et le titre porte `aria-busy`.
 *
 * Non stylé : cibler `[data-dwc="confirm"]` et descendants.
 *
 * @param {{ open: boolean, title: string, message?: import('react').ReactNode,
 *   confirmLabel?: string, cancelLabel?: string, destructive?: boolean,
 *   loading?: boolean, onConfirm: () => void, onCancel: () => void,
 *   children?: import('react').ReactNode, className?: string }} props
 */
export function ConfirmDialog(props = {}) {
  const {
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    destructive = false,
    loading = false,
    onConfirm,
    onCancel,
    children,
    className,
  } = props;

  const labels = useLabels('confirm');
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const bodyId = `${titleId}-body`;

  const close = useDialogBehaviour({
    open,
    onClose: onCancel,
    panelRef,
    initialFocusRef: cancelRef,
  });

  if (!open) return null;

  const body = children ?? message;
  const confirmText =
    confirmLabel ?? (destructive ? labels.destructiveConfirm : labels.confirm);

  const action = (handler, kind, text, ref) =>
    h(
      'button',
      {
        type: 'button',
        ref,
        // `aria-disabled` plutôt que `disabled` : un bouton retiré du parcours
        // clavier pendant l'attente ferait retomber le focus sur `<body>`, hors
        // du piège. Le double-clic est bloqué par la garde.
        'aria-disabled': loading || undefined,
        onClick: () => {
          if (loading) return;
          if (typeof handler === 'function') handler();
        },
        'data-dwc': `confirm-${kind}`,
      },
      text
    );

  return h(
    'div',
    {
      className,
      'data-dwc': 'confirm',
      'data-destructive': destructive ? '' : undefined,
      onMouseDown: event => {
        // Le fond ferme, comme dans cinq des sept copies — mais jamais pendant
        // une confirmation en cours.
        if (event.target === event.currentTarget && !loading) close();
      },
    },
    h('div', { 'data-dwc': 'confirm-backdrop', 'aria-hidden': 'true' }),
    h(
      'div',
      {
        ref: panelRef,
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
        'aria-describedby': body ? bodyId : undefined,
        'aria-busy': loading || undefined,
        tabIndex: -1,
        'data-dwc': 'confirm-panel',
      },
      h('h2', { id: titleId, 'data-dwc': 'confirm-title' }, title),
      body ? h('div', { id: bodyId, 'data-dwc': 'confirm-body' }, body) : null,
      h(
        'div',
        { 'data-dwc': 'confirm-actions' },
        action(onCancel, 'cancel', cancelLabel ?? labels.cancel, cancelRef),
        action(onConfirm, 'confirm', confirmText)
      )
    )
  );
}
