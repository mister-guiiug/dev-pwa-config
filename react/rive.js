import { createElement as h, lazy, Suspense } from 'react';
import { useReducedMotion } from './use-media-query.js';

// Chargé à la demande : `@rive-app/react-canvas` (~100 ko + WASM) reste hors du
// bundle initial des apps qui n'affichent pas d'animation au premier rendu.
// Peer OPTIONNELLE — installer dans le projet : npm i @rive-app/react-canvas
// `Rive` est l'export NOMMÉ du paquet ; on le privilégie au `default` (souvent
// non-composant dans l'espace de noms ESM) avant tout repli.
const LazyRive = lazy(async () => {
  const mod = await import('@rive-app/react-canvas');
  return { default: mod.Rive ?? mod.default };
});

/**
 * Wrapper Rive aligné sur les standards famille :
 *  - **lazy** : le runtime Rive est chargé à la demande (code-split) ;
 *  - **prefers-reduced-motion** : si l'utilisateur réduit les animations et
 *    qu'un `fallback` est fourni, on rend le fallback statique sans charger Rive ;
 *  - **a11y** : `role="img" + aria-label` si `ariaLabel`, sinon `aria-hidden`
 *    (animation purement décorative).
 *
 * Requiert la peer optionnelle `@rive-app/react-canvas`.
 *
 * @param {{ src: string, stateMachines?: string|string[], artboard?: string,
 *   animations?: string|string[], ariaLabel?: string, fallback?: import('react').ReactNode,
 *   className?: string, respectReducedMotion?: boolean, autoplay?: boolean }} props
 */
export function RiveAnimation(props) {
  const {
    src,
    stateMachines,
    artboard,
    animations,
    ariaLabel,
    fallback = null,
    className,
    respectReducedMotion = true,
    autoplay = true,
  } = props;

  const reduced = useReducedMotion();
  const a11y = ariaLabel
    ? { role: 'img', 'aria-label': ariaLabel }
    : { 'aria-hidden': 'true' };

  // Mouvement réduit + fallback dispo → on n'embarque même pas le runtime.
  if (respectReducedMotion && reduced && fallback) {
    return h('div', { className, ...a11y }, fallback);
  }

  const shouldAutoplay = autoplay && !(respectReducedMotion && reduced);

  return h(
    'div',
    { className, ...a11y },
    h(
      Suspense,
      { fallback },
      h(LazyRive, {
        src,
        stateMachines,
        artboard,
        animations,
        autoplay: shouldAutoplay,
      })
    )
  );
}
