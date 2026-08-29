import type { Store } from './storage.js';

export declare const BACKUP_FORMAT: string;
export declare const BACKUP_VERSION: number;

export interface Backup {
  format: string;
  v: number;
  /** L'identité de l'app — vérifiée à la restauration. */
  app: string;
  prefix: string;
  appVersion?: string;
  exportedAt: string;
  entries: number;
  /** Valeurs BRUTES : un blob chiffré n'est pas du JSON, et doit survivre. */
  data: Record<string, string>;
}

export interface BackupOptions {
  /** Identité affichée et vérifiée. Défaut : le préfixe du magasin. */
  app?: string;
  appVersion?: string;
}

/** L'état d'un magasin, en objet transportable. */
export declare function createBackup(
  store: Store,
  options?: BackupOptions
): Backup;

/**
 * Les problèmes qui empêchent de restaurer — tous, pas le premier. Vide si
 * tout va bien. Une sauvegarde d'une AUTRE app est un problème.
 */
export declare function validateBackup(
  backup: unknown,
  store?: Store
): string[];

export interface RestoreOptions {
  /** Vider d'abord le préfixe : l'état final est exactement celui du fichier. */
  replace?: boolean;
}

export type RestoreResult =
  | { ok: true; restored: number }
  | { ok: false; problems: string[] };

/** Valide d'abord, écrit ensuite — jamais d'état intermédiaire. */
export declare function restoreBackup(
  store: Store,
  backup: unknown,
  options?: RestoreOptions
): RestoreResult;

/** Exporte et télécharge (`mfm-sauvegarde-2026-08-29.json`). `false` sans DOM. */
export declare function downloadBackup(
  store: Store,
  options?: BackupOptions & { filename?: string }
): boolean;

/** Lit un fichier utilisateur et le restaure. Lève sur un JSON illisible. */
export declare function restoreBackupFile(
  store: Store,
  file: Blob,
  options?: RestoreOptions
): Promise<RestoreResult>;
