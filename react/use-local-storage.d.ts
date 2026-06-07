export type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/** État persistant dans `localStorage`, typé, avec sync inter-onglets. */
export declare function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, () => void];
