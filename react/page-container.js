import { createElement as h } from 'react';

/**
 * Le conteneur d'une vue : largeur progressive et zones sûres.
 *
 * PROMU, PAS INVENTÉ. `miss-badminton` (47 l.) et `mister-molkky` (26 l.)
 * portaient chacune un `PageContainer` pour la même chose : centrer la vue,
 * la borner à une largeur qui grandit du téléphone au grand écran, et prendre
 * les zones sûres iOS — celle du bas surtout, sans laquelle le dernier bouton
 * d'une vue colle à la barre d'onglets. Les vues qui l'oubliaient, dans ces
 * deux apps, collaient.
 *
 * `width` est un PALIER, pas une valeur : `sm` (28 rem), `md` (36), `lg`
 * (48), `xl` (64), `full`. Quatre paliers suffisaient aux deux copies.
 *
 * AUCUNE SÉMANTIQUE : c'est une largeur et des marges. `as="main"` quand il
 * est la région principale de la page — une seule par page.
 *
 * Non stylé : cibler `[data-dwc="page-container"][data-width]`, ou importer
 * `components.css`.
 *
 * @param {{ as?: string, width?: 'sm'|'md'|'lg'|'xl'|'full',
 *   padding?: boolean, className?: string,
 *   children?: import('react').ReactNode }} props
 */
export function PageContainer(props = {}) {
  const {
    as = 'div',
    width = 'md',
    padding = true,
    className,
    children,
    ...rest
  } = props;
  return h(
    as,
    {
      ...rest,
      className,
      'data-dwc': 'page-container',
      'data-width': width,
      'data-padding': padding ? undefined : 'none',
    },
    children
  );
}
