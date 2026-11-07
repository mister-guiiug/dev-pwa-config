/**
 * Le rappel de sauvegarde, sans React : quand une application dont la seule
 * copie est sur l'appareil doit-elle dire « pensez à exporter » ?
 */

export interface BackupState {
  /** Date ISO de la dernière sauvegarde exportée. */
  last: string | null;
  /** Date ISO du dernier « plus tard ». */
  snoozed: string | null;
}

/** Jours entre deux rappels (7, comme miss-contraction). */
export declare const BACKUP_REMINDER_DAYS: number;

/** `dwc_backup:<app>` : une clé par application, l'origine est partagée. */
export declare function backupStateKey(app: string): string;

export declare function readBackupState(
  app: string,
  storage?: Storage | null
): BackupState;

/** Une sauvegarde vient d'être exportée. */
export declare function markBackupDone(
  app: string,
  now?: Date,
  storage?: Storage | null
): BackupState;

/** « Plus tard » : le rappel se tait pour un cycle. */
export declare function snoozeBackupReminder(
  app: string,
  now?: Date,
  storage?: Storage | null
): BackupState;

export interface BackupReminderOptions {
  now?: Date;
  /** Jours entre deux rappels ; `false` l'éteint. Défaut : 7. */
  days?: number | false;
  /** L'app a-t-elle des données à sauvegarder ? Défaut : oui. */
  hasData?: boolean;
}

/** Faut-il rappeler d'exporter une sauvegarde ? */
export declare function isBackupReminderDue(
  state: BackupState,
  options?: BackupReminderOptions
): boolean;
