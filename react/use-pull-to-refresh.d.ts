export interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  /** Défaut `true`. */
  enabled?: boolean;
  /** Distance (px, après amorti) qui déclenche (défaut 64). */
  threshold?: number;
}

export interface PullToRefreshState {
  pulling: boolean;
  /** 0–1 : proportion du seuil parcourue (pour l'indicateur). */
  progress: number;
  refreshing: boolean;
}

/**
 * Tirer-pour-rafraîchir léger, borné au composant appelant — le
 * pull-to-refresh natif reste désactivé sur le reste de l'app.
 */
export declare function usePullToRefresh(
  options: PullToRefreshOptions
): PullToRefreshState;
