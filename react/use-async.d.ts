export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Chargement asynchrone minimal. `key` identifie la requête : quand elle
 * change, la donnée est rechargée. `fn` n'a pas besoin d'être mémoïsée.
 */
export declare function useAsync<T>(
  fn: () => Promise<T>,
  key: string
): AsyncState<T>;
