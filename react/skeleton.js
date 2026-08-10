import { createElement as h } from 'react';

/**
 * Squelettes de chargement : esquisser la FORME du contenu à venir plutôt
 * qu'afficher un spinner centré — la page ne saute pas à l'arrivée des données.
 *
 * Trois apps (miss-supaboss, mister-doc, mister-molkky) avaient la même brique
 * et la même règle d'accessibilité : les barres sont décoratives
 * (`aria-hidden`), c'est le CONTENEUR qui porte `role="status"` + `aria-busy`
 * et un libellé lisible par lecteur d'écran. Une barre annoncée une par une
 * produirait un bavardage inutile.
 *
 * Non stylé : cibler `[data-dwc="skeleton"]` / `[data-dwc="skeleton-group"]`.
 */

/**
 * Une barre. Par défaut une ligne de texte pleine largeur : le cas courant
 * tient en `<Skeleton />` sans jongler avec width/height.
 *
 * @param {{ width?: string|number, height?: string|number,
 *   radius?: 'sm'|'md'|'lg'|'full', className?: string }} props
 */
export function Skeleton(props = {}) {
  const { width = '100%', height = '1rem', radius = 'md', className } = props;
  return h('span', {
    className,
    'aria-hidden': 'true',
    'data-dwc': 'skeleton',
    'data-radius': radius,
    style: { width, height },
  });
}

/**
 * Conteneur annoncé : `role="status"` + `aria-busy`, libellé en texte masqué.
 * `lines` rend N barres de largeur dégressive si aucun enfant n'est fourni.
 *
 * @param {{ label: string, lines?: number, className?: string,
 *   children?: import('react').ReactNode }} props
 */
export function SkeletonGroup(props = {}) {
  const { label, lines = 3, className, children } = props;

  const content =
    children ??
    Array.from({ length: lines }, (_, i) =>
      h(Skeleton, {
        key: i,
        // Dernière ligne plus courte : c'est ce qui fait « lire » un paragraphe.
        width: i === lines - 1 ? '60%' : '100%',
      })
    );

  return h(
    'div',
    {
      className,
      role: 'status',
      'aria-busy': 'true',
      'data-dwc': 'skeleton-group',
    },
    h('span', { 'data-dwc': 'skeleton-label' }, label),
    content
  );
}
