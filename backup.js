/**
 * Sauvegarder et restaurer les données d'une app — le filet du local-first.
 *
 * LE RISQUE QUE ÇA COUVRE. Cinq apps de la famille n'ont AUCUN backend : les
 * scores, les suivis, les simulations vivent dans `localStorage`, et
 * `localStorage` n'est pas un lieu sûr — un navigateur nettoyé, un appareil
 * changé, un « bloquer les données de sites » coché, et des mois de saisie
 * disparaissent sans un message. Le fichier `backup` recopié dans sept apps
 * montrait le besoin ; sa promotion en `./storage` n'en avait traité que la
 * moitié « accès » — voici la moitié « sauvegarde ».
 *
 * TOUT EXISTAIT, SÉPARÉMENT : `createStore(prefix).keys()` énumère les données
 * d'une app, `downloadJson` les fait sortir, `readJsonFile` les fait rentrer.
 * Ce module est la composition qui manquait, et les trois décisions qu'une
 * composition rapide rate :
 *
 *   1. **Les valeurs partent BRUTES** (`getRaw`), pas re-parsées. Un coffre
 *      chiffré (`secure-storage`) range des blobs qui ne sont pas du JSON :
 *      les faire passer par `JSON.parse` les détruirait. La fidélité prime
 *      sur la lisibilité du fichier.
 *   2. **L'import VALIDE avant d'écraser.** Un fichier tronqué, retouché, ou
 *      d'un autre format doit être refusé AVANT la première écriture — pas au
 *      milieu, en laissant l'app dans un état qui n'est ni l'ancien ni le
 *      nouveau.
 *   3. **Un backup d'une AUTRE app est refusé.** Les seize apps partagent un
 *      domaine ; restaurer les clés `mistermolkky_` dans mister-family-map ne
 *      lèverait rien et ne restaurerait rien — le pire des échecs, le
 *      silencieux. Le fichier porte l'identité de son app, et elle est
 *      vérifiée.
 *
 * CE QUE ÇA NE TOUCHE JAMAIS : les clés hors du préfixe du magasin. Restaurer
 * une app ne peut pas déconnecter les quinze autres.
 */
import { dateSlug, downloadJson, readJsonFile } from './download.js';

/** Marqueur de format : ce qui distingue un backup d'un JSON quelconque. */
export const BACKUP_FORMAT = 'dwc-backup';
export const BACKUP_VERSION = 1;

/**
 * L'état d'un magasin, en objet transportable.
 *
 * @param {import('./storage.js').Store} store
 * @param {{ app?: string, appVersion?: string }} [options]
 */
export function createBackup(store, options = {}) {
  const data = {};
  for (const key of store.keys()) {
    const raw = store.getRaw(key);
    if (raw !== null) data[key] = raw;
  }
  return {
    format: BACKUP_FORMAT,
    v: BACKUP_VERSION,
    // L'identité : c'est elle qui interdit la restauration croisée.
    app: options.app ?? store.prefix,
    prefix: store.prefix,
    appVersion: options.appVersion,
    exportedAt: new Date().toISOString(),
    entries: Object.keys(data).length,
    data,
  };
}

/**
 * Vérifie qu'un objet est un backup restaurable DANS ce magasin.
 *
 * Rend une liste de problèmes — vide si tout va bien — plutôt que de lever :
 * l'écran de restauration doit pouvoir les afficher tous, pas s'arrêter au
 * premier.
 *
 * @returns {string[]}
 */
export function validateBackup(backup, store) {
  const problems = [];
  if (!backup || typeof backup !== 'object') {
    return ['le fichier n’est pas un objet JSON'];
  }
  if (backup.format !== BACKUP_FORMAT) {
    problems.push('ce fichier n’est pas une sauvegarde de la famille');
  }
  if (typeof backup.v !== 'number' || backup.v > BACKUP_VERSION) {
    problems.push(
      `version de sauvegarde inconnue (${backup.v}) — exportée par une app plus récente ?`
    );
  }
  if (store && backup.prefix !== store.prefix) {
    // Le pire des échecs est le silencieux : restaurer les clés d'une autre
    // app n'écraserait rien et ne restaurerait rien.
    problems.push(
      `sauvegarde d’une autre application (${backup.app ?? backup.prefix ?? 'inconnue'})`
    );
  }
  if (!backup.data || typeof backup.data !== 'object') {
    problems.push('aucune donnée dans la sauvegarde');
  } else if (
    Object.values(backup.data).some(value => typeof value !== 'string')
  ) {
    problems.push('sauvegarde altérée : des valeurs ne sont pas des chaînes');
  }
  return problems;
}

/**
 * Restaure un backup dans un magasin. VALIDE d'abord, écrit ensuite.
 *
 * @param {import('./storage.js').Store} store
 * @param {unknown} backup
 * @param {{ replace?: boolean }} [options] `replace` vide d'abord le préfixe :
 *   l'état final est exactement celui du fichier. Sans lui, fusion — les clés
 *   absentes du fichier survivent.
 * @returns {{ ok: true, restored: number } | { ok: false, problems: string[] }}
 */
export function restoreBackup(store, backup, options = {}) {
  const problems = validateBackup(backup, store);
  if (problems.length > 0) return { ok: false, problems };

  if (options.replace) store.clear();

  let restored = 0;
  for (const [key, raw] of Object.entries(backup.data)) {
    if (store.setRaw(key, raw)) restored += 1;
  }
  return { ok: true, restored };
}

/**
 * Exporte et télécharge, en un geste : `mfm-sauvegarde-2026-08-29.json`.
 *
 * @returns {boolean} `false` sans DOM (le fichier n'est pas parti).
 */
export function downloadBackup(store, options = {}) {
  const backup = createBackup(store, options);
  const name =
    options.filename ?? `${slugOf(backup.app)}-sauvegarde-${dateSlug()}.json`;
  return downloadJson(backup, name);
}

function slugOf(value) {
  return (
    String(value ?? 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app'
  );
}

/**
 * Lit un fichier choisi par l'utilisateur et le restaure.
 *
 * Lève sur un JSON illisible (c'est `readJsonFile` qui parle) ; rend les
 * problèmes de validation sans avoir rien écrit sinon.
 *
 * @param {import('./storage.js').Store} store
 * @param {Blob} file
 */
export async function restoreBackupFile(store, file, options = {}) {
  const parsed = await readJsonFile(file);
  return restoreBackup(store, parsed, options);
}
