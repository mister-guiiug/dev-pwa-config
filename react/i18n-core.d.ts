/**
 * Union des chemins dot-notation d'un dictionnaire de messages.
 * Pour `{ a: { b: string; c: { d: string } } }` → `'a.b' | 'a.c.d'`.
 */
export type I18nPaths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends object
          ? `${K}.${I18nPaths<T[K]>}`
          : never;
    }[keyof T & string];

export function resolvePath(obj: unknown, path: string): unknown;

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string;

/**
 * Fabrique une fonction de traduction typée pour une locale (repli inclus).
 * Le compilateur refuse une clé absente du dictionnaire.
 */
export function createTranslator<M, L extends string>(
  messages: Record<L, M>,
  locale: L,
  fallbackLocale: L
): (path: I18nPaths<M>, params?: Record<string, string | number>) => string;

/** Formes CLDR d'un pluriel. `other` est la seule vraiment obligatoire. */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Choisit la forme correcte selon la quantité, via `Intl.PluralRules`.
 * `{count}` est interpolé automatiquement.
 */
export function plural(
  count: number,
  forms: PluralForms,
  locale?: string,
  params?: Record<string, string | number>
): string;
