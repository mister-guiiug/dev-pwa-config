import { useLabels } from './labels.js';
import { createElement as h } from 'react';

/**
 * Bandeau d'erreur récupérable : message + bouton Réessayer + fermeture.
 * Non stylé : cibler `[data-dwc="error-banner"]` et `[data-severity="..."]`.
 *
 * `tone` EST LE MOT DE LA FAMILLE, et `severity` son ancien nom. L'audit du
 * 06/09/2026 a compté sept attributs pour une seule idée — `tone`, `kind`,
 * `variant`, `severity`, `status`, `state`, `size` — dont trois désignaient
 * bel et bien le ton sémantique. Le vocabulaire retenu est celui de `Badge` :
 * **`tone`** pour le sens, **`variant`** pour la forme.
 *
 * `severity` CONTINUE DE MARCHER, et l'attribut rendu ne change pas : les
 * feuilles de style des apps ciblent `[data-severity]`, les casser pour un mot
 * serait payer le renommage deux fois. `tone: 'danger'` est simplement traduit
 * en `severity: 'error'` — un alias, pas une seconde mécanique.
 *
 * @param {{ message?: import('react').ReactNode,
 *   tone?: 'danger'|'warning'|'info',
 *   severity?: 'error'|'warning'|'info',
 *   onRetry?: () => void, retryLabel?: string, onDismiss?: () => void,
 *   className?: string }} props
 */
export function ErrorBanner(props = {}) {
  const {
    message,
    tone,
    severity = tone === 'danger' ? 'error' : (tone ?? 'error'),
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
