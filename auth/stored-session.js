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
 * LE NOM DE CASE EST RECONNU, PAS RECALCULÉ. `@supabase/supabase-js` le
 * construit depuis l'URL du projet (`sb-<ref>-auth-token`). Reproduire la
 * formule, ce serait s'engager à la suivre à chaque version pour un gain nul ;
 * et imposer `storageKey` aux apps déconnecterait d'un coup tous ceux dont la
 * session est rangée sous l'ancien nom.
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
 * La session rangée sur cet appareil, ou `null`. **Best-effort** : navigation
 * privée, stockage refusé, contenu illisible, environnement sans
 * `localStorage` (Node, worker) — tout rend `null`, comme une absence de
 * session.
 *
 * PÉRIMÉE OU NON, ELLE EST RENDUE. C'est délibéré : hors ligne, un jeton
 * d'accès expiré ne dit rien de l'utilisateur — il dit qu'une heure a passé.
 * Le renouvellement se fera au retour du réseau, et `onAuthStateChange`
 * corrigera l'état ; si le jeton de rafraîchissement a été révoqué entretemps,
 * Supabase émettra `SIGNED_OUT` et la porte se refermera d'elle-même.
 *
 * @returns {object | null}
 */
export function storedSupabaseSession() {
  try {
    const stockage = globalThis.localStorage;
    if (!stockage) return null;
    for (let i = 0; i < stockage.length; i++) {
      const nom = stockage.key(i);
      if (!nom || !NOM_DE_CASE.test(nom)) continue;
      const brut = stockage.getItem(nom);
      if (!brut) continue;
      const valeur = JSON.parse(brut);
      if (estUneSession(valeur)) return valeur;
    }
    return null;
  } catch {
    return null;
  }
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
