import { createElement as h } from 'react';

/**
 * État vide avec action suivante (CTA). Non stylé : cibler
 * `[data-dwc="empty-state"]` et descendants.
 *
 * @param {{ icon?: import('react').ReactNode, title?: string,
 *   description?: string, action?: import('react').ReactNode, className?: string }} props
 */
export function EmptyState(props = {}) {
  const { icon, title, description, action, className } = props;
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
    action ? h('div', { 'data-dwc': 'empty-state-action' }, action) : null
  );
}
