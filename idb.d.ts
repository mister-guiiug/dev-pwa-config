/**
 * Une base IndexedDB clé/valeur propre à une app : store `kv` pour les valeurs
 * structurées, store `blobs` pour les `Blob` — best-effort, rien ne lève.
 */
export interface IdbStore {
  /** Le nom de la base — l'identité de l'app. */
  readonly name: string;
  /** `true` si la base s'ouvre réellement, pas seulement si l'API existe. */
  available(): Promise<boolean>;
  /**
   * Lit une valeur de `kv`. Le `fallback` couvre indistinctement la clé
   * absente, la base indisponible et la lecture qui échoue.
   */
  get<T>(key: string, fallback: T): Promise<T>;
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** Écrit dans `kv`. `false` si la base a refusé (quota, valeur non clonable…). */
  set(key: string, value: unknown): Promise<boolean>;
  /** Retire une clé de `kv`. */
  remove(key: string): Promise<boolean>;
  /** Les clés de `kv`. Vide si la base est indisponible. */
  keys(): Promise<string[]>;
  /** Vide `kv` — et lui seul : les `Blob` survivent. */
  clear(): Promise<boolean>;
  /** Lit un `Blob`, tel quel, sans passage par JSON. */
  getBlob(key: string): Promise<Blob | undefined>;
  /** Range un `Blob` sous `key`. `false` si la base a refusé. */
  setBlob(key: string, blob: Blob): Promise<boolean>;
  /** Retire un `Blob`. */
  removeBlob(key: string): Promise<boolean>;
  /** Ferme la connexion ; la prochaine opération rouvrira. */
  close(): Promise<void>;
}

/**
 * Une base clé/valeur propre à une app. Les seize apps partagent l'origine,
 * donc l'espace de noms IndexedDB : le nom EST l'isolation, comme le préfixe
 * de `createStore`.
 */
export declare function createIdb(name: string): IdbStore;
