/** Quel stockage : persistant (`local`) ou vidé à la fermeture (`session`). */
export type StorageKind = 'local' | 'session';

/**
 * `true` si ce stockage accepte réellement une écriture, ici et maintenant.
 * Éprouvé par un aller-retour, pas par une simple présence : un navigateur qui
 * bloque les données de sites expose l'objet et refuse l'écriture.
 */
export declare function isStorageAvailable(kind?: StorageKind): boolean;

/** La valeur brute, ou `null`. Ne lève jamais. */
export declare function readRaw(key: string, kind?: StorageKind): string | null;

/** Écrit une valeur brute. `false` si le stockage a refusé (quota, mode privé). */
export declare function writeRaw(
  key: string,
  value: string,
  kind?: StorageKind
): boolean;

/** Retire une clé. Ne lève jamais. */
export declare function removeKey(key: string, kind?: StorageKind): void;

/**
 * Lit du JSON, ou rend `fallback` — lequel couvre indistinctement la clé
 * absente, le stockage indisponible et la valeur illisible.
 */
export declare function readJson<T>(
  key: string,
  fallback: T,
  kind?: StorageKind
): T;

/** Écrit du JSON. `false` si le stockage a refusé ou la valeur est cyclique. */
export declare function writeJson(
  key: string,
  value: unknown,
  kind?: StorageKind
): boolean;

/** Toutes les clés du stockage, préfixe compris. Vide si indisponible. */
export declare function listKeys(kind?: StorageKind): string[];

export interface StoreOptions {
  kind?: StorageKind;
}

/** Un magasin préfixé : `clear()` n'efface que ses propres clés. */
export interface Store {
  readonly prefix: string;
  readonly kind: StorageKind;
  available(): boolean;
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): boolean;
  getRaw(key: string): string | null;
  setRaw(key: string, value: string): boolean;
  remove(key: string): void;
  /** Les clés du magasin, SANS le préfixe. */
  keys(): string[];
  clear(): void;
}

/**
 * Un magasin dont toutes les clés portent le même préfixe — indispensable
 * quand plusieurs apps de la famille partagent un domaine, donc un
 * `localStorage`.
 */
export declare function createStore(
  prefix: string,
  options?: StoreOptions
): Store;
