export interface ShortcutMap {
  /** Clés en minuscules (`e.key.toLowerCase()`) : `'r'`, `'escape'`, `' '`… */
  [key: string]: (event: KeyboardEvent) => void;
}

/**
 * Raccourcis clavier globaux, inertes dans les champs éditables et pendant
 * une composition IME.
 */
export declare function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  enabled?: boolean
): void;
