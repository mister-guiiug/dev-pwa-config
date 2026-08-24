import type { FC, ReactNode } from 'react';

/** Groupes de libellés portés par le paquet. */
export interface LabelGroups {
  sheet: { close: string };
  confirm: { confirm: string; cancel: string; destructiveConfirm: string };
  toast: { close: string; region: string };
  error: { retry: string; close: string };
  install: {
    title: string;
    description: string;
    install: string;
    dismiss: string;
  };
  update: {
    title: string;
    update: string;
    updating: string;
    snooze: string;
    dismiss: string;
    force: string;
    forceHint: string;
  };
  footer: { source: string; sponsor: string };
  apps: {
    repo: string;
    source: string;
    sponsor: string;
    otherApps: string;
  };
  maturity: { alpha: string; beta: string; stable: string };
  sync: { synced: string; pending: string; offline: string; error: string };
  nav: { label: string; current: string; more: string };
}

/** Surcharges partielles, groupe par groupe. */
export type LabelOverrides = {
  [G in keyof LabelGroups]?: Partial<LabelGroups[G]>;
};

/** Dictionnaire complet, indexé par locale (`fr` et `en` fournis). */
export declare const LABELS: Record<string, LabelGroups>;

/** Locale de repli : le français, ce que les composants codaient en dur. */
export declare const DEFAULT_LOCALE: string;

/** Fusionne un jeu de libellés avec des surcharges, groupe par groupe. */
export declare function mergeLabels(
  base: LabelGroups,
  overrides?: LabelOverrides
): LabelGroups;

export interface LabelsProviderProps {
  /** `'fr'` par défaut ; une locale inconnue retombe sur le français. */
  locale?: string;
  /** Remplace des libellés sans changer de langue. */
  overrides?: LabelOverrides;
  children?: ReactNode;
}

/** Fournit les libellés des composants du paquet à tout l'arbre. */
export declare const LabelsProvider: FC<LabelsProviderProps>;

/**
 * Libellés d'un groupe. Utilisable HORS provider : renvoie alors le français.
 */
export declare function useLabels<G extends keyof LabelGroups>(
  group: G
): LabelGroups[G];
