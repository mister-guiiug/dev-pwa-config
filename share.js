/**
 * Partage et presse-papiers.
 *
 * PROMU, PAS INVENTÉ. Quatre apps portent un `share.ts`, dont trois exportent
 * `shareOrCopy` avec la même signature (miss-dice, mister-molkky, mister-qowa —
 * 24 à 51 lignes). Et six apps recopient à l'identique le même `appUrl()`, qui
 * reconstruit l'URL canonique depuis `import.meta.env.BASE_URL`.
 *
 * LA CONTRADICTION TRANCHÉE : l'annulation. mister-qowa renvoie `'failed'` dès
 * que `navigator.share` lève — or il lève AUSSI quand l'utilisateur ferme la
 * feuille de partage. L'app affiche alors « échec » à quelqu'un qui a
 * simplement changé d'avis. miss-dice distingue l'`AbortError` et le traite
 * comme un partage abouti. Ni l'un ni l'autre ne dit ce qui s'est passé : ici,
 * `'cancelled'` est une réponse à part entière, et l'appelant décide s'il
 * affiche quelque chose.
 *
 * CE QUI N'EST PAS REPRIS : le repli silencieux vers le presse-papiers APRÈS
 * une annulation. Les trois copies s'accordent là-dessus, et elles ont raison —
 * copier ce que l'utilisateur vient de refuser de partager est une surprise.
 *
 * SANS DÉPENDANCE, SANS REACT.
 */

/** @typedef {'shared'|'copied'|'cancelled'|'failed'} ShareResult */

/**
 * URL canonique de l'app courante — racine du déploiement, base path compris.
 *
 * `import.meta.env.BASE_URL` couvre Vite ; hors bundler, l'origine seule fait
 * l'affaire. Les six copies mesurées faisaient exactement ce calcul.
 */
export function currentAppUrl() {
  try {
    const base =
      (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    return new URL(base, globalThis.location.origin).href;
  } catch {
    return '';
  }
}

/**
 * Copie du texte dans le presse-papiers. `false` plutôt qu'une exception : un
 * bouton « copier » n'a pas à faire tomber l'écran.
 *
 * LIMITE. `navigator.clipboard` exige un contexte sécurisé (HTTPS ou
 * localhost) ET, sur plusieurs navigateurs, un geste utilisateur encore valide.
 * Appelée depuis une continuation asynchrone lointaine, elle échoue.
 */
export async function copyToClipboard(text) {
  try {
    await globalThis.navigator?.clipboard?.writeText(String(text ?? ''));
    return true;
  } catch {
    return false;
  }
}

/**
 * Partage natif, repli sur le presse-papiers.
 *
 * @param {{ title?: string, text?: string, url?: string }} data
 * @returns {Promise<ShareResult>} Ce qui s'est RÉELLEMENT passé — l'annulation
 *   n'est pas un échec, et l'appelant a besoin de la distinguer pour ne pas
 *   afficher d'erreur à quelqu'un qui a juste renoncé.
 */
export async function shareOrCopy(data = {}) {
  const share = globalThis.navigator?.share;
  if (typeof share === 'function') {
    try {
      await share.call(globalThis.navigator, data);
      return 'shared';
    } catch (error) {
      // L'utilisateur a fermé la feuille : ne rien copier en douce, ne rien
      // signaler comme une panne.
      if (error && error.name === 'AbortError') return 'cancelled';
      // Autre erreur (partage refusé par la plateforme, données invalides) :
      // le presse-papiers reste utile.
    }
  }
  const payload = data.url ?? data.text ?? data.title ?? '';
  if (!payload) return 'failed';
  return (await copyToClipboard(payload)) ? 'copied' : 'failed';
}
