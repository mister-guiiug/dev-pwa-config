/** Une cellule : un nombre fini part typé, tout le reste part en chaîne. */
export type XlsxValue = string | number;

export interface XlsxSheet {
  /**
   * Nom d'onglet. Assaini (≤ 31 caractères, sans `\ / ? * [ ] :`) et rendu
   * unique dans le classeur — Excel compare sans tenir compte de la casse et
   * refuse le fichier entier sur un doublon.
   */
  name: string;
  /**
   * Ligne d'en-tête, rendue en gras. Absente ou vide : la feuille commence
   * directement à sa première ligne de données (cas d'une feuille de bilan,
   * qui n'a qu'un titre sur une cellule).
   */
  header?: string[];
  /**
   * Lignes de données. Chacune porte la longueur qu'elle a — une ligne vide
   * (`[]`) reste une ligne, une ligne d'une seule cellule reste d'une seule
   * cellule ; rien n'est aligné sur l'en-tête ni complété.
   */
  rows: XlsxValue[][];
}

/**
 * Construit les octets d'un fichier `.xlsx` (ZIP « stored », parties OOXML
 * minimales) : une feuille, ou plusieurs dans leur ordre d'affichage.
 * Déterministe — mêmes feuilles, mêmes octets.
 *
 * Un tableau vide rend un classeur d'un onglet vide plutôt que de lever : un
 * classeur sans onglet ne s'ouvre pas.
 */
export declare function buildXlsx(sheets: XlsxSheet | XlsxSheet[]): Uint8Array;

/** Télécharge un binaire XLSX ; `false` si aucun DOM n'est disponible. */
export declare function downloadXlsx(
  bytes: Uint8Array,
  filename: string
): boolean;
