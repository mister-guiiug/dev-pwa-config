export interface WakeLockState {
  /**
   * L'API Screen Wake Lock existe dans ce navigateur. `false` sur Firefox et
   * sur iOS avant 16.4 : de quoi masquer un réglage qui ne ferait rien.
   */
  supported: boolean;
  /**
   * Le verrou est tenu à cet instant. Il retombe seul quand l'onglet passe en
   * arrière-plan (le navigateur relâche d'autorité) et remonte à son retour.
   */
  held: boolean;
}

/**
 * Garde l'écran allumé tant que `active` est vrai.
 *
 * Réacquiert au retour de `visibilitychange`, libère au démontage comme à la
 * retombée d'`active`, et ne lève jamais — API absente, permission refusée ou
 * geste utilisateur manquant se lisent dans l'état renvoyé.
 *
 * Le branchement sur un réglage reste applicatif :
 * `useWakeLock(reglages.wakeLock && enCours)`.
 */
export declare function useWakeLock(active?: boolean): WakeLockState;
