import type { FC, ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  /** Étiquette la boîte (`aria-labelledby`). Toujours requis : sans lui, la
   *  boîte n'a pas de nom accessible — le défaut de mister-quota. */
  title: ReactNode;
  /** Décrit l'action (`aria-describedby`). `children` a la priorité. */
  message?: ReactNode;
  /** En mono-action, le défaut passe de « Confirmer » à « OK ». */
  confirmLabel?: string;
  /**
   * `null` — et non `undefined`, qui garde le repli « Annuler » — retire le
   * bouton Annuler : mode MONO-ACTION pour les alertes. Le focus initial va
   * sur l'action unique, et Échap comme le voile valent un « OK »
   * (`onConfirm`, garde `loading` comprise).
   */
  cancelLabel?: string | null;
  /**
   * Action irréversible : le libellé de confirmation passe à « Supprimer » et
   * `[data-destructive]` est posé sur la racine.
   */
  destructive?: boolean;
  /** Confirmation en cours : la boîte reste ouverte, les boutons sont inertes. */
  loading?: boolean;
  onConfirm: () => void;
  /**
   * Requis dès que le bouton Annuler existe — sans lui, ni le bouton, ni
   * Échap, ni le voile ne feraient rien. Ignoré en mono-action
   * (`cancelLabel: null`), où toute sortie passe par `onConfirm`.
   */
  onCancel?: () => void;
  children?: ReactNode;
  className?: string;
}

/**
 * Confirmation d'une action, en remplacement de `window.confirm`.
 * `role="alertdialog"`, focus initial sur Annuler, Échap annule.
 * `cancelLabel={null}` : mode mono-action, en remplacement de `window.alert`.
 */
export declare const ConfirmDialog: FC<ConfirmDialogProps>;
