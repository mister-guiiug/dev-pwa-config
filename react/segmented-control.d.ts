import type { FC, ReactNode } from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** Défaut `md`. */
  size?: 'sm' | 'md';
  ariaLabel?: string;
  /** Occupe toute la largeur, segments équirépartis. */
  fullWidth?: boolean;
  className?: string;
}

/**
 * Contrôle segmenté (onglets « pilule »). Non stylé : cibler
 * `[data-dwc="segmented"]` — base fournie par `components.css`.
 */
export declare const SegmentedControl: FC<SegmentedControlProps>;
