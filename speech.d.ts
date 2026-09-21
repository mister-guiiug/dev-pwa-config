/**
 * Convertit une locale interne (`fr`) en étiquette BCP-47 (`fr-FR`).
 * Une étiquette déjà complète est renvoyée telle quelle ; défaut `en-US`.
 */
export declare function localeToBcp47(locale: string): string;

/**
 * Voix correspondant à une étiquette BCP-47, ou `null`.
 *
 * Étiquette exacte d'abord (`fr-FR`), puis la même LANGUE (`fr-CA` pour un
 * `fr-FR` demandé), puis `null` — JAMAIS une voix d'une autre langue, qui
 * ferait lire du français avec un accent anglais. `null` laisse le moteur
 * décider depuis `utterance.lang`.
 */
export declare function pickVoice(
  tag: string,
  synth?: SpeechSynthesis
): SpeechSynthesisVoice | null;

/**
 * Énonce un texte via la synthèse vocale du navigateur, si disponible.
 * Un nouvel énoncé interrompt le précédent. Renvoie `true` si l'énoncé a été
 * PLANIFIÉ : il peut partir au tour de boucle suivant, le temps que le moteur
 * ait digéré l'annulation du précédent.
 */
export declare function speak(text: string, lang?: string): boolean;
