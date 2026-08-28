/**
 * Transport Supabase Realtime.
 *
 * Peer OPTIONNEL : `@supabase/supabase-js`. Le client est INJECTÉ — l'app en a
 * déjà un, et en créer un second ouvrirait une seconde connexion temps réel,
 * qui compte dans le quota du projet.
 *
 * LE RATTRAPAGE EST FOURNI ICI, pas dans le port : lui seul sait interroger
 * une table sur un `updated_at`. C'est cette fonction que `createChannel`
 * appelle après chaque reconnexion, avec le dernier repère reçu.
 *
 * PRÉREQUIS CÔTÉ BASE, que le paquet ne peut pas poser à votre place :
 *
 *   alter publication supabase_realtime add table public.places;
 *   -- et une politique de LECTURE, sinon l'abonnement se connecte
 *   -- sans jamais rien recevoir — l'échec le plus déroutant du lot.
 */

/**
 * @param {{ client: object, table: string, schema?: string, event?: string,
 *   filter?: string, cursorColumn?: string }} options
 */
export function supabaseRealtimeTransport(options) {
  const {
    client,
    table,
    schema = 'public',
    event = '*',
    filter,
    cursorColumn = 'updated_at',
  } = options ?? {};

  if (!client?.channel) {
    throw new Error('realtime/supabase: un client Supabase est requis');
  }
  if (!table) throw new Error('realtime/supabase: `table` est requis');

  return {
    /** Le repère porté par un message : ce qui borne le prochain rattrapage. */
    cursorOf: message => message?.new?.[cursorColumn] ?? null,

    connect({ onMessage, onError }) {
      return new Promise((resolve, reject) => {
        let settled = false;
        const channel = client
          .channel(`dwc:${schema}:${table}`)
          .on(
            'postgres_changes',
            { event, schema, table, ...(filter ? { filter } : {}) },
            payload => onMessage(payload)
          )
          .subscribe(status => {
            if (status === 'SUBSCRIBED' && !settled) {
              settled = true;
              resolve({
                close: () => client.removeChannel(channel),
                // `joinedOnce` reste vrai après une perte : c'est l'état du
                // canal qui dit s'il est encore debout.
                alive: () => channel.state === 'joined',
              });
              return;
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              const error = new Error(`realtime/supabase: ${status}`);
              if (settled) onError(error);
              else {
                settled = true;
                reject(error);
              }
            }
          });
      });
    },

    /**
     * Ce qui a changé depuis `since`. Sans repère, on ne rejoue RIEN : au
     * premier abonnement il n'y a pas de trou à combler, et tout retélécharger
     * ferait passer un démarrage pour un rattrapage.
     */
    async catchUp(since) {
      if (!since) return [];
      const { data, error } = await client
        .from(table)
        .select('*')
        .gt(cursorColumn, since)
        .order(cursorColumn, { ascending: true });
      if (error) throw new Error(`realtime/supabase: ${error.message}`);
      return (data ?? []).map(row => ({ eventType: 'CATCHUP', new: row }));
    },
  };
}
