export type ClassPart =
  | string
  | number
  | false
  | null
  | undefined
  | ClassPart[]
  | Record<string, unknown>;

/**
 * Joint des classes CSS : chaînes, tableaux, objets `{ classe: condition }`,
 * rien pour le faux. `cn('a', cond && 'b', { c: on })` → `'a b c'`.
 */
export declare function cn(...parts: ClassPart[]): string;
