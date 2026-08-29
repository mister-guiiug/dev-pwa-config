/** Une cellule : un nombre fini part typé, tout le reste part en chaîne. */
export type XlsxValue = string | number;

export interface XlsxSheet {
  /** Nom d'onglet (assaini : ≤ 31 caractères, sans `\ / ? * [ ] :`). */
  name: string;
  /** Ligne d'en-tête, rendue en gras. */
  header: string[];
  /** Lignes de données, alignées sur l'en-tête. */
  rows: XlsxValue[][];
}

/**
 * Construit les octets d'un fichier `.xlsx` mono-feuille (ZIP « stored »,
 * parties OOXML minimales). Déterministe : même tableau, mêmes octets.
 */
export declare function buildXlsx(sheet: XlsxSheet): Uint8Array;

/** Télécharge un binaire XLSX ; `false` si aucun DOM n'est disponible. */
export declare function downloadXlsx(
  bytes: Uint8Array,
  filename: string
): boolean;
