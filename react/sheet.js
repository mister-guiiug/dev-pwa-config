import {
  createElement as h,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react';
import { CloseIcon } from './icons.js';

// Éléments focusables, dans l'ordre du document. `:not([disabled])` et
// `tabindex="-1"` exclus : ils ne participent pas au parcours clavier.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Le verrou de scroll est COMPTÉ : deux feuilles ouvertes puis fermées dans le
// désordre laissaient sinon `overflow: hidden` collé sur le <body>, page
// définitivement figée. Le compteur vit au niveau du module, pas du composant :
// c'est le <body> qui est partagé.
let lockCount = 0;
let lockedFrom = '';

function lockScroll() {
  if (lockCount === 0) {
    lockedFrom = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = lockedFrom;
}

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
 *  - scroll de fond verrouillé **par compteur**, restauré à sa valeur d'origine.
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
  const titleId = useId();

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
      // Le focus peut avoir quitté le panneau (clic dans le fond) : on le
      // ramène au lieu de laisser Tab s'échapper.
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    lockScroll();
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockScroll();
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
