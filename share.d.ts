/** Ce qui s'est réellement passé — l'annulation n'est pas un échec. */
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

/** URL canonique de l'app courante (base path Vite compris). */
export declare function currentAppUrl(): string;

/** Copie dans le presse-papiers ; `false` plutôt qu'une exception. */
export declare function copyToClipboard(text: string): Promise<boolean>;

/** Partage natif, repli sur le presse-papiers. */
export declare function shareOrCopy(data?: ShareData): Promise<ShareResult>;
