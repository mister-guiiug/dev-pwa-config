import { useLabels } from './labels.js';
import { createElement as h } from 'react';

/**
 * Bandeau d'erreur récupérable : message + bouton Réessayer + fermeture.
 * `severity` distingue temporaire (warning) de permanent (error). Non stylé :
 * cibler `[data-dwc="error-banner"]` et `[data-severity="..."]`.
 *
 * @param {{ message?: import('react').ReactNode, severity?: 'error'|'warning'|'info',
 *   onRetry?: () => void, retryLabel?: string, onDismiss?: () => void,
 *   className?: string }} props
 */
export function ErrorBanner(props = {}) {
  const {
    message,
    severity = 'error',
    onRetry,
    retryLabel,
    onDismiss,
    className,
  } = props;

  const labels = useLabels('error');
  if (!message) return null;
  return h(
    'div',
    {
      className,
      role: severity === 'error' ? 'alert' : 'status',
      'data-dwc': 'error-banner',
      'data-severity': severity,
    },
    h('span', { 'data-dwc': 'error-banner-message' }, message),
    typeof onRetry === 'function'
      ? h(
          'button',
          {
            type: 'button',
            onClick: onRetry,
            'data-dwc': 'error-banner-retry',
          },
          retryLabel ?? labels.retry
        )
      : null,
    typeof onDismiss === 'function'
      ? h(
          'button',
          {
            type: 'button',
            onClick: onDismiss,
            'aria-label': labels.close,
            'data-dwc': 'error-banner-dismiss',
          },
          '×'
        )
      : null
  );
}
