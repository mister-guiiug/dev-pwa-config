import type { StorageKind } from './storage.js';

/** Itérations PBKDF2 par défaut (recommandation OWASP pour SHA-256). */
export declare const DEFAULT_ITERATIONS: number;

export interface VaultOptions {
  /** Préfixe des clés du coffre. Défaut : `dwc_vault_`. */
  prefix?: string;
  /** Itérations PBKDF2 à l'activation. Les coffres existants gardent les leurs. */
  iterations?: number;
  kind?: StorageKind;
}

/**
 * Un coffre local : secrets chiffrés au repos (AES-256-GCM, clé PBKDF2-SHA-256
 * en mémoire seule).
 *
 * Protège la fuite PASSIVE — sauvegarde du stockage, script tiers qui le lit,
 * appareil perdu. Ne protège PAS d'un XSS actif pendant une session
 * déverrouillée : le script appellerait `decrypt` comme l'app. Phrase oubliée =
 * données irrécupérables.
 */
export interface Vault {
  /** Web Crypto est-il disponible dans ce contexte ? */
  supported(): boolean;
  /** Le coffre a-t-il été activé sur cet appareil ? */
  isEnabled(): boolean;
  /** La clé est-elle en mémoire (coffre ouvert cette session) ? */
  isUnlocked(): boolean;
  /** Active avec une phrase neuve. Lève si Web Crypto ou le stockage manque. */
  enable(passphrase: string): Promise<void>;
  /** Déverrouille. `false` sur phrase incorrecte ou coffre absent. */
  unlock(passphrase: string): Promise<boolean>;
  /** Oublie la clé ; le contenu chiffré reste. */
  lock(): void;
  /** Retire les métadonnées : le contenu devient définitivement illisible. */
  disable(): void;
  /** Lève `vault-locked` si le coffre est fermé. */
  encrypt(plaintext: string): Promise<string>;
  /** Lève `vault-locked` fermé, ou si le blob a été altéré (GCM authentifie). */
  decrypt(blob: string): Promise<string>;
  /** Chiffre et range. `false` si le stockage refuse. */
  setItem(key: string, value: unknown): Promise<boolean>;
  /** Relit et déchiffre. `fallback` si absent OU illisible. */
  getItem<T>(key: string, fallback?: T): Promise<T | null>;
  removeItem(key: string): void;
  /** Les entrées du coffre, métadonnées exclues. */
  keys(): string[];
}

export declare function createVault(options?: VaultOptions): Vault;
