export interface VCardEntry {
  value: string;
  /** `home`, `work`, `cell`… Écrit tel quel dans `TYPE=`. */
  type?: string;
}

export interface VCardAddress {
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: string;
}

export interface VCardContact {
  /** Composé depuis les autres champs s'il manque — `FN` est OBLIGATOIRE. */
  fullName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  organization?: string;
  title?: string;
  note?: string;
  birthday?: string | Date;
  url?: string;
  uid?: string;
  emails?: ReadonlyArray<string | VCardEntry>;
  phones?: ReadonlyArray<string | VCardEntry>;
  addresses?: readonly VCardAddress[];
  categories?: readonly string[];
}

/**
 * Plie une ligne à 75 OCTETS (§3.2), sans jamais couper un caractère en deux.
 * Compter en caractères produit un mojibake sur les accents — c'est-à-dire sur
 * la plupart des noms français.
 */
export declare function foldLine(line: string, limit?: number): string;

/** Échappe une valeur texte (§3.4) : `\`, `,`, `;` et le retour à la ligne. */
export declare function escapeValue(value: unknown): string;

/** Un contact en vCard 4.0, terminée par CRLF. */
export declare function toVCard(contact?: VCardContact): string;

export interface VCardsOptions<T> {
  /** Convertit chaque élément en contact. */
  map?: (item: T) => VCardContact;
}

/** Plusieurs contacts concaténés dans un seul `.vcf`. */
export declare function toVCards<T>(
  contacts: readonly T[],
  options?: VCardsOptions<T>
): string;

/** `text/vcard;charset=utf-8`, pour `downloadText`. */
export declare const VCARD_MIME: string;

/**
 * Déplie les lignes d'un fichier vCard. À faire AVANT toute analyse : une
 * propriété coupée par le pliage n'est pas plusieurs propriétés.
 */
export declare function unfoldLines(text: string): string[];
