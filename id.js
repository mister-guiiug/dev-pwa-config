/**
 * Identifiants : un court préfixé, un UUID v4 — avec repli quand
 * `crypto.randomUUID` manque.
 *
 * PROMU, PAS INVENTÉ. Quatre apps portaient un `id.ts` : `miss-uwh`
 * (`createId` + `createUuid`, 99 importateurs), `mister-footcoach` (75),
 * `bac-sable` (`newId`, 46), `miss-genius` (`createId`, 30 — la copie de
 * celui d'uwh, à la lettre). Deux cent cinquante sites d'appel pour le besoin
 * le plus banal qui soit.
 *
 * ET LE PAQUET LE RÉÉCRIVAIT LUI-MÊME. `sync-queue.js` et
 * `react/use-offline-queue.js` portaient chacun leur `newId()` avec le même
 * repli sur `crypto.randomUUID` ; les deux importent désormais d'ici.
 *
 * `createUuid` est celui d'uwh, le seul des quatre à avoir le repli v4
 * complet — les bits de version et de variante posés, pas une chaîne au
 * hasard. Un identifiant local IDENTIQUE à la clé primaire Postgres
 * (`uuid`) rend l'insertion avec `id` explicite idempotente : c'est pour ça
 * qu'uwh l'a écrit.
 *
 * CE QUI N'EST PAS ICI. `genId` de footcoach (compteur + horodatage) promet
 * autre chose — l'unicité en mémoire et l'ordre d'arrivée, pas l'aléa — et
 * reste chez lui. `generateSecureId` (`security.js`) promet l'IMPRÉVISIBILITÉ
 * et refuse de fonctionner sans Web Crypto : ce n'est pas un identifiant,
 * c'est un jeton. Les deux replis ci-dessous, eux, acceptent `Math.random` —
 * un identifiant d'entité n'est pas un secret.
 */

/** Le `crypto` à utiliser : celui de la plateforme, ou celui qu'un test injecte. */
const cryptoOf = source => source ?? globalThis.crypto;

/**
 * Identifiant court et préfixé : `id_3f9a2c1b`. Huit hexadécimaux tirés d'un
 * UUID (32 bits d'aléa : assez pour une liste locale, pas pour une table
 * partagée — voir `createUuid`).
 *
 * @param {string} [prefix] Défaut `id`.
 * @param {{ randomUUID?: () => string } | null} [source] Injectable en test.
 */
export function createId(prefix = 'id', source) {
  const c = cryptoOf(source);
  const rnd =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

/**
 * UUID v4, au format des colonnes `uuid` Postgres. `crypto.randomUUID` quand
 * il existe ; sinon un v4 construit à la main, version et variante comprises.
 *
 * @param {{ randomUUID?: () => string } | null} [source] Injectable en test.
 */
export function createUuid(source) {
  const c = cryptoOf(source);
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const r = (Math.random() * 16) | 0;
    const v = char === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Vrai si la chaîne a la forme d'un UUID v4 (peu importe la casse). */
export function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}
