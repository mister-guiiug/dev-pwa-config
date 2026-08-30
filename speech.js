/**
 * Synthèse vocale (Web Speech) — annonces sonores et a11y.
 *
 * PROMU depuis `miss-dice/src/a11y/speech.ts`. Tolérant : aucune erreur si
 * l'API manque (Web Speech non supporté, SSR, tests). L'énoncé précédent est
 * annulé pour ne pas empiler les phrases.
 */

/** Étiquette BCP-47 par locale courte, pour choisir la bonne voix. */
const LOCALE_BCP47 = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
};

/**
 * Convertit une locale interne (`fr`) en étiquette BCP-47 (`fr-FR`).
 * Une étiquette déjà complète est renvoyée telle quelle ; défaut `en-US`.
 * @param {string} locale
 */
export function localeToBcp47(locale) {
  if (typeof locale === 'string' && locale.includes('-')) return locale;
  return LOCALE_BCP47[locale] ?? 'en-US';
}

/**
 * Énonce un texte via la synthèse du navigateur, si disponible.
 * @param {string} text
 * @param {string} lang Étiquette BCP-47 (ou locale courte, convertie).
 * @returns {boolean} `true` si l'énoncé a été planifié.
 */
export function speak(text, lang = 'fr') {
  const synth = globalThis.speechSynthesis;
  if (
    !synth ||
    typeof globalThis.SpeechSynthesisUtterance === 'undefined' ||
    !text
  ) {
    return false;
  }
  try {
    synth.cancel();
    const utterance = new globalThis.SpeechSynthesisUtterance(text);
    utterance.lang = localeToBcp47(lang);
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
