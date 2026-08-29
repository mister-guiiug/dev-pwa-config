/**
 * Alphabet de code court : les caractères autorisés, et les confusions de
 * lecture ramenées vers l'alphabet à la normalisation.
 */
export interface PairingAlphabet {
  /** Caractères autorisés. */
  chars: string;
  /**
   * Corrections appliquées après mise en majuscules — uniquement VERS un
   * caractère de l'alphabet (ex. Crockford : `{ I: '1', L: '1', O: '0' }`).
   */
  aliases?: Readonly<Record<string, string>>;
}

/** Alphabets éprouvés par mister-qowa, mister-molkky et miss-ticket-pwa. */
export type PairingAlphabetName = 'numeric' | 'crockford32' | 'antiConfusion';

/**
 * `numeric` (PIN au pavé numérique), `crockford32` (base32 de Crockford,
 * confusions corrigées), `antiConfusion` (32 caractères sans 0/O ni 1/I).
 */
export declare const ALPHABETS: Readonly<
  Record<PairingAlphabetName, PairingAlphabet>
>;

export interface GenerateCodeOptions {
  /** Nom d'`ALPHABETS` ou alphabet personnalisé — défaut `antiConfusion`. */
  alphabet?: PairingAlphabetName | PairingAlphabet;
  /**
   * Source d'octets injectable (tests, environnements exotiques) — défaut
   * `crypto.getRandomValues`.
   */
  random?: (count: number) => Uint8Array | number[];
}

/**
 * Engendre un code court aléatoire, équiprobable sur son alphabet (tirage
 * par rejet — pas de biais `% taille`).
 */
export declare function generateCode(
  length: number,
  options?: GenerateCodeOptions
): string;

export interface NormalizeCodeOptions {
  /** Nom d'`ALPHABETS` ou alphabet personnalisé — défaut `antiConfusion`. */
  alphabet?: PairingAlphabetName | PairingAlphabet;
  /** Coupe la saisie à cette longueur (borne d'un champ contrôlé). */
  maxLength?: number;
}

/**
 * Majuscules, confusions corrigées (`aliases`), tout caractère hors alphabet
 * écarté — à brancher sur le `onChange` d'un champ de code.
 */
export declare function normalizeCode(
  input: string,
  options?: NormalizeCodeOptions
): string;

/** Lien profond décomposé — le schéma est rendu en minuscules. */
export interface DeepLink {
  scheme: string;
  action: string;
  /** Première occurrence de chaque clé (contrat de `URLSearchParams.get`). */
  params: Record<string, string>;
}

/**
 * Construit `schéma:action?clé=valeur` (le motif `missticket:pair?…`,
 * généralisé) ; les valeurs `undefined`/`null` sont omises.
 */
export declare function buildDeepLink(
  scheme: string,
  action: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string;

/**
 * Parse un lien profond ; `null` si la forme — ou le filtre `expected` — ne
 * correspond pas.
 */
export declare function parseDeepLink(
  raw: string,
  expected?: { scheme?: string; action?: string }
): DeepLink | null;
