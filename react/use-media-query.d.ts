/** Suit une media query CSS (SSR-safe). */
export declare function useMediaQuery(query: string): boolean;

/** `true` si l'utilisateur a activé « réduire les animations ». */
export declare function useReducedMotion(): boolean;

/** `true` si le système préfère un thème sombre. */
export declare function usePrefersDark(): boolean;

/** `true` si l'utilisateur a demandé un contraste renforcé. */
export declare function usePrefersHighContrast(): boolean;
