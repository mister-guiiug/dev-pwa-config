export interface UndoableStateOptions<T> {
  /** Relit la sauvegarde au montage (reprise après refresh). */
  load?: () => T | null;
  /** Persiste chaque état courant non final. */
  save?: (state: T) => void;
  /** Efface la sauvegarde (état final ou `reset`). */
  clear?: () => void;
  /** Un état final n'est plus sauvegardé. */
  isFinal?: (state: T) => boolean;
  /** Profondeur d'undo (défaut 50). */
  maxHistory?: number;
}

export interface UndoableState<T> {
  /** État courant, ou `null` tant que rien n'est démarré. */
  state: T | null;
  canUndo: boolean;
  /** Démarre un nouvel état (vide l'historique). */
  start: (state: T) => void;
  /** Applique une transition (empile l'état précédent pour l'undo). */
  apply: (next: T) => void;
  /** Revient à l'état précédent. */
  undo: () => void;
  /** Efface la sauvegarde et revient à `null`. */
  reset: () => void;
}

/** État avec annulation (undo) et persistance optionnelle via ports injectés. */
export declare function useUndoableState<T>(
  options?: UndoableStateOptions<T>
): UndoableState<T>;
