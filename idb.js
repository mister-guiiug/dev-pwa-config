/**
 * IndexedDB clé/valeur qui ne casse jamais l'app.
 *
 * PROMU, PAS INVENTÉ — et réécrit CINQ fois dans le parc, à chaque fois le même
 * squelette `openDb` mémoïsé + transaction + promesse qui ne rejette pas :
 *   - `mister-molkky/src/idb.ts`, la plus complète — deux object-stores, `kv`
 *     pour les valeurs et `blobs` pour les avatars, repris tous les deux ;
 *   - `miss-badminton/src/idb.ts` — même squelette, et le seul à penser à
 *     `onblocked` (une mise à niveau bloquée par un autre onglet resterait
 *     pendante pour toujours : on se dégrade au lieu d'attendre) ;
 *   - `mister-doc/src/lib/idbCache.ts` — la philosophie en une ligne :
 *     best-effort, toute erreur avalée, jamais bloquant.
 *
 * MÊME PHILOSOPHIE QUE `./storage.js`, car IndexedDB échoue pour les mêmes
 * raisons et quelques-unes en plus : API absente (vieux WebView, worker
 * restreint), `open` qui LÈVE en navigation privée Firefox, quota, mise à
 * niveau bloquée, valeur non clonable par l'algorithme structuré. Une app qui
 * lit un cache ou un avatar n'a aucune raison de tomber pour ça : lire rend le
 * `fallback`, écrire rend `false`, rien ne lève jamais — et `available()` dit
 * la vérité en éprouvant une VRAIE ouverture, pas la présence de l'API.
 *
 * POURQUOI LE NOM COMPTE, comme le préfixe de `createStore` : les seize apps
 * sont servies depuis le même domaine, donc UN SEUL espace IndexedDB. Chaque
 * app passe son identité (`createIdb('mister-molkky')`) — deux apps, deux
 * bases, zéro collision.
 *
 * DEUX OBJECT-STORES, PAS UN. `kv` range les valeurs structurées ; `blobs`
 * range les `Blob` (avatars, pièces jointes) SANS les faire passer par JSON —
 * c'est toute la raison d'être d'IndexedDB face à `localStorage`. Les
 * écritures attendent `transaction.oncomplete`, pas le succès de la requête :
 * c'est la transaction commise qui promet la durabilité.
 *
 * QUAND l'utiliser : du volume, des `Blob`, un historique sans plafond. Pour
 * l'instantané versionné d'une app, voir `./versioned-store.js` ; pour une
 * préférence, `./storage.js` suffit ; pour un secret, `./secure-storage.js`.
 */

const DB_VERSION = 1;
const STORE_KV = 'kv';
const STORE_BLOBS = 'blobs';

/**
 * Une base clé/valeur propre à une app.
 *
 * @param {string} name L'identité de l'app (`'mister-molkky'`) — le nom de la
 *   base. Seize apps partagent l'origine, donc l'espace de noms.
 */
export function createIdb(name) {
  /** @type {Promise<IDBDatabase | null> | null} Mémoïsée : une ouverture. */
  let dbPromise = null;

  const open = () => {
    if (dbPromise) return dbPromise;
    const factory = globalThis.indexedDB;
    if (!factory) {
      dbPromise = Promise.resolve(null);
      return dbPromise;
    }
    dbPromise = new Promise(resolve => {
      try {
        const req = factory.open(name, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_KV)) {
            db.createObjectStore(STORE_KV);
          }
          if (!db.objectStoreNames.contains(STORE_BLOBS)) {
            db.createObjectStore(STORE_BLOBS);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        // Mise à niveau bloquée par un autre onglet : attendre serait attendre
        // pour toujours. On se dégrade — c'est la leçon de miss-badminton.
        req.onblocked = () => resolve(null);
      } catch {
        // Firefox en navigation privée fait LEVER `open` lui-même.
        resolve(null);
      }
    });
    return dbPromise;
  };

  /**
   * Lit une clé d'un object-store. Le `fallback` couvre, sans les distinguer,
   * la clé absente, la base indisponible et la lecture qui échoue — même
   * contrat que `readJson` de `./storage.js`.
   *
   * @param {string} storeName
   * @param {string} key
   * @param {unknown} fallback
   */
  const read = async (storeName, key, fallback) => {
    const db = await open();
    if (!db) return fallback;
    return new Promise(resolve => {
      try {
        const req = db
          .transaction(storeName, 'readonly')
          .objectStore(storeName)
          .get(key);
        req.onsuccess = () =>
          resolve(req.result === undefined ? fallback : req.result);
        req.onerror = () => resolve(fallback);
      } catch {
        resolve(fallback);
      }
    });
  };

  /**
   * Écrit dans un object-store. `false` quand la base a refusé — quota, base
   * indisponible, valeur non clonable. Résout sur `transaction.oncomplete` :
   * le succès de la requête précède le commit, et c'est le commit qui promet.
   *
   * @param {string} storeName
   * @param {(store: IDBObjectStore) => void} apply
   */
  const write = async (storeName, apply) => {
    const db = await open();
    if (!db) return false;
    return new Promise(resolve => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        apply(tx.objectStore(storeName));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch {
        // `put` lève en SYNCHRONE sur une valeur que le clonage structuré
        // refuse (fonction, DOM…) : c'est le pendant de la valeur cyclique
        // refusée par `writeJson`.
        resolve(false);
      }
    });
  };

  /** @param {string} storeName */
  const list = async storeName => {
    const db = await open();
    if (!db) return [];
    return new Promise(resolve => {
      try {
        const req = db
          .transaction(storeName, 'readonly')
          .objectStore(storeName)
          .getAllKeys();
        req.onsuccess = () =>
          resolve(req.result.filter(key => typeof key === 'string'));
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  };

  return {
    name,

    /**
     * `true` si la base s'ouvre RÉELLEMENT, ici et maintenant — pas si l'API
     * existe : la navigation privée expose `indexedDB` et refuse l'ouverture.
     */
    available: async () => (await open()) !== null,

    /** Lit une valeur du store `kv`, ou rend `fallback`. */
    get: (key, fallback = undefined) => read(STORE_KV, key, fallback),

    /** Écrit dans `kv`. `false` si la base a refusé. */
    set: (key, value) => write(STORE_KV, store => store.put(value, key)),

    /** Retire une clé de `kv`. `false` seulement si la base a refusé. */
    remove: key => write(STORE_KV, store => store.delete(key)),

    /** Les clés du store `kv`. Vide si la base est indisponible. */
    keys: () => list(STORE_KV),

    /** Vide `kv` — et LUI SEUL : les `Blob` de l'app survivent. */
    clear: () => write(STORE_KV, store => store.clear()),

    /** Lit un `Blob`, ou `undefined` — tel quel, sans passage par JSON. */
    getBlob: key => read(STORE_BLOBS, key, undefined),

    /** Range un `Blob` sous `key`. `false` si la base a refusé. */
    setBlob: (key, blob) => write(STORE_BLOBS, store => store.put(blob, key)),

    /** Retire un `Blob`. */
    removeBlob: key => write(STORE_BLOBS, store => store.delete(key)),

    /**
     * Ferme la connexion — et rouvrira à la prochaine opération. Une connexion
     * ouverte est exactement ce qui fait `onblocked` chez les autres onglets
     * le jour d'une mise à niveau.
     */
    close: async () => {
      const pending = dbPromise;
      dbPromise = null;
      const db = pending ? await pending : null;
      try {
        db?.close();
      } catch {
        /* déjà fermée : il n'y a rien à fermer */
      }
    },
  };
}
