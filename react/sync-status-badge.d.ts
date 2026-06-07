import type { FC } from 'react';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

export interface SyncStatusBadgeProps {
  status: SyncStatus;
  /** Nombre d'éléments en attente (affiché pour status="pending"). */
  pending?: number;
  className?: string;
  labels?: Partial<Record<SyncStatus, string>>;
}

/** Badge d'état de synchronisation (non stylé, cibler `[data-dwc]`/`[data-status]`). */
export declare const SyncStatusBadge: FC<SyncStatusBadgeProps>;
