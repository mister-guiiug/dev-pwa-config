import type { FC } from 'react';
import type { ApplyUpdateOptions } from '../sw-update.js';

export interface UpdateButtonProps {
  label?: string;
  updatingLabel?: string;
  /** Texte d'explication ; affiché seulement si `showHint`. */
  hint?: string;
  showHint?: boolean;
  className?: string;
  updateOptions?: ApplyUpdateOptions;
}

/** Bouton « Forcer la mise à jour » : purge le cache applicatif et recharge. */
export declare const UpdateButton: FC<UpdateButtonProps>;
