import { createElement as h } from 'react';

/**
 * État vide avec action suivante (CTA). Non stylé : cibler
 * `[data-dwc="empty-state"]` et descendants.
 *
 * `description` prend une chaîne ; `children` prend tout le reste. Sept apps
 * ont leur propre `EmptyState`, et celle de miss-uwh n'accepte QUE des
 * `children` — une liste, un lien, une explication de deux paragraphes. Se
 * limiter à une chaîne, c'était refuser la moitié des usages constatés.
 *
 * @param {{ icon?: import('react').ReactNode, title?: string,
 *   description?: string, children?: import('react').ReactNode,
 *   action?: import('react').ReactNode, className?: string }} props
 */
export function EmptyState(props = {}) {
  const { icon, title, description, children, action, className } = props;
  return h(
    'div',
    { className, 'data-dwc': 'empty-state', role: 'note' },
    icon
      ? h(
          'div',
          { 'data-dwc': 'empty-state-icon', 'aria-hidden': 'true' },
          icon
        )
      : null,
    title ? h('p', { 'data-dwc': 'empty-state-title' }, title) : null,
    description
      ? h('p', { 'data-dwc': 'empty-state-desc' }, description)
      : null,
    children ? h('div', { 'data-dwc': 'empty-state-body' }, children) : null,
    action ? h('div', { 'data-dwc': 'empty-state-action' }, action) : null
  );
}
