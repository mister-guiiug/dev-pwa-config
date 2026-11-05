/**
 * LA SESSION SUPABASE TELLE QU'ELLE EST ÉCRITE SUR L'APPAREIL, lue sans passer
 * par la bibliothèque.
 *
 * POURQUOI CE MODULE EXISTE. `auth.getSession()` n'est pas une lecture : si le
 * jeton d'accès est périmé — et il ne vit qu'une heure — il le RENOUVELLE
 * contre le réseau, avec des reprises à intervalle croissant. Sans réseau,
 * aucune ne peut aboutir. Mesuré sur la production de `mister-doc` le
 * 2026-09-10 : 27 secondes de « Chargement… », puis « pas de session » — et la
 * garde d'accès affichait l'écran de CONNEXION, qu'on ne peut pas franchir
 * hors ligne. Une application dont toutes les données étaient pourtant en
 * cache sur l'appareil.
 *
 * Le même piège existe une porte plus loin : `getAuthenticatorAssuranceLevel()`
 * et tout appel PostgREST commencent eux aussi par `getSession()`, pour joindre
 * le jeton. Trois demi-minutes en enfilade, au bout desquelles on lit des
 * données qu'on avait dès la première milliseconde.
 *
 * LE NOM DE CASE EST LU SUR LE CLIENT, PAS RECALCULÉ. `@supabase/supabase-js`
 * le construit depuis l'URL du projet (`sb-<ref>-auth-token`), sauf `storageKey`
 * explicite, et le range dans `client.auth.storageKey`. Reproduire la formule,
 * ce serait s'engager à la suivre à chaque version ; imposer `storageKey` aux
 * apps déconnecterait d'un coup tous ceux dont la session est rangée sous
 * l'ancien nom. Le lire, c'est prendre la réponse du SDK lui-même.
 *
 * SANS CLIENT, LE NOM EST SEULEMENT RECONNU — ET C'EST AMBIGU. Toute la famille
 * est servie depuis une seule origine, donc un seul `localStorage` : sur un
 * appareil qui sert à deux apps Supabase du parc, il y a deux cases
 * `sb-*-auth-token`, et la première venue peut être celle de la sœur. Relevé
 * le 05/11/2026 (audit hors ligne) : hors ligne, une app pouvait ouvrir son
 * écran sous l'utilisateur d'une autre, ou ignorer une vraie déconnexion parce
 * qu'une autre app avait encore une session. La lecture par motif reste pour
 * les appels sans argument, faute de mieux ; passez le client.
 */

const NOM_DE_CASE = /^sb-[a-z0-9]+-auth-token$/;

/**
 * Ce que Supabase lui-même considère comme une session récupérable : les trois
 * champs exigés par son `_isValidSession`, plus l'identifiant d'utilisateur
 * sans lequel une app ne saurait pas quelles données lire en cache.
 *
 * @param {unknown} valeur
 */
function estUneSession(valeur) {
  if (typeof valeur !== 'object' || valeur === null) return false;
  return (
    typeof valeur.access_token === 'string' &&
    typeof valeur.refresh_token === 'string' &&
    typeof valeur.expires_at === 'number' &&
    typeof valeur.user === 'object' &&
    valeur.user !== null &&
    typeof valeur.user.id === 'string'
  );
}

/**
 * La case où le client range sa session, ou `null` s'il ne la dit pas (client
 * simulé, SDK d'une autre forme). `storageKey` est `protected` dans les types
 * de `@supabase/auth-js`, mais c'est une propriété ordinaire à l'exécution.
 *
 * @param {unknown} client
 */
function caseDuClient(client) {
  const nom = /** @type {any} */ (client)?.auth?.storageKey;
  return typeof nom === 'string' && nom.length > 0 ? nom : null;
}

/**
 * La session sous ce nom, ou `null` — absente, illisible ou incomplète.
 *
 * @param {Storage} stockage
 * @param {string} nom
 */
function lireCase(stockage, nom) {
  const brut = stockage.getItem(nom);
  if (!brut) return null;
  const valeur = JSON.parse(brut);
  return estUneSession(valeur) ? valeur : null;
}

/**
 * La session rangée sur cet appareil, ou `null`. **Best-effort** : navigation
 * privée, stockage refusé, contenu illisible, environnement sans
 * `localStorage` (Node, worker) — tout rend `null`, comme une absence de
 * session.
 *
 * AVEC LE CLIENT, C'EST LA SESSION DE CE PROJET, et seulement elle : sa case
 * vide, la réponse est `null`, même si une sœur a la sienne à côté. Sans
 * client — ou avec un client qui ne dit pas sa case —, la première case
 * `sb-*-auth-token` qui contient une session : ambigu sur une origine
 * partagée (voir l'en-tête).
 *
 * PÉRIMÉE OU NON, ELLE EST RENDUE. C'est délibéré : hors ligne, un jeton
 * d'accès expiré ne dit rien de l'utilisateur — il dit qu'une heure a passé.
 * Le renouvellement se fera au retour du réseau, et `onAuthStateChange`
 * corrigera l'état ; si le jeton de rafraîchissement a été révoqué entretemps,
 * Supabase émettra `SIGNED_OUT` et la porte se refermera d'elle-même.
 *
 * @param {{ auth: object }} [client] Le client Supabase de l'app.
 * @returns {object | null}
 */
export function storedSupabaseSession(client) {
  try {
    const stockage = globalThis.localStorage;
    if (!stockage) return null;
    const sienne = caseDuClient(client);
    if (sienne) return lireCase(stockage, sienne);
    for (let i = 0; i < stockage.length; i++) {
      const nom = stockage.key(i);
      if (!nom || !NOM_DE_CASE.test(nom)) continue;
      const valeur = lireCase(stockage, nom);
      if (valeur) return valeur;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * UN « PAS DE SESSION » VENU DU SILENCE DU RÉSEAU, À IGNORER ?
 *
 * PROMU DE QUATRE APPS (mister-doc, miss-uwh, miss-lookhouse,
 * miss-holi-voyage), qui écrivaient la même garde autour de
 * `onAuthStateChange` ; lookhouse la disait « la garde que le socle n'a pas ».
 *
 * Supabase s'abonne en émettant l'état initial, et cet état passe par le
 * renouvellement du jeton. Hors ligne il n'aboutit pas : au bout d'une
 * demi-minute, la bibliothèque annonce « pas de session ». Mesuré sur mister-doc
 * après la correction de l'amorçage : ouverte à 3 s, ÉJECTÉE sur l'écran de
 * connexion avant 30.
 *
 * LA DISTINCTION TIENT AU STOCKAGE. Lors d'une vraie déconnexion — geste,
 * jeton révoqué —, Supabase EFFACE la session AVANT d'émettre `SIGNED_OUT`. Si
 * elle est encore rangée, il n'a déconnecté personne : il a renoncé à joindre
 * le serveur. Une déconnexion demandée sans réseau reste donc honorée.
 *
 * `true` quand l'évènement est à ignorer : pas de session, navigateur hors
 * ligne, et la session de CE projet encore rangée (avec le client, voir
 * `storedSupabaseSession`).
 *
 * @param {unknown} session La session que l'évènement porte.
 * @param {{ auth: object }} [client] Le client Supabase de l'app.
 */
export function ignoreOfflineSignOut(session, client) {
  return !session && navigateurHorsLigne() && !!storedSupabaseSession(client);
}

/**
 * Le navigateur affirme-t-il être HORS LIGNE ?
 *
 * `=== false` et non `!onLine` : hors navigateur (Node, tests) la propriété
 * n'existe pas, et un `!undefined` ferait croire à une coupure permanente.
 * L'inverse — se fier à `onLine` pour affirmer qu'on est EN ligne — n'est pas
 * possible non plus : il est vrai derrière un portail captif comme sur un
 * Wi-Fi qui ne route rien. D'où l'attente bornée, côté adaptateur.
 */
export function navigateurHorsLigne() {
  return globalThis.navigator?.onLine === false;
}
