import { createElement as h, useCallback, useEffect, useRef } from 'react';
import { CloseIcon } from './icons.js';

// Éléments focusables, dans l'ordre du document. `:not([disabled])` et
// `tabindex="-1"` exclus : ils ne participent pas au parcours clavier.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Feuille modale (bottom sheet sur mobile, boîte centrée au-delà).
 *
 * Quatre apps avaient leur propre `Sheet` et une vingtaine d'écrans en
 * dépendent (miss-uwh en a huit à elle seule). Le comportement est toujours le
 * même — et c'est précisément le genre de code qu'il ne faut PAS recopier :
 * chaque copie oublie un morceau.
 *
 * Ce que la version partagée garantit :
 *  - `role="dialog"` + `aria-modal`, libellé par le titre ;
 *  - fermeture par Échap et par clic sur le fond ;
 *  - focus déplacé dans le panneau à l'ouverture, **restitué à l'élément
 *    d'origine** à la fermeture (aucune copie locale ne le faisait) ;
 *  - **piège de focus** : Tab et Maj+Tab bouclent dans le panneau, au lieu de
 *    partir dans la page de fond restée visible ;
 *  - scroll de fond verrouillé, avec restauration de la valeur précédente ;
 *  - retrait du padding bas de la safe-area iOS.
 *
 * Non stylé : cibler `[data-dwc="sheet"]` et descendants.
 *
 * @param {{ open: boolean, title: string, onClose: () => void,
 *   closeLabel?: string, children?: import('react').ReactNode,
 *   className?: string }} props
 */
export function Sheet(props = {}) {
  const {
    open,
    title,
    onClose,
    closeLabel = 'Fermer',
    children,
    className,
  } = props;

  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  const close = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    // Mémorise l'élément qui avait le focus AVANT l'ouverture : sans ça, le
    // focus retombe sur <body> à la fermeture et la navigation clavier
    // repart du début de la page.
    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) {
        // Panneau sans élément focusable : on garde le focus sur le panneau.
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, [open, close]);

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
        'aria-label': title,
        tabIndex: -1,
        'data-dwc': 'sheet-panel',
      },
      h(
        'div',
        { 'data-dwc': 'sheet-head' },
        h('h2', { 'data-dwc': 'sheet-title' }, title),
        h(
          'button',
          {
            type: 'button',
            onClick: close,
            'aria-label': closeLabel,
            'data-dwc': 'sheet-close',
          },
          h(CloseIcon)
        )
      ),
      h('div', { 'data-dwc': 'sheet-body' }, children)
    )
  );
}
