/**
 * LES URL QUE POSTHOG JOINT DE LUI-MÊME, NETTOYÉES AVANT DE PARTIR.
 *
 * Le socle ne choisit pas toutes les propriétés d'un événement. posthog-js
 * en ajoute à CHACUN : `$current_url`, `$referrer`, et surtout les propriétés
 * d'entrée de session, `$session_entry_url` et `$session_entry_referrer`,
 * qui valent `location.href` au DÉBUT de la session (jusqu'à mille
 * caractères, fragment compris) et voyagent ensuite avec chaque vue, chaque
 * geste, chaque erreur. La bibliothèque n'y masque que les paramètres de
 * campagne.
 *
 * LE CAS QUI COÛTE : UNE REDIRECTION SUPABASE. Un lien de connexion ou de
 * réinitialisation arrive sur `…/?code=<uuid>` ou, dans une app en
 * `HashRouter`, sur `…/#/reset#access_token=eyJ…&refresh_token=…`. Supabase
 * nettoie la barre d'adresse aussitôt, mais l'URL d'entrée de session est déjà
 * relevée : sans ce nettoyage, les jetons partaient chez PostHog avec chaque
 * événement de la session. Démontré sous jsdom avec posthog-js 1.438.2,
 * 1.445.4 et 1.453.2 le 21/11/2026.
 *
 * CE QUI RESTE : l'origine et le chemin, et la ROUTE d'un `HashRouter`
 * (`#/depenses` est l'écran où l'on était). La requête devient
 * `?[requête]`, le fragment `#[fragment]`, les identifiants d'une URL
 * `[identifiants]@`. Ce module est petit et chargé avec `analytics.js` : le
 * nettoyage vaut pour tout ce qui part, pas seulement pour les erreurs.
 */

/** Les marqueurs qui remplacent ce qui est retiré. */
export const MARQUES_URL = Object.freeze({
  requete: '[requête]',
  fragment: '[fragment]',
  identifiants: '[identifiants]',
});

/**
 * Une URL sans ses identifiants, sa requête ni son fragment — SAUF la route
 * d'un `HashRouter`, qui s'arrête au premier `?`, `&` ou `=`, ou au SECOND
 * `#` : dans `#/reset#access_token=…`, la route est `/reset` et le reste est
 * un fragment comme un autre ; dans `#/invite&nom=…`, une requête.
 *
 * Partagée avec `analytics-erreurs.js`, qui l'applique aux URL citées dans un
 * message d'erreur.
 *
 * Une valeur qui n'est pas une URL (`$direct`, une chaîne vide) est rendue
 * telle quelle : elle n'a ni requête ni fragment.
 *
 * @param {string} url
 * @returns {string}
 */
export function nettoieUrl(url) {
  const propre = url.replace(
    /^((?:blob:)?[a-z][\w+.-]*:\/\/)[^/?#@]*@/iu,
    `$1${MARQUES_URL.identifiants}@`
  );
  const diese = propre.indexOf('#');
  const avant = diese < 0 ? propre : propre.slice(0, diese);
  const apres = diese < 0 ? '' : propre.slice(diese + 1);
  const point = avant.indexOf('?');
  let out =
    point < 0 ? avant : `${avant.slice(0, point)}?${MARQUES_URL.requete}`;
  if (!apres) return out;
  const route = /^\/[^?#&=]*/u.exec(apres);
  if (!route) return `${out}#${MARQUES_URL.fragment}`;
  out += `#${route[0]}`;
  const reste = apres.slice(route[0].length);
  const second = reste.indexOf('#');
  const requete = second < 0 ? reste : reste.slice(0, second);
  if (requete) out += `?${MARQUES_URL.requete}`;
  if (second >= 0) out += `#${MARQUES_URL.fragment}`;
  return out;
}

/**
 * Les clés qui portent une URL : `$current_url`, `$referrer`,
 * `$session_entry_url`, `$session_entry_referrer`, `$initial_current_url`,
 * `$initial_referrer`… Les noms de domaine (`$referring_domain`) et les
 * chemins (`$pathname`, `$session_entry_pathname`) n'ont ni requête ni
 * fragment : ils restent.
 */
const CLE_URL = /(?:^\$?|_)(?:url|referrer)$/u;

/**
 * `$initial_person_info` range l'URL et le référent d'arrivée sous des clés
 * d'une lettre : `u` et `r`.
 */
const INFO_PERSONNE = '$initial_person_info';

/**
 * Les propriétés d'un objet, URL nettoyées — le même objet si rien ne change.
 *
 * @param {Record<string, unknown>} props
 * @returns {Record<string, unknown>}
 */
function nettoieProprietes(props) {
  /** @type {Record<string, unknown> | null} */
  let copie = null;
  const ecrit = (/** @type {string} */ cle, /** @type {unknown} */ valeur) => {
    if (valeur === props[cle]) return;
    copie ??= { ...props };
    copie[cle] = valeur;
  };
  for (const [cle, valeur] of Object.entries(props)) {
    if (typeof valeur === 'string' && CLE_URL.test(cle)) {
      ecrit(cle, nettoieUrl(valeur));
    } else if (
      (cle === '$set' || cle === '$set_once') &&
      valeur &&
      typeof valeur === 'object' &&
      !Array.isArray(valeur)
    ) {
      ecrit(
        cle,
        nettoieProprietes(/** @type {Record<string, unknown>} */ (valeur))
      );
    } else if (cle === INFO_PERSONNE && valeur && typeof valeur === 'object') {
      const info = /** @type {Record<string, unknown>} */ (valeur);
      const nette = { ...info };
      if (typeof info.u === 'string') nette.u = nettoieUrl(info.u);
      if (typeof info.r === 'string') nette.r = nettoieUrl(info.r);
      if (nette.u !== info.u || nette.r !== info.r) ecrit(cle, nette);
    }
  }
  return copie ?? props;
}

/**
 * LE `before_send` DE TOUS LES ÉVÉNEMENTS : les URL des propriétés, de
 * `$set` et de `$set_once` (au premier niveau comme dans les propriétés),
 * nettoyées. Un événement sans URL à nettoyer est rendu tel quel, même objet ;
 * `null` reste `null` (un `before_send` précédent l'a écarté).
 *
 * @template T
 * @param {T} evenement
 * @returns {T}
 */
export function nettoieUrlsEvenement(evenement) {
  const brut = /** @type {any} */ (evenement);
  if (!brut || typeof brut !== 'object') return evenement;
  /** @type {Record<string, unknown> | null} */
  let copie = null;
  for (const cle of ['properties', '$set', '$set_once']) {
    const valeur = brut[cle];
    if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur))
      continue;
    const nette = nettoieProprietes(valeur);
    if (nette === valeur) continue;
    copie ??= { ...brut };
    copie[cle] = nette;
  }
  return /** @type {T} */ (copie ?? evenement);
}
