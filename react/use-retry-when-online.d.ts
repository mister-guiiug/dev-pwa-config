export interface RetryWhenOnlineOptions {
  /**
   * Répit après le retour du réseau, en ms (défaut 1500) : `online` part quand
   * l'interface remonte, pas quand le DNS et le TLS répondent.
   */
  graceMs?: number;
}

/**
 * Rejoue `retry` une fois par retour du réseau tant que `onFallback` est vrai
 * (donnée servie depuis un cache, erreur posée sans rien de chargé…). Couvre
 * aussi le repli choisi sur délai : au démarrage en ligne, une tentative part
 * après le répit. Renvoie l'état en ligne.
 */
export declare function useRetryWhenOnline(
  onFallback: boolean,
  retry: () => unknown,
  options?: RetryWhenOnlineOptions
): boolean;
