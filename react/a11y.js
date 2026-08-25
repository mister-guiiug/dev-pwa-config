import {
  createContext,
  createElement as h,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Les primitives d'accessibilité, EXTRAITES au lieu d'être enfermées.
 *
 * LE CONSTAT, MESURÉ sur les seize apps. **38 `role="dialog"` /
 * `role="alertdialog"`** répartis sur treize apps, et **trois pièges de
 * focus** : `miss-carbook/src/hooks/useFocusTrap.ts`,
 * `miss-dice/src/react/components/Sheet.tsx`,
 * `mister-molkky/src/react/components/Modal.tsx`. Les trente-cinq autres
 * dialogues laissent Tab s'échapper derrière le fond. `.sr-only` est redéfini
 * dans **cinq** fichiers CSS distincts et n'existait pas dans `tokens.css`.
 * **66 régions `aria-live`** écrites à la main dans treize apps, alors que
 * `Toast` en possède déjà une. Lien d'évitement : **trois apps**.
 *
 * POURQUOI CE MODULE EXISTE. Le paquet faisait déjà tout cela correctement —
 * mais À L'INTÉRIEUR de `Sheet` et `ConfirmDialog`, via un hook interne
 * (`use-dialog.js`) délibérément non exporté. Une app avec onze dialogues
 * maison ne pouvait donc pas emprunter la partie accessible sans tout
 * réécrire en `Sheet`, ce qu'aucune n'a fait. Le comportement est ici ;
 * `use-dialog.js` s'écrit désormais AU-DESSUS, et rend le même service.
 *
 * PROMU, PAS INVENTÉ : rien ici n'est nouveau. Le piège de focus est celui de
 * `Sheet`, le verrou de scroll compté est celui de `use-dialog`, `.sr-only`
 * est celui des cinq feuilles de style.
 */

/**
 * Éléments focusables, dans l'ordre du document. `:not([disabled])` et
 * `tabindex="-1"` exclus : ils ne participent pas au parcours clavier.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Les éléments focusables d'un conteneur, dans l'ordre du document.
 * @param {HTMLElement | null | undefined} container
 * @returns {HTMLElement[]}
 */
export function getFocusable(container) {
  if (!container) return [];
  return /** @type {HTMLElement[]} */ ([
    ...container.querySelectorAll(FOCUSABLE_SELECTOR),
  ]);
}

/* ── Échap ─────────────────────────────────────────────────────────────── */

/**
 * Appelle `onEscape` sur la touche Échap, tant que `active`.
 *
 * Écouté sur `document`, pas sur le panneau : le focus peut être n'importe où
 * (dans une `<iframe>` fille, sur le `<body>` après un clic dans le fond), et
 * un écouteur local raterait alors la touche — le défaut exact de
 * `mister-quota/ConfirmDialog`, qui n'avait pas de gestionnaire Échap du tout.
 *
 * @param {(event: KeyboardEvent) => void} onEscape
 * @param {boolean} [active]
 */
export function useEscape(onEscape, active = true) {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    /** @param {KeyboardEvent} event */
    const onKeyDown = event => {
      if (event.key === 'Escape') handler.current?.(event);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);
}

/* ── Verrou de scroll ──────────────────────────────────────────────────── */

// Le verrou est COMPTÉ : deux surfaces ouvertes puis fermées dans le désordre
// laissaient sinon `overflow: hidden` collé sur le <body>, page définitivement
// figée. Le compteur vit au niveau du module, pas du composant : c'est le
// <body> qui est partagé.
let lockCount = 0;
let lockedFrom = '';

/** Verrouille le défilement du `<body>` tant que `active`. Réentrant. */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    if (lockCount === 0) {
      lockedFrom = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.style.overflow = lockedFrom;
    };
  }, [active]);
}

/* ── Piège de focus ────────────────────────────────────────────────────── */

/**
 * Enferme le parcours clavier dans `containerRef` tant que `active`.
 *
 *  - à l'activation, le focus va sur `initialFocusRef` sinon sur le conteneur ;
 *  - Tab et Maj+Tab bouclent entre le premier et le dernier élément focusable ;
 *  - si le focus a quitté le conteneur (clic dans le fond), Tab l'y ramène ;
 *  - à la désactivation, le focus est RENDU à l'élément qui l'avait avant —
 *    sans quoi il retombe sur `<body>` et la navigation clavier repart du
 *    début de la page.
 *
 * Le conteneur doit porter `tabIndex={-1}` pour pouvoir recevoir le focus.
 *
 * @param {{ current: HTMLElement | null }} containerRef
 * @param {{ active?: boolean, initialFocusRef?: { current: HTMLElement | null },
 *   restoreFocus?: boolean }} [options]
 */
export function useFocusTrap(containerRef, options = {}) {
  const { active = true, initialFocusRef, restoreFocus = true } = options;
  /** @type {{ current: HTMLElement | null }} */
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    /** @param {KeyboardEvent} event */
    const onKeyDown = event => {
      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;
      const items = getFocusable(container);
      if (items.length === 0) {
        // Conteneur sans élément focusable : on garde le focus dessus.
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!container.contains(document.activeElement)) {
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
    (initialFocusRef?.current ?? containerRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (restoreFocus) restoreRef.current?.focus();
    };
  }, [active, containerRef, initialFocusRef, restoreFocus]);
}

/* ── Annonces ──────────────────────────────────────────────────────────── */

const AnnouncerContext = createContext(null);

/**
 * UNE région d'annonce pour toute l'app.
 *
 * POURQUOI UNE SEULE. Les seize apps totalisent 66 attributs `aria-live`,
 * posés au fil des écrans. Multiplier les régions vivantes n'améliore rien :
 * un lecteur d'écran les surveille toutes, et deux mises à jour simultanées se
 * chevauchent. La recommandation est une région, présente au montage — une
 * région insérée AU MOMENT du message n'est souvent pas annoncée, parce que le
 * lecteur d'écran ne la surveillait pas encore.
 *
 * `politeness` par message : `'polite'` (défaut) attend une pause, `'assertive'`
 * interrompt — à réserver aux erreurs.
 *
 * @param {{ children?: import('react').ReactNode }} props
 */
export function AnnouncerProvider(props = {}) {
  // DEUX emplacements par niveau d'urgence, écrits en alternance.
  //
  // POURQUOI. Un lecteur d'écran annonce le CHANGEMENT du contenu d'une région
  // vivante. Réécrire le même texte ne change rien dans le DOM : le second
  // « Enregistré » ne serait donc pas annoncé. Vider puis réécrire ne suffit
  // pas non plus — React regroupe les deux mises à jour dans le même rendu, et
  // le DOM ne voit que l'état final. L'alternance garantit une modification
  // réelle à chaque appel.
  const [polite, setPolite] = useState(['', '']);
  const [assertive, setAssertive] = useState(['', '']);
  const slot = useRef(0);

  const announce = useCallback((message, politeness = 'polite') => {
    const text = String(message ?? '');
    const index = slot.current;
    slot.current = index === 0 ? 1 : 0;
    const next = index === 0 ? [text, ''] : ['', text];
    (politeness === 'assertive' ? setAssertive : setPolite)(next);
  }, []);

  return h(
    AnnouncerContext.Provider,
    { value: announce },
    props.children,
    h(
      'div',
      {
        className: 'dwc-sr-only',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      },
      h('div', null, polite[0]),
      h('div', null, polite[1])
    ),
    h(
      'div',
      {
        className: 'dwc-sr-only',
        role: 'alert',
        'aria-live': 'assertive',
        'aria-atomic': 'true',
      },
      h('div', null, assertive[0]),
      h('div', null, assertive[1])
    )
  );
}

/**
 * La fonction d'annonce. Hors fournisseur, renvoie une fonction qui ne fait
 * rien : un appelant n'a pas à savoir si la région existe.
 *
 * @returns {(message: string, politeness?: 'polite'|'assertive') => void}
 */
export function useAnnouncer() {
  const ctx = useContext(AnnouncerContext);
  return useMemo(() => ctx ?? (() => {}), [ctx]);
}

/* ── Deux composants ───────────────────────────────────────────────────── */

/**
 * Texte réservé aux lecteurs d'écran.
 *
 * Il repose sur `.dwc-sr-only`, défini dans `tokens.css`. C'est la règle que
 * cinq apps redéfinissent chacune dans leur feuille de style ; celles qui ne
 * l'ont pas posent à la place `aria-label` sur un `<span>` — ce qui ne
 * s'annonce pas, `<span>` n'ayant pas de rôle.
 *
 * @param {{ as?: string, children?: import('react').ReactNode }} props
 */
export function VisuallyHidden(props = {}) {
  const { as = 'span', className, children, ...rest } = props;
  return h(
    as,
    {
      ...rest,
      className: className ? `dwc-sr-only ${className}` : 'dwc-sr-only',
      'data-dwc': 'visually-hidden',
    },
    children
  );
}

/**
 * Lien d'évitement : premier élément focusable de la page, invisible jusqu'à
 * ce qu'il reçoive le focus.
 *
 * Trois apps sur seize en ont un. Sans lui, un utilisateur au clavier traverse
 * toute la navigation à chaque page — c'est le critère 2.4.1 de WCAG.
 *
 * La cible doit exister et pouvoir recevoir le focus : `<main id="contenu"
 * tabIndex={-1}>`. Sans `tabIndex`, le navigateur déplace la vue mais pas le
 * focus, et la tabulation suivante repart du lien.
 *
 * @param {{ to?: string, children?: import('react').ReactNode }} props
 */
export function SkipLink(props = {}) {
  const { to = '#contenu', children = 'Aller au contenu', ...rest } = props;
  return h(
    'a',
    { ...rest, href: to, className: 'dwc-skip-link', 'data-dwc': 'skip-link' },
    children
  );
}
