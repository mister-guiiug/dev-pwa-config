/**
 * Échappe les caractères qui ont un sens en HTML.
 *
 * Rend une chaîne sûre à insérer COMME TEXTE. N'assainit PAS du HTML destiné à
 * `innerHTML` — ce n'est pas le même problème.
 */
export declare function escapeHtml(input: string): string;

/** Échappe les caractères spéciaux d'une expression régulière. */
export declare function escapeRegex(text: string): string;

/** Contrôles invisibles retirés, rogne, plafonne la longueur, échappe. */
export declare function sanitizeInput(
  input: string,
  maxLength?: number
): string;

/** Identifiant aléatoire imprévisible (128 bits, hexadécimal). */
export declare function generateSecureId(): string;

/** Empreinte SHA-256 hexadécimale. */
export declare function hashString(text: string): Promise<string>;

/** `true` si l'URL est absolue ET en HTTPS. */
export declare function isValidHttpsUrl(url: string): boolean;

/** Écarte les saisies manifestement fausses ; ne prouve pas qu'une adresse existe. */
export declare function isValidEmail(email: string): boolean;

/** Domaine d'une adresse valide, sinon `null`. */
export declare function extractDomainFromEmail(email: string): string | null;

/** Masque une adresse pour l'affichage (`j****n@exemple.fr`). */
export declare function maskEmail(email: string): string;

/** Masque un numéro, en gardant les deux derniers chiffres. */
export declare function maskPhone(phone: string): string;

/**
 * Remplace par `[masqué]` ce qui ressemble à une donnée personnelle ou à un
 * secret, avant journalisation. Récursif, profondeur bornée.
 */
export declare function redact<T>(value: T, extraKeys?: string[]): unknown;

/**
 * Normalise un texte utilisateur SANS l'échapper — pour le stocker tel quel
 * (React échappera à l'affichage). Contrôles et caractères bidi invisibles
 * retirés, fins de ligne normalisées, longueur plafonnée.
 */
export declare function sanitizeUserText(
  raw: unknown,
  maxLength: number
): string;

/** Variante une seule ligne, espaces normalisés (noms, titres). */
export declare function sanitizeSingleLine(
  raw: unknown,
  maxLength: number
): string;

/** `true` si l'URL est absolue et en http(s) — jamais `javascript:` ni `data:`. */
export declare function isSafeHttpUrl(raw: unknown): boolean;
