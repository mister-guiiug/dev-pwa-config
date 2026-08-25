/**
 * Journal applicatif à niveaux — au-dessus du fil d'Ariane existant.
 *
 * CE QUE ÇA N'EST PAS. Ce n'est pas un second système de journalisation :
 * chaque ligne finit dans le MÊME fil d'Ariane que `breadcrumb`, donc dans la
 * même erreur remontée. Il n'y a pas de tampon concurrent, pas de second
 * transport, rien à vider séparément.
 *
 * CE QUE ÇA APPORTE. Les 59 `console.error`/`warn` mesurés dans quatorze apps
 * n'ont ni niveau exploitable, ni origine (« échec » — de quoi ?), ni
 * corrélation. Un journal nommé donne les trois : `createLogger('favoris')`
 * produit des lignes attribuées, filtrables par niveau, et estampillées de
 * l'identifiant de corrélation — celui-là même qui part en en-tête de la
 * requête et qui s'affiche à l'utilisateur quand l'écran casse.
 */
import { breadcrumb } from './react/observability.js';
import { getSessionId } from './correlation.js';

const LEVELS = ['debug', 'info', 'warn', 'error'];
const CONSOLE_METHOD = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

let minLevel = 'info';

/** Seuil global : les lignes en dessous ne sont ni tracées ni affichées. */
export function setLogLevel(level) {
  if (LEVELS.includes(level)) minLevel = level;
  return minLevel;
}

/** Le seuil courant. */
export function getLogLevel() {
  return minLevel;
}

function enabled(level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(minLevel);
}

/**
 * Un journal nommé.
 *
 * @param {string} namespace Origine de la ligne (`'favoris'`, `'carte'`…).
 * @param {{ console?: boolean, correlation?: () => string }} [options]
 *   `console` (défaut `true`) affiche aussi la ligne ; `correlation` permet de
 *   remplacer l'identifiant joint (défaut : l'identifiant de session).
 */
export function createLogger(namespace, options = {}) {
  const { console: toConsole = true, correlation = getSessionId } = options;
  const name = String(namespace ?? 'app');

  const emit = (level, message, data) => {
    if (!enabled(level)) return null;
    let correlationId;
    try {
      correlationId = correlation();
    } catch {
      correlationId = undefined;
    }
    const payload = correlationId ? { ...data, correlationId } : { ...data };
    // `breadcrumb` masque déjà les clés sensibles : rien à refaire ici.
    const entry = breadcrumb(
      `${name}.${level}`,
      String(message ?? ''),
      payload
    );
    if (toConsole && typeof console !== 'undefined') {
      const method = console[CONSOLE_METHOD[level]] ?? console.log;
      // Volontairement APRÈS l'enregistrement : si `captureConsole` enveloppe
      // la console, la ligne est déjà dans le fil, et le doublon éventuel y
      // porte le même identifiant — jamais une information perdue.
      method.call(console, `[${name}] ${message}`, data ?? '');
    }
    return entry;
  };

  return {
    debug: (message, data) => emit('debug', message, data),
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),
    error: (message, data) => emit('error', message, data),
  };
}
