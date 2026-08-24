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
