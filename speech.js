/**
 * Synthèse vocale (Web Speech) — annonces sonores et a11y.
 *
 * PROMU depuis `miss-dice/src/a11y/speech.ts`, ET CORRIGÉ DEPUIS : la version
 * promue portait deux défauts de Chrome qui coupent la FIN de la phrase. Or la
 * fin d'une annonce est presque toujours la donnée utile — un score, un
 * résultat. D'où des signalements qui accusent une VALEUR (« sur le 5 le mot
 * est écorché ») alors que la valeur n'y est pour rien : elle était seulement
 * le dernier mot. Relevé sur Android le 21/09/2026, corrigé d'abord dans
 * miss-dice (mister-guiiug/miss-dice#90), remonté ici.
 *
 * 1. UN UTTERANCE QUE PLUS RIEN NE RÉFÉRENCE peut être ramassé par le GC
 *    PENDANT qu'il parle : le son s'arrête net. On en garde donc une
 *    référence de module jusqu'à `onend`/`onerror`.
 * 2. `cancel()` EST ASYNCHRONE. Enchaîner `speak()` dans le même tour de
 *    boucle fait avaler le début — parfois la totalité — de la nouvelle
 *    phrase, et c'est nettement pire sur Android. On n'annule que s'il y a
 *    quelque chose à interrompre, puis on laisse un délai au moteur.
 *
 * Tolérant : aucune erreur si l'API manque (Web Speech non supporté, SSR,
 * tests). Non stylé, sans dépendance.
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

/** Liste des voix, mise en cache. `null` = à relire. */
let voixConnues = null;
let ecouteBranchee = false;

/**
 * `getVoices()` rend un tableau VIDE au premier appel sur la plupart des
 * navigateurs : la liste arrive de façon asynchrone. Mesuré sur miss-dice —
 * 0 voix juste après le chargement, 3 après `voiceschanged`. Sans cette
 * écoute, la toute première annonce d'une session partirait sans voix.
 * @param {SpeechSynthesis} synth
 */
function listeDesVoix(synth) {
  if (!ecouteBranchee && typeof synth.addEventListener === 'function') {
    try {
      synth.addEventListener('voiceschanged', () => {
        voixConnues = null;
      });
      ecouteBranchee = true;
    } catch {
      /* écoute impossible : on relira à chaque appel, c'est tout */
    }
  }
  if (!voixConnues || voixConnues.length === 0) {
    voixConnues =
      typeof synth.getVoices === 'function' ? (synth.getVoices() ?? []) : [];
  }
  return voixConnues;
}

/** Normalise une étiquette de langue : `fr_FR` et `FR-fr` donnent `fr-fr`. */
const normalise = étiquette =>
  String(étiquette ?? '')
    .toLowerCase()
    .replace('_', '-');

/**
 * Voix correspondant à une étiquette BCP-47, ou `null`.
 *
 * TROIS NIVEAUX, ET LE DERNIER EST « AUCUNE ». D'abord l'étiquette exacte
 * (`fr-FR`), puis la même LANGUE (`fr-CA` pour un `fr-FR` demandé), puis rien.
 * Ce dernier niveau est un choix : `mister-molkky`, d'où vient l'idée de
 * choisir une voix, retombait sur `voix[0]` — la première de la liste, quelle
 * que soit sa langue. C'est précisément ce qui fait lire du français par une
 * voix anglaise. Rendre `null` laisse le moteur décider à partir de
 * `utterance.lang`, ce qu'il fait mieux qu'un choix arbitraire.
 *
 * @param {string} tag Étiquette BCP-47 (`fr-FR`).
 * @param {SpeechSynthesis} [synth]
 * @returns {SpeechSynthesisVoice | null}
 */
export function pickVoice(tag, synth = globalThis.speechSynthesis) {
  if (!synth) return null;
  const voix = listeDesVoix(synth);
  if (!voix.length) return null;
  const visée = normalise(tag);
  const langue = visée.split('-')[0];
  return (
    voix.find(v => normalise(v.lang) === visée) ??
    voix.find(v => normalise(v.lang).split('-')[0] === langue) ??
    null
  );
}

/**
 * RÉFÉRENCE VIVANTE DE L'ÉNONCÉ EN COURS — ce n'est pas une optimisation,
 * c'est ce qui empêche le son d'être coupé (cf. l'en-tête, défaut n° 1).
 * @type {SpeechSynthesisUtterance | null}
 */
let enCours = null;

/**
 * Délai laissé au moteur entre `cancel()` et `speak()` (défaut n° 2).
 * 120 ms est imperceptible dans une annonce de jeu et laisse au moteur de
 * quoi vider sa file.
 */
const REPRISE_MS = 120;

/** @type {ReturnType<typeof setTimeout> | undefined} */
let minuteur;

/**
 * Énonce un texte via la synthèse du navigateur, si disponible.
 * Un nouvel énoncé interrompt le précédent — mais sans se faire écraser par
 * lui. Renvoie `true` si l'énoncé a été PLANIFIÉ : avec le délai de reprise,
 * il peut partir au tour de boucle suivant.
 *
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
    const étiquette = localeToBcp47(lang);
    const utterance = new globalThis.SpeechSynthesisUtterance(text);
    utterance.lang = étiquette;

    // Sans voix correspondante on ne force rien : `lang` suffit au moteur.
    const voix = pickVoice(étiquette, synth);
    if (voix) utterance.voice = voix;

    // Tenue jusqu'à la fin, puis relâchée : garder la référence au-delà
    // retiendrait inutilement le dernier énoncé de la session.
    const libère = () => {
      if (enCours === utterance) enCours = null;
    };
    utterance.onend = libère;
    utterance.onerror = libère;
    enCours = utterance;

    // Une annonce plus récente remplace celle qui attendait son tour.
    if (minuteur !== undefined) {
      clearTimeout(minuteur);
      minuteur = undefined;
    }

    // On n'annule QUE s'il y a réellement quelque chose à interrompre : sans
    // cette garde, chaque annonce paierait le délai de reprise pour rien.
    if (synth.speaking || synth.pending) {
      synth.cancel();
      minuteur = setTimeout(() => {
        minuteur = undefined;
        synth.speak(utterance);
      }, REPRISE_MS);
    } else {
      synth.speak(utterance);
    }
    return true;
  } catch {
    return false;
  }
}
