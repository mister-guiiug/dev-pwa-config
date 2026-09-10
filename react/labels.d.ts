import type { FC } from 'react';

import type {
  LabelGroups,
  LabelOverrides,
  LabelsProviderProps,
} from './labels-core.js';

export type { LabelGroups, LabelOverrides, LabelsProviderProps };
export { DEFAULT_LOCALE, mergeLabels, useLabels } from './labels-core.js';

/**
 * Dictionnaire complet, indexé par locale. Sept fournies : `fr`, `en`, `es`,
 * `de`, `it`, `pt`, `nl` — les langues que la famille parle. Chacune est aussi
 * un sous-chemin à part (`react/labels-fr` … `react/labels-nl`).
 */
export declare const LABELS: Record<string, LabelGroups>;

/**
 * Le dictionnaire d'une locale, ou `null` si aucune ne convient. Une étiquette
 * régionale (`pt-BR`, `de-CH`) retombe sur sa langue avant de rendre `null`.
 */
export declare function labelsFor(locale: string): LabelGroups | null;

/**
 * Fournit les libellés aux composants, en résolvant la locale contre les sept
 * dictionnaires — synchronement, comme avant la 4.10.
 */
export declare const LabelsProvider: FC<LabelsProviderProps>;
