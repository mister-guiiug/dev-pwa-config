import { createElement as h, useEffect, useId, useRef, useState } from 'react';
import { useLabels } from './labels.js';

/**
 * Barre de navigation basse — la coque de toutes les apps mobiles de la famille.
 *
 * PROMU, PAS INVENTÉ. **Sept apps sur seize** portent un `BottomNav.tsx` :
 * miss-contraction, miss-genius, miss-lookhouse, miss-supaboss, mister-cim10,
 * mister-doc, mister-footcoach (mister-puzzle a la même chose sous le nom
 * `Navbar`). Trois à six destinations, une icône, un libellé, un état actif :
 * la structure est identique partout, les défauts non.
 *
 * QUATRE DÉFAUTS CONSTATÉS, corrigés ici :
 *
 * 1. **Le `<nav>` sans nom.** miss-contraction, mister-doc et mister-footcoach
 *    n'en posent aucun. Dans la liste des repères d'un lecteur d'écran, deux
 *    `<nav>` anonymes sont indiscernables. Ici le nom vient du dictionnaire, et
 *    ne peut pas manquer.
 * 2. **L'état actif porté par la seule couleur.** mister-cim10, mister-doc,
 *    miss-lookhouse et miss-supaboss changent l'encre, rien d'autre — WCAG 1.4.1.
 *    Ici : `aria-current="page"`, `[data-current]` pour l'habillage, ET un
 *    « Page actuelle » lu mais non vu. miss-genius était la seule à le faire.
 * 3. **La pastille invisible.** miss-lookhouse pose `aria-label="3 non lues"`
 *    sur un `<span>` : un `aria-label` sur un élément sans rôle n'est pas
 *    restitué. Ici, le compte est doublé d'un texte masqué visuellement.
 * 4. **Le bouton « Plus » muet.** mister-footcoach ouvre un tiroir depuis un
 *    `<button>` sans `aria-expanded` ni `aria-controls` ; miss-contraction, qui
 *    a le même motif, les pose tous les deux. C'est la version de
 *    miss-contraction qui est reprise.
 *
 * AGNOSTIQUE DE ROUTEUR. Le paquet ne dépend pas de react-router. Par défaut un
 * `<a href>` ; `linkComponent` + `hrefProp` branchent un `Link` (`hrefProp="to"`).
 * L'état actif est calculé ici, jamais délégué : c'est lui qui portait le
 * défaut n° 2.
 *
 * Non stylé : cibler `[data-dwc="bottom-nav"]` et descendants.
 *
 * @param {{
 *   items?: Array<{ key?: string, href: string, label: string,
 *     icon?: import('react').ReactNode, badge?: number, badgeLabel?: string,
 *     end?: boolean }>,
 *   currentPath?: string,
 *   label?: string,
 *   maxVisible?: number,
 *   moreLabel?: string,
 *   linkComponent?: unknown,
 *   hrefProp?: string,
 *   onNavigate?: (item: object) => void,
 *   className?: string,
 * }} props
 */
export function BottomNav(props = {}) {
  const {
    items = [],
    currentPath,
    label,
    maxVisible = 5,
    moreLabel,
    linkComponent = 'a',
    hrefProp = 'href',
    onNavigate,
    className,
  } = props;

  const labels = useLabels('nav');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const moreRef = useRef(null);

  const path =
    currentPath ?? (typeof location !== 'undefined' ? location.pathname : '');

  // `end` distingue la racine (`/`, qui préfixe tout) des autres destinations —
  // c'est le rôle de la prop du même nom chez react-router, et six des sept
  // copies la portent déjà.
  const isCurrent = item => {
    const exact = item.end ?? item.href === '/';
    if (exact) return path === item.href;
    return path === item.href || path.startsWith(`${item.href}/`);
  };

  const overflowing = items.length > maxVisible;
  // Une place est réservée au bouton « Plus » : sans ça, le dernier onglet
  // visible disparaîtrait au profit du bouton.
  const visible = overflowing ? items.slice(0, maxVisible - 1) : items;
  const hidden = overflowing ? items.slice(maxVisible - 1) : [];

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKeyDown = event => {
      if (event.key !== 'Escape') return;
      setMoreOpen(false);
      moreRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  const srOnly = text => h('span', { 'data-dwc': 'bottom-nav-sr' }, text);

  const link = (item, place) => {
    const current = isCurrent(item);
    return h(
      linkComponent,
      {
        key: item.key ?? item.href,
        [hrefProp]: item.href,
        'aria-current': current ? 'page' : undefined,
        'data-dwc': `bottom-nav-${place}`,
        'data-current': current ? '' : undefined,
        onClick: () => {
          setMoreOpen(false);
          onNavigate?.(item);
        },
      },
      item.icon
        ? h(
            'span',
            { 'data-dwc': 'bottom-nav-icon', 'aria-hidden': 'true' },
            item.icon
          )
        : null,
      h('span', { 'data-dwc': 'bottom-nav-label' }, item.label),
      typeof item.badge === 'number' && item.badge > 0
        ? h(
            'span',
            { 'data-dwc': 'bottom-nav-badge' },
            // Le chiffre est lu par un texte masqué visuellement, pas par un
            // `aria-label` posé sur un élément sans rôle — celui de
            // miss-lookhouse n'est restitué nulle part. `badgeLabel` donne le
            // sens (« 3 non lues ») ; sans lui, le nombre seul est lu.
            h('span', { 'aria-hidden': 'true' }, String(item.badge)),
            srOnly(item.badgeLabel ?? String(item.badge))
          )
        : null,
      current ? srOnly(labels.current) : null
    );
  };

  return h(
    'nav',
    {
      className,
      'aria-label': label ?? labels.label,
      'data-dwc': 'bottom-nav',
    },
    visible.map(item => link(item, 'item')),
    overflowing
      ? h(
          'button',
          {
            type: 'button',
            ref: moreRef,
            onClick: () => setMoreOpen(open => !open),
            'aria-expanded': moreOpen,
            'aria-controls': moreId,
            'data-dwc': 'bottom-nav-more',
            'data-current': moreOpen ? '' : undefined,
          },
          h(
            'span',
            { 'data-dwc': 'bottom-nav-label' },
            moreLabel ?? labels.more
          )
        )
      : null,
    overflowing
      ? h(
          'div',
          { id: moreId, hidden: !moreOpen, 'data-dwc': 'bottom-nav-drawer' },
          hidden.map(item => link(item, 'drawer-item'))
        )
      : null
  );
}
