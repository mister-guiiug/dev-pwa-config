/** Minuscules, accents retirés, ponctuation en espaces. */
export declare function normalizeName(value: unknown): string;

/**
 * Similarité entre 0 et 1 (Sørensen–Dice sur bigrammes) : robuste aux
 * inversions de mots et aux petites fautes, là où une distance d'édition
 * punit un mot déplacé autant qu'un mot faux.
 */
export declare function nameSimilarity(a: unknown, b: unknown): number;

export type SimilarityReason =
  | 'same-name'
  | 'very-close'
  | 'similar-name-nearby';

export declare const REASONS: {
  readonly sameName: 'same-name';
  readonly veryClose: 'very-close';
  readonly similarNameNearby: 'similar-name-nearby';
};

export interface SimilarMatch<T> {
  item: T;
  similarity: number;
  /** `null` quand aucune fonction `distance` n'a été fournie. */
  distance: number | null;
  /**
   * Pourquoi ce rapprochement est proposé. Une suggestion de doublon qui ne
   * dit pas pourquoi n'est pas actionnable.
   */
  reason: SimilarityReason;
}

export interface FindSimilarOptions<T, A> {
  /**
   * Écart entre deux éléments : kilomètres pour une carte, différence de prix
   * pour une annonce, jours pour un évènement. Sans elle, seuls les noms
   * comptent.
   */
  distance?: (a: A, b: A) => number;
  /** Au-delà, l'élément n'est ni comparé ni proposé. Défaut : `Infinity`. */
  maxDistance?: number;
  /** En deçà, le nom ne compte plus. Défaut : `0`. */
  closeEnough?: number;
  /** Similarité minimale hors de `closeEnough`. Défaut : `0.55`. */
  minSimilarity?: number;
  nameOf?: (item: T) => string;
  atOf?: (item: T) => A;
}

/** Les candidats qui ressemblent, du plus probable au moins probable. */
export declare function findSimilar<T, A = unknown>(
  candidate: { name: string; at?: A },
  existing: readonly T[],
  options?: FindSimilarOptions<T, A>
): Array<SimilarMatch<T>>;
