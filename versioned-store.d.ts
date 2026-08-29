import type { Store } from './storage.js';

export interface VersionedStoreOptions<T> {
  /** Un magasin de `./storage.js`, ou un préfixe (passé à `createStore`). */
  store: Store | string;
  /** La clé de l'instantané dans le magasin. Défaut : `'data'`. */
  key?: string;
  /** La version courante du schéma. Entier ≥ 0. */
  version: number;
  /**
   * Migrations indexées par version SOURCE : `migrations[n]` transforme la
   * donnée de la version `n` vers `n + 1`. C'est le magasin qui tient le
   * compte — la migration ne transforme que la donnée.
   */
  migrations?: Record<number, (data: unknown) => unknown>;
  /**
   * Rend la donnée validée (éventuellement réparée) ou LÈVE. Typiquement
   * `schema.parse` de zod — injectée, le socle ne dépend de rien.
   */
  validate?: (data: unknown) => T;
  /** L'état initial, quand il n'y a rien — ou rien d'utilisable. */
  seed?: () => T;
  /** Copie de côté avant chaque migration (`{clé}.backup-v{n}`). Défaut : `true`. */
  backupBeforeMigrate?: boolean;
}

export interface VersionedStore<T> {
  /** Le magasin sous-jacent — pour composer avec `./backup.js`. */
  readonly store: Store;
  /**
   * Lit, migre, valide. Jamais de destruction silencieuse : ce qui ne se
   * comprend pas (version d'après, donnée invalide, JSON illisible) est copié
   * sous `{clé}.backup-…` AVANT le repli sur le seed.
   */
  load(): T | null;
  /** Enveloppe (`{ v, data }`) et écrit. `false` si le stockage a refusé. */
  save(data: T): boolean;
  /** Efface l'instantané ET ses copies de côté. Le reste du magasin survit. */
  clear(): void;
  /** L'état courant en JSON indenté, enveloppe comprise. `null` si rien. */
  export(): string | null;
  /**
   * Parse, migre, valide — n'écrit QUE si tout a réussi. Lève une erreur
   * lisible sinon (cause d'origine en `cause`).
   */
  import(json: string): T;
}

export interface SeededVersionedStore<T> extends VersionedStore<T> {
  /** Avec un `seed`, il y a toujours quelque chose à charger. */
  load(): T;
}

/**
 * Un magasin versionné pour UN instantané : enveloppe `{ v, data }`, chaîne de
 * migrations qui montent d'un cran, validation injectée — et une copie de côté
 * avant toute perte possible, jamais l'inverse.
 */
export declare function createVersionedStore<T = unknown>(
  options: VersionedStoreOptions<T> & { seed: () => T }
): SeededVersionedStore<T>;
export declare function createVersionedStore<T = unknown>(
  options: VersionedStoreOptions<T>
): VersionedStore<T>;
