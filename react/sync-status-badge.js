import { createElement as h } from 'react';

const DEFAULT_LABELS = {
  synced: 'Synchronisé',
  pending: 'En attente',
  offline: 'Hors ligne',
  error: 'Erreur',
};

/**
 * Badge d'état de synchronisation (non stylé : cibler `[data-dwc="sync-status"]`
 * et `[data-status="..."]`). status ∈ synced|pending|offline|error.
 *
 * @param {{ status: 'synced'|'pending'|'offline'|'error', pending?: number,
 *   className?: string, labels?: Record<string, string> }} props
 */
export function SyncStatusBadge(props) {
  const { status, pending = 0, className, labels = {} } = props;
  const base = labels[status] ?? DEFAULT_LABELS[status] ?? status;
  const text =
    status === 'pending' && pending > 0 ? `${base} (${pending})` : base;
  return h(
    'span',
    {
      className,
      role: 'status',
      'data-dwc': 'sync-status',
      'data-status': status,
    },
    text
  );
}
