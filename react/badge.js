import { createElement as h } from 'react';

/**
 * Pastille d'état ou d'étiquette.
 *
 * Quatre apps avaient leur propre `Badge` / `badges.tsx`, chacune avec sa
 * propre liste de couleurs ad hoc. On introduit ici l'axe manquant : un `tone`
 * SÉMANTIQUE (ce que la pastille veut dire) plutôt qu'une couleur (à quoi elle
 * ressemble), décliné en trois intensités.
 *
 * `tone` est volontairement fermé : six intentions couvrent tous les usages
 * relevés, et une liste ouverte ramènerait les couleurs en dur.
 *
 * `variant` n'en compte que deux : une variante pleine (ton en aplat, texte
 * inversé) ne peut pas tenir 4,5:1 avec une seule couleur par ton — un ambre
 * ou un vert clair ne portent pas de texte blanc. Voir le commentaire dans
 * `components.css`.
 *
 * Non stylé : cibler `[data-dwc="badge"][data-tone][data-variant]`.
 *
 * @param {{ tone?: 'brand'|'success'|'warning'|'danger'|'info'|'muted',
 *   variant?: 'soft'|'outline', icon?: import('react').ReactNode,
 *   children?: import('react').ReactNode, className?: string }} props
 */
export function Badge(props = {}) {
  const {
    tone = 'muted',
    variant = 'soft',
    icon,
    children,
    className,
    ...rest
  } = props;

  return h(
    'span',
    {
      ...rest,
      className,
      'data-dwc': 'badge',
      'data-tone': tone,
      'data-variant': variant,
    },
    icon ? h('span', { 'aria-hidden': 'true' }, icon) : null,
    children
  );
}
