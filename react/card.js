import { createElement as h } from 'react';

/**
 * La surface : une carte, et son en-tête.
 *
 * PROMU, PAS INVENTÉ. Dix apps sur dix-sept avaient une carte, aucune ne
 * venait du paquet : `Card.tsx` dans miss-genius et miss-uwh — **le même
 * fichier**, au préfixe de variable CSS près (`--mg-surface` contre
 * `--uwh-surface`) —, dans mister-footcoach (avec `CardHeader`, 23
 * importateurs) et mister-qowa ; et une classe `.card` écrite à la main dans
 * six feuilles de style de plus (carbook, contraction, lookhouse, supaboss,
 * cim10, quota). Le contrat retenu est celui de footcoach, le plus complet.
 *
 * CE QUE LES COPIES FAISAIENT TOUTES : un fond de surface, un filet, un rayon,
 * un padding. Ce sont exactement `--dwc-surface`, `--dwc-border`,
 * `--dwc-radius` et l'espacement fluide du preset — les deux copies de genius
 * et uwh ne différaient que par le nom de la variable que le paquet unifie.
 *
 * UNE CARTE N'A PAS DE RÔLE : c'est une surface, pas un contrôle. Rendre tout
 * le bloc cliquable par un `onClick` sur le `div` le réserve à la souris —
 * sans rôle ni focus, ni le clavier ni un lecteur d'écran n'y accèdent.
 * L'action se pose sur un élément focusable À L'INTÉRIEUR (`CardHeader`
 * `action`), ou la carte devient un vrai lien (`as: 'a'`) avec une seule
 * destination.
 *
 * Non stylé : cibler `[data-dwc="card"]` et descendants, ou importer
 * `components.css`.
 *
 * @param {{ as?: string, padding?: boolean, className?: string,
 *   children?: import('react').ReactNode }} props
 *   `padding: false` pour un contenu qui touche les bords (une image, une
 *   liste) ; `as` pour `article`, `section`, `a`, `li`.
 */
export function Card(props = {}) {
  const { as = 'div', padding = true, className, children, ...rest } = props;
  return h(
    as,
    {
      ...rest,
      className,
      'data-dwc': 'card',
      'data-padding': padding ? undefined : 'none',
    },
    children
  );
}

/**
 * L'en-tête d'une carte : un titre, un sous-titre facultatif, une action à
 * droite. Le titre est un VRAI titre (`h3` par défaut, `as` pour le niveau) :
 * la structure du document survit à la mise en page, un lecteur d'écran
 * navigue de carte en carte par les titres.
 *
 * @param {{ title: import('react').ReactNode, subtitle?: import('react').ReactNode,
 *   action?: import('react').ReactNode, as?: string, className?: string }} props
 */
export function CardHeader(props = {}) {
  const { title, subtitle, action, as = 'h3', className, ...rest } = props;
  return h(
    'div',
    { ...rest, className, 'data-dwc': 'card-header' },
    h(
      'div',
      { 'data-dwc': 'card-heading' },
      h(as, { 'data-dwc': 'card-title' }, title),
      subtitle ? h('p', { 'data-dwc': 'card-subtitle' }, subtitle) : null
    ),
    action ? h('div', { 'data-dwc': 'card-action' }, action) : null
  );
}
