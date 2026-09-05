/**
 * Stockage clé/valeur qui ne casse jamais l'app.
 *
 * PROMU, PAS INVENTÉ. Sept apps sur dix-sept recopient le même fichier —
 * `readJson` / `writeJson` / `removeKey` enveloppés d'un `try/catch` — et c'est
 * la PLUS GROSSE duplication du relevé d'adoption, devant `links` (9) parce que
 * celui-là est de la donnée. L'en-tête de `mister-family-map` dit déjà pourquoi
 * ces try/catch existent : « navigation privée, quota, environnement de test ».
 *
 * POURQUOI CES TRY/CATCH NE SONT PAS DE LA SUPERSTITION. `localStorage.getItem`
 * LÈVE, et pas seulement en navigation privée :
 *   - Safari en navigation privée refusait historiquement l'écriture (quota 0) ;
 *   - un navigateur réglé sur « bloquer les données de sites » fait lever le
 *     simple ACCÈS à `localStorage`, avant toute lecture ;
 *   - le quota dépassé lève `QuotaExceededError` à l'écriture ;
 *   - `JSON.parse` lève sur une valeur écrite par une version antérieure.
 * Une app qui lit une préférence d'affichage n'a aucune raison de tomber pour
 * l'une de ces quatre raisons.
 *
 * CE QUE LA PROMOTION AJOUTE aux trente lignes recopiées :
 *   - `createStore(prefix)` — les sept copies préfixent leurs clés à la main,
 *     chacune à sa façon (`mfm_`, `miss-supaboss-`, aucune). Un préfixe oublié,
 *     et deux apps servies depuis le même domaine se marchent dessus ;
 *   - la distinction ÉCRITURE REFUSÉE / VALEUR ABSENTE, que `writeJson`
 *     signalait déjà par un booléen mais que personne ne lisait ;
 *   - `session` et `local` derrière la même interface.
 *
 * CE QUE ÇA N'EST PAS. Ce n'est pas du stockage sécurisé : tout est en clair et
 * lisible par n'importe quel script de la page. Pour un secret, voir
 * `@mister-guiiug/dev-pwa-config/secure-storage`. Et ce n'est pas un schéma :
 * pour l'instantané versionné d'une app — enveloppe, migrations, validation —
 * voir `./versioned-store.js` ; pour du volume ou des `Blob`, `./idb.js`.
 */

/** Le stockage demandé, ou `null` si l'accès lui-même lève. */
function pick(kind) {
  try {
    const store =
      kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
    // L'accès à la propriété suffit à lever quand les données de site sont
    // bloquées : on ne peut donc pas se contenter de tester la présence.
    return store ?? null;
  } catch {
    return null;
  }
}

/** `true` si ce stockage accepte réellement une écriture, ici et maintenant. */
export function isStorageAvailable(kind = 'local') {
  const store = pick(kind);
  if (!store) return false;
  const probe = '__dwc_probe__';
  try {
    store.setItem(probe, '1');
    store.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** La valeur brute, ou `null` — jamais d'exception. */
export function readRaw(key, kind = 'local') {
  try {
    return pick(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Écrit une valeur brute. Rend `false` quand le stockage a REFUSÉ — quota,
 * mode privé, données de site bloquées. Un appelant qui s'en moque peut
 * ignorer le retour ; celui qui promet « enregistré » à l'utilisateur ne le
 * doit pas.
 */
export function writeRaw(key, value, kind = 'local') {
  try {
    const store = pick(kind);
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Retire une clé. Ne lève jamais, ne dit rien : il n'y a rien à savoir. */
export function removeKey(key, kind = 'local') {
  try {
    pick(kind)?.removeItem(key);
  } catch {
    /* stockage indisponible : il n'y avait rien à retirer */
  }
}

/**
 * Lit du JSON, ou rend `fallback`.
 *
 * `fallback` couvre TROIS cas qu'il ne distingue pas : clé absente, stockage
 * indisponible, valeur illisible. C'est voulu — l'appelant qui a besoin de les
 * distinguer utilise `readRaw`.
 */
export function readJson(key, fallback, kind = 'local') {
  const raw = readRaw(key, kind);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    // Valeur écrite par une version antérieure, ou tronquée : le défaut vaut
    // mieux qu'une exception au montage.
    return fallback;
  }
}

/** Écrit du JSON. `false` si le stockage a refusé, ou si la valeur est cyclique. */
export function writeJson(key, value, kind = 'local') {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }
  if (serialized === undefined) return false;
  return writeRaw(key, serialized, kind);
}

/**
 * Toutes les clés du stockage, préfixe compris. Vide si indisponible.
 *
 * Par `length` et `key(i)`, l'API documentée de `Storage` — et non par
 * `Object.keys`, qui ne marche que parce que les implémentations exposent les
 * clés comme des propriétés énumérables. Rien ne l'impose.
 */
export function listKeys(kind = 'local') {
  try {
    const store = pick(kind);
    if (!store) return [];
    const keys = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (typeof key === 'string') keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Un magasin dont toutes les clés portent le même préfixe.
 *
 * POURQUOI LE PRÉFIXE COMPTE. Les seize apps sont servies depuis le MÊME
 * domaine — `mister-guiiug.github.io` — et partagent donc un seul
 * `localStorage`. Sans préfixe, `settings` de l'une écrase `settings` de
 * l'autre. Trois apps préfixent, les autres non ; c'est le genre de collision
 * qui ne se voit qu'en production, chez l'utilisateur qui a installé les deux.
 *
 * `clear()` ne retire QUE les clés du préfixe : effacer le stockage d'une app
 * ne doit pas déconnecter les seize autres.
 */
export function createStore(prefix, options = {}) {
  const kind = options.kind ?? 'local';
  const full = key => `${prefix}${key}`;

  return {
    prefix,
    kind,
    available: () => isStorageAvailable(kind),
    get: (key, fallback) => readJson(full(key), fallback, kind),
    set: (key, value) => writeJson(full(key), value, kind),
    getRaw: key => readRaw(full(key), kind),
    setRaw: (key, value) => writeRaw(full(key), value, kind),
    remove: key => removeKey(full(key), kind),
    keys: () =>
      listKeys(kind)
        .filter(key => key.startsWith(prefix))
        .map(key => key.slice(prefix.length)),
    clear() {
      for (const key of listKeys(kind)) {
        if (key.startsWith(prefix)) removeKey(key, kind);
      }
    },
  };
}
