import { createElement as h } from 'react';
import { useIcon } from './icons-context.js';
import { useLabels } from './labels.js';

/**
 * L'en-tête d'application : le troisième côté du cadre, après `BottomNav` et
 * `AppFooter`.
 *
 * PROMU, PAS INVENTÉ. Neuf apps ont un en-tête : `AppHeader` (genius 36 l.,
 * supaboss 104, uwh 137, cim10 148), `Header` (doc 148, ticket-pwa 377),
 * `TopBar` (footcoach 63, carbook 375), `Navbar` (puzzle 354). Leur
 * similarité est basse (0,16) parce que le CONTENU est métier — le chip de
 * saison d'uwh, le badge démo de supaboss, le guide de démarrage de cim10.
 * Mais la MISE EN PAGE est la même partout : `<header>` collant en haut,
 * zone sûre iOS, fond translucide, filet en bas, un titre, une rangée
 * d'actions. Ce composant ne rend que ça. Le contrat est celui du `TopBar` de
 * footcoach — `{ title, showBack, actions }` —, le seul qui ne décide rien du
 * contenu.
 *
 * LE TITRE EST UN `h1`. `mister-cim10` le rendait en `<p>` hors de l'accueil
 * pour n'avoir qu'un `h1` par app : la page perdait son titre pour un lecteur
 * d'écran. Le titre de l'en-tête EST le titre de la page ; `as` sert quand
 * la page en a déjà un.
 *
 * LE RETOUR EST UN LIEN QUAND IL A UNE DESTINATION (`backHref`, par le
 * `linkComponent` du routeur, comme `BottomNav`), UN BOUTON quand il n'a
 * qu'une action (`onBack`). Il porte son nom — « Retour », sept langues — et
 * son icône vient du rôle `back` d'`IconsProvider`.
 *
 * Non stylé : cibler `[data-dwc="app-header"]` et descendants, ou importer
 * `components.css` (collant, zone sûre, fond translucide, filet).
 *
 * @param {{ title?: import('react').ReactNode, as?: string,
 *   leading?: import('react').ReactNode, actions?: import('react').ReactNode,
 *   backHref?: string, onBack?: () => void, backLabel?: string,
 *   linkComponent?: unknown, hrefProp?: string, sticky?: boolean,
 *   className?: string, children?: import('react').ReactNode }} props
 *   `children` est rendu SOUS la rangée du titre (une accroche, un guide, un
 *   bandeau) ; `leading` AVANT le titre (un logo).
 */
export function AppHeader(props = {}) {
  const {
    title,
    as = 'h1',
    leading,
    actions,
    backHref,
    onBack,
    backLabel,
    linkComponent = 'a',
    hrefProp = 'href',
    sticky = true,
    className,
    children,
    ...rest
  } = props;

  const labels = useLabels('nav');
  const BackIcon = useIcon('back');
  const label = backLabel ?? labels.back ?? 'Retour';
  const icon = BackIcon ? h(BackIcon, { size: 20 }) : null;

  let back = null;
  if (backHref) {
    back = h(
      linkComponent,
      {
        [hrefProp]: backHref,
        'data-dwc': 'app-header-back',
        'aria-label': label,
      },
      icon
    );
  } else if (onBack) {
    back = h(
      'button',
      {
        type: 'button',
        'data-dwc': 'app-header-back',
        'aria-label': label,
        onClick: onBack,
      },
      icon
    );
  }

  return h(
    'header',
    {
      ...rest,
      className,
      'data-dwc': 'app-header',
      'data-sticky': sticky ? '' : undefined,
    },
    h(
      'div',
      { 'data-dwc': 'app-header-row' },
      back,
      leading ? h('div', { 'data-dwc': 'app-header-leading' }, leading) : null,
      title !== undefined && title !== null
        ? h(as, { 'data-dwc': 'app-header-title' }, title)
        : null,
      actions ? h('div', { 'data-dwc': 'app-header-actions' }, actions) : null
    ),
    children ? h('div', { 'data-dwc': 'app-header-extra' }, children) : null
  );
}
