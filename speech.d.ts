/**
 * Convertit une locale interne (`fr`) en étiquette BCP-47 (`fr-FR`).
 * Une étiquette déjà complète est renvoyée telle quelle ; défaut `en-US`.
 */
export declare function localeToBcp47(locale: string): string;

/**
 * Énonce un texte via la synthèse vocale du navigateur, si disponible.
 * Annule l'énoncé précédent. Renvoie `true` si l'énoncé a été planifié.
 */
export declare function speak(text: string, lang?: string): boolean;
