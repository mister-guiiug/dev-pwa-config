import type { ReactElement } from 'react';

export interface BackupImportResult {
  ok: boolean;
  /** Ce qui empêche l'import, dit à l'utilisateur. */
  problems?: string[];
}

export interface BackupCardProps {
  /** Identifiant de l'app : nom du fichier et clé du rappel (`dwc_backup:<app>`). */
  app: string;
  /** Ce qu'il faut écrire dans le fichier (tout ce que l'utilisateur a créé). */
  exportData: () => unknown | Promise<unknown>;
  /** Reprend le contenu d'un fichier, après confirmation. Absent : pas d'import. */
  importData?: (
    data: unknown
  ) => BackupImportResult | void | Promise<BackupImportResult | void>;
  /** Défaut : `<app>-sauvegarde-AAAA-MM-JJ.json`. */
  fileName?: string;
  /** Jours entre deux rappels ; `false` l'éteint. Défaut : 7. */
  reminderDays?: number | false;
  /** L'app a-t-elle des données ? Sans données, aucun rappel. Défaut : oui. */
  hasData?: boolean;
  /** Niveau du titre de la carte. Défaut : 2. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/** La carte « Sauvegarde » des réglages : exporter, importer, rappel, stockage persistant. */
export declare function BackupCard(props: BackupCardProps): ReactElement;

/** Le rappel de sauvegarde, pour l'afficher où l'utilisateur passe. */
export declare function useBackupReminder(
  app: string,
  options?: { days?: number | false; hasData?: boolean }
): {
  last: string | null;
  due: boolean;
  snooze: () => void;
  markDone: () => void;
};
