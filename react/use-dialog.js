import { useCallback } from 'react';
import { useEscape, useFocusTrap, useScrollLock } from './a11y.js';

/**
 * Comportement partagé des surfaces modales — INTERNE au paquet.
 *
 * Échap, piège de focus, restitution du focus et verrou de scroll étaient
 * écrits une fois dans `Sheet`. `ConfirmDialog` en a besoin à l'identique mais
 * PAS du même rôle ARIA (`alertdialog`, pas `dialog`) ni de la même charpente :
 * recopier ces quatre-vingts lignes serait exactement l'erreur que le paquet
 * reproche aux apps. Le comportement vit donc ici, la charpente chez chacun.
 *
 * CE N'EST PLUS ICI QU'IL EST ÉCRIT. Les quatre gestes sont désormais des
 * primitives publiques (`react/a11y.js`), parce qu'ils manquaient AUSSI aux
 * trente-cinq dialogues que les apps écrivent elles-mêmes et qui ne peuvent
 * pas devenir des `Sheet`. Ce hook n'est plus qu'une composition — et reste
 * non exporté : le contrat utile est le composant, pas le hook.
 */

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

  const close = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  useEscape(close, open);
  useScrollLock(open);
  useFocusTrap(panelRef, { active: open, initialFocusRef });

  return close;
}
