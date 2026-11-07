/**
 * LE STOCKAGE PERSISTANT DE L'ORIGINE — demandé une fois, il vaut pour toute
 * la famille d'applications.
 *
 * Sans lui, le navigateur range les données d'un site parmi celles qu'il peut
 * effacer pour faire de la place, et Safari les efface au bout de sept jours
 * sans visite tant que l'application n'est pas installée. Les applications du
 * parc partagent l'origine `mister-guiiug.github.io` : un effacement emporte
 * donc le journal de contractions, les notes, les carnets, les parties et les
 * identités anonymes de toutes à la fois. Relevé du 07/11/2026 : aucune des
 * vingt-trois ne le demandait (audit hors ligne du 05/11, P2 n° 15).
 *
 * QUAND LE DEMANDER. Chromium l'accorde sans rien demander à une application
 * installée ou très utilisée ; Firefox AFFICHE UNE INVITE. On ne le demande
 * donc pas au chargement : à l'installation (`useInstallPrompt` le fait), ou
 * sur un geste de l'utilisateur (la carte de sauvegarde, `react/backup-card`).
 *
 * Chaque fonction rend `null` quand le navigateur n'offre pas l'API ou la
 * refuse en levant : « on ne sait pas » n'est ni oui ni non.
 */

const api = () =>
  (typeof navigator !== 'undefined' && navigator.storage) || null;

/** Le navigateur garde-t-il les données de l'origine ? `null` : on ne sait pas. */
export async function isStoragePersisted() {
  const storage = api();
  if (typeof storage?.persisted !== 'function') return null;
  try {
    return await storage.persisted();
  } catch {
    return null;
  }
}

/**
 * Demande au navigateur de garder les données de l'origine. Ne redemande pas
 * ce qui est déjà accordé (Firefox reposerait la question).
 *
 * @returns {Promise<boolean | null>} accordé, refusé, ou API absente.
 */
export async function requestPersistentStorage() {
  const storage = api();
  if (typeof storage?.persist !== 'function') return null;
  try {
    if (
      typeof storage.persisted === 'function' &&
      (await storage.persisted())
    ) {
      return true;
    }
    return await storage.persist();
  } catch {
    return null;
  }
}

/**
 * Place utilisée et disponible pour l'origine, en octets. `null` sans l'API.
 *
 * @returns {Promise<{ usage: number | null, quota: number | null } | null>}
 */
export async function storageEstimate() {
  const storage = api();
  if (typeof storage?.estimate !== 'function') return null;
  try {
    const { usage, quota } = await storage.estimate();
    return {
      usage: Number.isFinite(usage) ? usage : null,
      quota: Number.isFinite(quota) ? quota : null,
    };
  } catch {
    return null;
  }
}
