import { useCallback, useEffect, useRef } from 'react';

/**
 * Comportement partagé des surfaces modales — INTERNE au paquet.
 *
 * Échap, piège de focus, restitution du focus et verrou de scroll étaient
 * écrits une fois dans `Sheet`. `ConfirmDialog` en a besoin à l'identique mais
 * PAS du même rôle ARIA (`alertdialog`, pas `dialog`) ni de la même charpente :
 * recopier ces quatre-vingts lignes serait exactement l'erreur que le paquet
 * reproche aux apps. Le comportement vit donc ici, la charpente chez chacun.
 *
 * Non exporté publiquement : le contrat utile est le composant, pas le hook.
 */

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

// Le verrou de scroll est COMPTÉ : deux surfaces ouvertes puis fermées dans le
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
 * @param {{
 *   open: boolean,
 *   onClose?: () => void,
 *   panelRef: { current: HTMLElement | null },
 *   initialFocusRef?: { current: HTMLElement | null },
 * }} options
 * @returns {() => void} La fermeture, stable, sûre à passer en gestionnaire.
 */
export function useDialogBehaviour(options) {
  const { open, onClose, panelRef, initialFocusRef } = options;

  /** @type {{ current: HTMLElement | null }} */
  const restoreRef = useRef(null);

  const close = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    // Mémorise l'élément qui avait le focus AVANT l'ouverture : sans ça, le
    // focus retombe sur <body> à la fermeture et la navigation clavier repart
    // du début de la page.
    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    /** @param {KeyboardEvent} event */
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = /** @type {HTMLElement[]} */ ([
        ...panel.querySelectorAll(FOCUSABLE),
      ]);
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
    (initialFocusRef?.current ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockScroll();
      restoreRef.current?.focus();
    };
  }, [open, close, panelRef, initialFocusRef]);

  return close;
}
