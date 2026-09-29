/**
 * Reconnaître un ROBOT à son agent utilisateur — pour lui servir la langue
 * PAR DÉFAUT d'une app, pas celle de son navigateur.
 *
 * LE CONSTAT (Search Console, 29/09/2026). Le test en direct de l'URL
 * `https://mister-guiiug.github.io/miss-contraction/` montre une page rendue
 * EN ANGLAIS — « Start contraction », bandeau de consentement en anglais —
 * alors que la page est française : `lang="fr"`, contenu servi en français,
 * page de contenu en français. La cause : la langue initiale est tirée de
 * `navigator.language`, et le moteur de rendu de Google se présente en
 * `en-US`. Google indexe donc, pour une app française, un écran en anglais
 * qui ne correspond ni à son `<html lang>` ni à son HTML statique.
 *
 * LE REMÈDE : un robot connu reçoit la langue par défaut de l'app, celle de
 * son HTML statique. Ce n'est PAS de l'habillage pour robots (cloaking) : le
 * robot reçoit exactement ce que reçoit un visiteur sans préférence, et ce
 * que dit déjà le HTML servi. `createI18n` (`react/i18n`) s'en sert ; une app
 * à i18n maison l'importe d'ici — une ligne avant sa lecture de
 * `navigator.language`.
 *
 * DEUX LECTURES, DANS CET ORDRE :
 *
 *   1. les robots NOMMÉS — moteurs de recherche, moteurs de réponse (IA),
 *      aperçus de liens — reconnus par inclusion, sans égard à la casse ;
 *   2. un repli GÉNÉRIQUE : un JETON ENTIER qui finit par `bot`, `crawler` ou
 *      `spider` (« SemrushBot/7.0 », « AhrefsBot », « Sogou web spider »).
 *      Entier, donc borné des deux côtés : « Mobile » ou « Robotic » ne
 *      répondent pas. Les noms d'APPAREIL qui finissent en « bot » (les
 *      téléphones CUBOT) sont écartés à la main : ce sont des navigateurs.
 *
 * PAS DE LOOKBEHIND dans les motifs : Safari ne les lit que depuis 16.4, et un
 * motif qu'un navigateur refuse casse le module entier au chargement. Les
 * quantificateurs sont bornés, et l'entrée tronquée : pas de retour arrière
 * coûteux (CodeQL `js/polynomial-redos`).
 */

/** Les robots nommés, en minuscules : moteurs, moteurs de réponse, aperçus. */
const ROBOTS_NOMMES = [
  // Google : robot d'exploration, outil d'inspection (test en direct de la
  // Search Console), Shopping, annonces.
  'googlebot',
  'google-inspectiontool',
  'storebot-google',
  'adsbot-google',
  // Bing et son aperçu, Apple, DuckDuckGo, Yandex, Baidu.
  'bingbot',
  'bingpreview',
  'applebot',
  'duckduckbot',
  'yandexbot',
  'baiduspider',
  // Moteurs de réponse et agents d'IA.
  'gptbot',
  'oai-searchbot',
  'chatgpt-user',
  'claudebot',
  'claude-user',
  'claude-searchbot',
  'perplexitybot',
  'perplexity-user',
  // Aperçus de liens partagés.
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
];

/**
 * Le repli générique, sur l'agent déjà mis en minuscules : un jeton de
 * lettres, chiffres et tirets (40 caractères au plus avant le suffixe), qui
 * finit par `bot`, `crawler` ou `spider`, et que rien de tel ne prolonge.
 */
const JETON_ROBOT =
  /(?:^|[^a-z0-9-])([a-z0-9-]{0,40}(?:bot|crawler|spider))(?![a-z0-9])/g;

/** Des jetons en « bot » qui désignent un APPAREIL, donc un navigateur. */
const APPAREILS = new Set(['cubot']);

/** Au-delà, un agent utilisateur n'en est plus un : on ne lit pas plus loin. */
const LONGUEUR_LUE = 1024;

/**
 * L'agent utilisateur est-il celui d'un robot connu (moteur de recherche,
 * moteur de réponse, aperçu de lien) ?
 *
 * @param {string | null | undefined} ua `navigator.userAgent`, en général.
 * @returns {boolean} `false` pour une valeur absente ou vide.
 */
export function isCrawlerUserAgent(ua) {
  if (typeof ua !== 'string' || ua === '') return false;
  const texte = ua.slice(0, LONGUEUR_LUE).toLowerCase();
  if (ROBOTS_NOMMES.some(nom => texte.includes(nom))) return true;
  for (const m of texte.matchAll(JETON_ROBOT)) {
    if (!APPAREILS.has(m[1])) return true;
  }
  return false;
}
