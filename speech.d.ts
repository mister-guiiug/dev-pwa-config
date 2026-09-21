/**
 * Convertit une locale interne (`fr`) en étiquette BCP-47 (`fr-FR`).
 * Une étiquette déjà complète est renvoyée telle quelle ; défaut `en-US`.
 */
export declare function localeToBcp47(locale: string): string;

/**
 * Voix correspondant à une étiquette BCP-47, ou `null`.
 *
 * La LANGUE est la seule contrainte dure : aucune voix qui la parle veut dire
 * `null` — jamais une voix d'une autre langue, qui ferait lire du français
 * avec un accent anglais. `null` laisse le moteur décider depuis
 * `utterance.lang`.
 *
 * Dans la langue, la voix par DÉFAUT du système gagne : c'est le choix
 * explicite de l'utilisateur, là où l'ordre de `getVoices()` n'est spécifié
 * nulle part. La région (`fr-FR` contre `fr-CA`) ne départage qu'ensuite.
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
