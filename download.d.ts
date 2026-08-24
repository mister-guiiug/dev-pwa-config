/** Date du jour en `AAAA-MM-JJ`, pour nommer un fichier. */
export declare function dateSlug(date?: Date | string | number): string;

/** Provoque le téléchargement d'un blob ; `false` sans DOM. */
export declare function downloadBlob(blob: Blob, filename: string): boolean;

/** Télécharge une valeur sérialisable en JSON indenté. */
export declare function downloadJson(data: unknown, filename: string): boolean;

/** Télécharge du texte brut (CSV, Markdown, journal…). */
export declare function downloadText(
  text: string,
  filename: string,
  type?: string
): boolean;

/** Relit un fichier JSON choisi par l'utilisateur ; lève si le JSON est invalide. */
export declare function readJsonFile(file: Blob): Promise<unknown>;
