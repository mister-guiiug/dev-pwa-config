/** Montant monétaire (`1 234,50 €`). Vide si `amount` n'est pas fini. */
export declare function formatCurrency(
  amount: number,
  locale?: string,
  currency?: string
): string;

/** Nombre avec séparateurs de milliers. */
export declare function formatNumber(
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string;

/** Pourcentage à partir d'une PROPORTION (0,42 → « 42 % »). */
export declare function formatPercentage(
  value: number,
  locale?: string,
  digits?: number
): string;

/** Date courte (`12 août 2026`). */
export declare function formatDate(
  date: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string;

/** Date et heure (`12 août 2026, 14:05`). */
export declare function formatDateTime(
  date: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string;

/** Temps relatif (`il y a 3 jours`). `now` rend la fonction testable. */
export declare function formatRelativeTime(
  date: Date | string | number,
  locale?: string,
  now?: Date | number
): string;

/** Tronque en ajoutant une ellipse. */
export declare function truncate(
  text: string,
  maxLength?: number,
  ellipsis?: string
): string;

/** Première lettre en capitale. */
export declare function capitalize(text: string): string;

/** Identifiant d'URL, diacritiques retirés et tirets de bord rognés. */
export declare function slugify(text: string): string;

/** Numéro français à dix chiffres, en groupes de deux. Sinon, inchangé. */
export declare function formatPhoneNumber(phone: string): string;

/** Taille de fichier lisible (`1,4 Mo`). */
export declare function formatBytes(
  bytes: number,
  locale?: string,
  digits?: number
): string;

/**
 * Déplace la locale par défaut de TOUTES les fonctions ci-dessus.
 * `createI18n` l'appelle à chaque changement de langue.
 */
export declare function setDefaultLocale(tag: string): void;

/** Locale par défaut courante (`'fr-FR'` tant que rien ne la déplace). */
export declare function getDefaultLocale(): string;

/** Énumération dans la langue (`« a, b et c »`). */
export declare function formatList(
  values: readonly unknown[],
  locale?: string,
  options?: Intl.ListFormatOptions
): string;

/** Les mêmes fonctions, la locale déjà posée. */
export declare function createFormatters(
  locale?: string,
  options?: { currency?: string }
): {
  locale: string;
  currency: (value: number, code?: string) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  percent: (value: number, digits?: number) => string;
  date: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  dateTime: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  relative: (value: Date | string | number, now?: Date | number) => string;
  bytes: (value: number, digits?: number) => string;
  list: (
    values: readonly unknown[],
    options?: Intl.ListFormatOptions
  ) => string;
  count: (value: number) => string;
  usage: (
    value: number | null,
    quota: number,
    options?: { bytes?: boolean }
  ) => string;
  duration: (ms: number) => string;
};

/** Compteur compact (`1,2 k`, `50 k`, `1,3 M`). */
export declare function formatCount(value: number, locale?: string): string;

/** Consommation « X / Y » (`31,5 Mo / 5 Go`, `2 / 50 k`). `null` → tiret. */
export declare function formatUsage(
  value: number | null,
  quota: number,
  options?: { bytes?: boolean; locale?: string }
): string;

/** Durée courte (`45 s`, `2 min 15 s`). */
export declare function formatDuration(ms: number): string;
