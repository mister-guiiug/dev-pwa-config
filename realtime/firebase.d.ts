import type { RealtimeTransport } from './index.js';

export interface FirestoreRealtimeOptions {
  /** La requête ou la référence à écouter. */
  query: unknown;
  /**
   * `onSnapshot` importé de `firebase/firestore`. Le SDK modulaire s'importe
   * par fonctions : le paquet ne décide pas de la version pour l'app.
   */
  onSnapshot: (
    query: unknown,
    options: unknown,
    onNext: (snapshot: {
      docChanges?: () => Array<{
        type: string;
        doc: { id: string; data: () => Record<string, unknown> };
      }>;
      metadata?: { fromCache?: boolean };
    }) => void,
    onError: (error: unknown) => void
  ) => () => void;
  includeMetadataChanges?: boolean;
}

export interface FirestoreChange {
  eventType: 'added' | 'modified' | 'removed' | string;
  id: string;
  new: Record<string, unknown>;
  /** `true` = servi par le cache hors ligne, pas encore confirmé. */
  fromCache: boolean;
}

/**
 * Abonnement `onSnapshot`. Firestore rejoue seul l'état à la reconnexion :
 * pas de `catchUp` ici. Le port sert pour le retrait, l'état affiché et la
 * sonde au réveil.
 */
export declare function firestoreRealtimeTransport(
  options: FirestoreRealtimeOptions
): RealtimeTransport<FirestoreChange>;
