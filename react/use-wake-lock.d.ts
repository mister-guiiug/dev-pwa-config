/**
 * Garde l'écran allumé (Screen Wake Lock API) tant que `active`. Ré-acquiert
 * le verrou au retour au premier plan. Silencieux si l'API manque.
 */
export declare function useWakeLock(active?: boolean): void;
