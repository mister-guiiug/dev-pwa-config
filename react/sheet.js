import { createElement as h, useId, useRef } from 'react';
import { Icon } from './icons-context.js';
import { useLabels } from './labels.js';
import { useDialogBehaviour } from './use-dialog.js';

/**
 * Feuille modale (bottom sheet sur mobile, boîte centrée au-delà).
 *
 * Quatre apps avaient leur propre `Sheet` et une vingtaine d'écrans en
 * dépendent (miss-uwh en a huit à elle seule). Le comportement est toujours le
 * même — et c'est précisément le genre de code qu'il ne faut PAS recopier :
 * chaque copie oublie un morceau.
 *
 * Ce que la version partagée garantit — chaque point est verrouillé par un test
 * dans un vrai DOM (`test/react-sheet.test.mjs`) :
 *  - `role="dialog"` + `aria-modal`, **étiqueté par le titre visible**
 *    (`aria-labelledby`, pas une copie du texte) ;
 *  - fermeture par Échap et par clic sur le fond ;
 *  - focus déplacé dans le panneau à l'ouverture, **restitué à l'élément
 *    d'origine** à la fermeture (aucune copie locale ne le faisait) ;
 *  - **piège de focus** : Tab et Maj+Tab bouclent dans le panneau, au lieu de
 *    partir dans la page de fond restée visible ;
 *  - scroll de fond verrouillé **par compteur**, restauré à sa valeur d'origine ;
 *  - `footer` optionnel, **épinglé** pendant que le corps défile.
 *
 * LIMITE. Le contenu de fond n'est pas rendu `inert` : la feuille n'utilise pas
 * de portail et ne peut donc pas neutraliser ses propres ancêtres sans risque.
 * `aria-modal` couvre les lecteurs d'écran modernes ; pour une neutralisation
 * complète, monter la feuille au premier niveau de l'application.
 *
 * Non stylé : cibler `[data-dwc="sheet"]` et descendants.
 *
 * @param {{ open: boolean, title: string, onClose: () => void,
 *   closeLabel?: string, children?: import('react').ReactNode,
 *   footer?: import('react').ReactNode, className?: string }} props
 */
export function Sheet(props = {}) {
  const { open, title, onClose, closeLabel, children, footer, className } =
    props;

  // Le libellé passé en prop l'emporte ; sinon le dictionnaire (français hors
  // provider, donc aucun changement pour une app qui ne fait rien).
  const labels = useLabels('sheet');
  const close_ = closeLabel ?? labels.close;

  const panelRef = useRef(null);
  const titleId = useId();

  // Échap, piège de focus, restitution et verrou de scroll : voir
  // `use-dialog.js`. `ConfirmDialog` partage exactement ce comportement.
  const close = useDialogBehaviour({ open, onClose, panelRef });

  if (!open) return null;

  return h(
    'div',
    {
      className,
      'data-dwc': 'sheet',
      onMouseDown: event => {
        // Uniquement le fond : un glisser-déposer terminé hors du panneau ne
        // doit pas fermer la feuille.
        if (event.target === event.currentTarget) close();
      },
    },
    h('div', { 'data-dwc': 'sheet-backdrop', 'aria-hidden': 'true' }),
    h(
      'div',
      {
        ref: panelRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
        tabIndex: -1,
        'data-dwc': 'sheet-panel',
      },
      h(
        'div',
        { 'data-dwc': 'sheet-head' },
        h('h2', { id: titleId, 'data-dwc': 'sheet-title' }, title),
        h(
          'button',
          {
            type: 'button',
            onClick: close,
            'aria-label': close_,
            'data-dwc': 'sheet-close',
          },
          h(Icon, { role: 'close' })
        )
      ),
      h('div', { 'data-dwc': 'sheet-body' }, children),
      // Barre d'actions ÉPINGLÉE : elle reste visible pendant que le corps
      // défile. Sans elle, le bouton « Enregistrer » d'un formulaire long part
      // hors de l'écran sur mobile — c'est le motif de miss-uwh, qui le passe
      // dans QUINZE de ses vingt-trois feuilles, et le seul empêchement mesuré
      // à remplacer sa copie locale par celle-ci.
      footer ? h('div', { 'data-dwc': 'sheet-footer' }, footer) : null
    )
  );
}
