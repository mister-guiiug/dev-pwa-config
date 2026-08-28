import type { FC } from 'react';
import type { DescribeOptions, ProjectOptions } from '../sparkline.js';

export interface SparklineProps<T = unknown>
  extends ProjectOptions<T>,
    DescribeOptions<T> {
  values: ReadonlyArray<number | null | undefined | T>;
  /** Marquer le dernier point. Défaut : `true`. */
  showLast?: boolean;
  className?: string;
}

/** Courbe minuscule. Non stylée : cibler `[data-dwc="sparkline"]`. */
export declare const Sparkline: FC<SparklineProps>;

export interface BarChartProps<T = unknown>
  extends ProjectOptions<T>,
    DescribeOptions<T> {
  values: ReadonlyArray<number | null | undefined | T>;
  className?: string;
}

/** Barres proportionnelles. Non stylées : cibler `[data-dwc="bars"]`. */
export declare const BarChart: FC<BarChartProps>;

export interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  format?: (value: number) => string;
  unit?: string;
  className?: string;
}

/**
 * Jauge de NIVEAU (`role="meter"`), pas d'avancement : les lecteurs d'écran
 * annoncent les deux différemment.
 */
export declare const Gauge: FC<GaugeProps>;
