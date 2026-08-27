import type {
  FocusEventHandler,
  PointerEventHandler,
  TouchEventHandler,
} from 'react';

export interface PrefetchLinkProps {
  onPointerEnter: PointerEventHandler;
  onFocus: FocusEventHandler;
  onTouchStart: TouchEventHandler;
}

export interface PrefetchHandle {
  /** Déclenche le préchargement tout de suite. */
  prefetch: () => boolean;
  /** À étaler sur un lien : précharge à l'approche du pointeur ou du focus. */
  linkProps: PrefetchLinkProps;
}

/** Précharge une route découpée à l'approche. Le chargeur est figé au montage. */
export declare function usePrefetch(
  loader: () => Promise<unknown>
): PrefetchHandle;

export interface VisiblePrefetchOptions {
  rootMargin?: string;
  enabled?: boolean;
}

/** Précharge quand l'élément référencé approche de l'écran. */
export declare function useVisiblePrefetch(
  elementRef: { current: Element | null },
  loader: () => Promise<unknown>,
  options?: VisiblePrefetchOptions
): void;

export interface IdlePrefetchOptions {
  timeout?: number;
  enabled?: boolean;
}

/** Précharge dès que le navigateur est au repos. */
export declare function useIdlePrefetch(
  loader: () => Promise<unknown>,
  options?: IdlePrefetchOptions
): void;
