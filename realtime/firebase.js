/**
 * Transport Firestore.
 *
 * Peer OPTIONNEL : `firebase`. `onSnapshot` et la requête sont INJECTÉS — le
 * SDK modulaire s'importe par fonctions, et le paquet ne doit pas décider
 * pour l'app quelle version elle utilise.
 *
 * FIRESTORE N'A PAS BESOIN DU MÊME RATTRAPAGE. `onSnapshot` rejoue de
 * lui-même l'état complet à la reconnexion, et le cache hors ligne du SDK
 * sert les données en attendant. Le port reste utile pour le reste : le
 * retrait exponentiel quand l'abonnement échoue à s'établir, l'état affiché à
 * l'utilisateur, et la sonde au réveil de l'onglet.
 *
 * `metadata.fromCache` distingue une donnée locale d'une donnée serveur : le
 * transport la remonte telle quelle, à l'app de décider si elle l'affiche
 * comme provisoire.
 */

/**
 * @param {{ query: unknown, onSnapshot: Function,
 *   includeMetadataChanges?: boolean }} options
 */
export function firestoreRealtimeTransport(options) {
  const { query, onSnapshot, includeMetadataChanges = false } = options ?? {};
  if (!query || typeof onSnapshot !== 'function') {
    throw new Error(
      "realtime/firebase: `query` et `onSnapshot` sont requis — importez `onSnapshot` de 'firebase/firestore'"
    );
  }

  return {
    connect({ onMessage, onError }) {
      return new Promise((resolve, reject) => {
        let settled = false;
        let unsubscribe;
        try {
          unsubscribe = onSnapshot(
            query,
            { includeMetadataChanges },
            snapshot => {
              if (!settled) {
                settled = true;
                resolve({ close: () => unsubscribe?.() });
              }
              for (const change of snapshot.docChanges?.() ?? []) {
                onMessage({
                  eventType: change.type,
                  id: change.doc.id,
                  new: change.doc.data(),
                  fromCache: snapshot.metadata?.fromCache ?? false,
                });
              }
            },
            error => {
              if (settled) onError(error);
              else {
                settled = true;
                reject(error);
              }
            }
          );
        } catch (error) {
          reject(error);
        }
      });
    },
  };
}
