import type { FC, ReactNode } from 'react';

export interface StatProps {
  label: string;
  value: ReactNode;
  /** Variation affichée sous la valeur (ex. « 12 », « +3,2 % »). */
  delta?: ReactNode;
  trend?: 'up' | 'down' | 'flat';
  /**
   * Libellé textuel de la tendance (ex. « en hausse »), lu par les lecteurs
   * d'écran : la variation ne doit pas reposer sur la seule couleur.
   */
  trendLabel?: string;
  icon?: ReactNode;
  className?: string;
}

/** Chiffre-clé en `<dl>` (non stylé, cibler `[data-dwc="stat"]`). */
export declare const Stat: FC<StatProps>;
