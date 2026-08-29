/** Dimensions A4 portrait, en points PostScript (1/72 de pouce). */
export declare const PAGE: { readonly w: number; readonly h: number };

/** Couleur RVB, composantes 0..1. */
export type Rgb = [number, number, number];

/** Largeur approximative d'un texte Helvetica, en points (heuristique). */
export declare function textWidth(str: string, size: number): number;

export interface TextOptions {
  /** Helvetica-Bold au lieu de Helvetica. */
  bold?: boolean;
  /** Couleur du texte. Défaut : noir. */
  color?: Rgb;
  /** Défaut : `left`. */
  align?: 'left' | 'center';
  /** Largeur de la colonne pour l'alignement centré. */
  width?: number;
}

/**
 * Flux de contenu d'une page (repère haut-gauche, y vers le bas).
 * Une instance = une page.
 */
export declare class PdfContent {
  /** Rectangle plein. `(x, yTop)` = coin haut-gauche. */
  fillRect(x: number, yTop: number, w: number, h: number, color: Rgb): void;
  /** Trait de `(x1, y1Top)` à `(x2, y2Top)` ; gris de 0 (noir) à 1 (blanc). */
  line(
    x1: number,
    y1Top: number,
    x2: number,
    y2Top: number,
    width: number,
    gray: number
  ): void;
  /** Texte. `(x, baselineTop)` = ligne de base depuis le haut de la page. */
  text(
    x: number,
    baselineTop: number,
    size: number,
    str: string,
    opts?: TextOptions
  ): void;
  /** Les octets du flux de contenu — consommés par `buildPdf`. */
  bytes(): number[];
}

/**
 * Assemble un document PDF (une page par flux de contenu) et rend ses octets.
 * Sans aucun flux, une page vide : un PDF sans page est invalide.
 */
export declare function buildPdf(contents: PdfContent[]): Uint8Array;

/** Télécharge un binaire PDF ; `false` si aucun DOM n'est disponible. */
export declare function downloadPdf(
  bytes: Uint8Array,
  filename: string
): boolean;
