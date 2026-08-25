import { Component, createElement as h, lazy, Suspense, useMemo } from 'react';
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
 * Oublie le `lazy()` d'un loader, pour qu'un remontage RÉESSAIE.
 *
 * React mémorise le rejet d'un `lazy()` : une fois l'import échoué, le même
 * composant rejette indéfiniment, sans jamais retenter. Un runtime chargé
 * pendant une coupure réseau resterait donc mort jusqu'au rechargement complet
 * de la page.
 */
function forgetLazy(loader) {
  LAZY.delete(loader ?? DEFAULT_LOADER);
}

/**
 * LE REPLI EST LE CAS NOMINAL, PAS L'EXCEPTION.
 *
 * MESURE, sur les seize dépôts : `find -name '*.riv'` renvoie **zéro
 * fichier**. Trois apps déclarent pourtant un runtime Rive — miss-badminton et
 * mister-molkky (`@rive-app/react-canvas` 4.28.4), miss-genius
 * (`@rive-app/react-webgl2` 4.18.0) — et pointent vers des dossiers vides :
 * `src/assets/rive/*.riv` pour la première, `public/rive/` pour la troisième.
 * Aucune animation Rive n'est en production nulle part.
 *
 * Ce qui manquait n'était donc pas un lecteur de plus : c'était que l'ABSENCE
 * soit traitée. Sans cette frontière, un `src` introuvable ou un runtime non
 * installé remonte jusqu'à la frontière d'erreur de l'app et efface l'écran —
 * pour une décoration.
 *
 * `onError` est appelé une fois par échec, pour que l'app puisse le remonter
 * (`recordError`) au lieu de le découvrir sur un écran vide.
 */
class RiveBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    forgetLazy(this.props.loader);
    this.props.onError?.(error);
  }

  componentDidUpdate(previous) {
    // Un `src` neuf mérite une nouvelle tentative : sinon un écran qui change
    // d'animation reste bloqué sur le repli du premier échec.
    if (this.state.failed && previous.src !== this.props.src) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Wrapper Rive aligné sur les standards famille :
 *  - **repli garanti** : runtime absent, `src` introuvable ou rendu qui jette
 *    → le `fallback` s'affiche, l'écran ne disparaît pas (voir `RiveBoundary`) ;
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
 *   loader?: () => Promise<Record<string, unknown>>,
 *   onError?: (error: unknown) => void }} props
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
    onError,
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
      RiveBoundary,
      { fallback, loader, src, onError },
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
    )
  );
}
