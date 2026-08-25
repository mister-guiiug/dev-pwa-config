import { createElement as h, lazy, Suspense, useMemo } from 'react';
import { useReducedMotion } from './use-media-query.js';

// Chargé à la demande : le runtime Rive (~100 ko + WASM) reste hors du bundle
// initial des apps qui n'affichent pas d'animation au premier rendu.
// `Rive` est l'export NOMMÉ du paquet ; on le privilégie au `default` (souvent
// non-composant dans l'espace de noms ESM) avant tout repli.
const pick = mod => ({ default: mod.Rive ?? mod.default });

/**
 * LE RUNTIME S'INJECTE. Trois apps déclarent Rive, et **deux runtimes
 * différents** : `@rive-app/react-canvas` (mister-molkky, miss-badminton) et
 * `@rive-app/react-webgl2` (miss-genius). Ce module ne connaissait que le
 * premier — miss-genius ne pouvait donc pas l'utiliser, et a écrit son propre
 * `RivePlayer.tsx`. Adoption du composant du paquet : zéro sur trois.
 *
 * Le choix du moteur appartient à l'app, comme `registerSW` pour la mise à
 * jour. `loader` doit être un import STATIQUEMENT ANALYSABLE côté app, sans
 * quoi le bundler ne saura pas quoi mettre dans le morceau :
 *
 *   <RiveAnimation loader={() => import('@rive-app/react-webgl2')} … />
 *
 * Sans `loader`, `@rive-app/react-canvas` reste le défaut — les deux apps qui
 * l'utilisent ne changent rien.
 */
const DEFAULT_LOADER = () => import('@rive-app/react-canvas');

// Un `lazy()` par loader, mémorisé au niveau module : le recréer à chaque rendu
// remonterait le composant, donc rechargerait le WASM et perdrait l'animation
// en cours.
const LAZY = new Map();
function lazyFor(loader) {
  const key = loader ?? DEFAULT_LOADER;
  if (!LAZY.has(key))
    LAZY.set(
      key,
      lazy(() => key().then(pick))
    );
  return LAZY.get(key);
}

/**
 * Wrapper Rive aligné sur les standards famille :
 *  - **lazy** : le runtime Rive est chargé à la demande (code-split) ;
 *  - **prefers-reduced-motion** : si l'utilisateur réduit les animations et
 *    qu'un `fallback` est fourni, on rend le fallback statique sans charger Rive ;
 *  - **a11y** : `role="img" + aria-label` si `ariaLabel`, sinon `aria-hidden`
 *    (animation purement décorative).
 *
 * Requiert un runtime Rive : la peer optionnelle `@rive-app/react-canvas` par
 * défaut, ou celui que `loader` fournit (`@rive-app/react-webgl2`…).
 *
 * @param {{ src: string, stateMachines?: string|string[], artboard?: string,
 *   animations?: string|string[], ariaLabel?: string, fallback?: import('react').ReactNode,
 *   className?: string, respectReducedMotion?: boolean, autoplay?: boolean,
 *   loader?: () => Promise<Record<string, unknown>> }} props
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
    loader,
  } = props;

  const reduced = useReducedMotion();
  const LazyRive = useMemo(() => lazyFor(loader), [loader]);
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
