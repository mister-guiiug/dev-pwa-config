import {
  createElement as h,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useLabels } from './labels-core.js';
import { Icon } from './icons-context.js';
import { prefetch } from '../prefetch.js';

/**
 * Barre de navigation basse — la coque de toutes les apps mobiles de la famille.
 *
 * PROMU, PAS INVENTÉ. **Sept apps** portaient un `BottomNav.tsx` au relevé
 * d'origine : miss-contraction, miss-genius, miss-lookhouse, miss-supaboss,
 * mister-cim10, mister-doc, mister-footcoach. Trois à six destinations, une
 * icône, un libellé, un état actif : la structure est identique partout, les
 * défauts non.
 *
 * UNE HUITIÈME Y FIGURAIT À TORT, et il a fallu une migration pour s'en
 * apercevoir. Cet en-tête affirmait « mister-puzzle a la même chose sous le nom
 * `Navbar` ». **Faux** : son `Navbar.tsx` est un EN-TÊTE HAUT collant
 * (`<header className="sticky top-0 …">`) — logo, progression, hamburger,
 * menu de thème — et **il ne porte aucune destination**. L'app n'a d'ailleurs
 * aucun routeur : deux écrans, choisis par le hash de l'URL. `BottomNav` exige
 * une liste STATIQUE de routes ; puzzle n'en a pas, et n'en aura pas.
 * L'affirmation venait d'une ressemblance de nom de fichier, jamais vérifiée —
 * et elle a mis un dépôt sur une liste de migration pendant des semaines.
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
 * `trailing` ET `item.className` : LES DEUX MANQUES QU'UNE APP A NOMMÉS EN
 * REFUSANT DE MIGRER. L'en-tête de son `BottomNav.tsx` les décrit, et sa
 * dernière ligne est une demande explicite : « À DEMANDER AU SOCLE si la
 * migration doit un jour aboutir : un emplacement libre en fin de barre
 * (`trailing`), et une accroche d'habillage par élément. » La voici.
 *
 *   `trailing` — UNE CELLULE QUI N'EST PAS UNE DESTINATION. La cinquième de
 *   miss-contraction est un `<button>` qui ouvre le tiroir de l'app, avec
 *   `aria-expanded` et `aria-controls`, et qui s'allume aussi sur les routes
 *   que ce tiroir contient. Ce composant ne prend que des `items` à `href`.
 *   Son propre bouton « Plus » ressemble au sien mais fait autre chose : il
 *   déplie SON tiroir d'onglets en surnombre. Même balisage, autre mécanique —
 *   d'où l'emplacement libre plutôt qu'un détournement.
 *
 *   `item.className` — `key` NE DESCEND PAS DANS LE DOM. Son appel maternité
 *   est un bouton d'action, pas un onglet : gros disque en relief, libellé
 *   masqué visuellement. Tous les `items` étaient rendus à l'identique, sans
 *   aucune accroche par élément, et un sélecteur sur le `href` ne tiendrait pas
 *   — les chemins sont traduits dans sept langues.
 *
 * Les deux sont ADDITIFS : les six apps qui importent déjà cette barre ne
 * changent pas d'un pixel.
 *
 * LE CLIC QUI RÉPOND — `navigate`, ET LE MORCEAU QUI ARRIVE AVANT — `load`.
 * Deux manques de plus, nommés cette fois par DIX apps le même jour.
 *
 *   Le 20/09/2026, un signalement sur miss-badminton (« je clique sur
 *   historique, rien ne se passe ») a mené à ceci : react-router 7 et 8
 *   enveloppent tout changement d'URL dans `startTransition`, et React 19
 *   garde délibérément l'écran déjà affiché plutôt que de le remplacer par un
 *   repli. Le `<Suspense fallback>` d'une route est donc DU CODE MORT AU CLIC ;
 *   mesuré à froid sur deux sites publiés : 133 ms d'écran figé sur
 *   mister-settle, 161 sur mister-molkky, `aria-busy` faux d'un bout à l'autre.
 *   Dix apps ont corrigé cela en une journée, en quatre formes — et QUATRE
 *   d'entre elles, qui passent par cette barre, ont dû la contourner : le
 *   `onClick` était construit ici et appelait `onNavigate(item)` SANS
 *   l'évènement, donc ni `preventDefault`, ni touche de modification, ni
 *   transition ne pouvaient y passer. Chacune a écrit un `linkComponent`
 *   maison et un contexte pour lui porter le geste. Le même geste, quatre fois.
 *
 *   `navigate` — la barre pilote la navigation dans SA transition. L'entrée
 *   cliquée se dit occupée (`aria-busy`, `data-pending`) tant que le morceau
 *   n'est pas arrivé, son icône cède la place au rôle `busy` du contrat
 *   d'icônes, et une zone vive `role="status"` annonce le chargement HORS des
 *   liens — pour ne pas changer leur nom accessible en cours de route. Les
 *   clics à modificateur (Ctrl/Cmd/Maj/Alt, bouton non gauche) restent au
 *   navigateur, comme un `<a>` ordinaire. `onNavigate` reçoit désormais
 *   l'évènement en second argument. SANS `navigate`, rien ne change — ni dans
 *   le DOM, ni dans les props remises à un `linkComponent` maison, et la
 *   nuance a coûté une version : voir le commentaire de `link()`. Pas un
 *   attribut de plus, le lien navigue seul.
 *
 *   `load` — le thunk du morceau, LE MÊME que celui passé à `lazy()`, nommé une
 *   fois au niveau du module (deux `import()` d'un spécificateur écrit
 *   différemment donnent deux morceaux). La barre le tire à l'approche du
 *   pointeur, au focus ou au doigt, par `prefetch` du socle : une seule fois,
 *   jamais sur `saveData` ni en 2g. Le socle exportait déjà `react/use-prefetch`
 *   pour cela — zéro adoptant, treize copies à la main : le branchement manquait
 *   là où les liens sont construits, c'est-à-dire ici.
 *
 * AGNOSTIQUE DE ROUTEUR. Le paquet ne dépend pas de react-router. Par défaut un
 * `<a href>` ; `linkComponent` + `hrefProp` branchent un `Link` (`hrefProp="to"`).
 * L'état actif est calculé ici, jamais délégué : c'est lui qui portait le
 * défaut n° 2.
 *
 * DEUX PIÈGES D'ADOPTION, chacun payé DEUX FOIS (mister-cim10 puis
 * mister-footcoach), donc écrits ici plutôt que redécouverts une troisième :
 *
 * - **Brancher `Link`, PAS `NavLink`.** `NavLink` redéclare son propre
 *   `aria-current` APRÈS l'étalement des props : il y aurait alors deux sources
 *   de vérité pour l'état actif, la nôtre et la sienne, et `end` ne lui est pas
 *   transmis. Les deux apps ont tranché pour `Link`, indépendamment et pour la
 *   même raison.
 * - **`currentPath` est OBLIGATOIRE dès que le routeur a un `basename`.**
 *   Le repli lit `window.location.pathname`, qui vaut `/mon-app/equipes` là où
 *   les `href` valent `/equipes` : **aucun onglet ne serait actif** — et
 *   seulement une fois déployé, jamais en développement. Passer
 *   `useLocation().pathname`, qui est relatif au `basename`.
 *
 * COLLÉE OU DANS LE FLUX : `placement`. Le socle habillait la barre sans la
 * PLACER — `position: relative`, délibérément, parce qu'une barre peut vivre
 * dans une colonne flex qui occupe la hauteur. Résultat mesuré le 05/09/2026 :
 * **huit dépôts** (sept apps et le squelette) recopiaient la même règle
 * `position: fixed; inset-inline: 0; bottom: 0`, avec à côté la même réserve
 * de hauteur sur le contenu. `placement="fixed"` pose la règle une fois, et
 * `<PageContainer reserve="bottom-nav">` réserve la place qu'elle occupe. Le
 * défaut reste `static` : rien ne change pour qui ne le demande pas.
 *
 * Non stylé : cibler `[data-dwc="bottom-nav"]` et descendants.
 *
 * @param {{
 *   items?: Array<{ key?: string, href: string, label: string,
 *     icon?: import('react').ReactNode, badge?: number, badgeLabel?: string,
 *     end?: boolean, className?: string, load?: () => Promise<unknown> }>,
 *   currentPath?: string,
 *   label?: string,
 *   maxVisible?: number,
 *   moreLabel?: string,
 *   linkComponent?: unknown,
 *   hrefProp?: string,
 *   navigate?: (href: string) => void,
 *   onNavigate?: (item: object, event?: object) => void,
 *   className?: string,
 *   trailing?: import('react').ReactNode,
 *   placement?: 'static' | 'fixed',
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
    navigate,
    onNavigate,
    className,
    trailing,
    placement = 'static',
  } = props;

  const labels = useLabels('nav');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const moreRef = useRef(null);

  // LA TRANSITION EST À LA BARRE. `enCours` reste vrai tant que le morceau
  // `lazy` de la destination n'est pas arrivé — c'est le seul signal que
  // react-router n'expose pas hors d'un routeur de données. La cible n'est lue
  // que pendant la transition : pas d'effet pour la remettre à zéro, une valeur
  // périmée n'est jamais affichée.
  const [enCours, demarre] = useTransition();
  const [cible, setCible] = useState(null);
  const enAttente = navigate && enCours ? cible : null;

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

  // Un clic que le navigateur doit garder : touche de modification (nouvel
  // onglet, nouvelle fenêtre, téléchargement), bouton du milieu, ou un
  // gestionnaire de l'app qui a déjà tranché.
  const laisseAuNavigateur = event =>
    !event ||
    event.defaultPrevented ||
    (typeof event.button === 'number' && event.button !== 0) ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey;

  const link = (item, place) => {
    const current = isCurrent(item);
    const attend = enAttente === item.href;
    // `prefetch` dédoublonne par identité de chargeur : `load` doit être LE
    // thunk de module, pas une flèche écrite dans le rendu.
    const tire = item.load ? () => prefetch(item.load) : undefined;
    // UNE CLÉ N'EST POSÉE QUE QUAND CE COMPOSANT A UN AVIS, et c'est une
    // correction, pas une élégance.
    //
    // Passer `'aria-busy': undefined` ne coûte rien sur le `<a>` par défaut :
    // React n'écrit pas un attribut dont la valeur est `undefined`. Mais un
    // `linkComponent` MAISON reçoit ces props en objet, et les étale :
    //
    //   const LienDeMenu = ({ to, ...reste }) =>
    //     <Link to={to} aria-busy={enAttente === to} {...reste} />
    //
    // L'étalement vient APRÈS, la clé EXISTE, et sa valeur `undefined` écrase
    // celle de l'app. Quatre dépôts du parc écrivent exactement cette ligne —
    // ce sont ceux qui avaient dû contourner cette barre avant qu'elle sache
    // attendre —, et la 6.3.1 leur a éteint leur propre `aria-busy` : test
    // rouge sur mister-settle, mesuré dans les deux sens (vert en 6.2.0,
    // rouge en 6.3.1, même fichier).
    //
    // L'en-tête promettait « SANS `navigate`, rien ne change : pas un attribut
    // de plus ». C'était vrai du DOM et faux des props, et le test ne montait
    // que le lien par défaut. Sans `navigate`, ce composant n'a aucun avis sur
    // l'attente ; sans `load`, aucun sur l'intention. Il se tait donc.
    //
    // `aria-current` et `data-current` restent posés dans les deux états, et
    // c'est délibéré : l'état courant, LUI, est calculé ici — c'est même le
    // défaut n° 2 que cette barre existe pour fermer. Sur ceux-là, le
    // composant a un avis y compris quand il vaut « non ».
    const props = {
      key: item.key ?? item.href,
      [hrefProp]: item.href,
      // `key` NE DESCEND PAS DANS LE DOM : une app qui veut habiller un
      // onglet en particulier n'avait aucune prise. Un sélecteur sur le
      // `href` ne remplace pas ce crochet — miss-contraction traduit ses
      // chemins dans sept langues.
      className: item.className,
      'aria-current': current ? 'page' : undefined,
      'data-dwc': `bottom-nav-${place}`,
      'data-current': current ? '' : undefined,
    };
    if (attend) {
      props['aria-busy'] = 'true';
      props['data-pending'] = '';
    }
    if (tire) {
      props.onPointerEnter = tire;
      props.onFocus = tire;
      props.onTouchStart = tire;
    }
    return h(
      linkComponent,
      {
        ...props,
        onClick: event => {
          setMoreOpen(false);
          onNavigate?.(item, event);
          if (!navigate || laisseAuNavigateur(event)) return;
          event.preventDefault();
          setCible(item.href);
          demarre(() => navigate(item.href));
        },
      },
      item.icon || attend
        ? h(
            'span',
            { 'data-dwc': 'bottom-nav-icon', 'aria-hidden': 'true' },
            attend ? h(Icon, { role: 'busy' }) : item.icon
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
      'data-placement': placement === 'fixed' ? 'fixed' : undefined,
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
      : null,
    // LA ZONE VIVE, HORS DES LIENS, et présente dès le montage : une région
    // créée au moment de parler n'est pas annoncée. Elle n'existe que si la
    // barre pilote la navigation — sinon elle n'aurait jamais rien à dire.
    navigate
      ? h(
          'span',
          {
            'data-dwc': 'bottom-nav-sr',
            role: 'status',
            'aria-live': 'polite',
          },
          enAttente ? labels.loading : ''
        )
      : null,
    // En dernier, DANS le repère : une cellule qui n'est pas une destination.
    trailing ?? null
  );
}
