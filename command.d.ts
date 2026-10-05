/** Cible éditable : input, textarea, select, ou contenteditable. */
export declare function isEditableTarget(
  target: EventTarget | null | undefined
): boolean;

/** Ctrl/Meta+K sans Alt ni Shift. */
export declare function isCommandHotkey(event: KeyboardEvent): boolean;

/** `/` sans modificateur, hors champ éditable. */
export declare function isSlashHotkey(event: KeyboardEvent): boolean;

/** Déplace l'index actif dans `[0, length)` ; `-1` si la liste est vide. */
export declare function moveActiveIndex(
  active: number,
  length: number,
  delta: 1 | -1
): number;

/** Correspondance sous-chaîne sur `search` / `label` (ou la chaîne elle-même). */
export declare function itemMatchesQuery(
  item: { search?: string; label?: string } | string,
  query: string
): boolean;

export interface FilterCommandItemsOptions<T> {
  limit?: number;
  match?: (item: T, query: string) => boolean;
}

/** Filtre les items ; `limit` coupe dès que le plafond est atteint. */
export declare function filterCommandItems<T>(
  items: T[],
  query: string,
  options?: FilterCommandItemsOptions<T>
): T[];

/** Focus (+ sélection) sur l'input de commande. */
export declare function focusCommandInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  options?: { select?: boolean }
): void;

export interface BindSearchHotkeysOptions {
  slash?: boolean;
  select?: boolean;
  onOpen?: () => void;
  target?: Document | Window | HTMLElement;
}

/**
 * Ctrl/Meta+K et optionnellement `/` → focus l'input.
 * Renvoie une fonction de désabonnement.
 */
export declare function bindSearchHotkeys(
  input: HTMLInputElement | HTMLTextAreaElement,
  options?: BindSearchHotkeysOptions
): () => void;

export interface AttachCommandComboboxOptions<T> {
  input: HTMLInputElement;
  list: HTMLElement;
  getItems: (query: string) => T[];
  onSelect: (item: T) => void;
  renderItem?: (item: T, index: number, selected: boolean) => HTMLElement;
  emptyLabel?: string | null;
  emptyClass?: string;
  idPrefix?: string;
  blurDelayMs?: number;
  hotkeys?: boolean;
  slash?: boolean;
  clearOnSelect?: boolean;
}

export interface CommandComboboxApi<T> {
  close: () => void;
  refresh: () => void;
  dispose: () => void;
  getActiveIndex: () => number;
  getHits: () => T[];
}

/**
 * Combobox ARIA (flèches / Entrée / Échap / blur) + raccourcis Ctrl+K et `/`.
 */
export declare function attachCommandCombobox<T>(
  options: AttachCommandComboboxOptions<T>
): CommandComboboxApi<T>;
