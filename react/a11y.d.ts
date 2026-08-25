import type { FC, ReactNode, RefObject } from 'react';

/** Sélecteur CSS des éléments qui participent au parcours clavier. */
export declare const FOCUSABLE_SELECTOR: string;

/** Les éléments focusables d'un conteneur, dans l'ordre du document. */
export declare function getFocusable(
  container: HTMLElement | null | undefined
): HTMLElement[];

/** Appelle `onEscape` sur Échap, tant que `active`. Écouté sur `document`. */
export declare function useEscape(
  onEscape: (event: KeyboardEvent) => void,
  active?: boolean
): void;

/** Verrouille le défilement du `<body>` tant que `active`. Réentrant. */
export declare function useScrollLock(active?: boolean): void;

export interface FocusTrapOptions {
  /** Le piège n'agit que si `true` (défaut). */
  active?: boolean;
  /** Élément qui reçoit le focus à l'activation (sinon le conteneur). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Rend le focus à l'élément qui l'avait, à la désactivation (défaut `true`). */
  restoreFocus?: boolean;
}

/**
 * Enferme le parcours clavier dans `containerRef`. Le conteneur doit porter
 * `tabIndex={-1}` pour pouvoir recevoir le focus.
 */
export declare function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options?: FocusTrapOptions
): void;

export type Politeness = 'polite' | 'assertive';

/** UNE région d'annonce pour toute l'app, montée en permanence. */
export declare const AnnouncerProvider: FC<{ children?: ReactNode }>;

/**
 * La fonction d'annonce. Hors fournisseur, renvoie une fonction inerte : un
 * appelant n'a pas à savoir si la région existe.
 */
export declare function useAnnouncer(): (
  message: string,
  politeness?: Politeness
) => void;

/** Texte réservé aux lecteurs d'écran (`.dwc-sr-only` de `tokens.css`). */
export declare const VisuallyHidden: FC<{
  as?: string;
  className?: string;
  children?: ReactNode;
}>;

/**
 * Lien d'évitement. La cible doit exister ET pouvoir recevoir le focus :
 * `<main id="contenu" tabIndex={-1}>`.
 */
export declare const SkipLink: FC<{
  to?: string;
  children?: ReactNode;
  className?: string;
}>;
