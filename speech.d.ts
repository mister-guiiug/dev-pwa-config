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
 * Voix disponibles dans une langue, dans l'ordre où le navigateur les rend.
 *
 * Sert à PROPOSER un choix : aucune API n'expose la qualité d'une voix, et
 * certaines articulent mal. La région ne restreint pas — on propose toute la
 * langue.
 */
export declare function listVoices(
  lang: string,
  synth?: SpeechSynthesis
): SpeechSynthesisVoice[];

/**
 * S'abonne à l'arrivée des voix : `getVoices()` rend un tableau VIDE au premier
 * appel. Le rappel est déclenché après invalidation du cache interne, donc il
 * voit bien la liste neuve. Renvoie de quoi se désabonner.
 */
export declare function onVoicesChanged(
  rappel: () => void,
  synth?: SpeechSynthesis
): () => void;

/**
 * Énonce un texte via la synthèse vocale du navigateur, si disponible.
 * Un nouvel énoncé interrompt le précédent. Renvoie `true` si l'énoncé a été
 * PLANIFIÉ : il peut partir au tour de boucle suivant, le temps que le moteur
 * ait digéré l'annulation du précédent.
 *
 * `voiceName` est le `name` de la voix choisie par l'utilisateur — et non son
 * `voiceURI`, qui diffère d'un navigateur à l'autre pour une même voix. Une
 * voix inconnue ou d'une autre langue est ignorée au profit de `pickVoice`,
 * jamais du silence.
 */
export declare function speak(
  text: string,
  lang?: string,
  options?: { voiceName?: string }
): boolean;
