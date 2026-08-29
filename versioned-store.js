/**
 * Un instantané versionné : enveloppe, chaîne de migrations, validation.
 *
 * PROMU, PAS INVENTÉ. C'est le besoin le plus recopié du parc APRÈS l'accès au
 * stockage lui-même : `miss-uwh/src/shared/lib/storage.ts` et
 * `miss-genius/src/shared/lib/storage.ts` sont deux fichiers JUMEAUX — même
 * enveloppe versionnée, même `runMigrations` indexé par version source, même
 * validation zod, même contrat `load/save/clear/export/import` — copiés-collés
 * à la virgule près. `miss-badminton/src/storage.ts` y ajoutait la seule idée
 * qui manquait aux jumeaux : une copie de côté (`mb_backup_v{n}`) AVANT toute
 * transformation destructrice.
 *
 * LE CONTRE-EXEMPLE QUI JUSTIFIE LE MODULE. Dans
 * `miss-lookhouse/src/store/persistence.ts`, une version inconnue rend `null` :
 * les données sont JETÉES à la première sauvegarde qui suit. Un utilisateur qui
 * ouvre l'app depuis un onglet resté sur l'ancienne version, ou après un
 * retour arrière de déploiement, perd tout — sans un message. Ici, la règle
 * est unique et sans exception : AVANT toute perte possible, une copie de côté
 * (`{clé}.backup-…`), déterministe donc bornée ; APRÈS, le seed. Jamais de
 * destruction silencieuse.
 *
 * TROIS DÉCISIONS DE PROMOTION :
 *
 * 1. **La validation est INJECTÉE** (`validate: (data) => data | throw`), pas
 *    importée. Les jumeaux appellent `appDataSchema.safeParse` ; le socle n'a
 *    aucune dépendance et n'en prend pas — l'app passe `schema.parse`, ou une
 *    garde maison, ou rien.
 * 2. **La migration ne transforme QUE la donnée.** Chez les jumeaux, chaque
 *    migration devait penser à réécrire `version: n + 1` dans la donnée — un
 *    oubli et la boucle relisait la même version. Ici le magasin tient le
 *    compte : une migration par version source, chacune monte d'un cran.
 * 3. **La migration réussie est PERSISTÉE.** Les jumeaux re-migraient à chaque
 *    chargement tant que l'app n'avait pas sauvegardé ; une migration doit
 *    tourner une fois.
 *
 * COMPLÉMENTARITÉ. L'accès au stockage vient de `./storage.js` (`createStore`),
 * qui absorbe déjà les quatre façons dont `localStorage` lève — rien n'est
 * recopié ici. Tout passe par le magasin en JSON : `./backup.js`, qui exporte
 * les valeurs BRUTES d'un préfixe, emporte donc l'enveloppe, ses copies de
 * côté, et les restaure telles quelles. Pour un secret, voir
 * `./secure-storage.js` ; pour du volume ou des `Blob`, voir `./idb.js`.
 */
import { createStore } from './storage.js';

/**
 * Un magasin versionné pour UN instantané : l'état complet d'une app sous une
 * clé, enveloppé de sa version (`{ v, data }`).
 *
 * @param {{
 *   store: import('./storage.js').Store | string,
 *   key?: string,
 *   version: number,
 *   migrations?: Record<number, (data: unknown) => unknown>,
 *   validate?: (data: unknown) => unknown,
 *   seed?: () => unknown,
 *   backupBeforeMigrate?: boolean,
 * }} options `store` accepte un magasin de `./storage.js` ou un préfixe ;
 *   `migrations` est indexé par version SOURCE, chaque fonction monte d'un
 *   cran ; `validate` rend la donnée (éventuellement réparée) ou lève —
 *   typiquement `schema.parse` de zod, sans que le socle dépende de zod.
 */
export function createVersionedStore(options) {
  const {
    key = 'data',
    version,
    migrations = {},
    validate = data => data,
    seed,
    backupBeforeMigrate = true,
  } = options;

  if (!Number.isInteger(version) || version < 0) {
    throw new TypeError('versioned-store: `version` doit être un entier ≥ 0');
  }

  const store =
    typeof options.store === 'string'
      ? createStore(options.store)
      : options.store;

  const fresh = () => (seed ? seed() : null);

  /**
   * La copie de côté, AVANT toute perte possible. Clé déterministe
   * (`{clé}.backup-v{n}` ou `{clé}.backup-illisible`), donc bornée : relire
   * cent fois la même donnée malade n'écrit pas cent copies — c'est ce qui
   * distingue ce filet du `_invalid_${Date.now()}` de miss-badminton, qui
   * pouvait remplir le stockage.
   */
  const shelter = (raw, tag) => store.setRaw(`${key}.backup-${tag}`, raw);

  /**
   * L'enveloppe, ou `null`. Une valeur d'avant l'enveloppe — les apps ont
   * toutes commencé sans — vaut version 0 : c'est le chemin d'adoption, la
   * migration `0` de l'app sait quoi en faire.
   */
  const normalize = value => {
    if (value === null || value === undefined) return null;
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof (/** @type {{ v?: unknown }} */ (value).v) === 'number' &&
      'data' in value
    ) {
      return /** @type {{ v: number, data: unknown }} */ (value);
    }
    return { v: 0, data: value };
  };

  /**
   * Monte la chaîne d'un cran à la fois. `null` si un barreau manque —
   * l'appelant décide (copie de côté au chargement, refus à l'import).
   *
   * @param {{ v: number, data: unknown }} envelope
   */
  const upgrade = envelope => {
    let data = envelope.data;
    for (let from = envelope.v; from < version; from += 1) {
      const step = migrations[from];
      if (typeof step !== 'function') return null;
      data = step(data);
    }
    return { v: version, data };
  };

  /** Enveloppe et écrit. `false` si le stockage a refusé. */
  const save = data => store.set(key, { v: version, data });

  /**
   * Lit, migre, valide. Rend le seed (ou `null` sans seed) quand il n'y a
   * rien — ou quand il y a quelque chose d'inutilisable, TOUJOURS copié de
   * côté d'abord. Une migration réussie est persistée dans la foulée.
   */
  const load = () => {
    const raw = store.getRaw(key);
    if (raw === null) return fresh();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Tronquée par un onglet tué, ou écrite hors JSON : illisible ne veut
      // pas dire bon à jeter.
      shelter(raw, 'illisible');
      return fresh();
    }

    const envelope = normalize(parsed);
    if (envelope === null) return fresh();

    // Version d'APRÈS — un onglet resté ouvert sur la nouvelle version a
    // écrit, puis l'utilisateur rouvre l'ancienne ; ou un déploiement est
    // revenu en arrière. On n'y comprend rien, on ne JETTE rien : la clé
    // principale reste intacte, la copie double le filet.
    if (envelope.v > version) {
      shelter(raw, `v${envelope.v}`);
      return fresh();
    }

    let migrated = envelope;
    if (envelope.v < version) {
      if (backupBeforeMigrate) shelter(raw, `v${envelope.v}`);
      try {
        migrated = upgrade(envelope);
      } catch {
        migrated = null; // une migration a levé : même traitement qu'un trou
      }
      if (migrated === null) {
        if (!backupBeforeMigrate) shelter(raw, `v${envelope.v}`);
        return fresh();
      }
    }

    let data;
    try {
      data = validate(migrated.data);
    } catch {
      const sheltered = envelope.v < version && backupBeforeMigrate;
      if (!sheltered) shelter(raw, `v${envelope.v}`);
      return fresh();
    }

    // Une migration doit tourner UNE fois : l'état migré est écrit tout de
    // suite, pas au bon vouloir de la première sauvegarde de l'app.
    if (envelope.v < version) save(data);
    return data;
  };

  return {
    /** Le magasin sous-jacent — pour composer avec `./backup.js`. */
    store,

    load,

    save,

    /**
     * Efface l'instantané ET ses copies de côté. Vider ses données doit vider
     * ses données : laisser traîner un `backup-v2` lisible trahirait la
     * demande. Le reste du magasin n'est pas touché.
     */
    clear() {
      store.remove(key);
      for (const stored of store.keys()) {
        if (stored.startsWith(`${key}.backup-`)) store.remove(stored);
      }
    },

    /**
     * L'état courant — migré, validé — en JSON indenté, enveloppe comprise :
     * le fichier réimporté demain par une app plus récente passera par ses
     * migrations. `null` s'il n'y a rien à exporter.
     */
    export() {
      const data = load();
      if (data === null) return null;
      return JSON.stringify({ v: version, data }, null, 2);
    },

    /**
     * Parse, migre, valide — et n'écrit QUE si tout a réussi : un fichier
     * refusé laisse l'état exactement comme avant. Lève une erreur lisible
     * sinon (l'écran d'import doit pouvoir l'afficher), la cause d'origine en
     * `cause`.
     */
    import(json) {
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (cause) {
        throw new Error(
          'versioned-store: fichier illisible — ce n’est pas du JSON',
          { cause }
        );
      }
      const envelope = normalize(parsed);
      if (envelope === null) {
        throw new Error('versioned-store: fichier vide');
      }
      // À l'import, la version d'après se REFUSE au lieu de se contourner :
      // l'utilisateur tient le fichier, le message lui dit quoi en faire.
      if (envelope.v > version) {
        throw new Error(
          `versioned-store: version ${envelope.v} inconnue — fichier exporté par une version plus récente de l’app ?`
        );
      }
      let migrated = envelope;
      if (envelope.v < version) {
        try {
          migrated = upgrade(envelope);
        } catch (cause) {
          throw new Error(
            `versioned-store: la migration depuis la version ${envelope.v} a échoué`,
            { cause }
          );
        }
        if (migrated === null) {
          throw new Error(
            `versioned-store: aucune chaîne de migrations depuis la version ${envelope.v}`
          );
        }
      }
      let data;
      try {
        data = validate(migrated.data);
      } catch (cause) {
        throw new Error(
          'versioned-store: fichier invalide — le format ne correspond pas à cette application',
          { cause }
        );
      }
      save(data);
      return data;
    },
  };
}
