/**
 * Transport local : les autres ONGLETS, sans serveur.
 *
 * SANS DÉPENDANCE, ET PAS UN BOUCHON. Cinq apps de la famille sont
 * local-first et n'ont aucun backend — mais leurs utilisateurs ouvrent
 * plusieurs onglets, et deux onglets qui écrivent le même `localStorage` se
 * contredisent en silence. `BroadcastChannel` les met d'accord, avec la même
 * interface que Supabase ou Firestore : le jour où l'app se branche à un
 * serveur, seul l'adaptateur change.
 *
 * Il sert aussi de transport de TEST pour les autres : un canal réel, sans
 * réseau ni service.
 *
 * Repli quand `BroadcastChannel` manque (Safari ancien) : l'évènement
 * `storage`, que le navigateur émet dans les AUTRES onglets — exactement la
 * portée voulue.
 */

/** @param {{ name: string, env?: object }} options */
export function localRealtimeTransport(options) {
  const { name, env = globalThis } = options ?? {};
  if (!name) throw new Error('realtime/local: `name` est requis');
  const storageKey = `dwc_bc_${name}`;

  return {
    connect({ onMessage }) {
      if (typeof env.BroadcastChannel === 'function') {
        const channel = new env.BroadcastChannel(`dwc:${name}`);
        channel.onmessage = event => onMessage(event.data);
        return Promise.resolve({
          close: () => channel.close(),
          alive: () => true,
        });
      }

      if (!env.addEventListener) {
        return Promise.reject(
          new Error('realtime/local: ni BroadcastChannel ni évènement storage')
        );
      }

      const onStorage = event => {
        if (event.key !== storageKey || !event.newValue) return;
        try {
          onMessage(JSON.parse(event.newValue).payload);
        } catch {
          /* message illisible : un onglet d'une autre version */
        }
      };
      env.addEventListener('storage', onStorage);
      return Promise.resolve({
        close: () => env.removeEventListener('storage', onStorage),
        alive: () => true,
      });
    },

    /**
     * Diffuse aux autres onglets. Le repli passe par une écriture éphémère :
     * `storage` ne se déclenche que sur un CHANGEMENT de valeur, d'où
     * l'horodatage.
     */
    post(payload) {
      if (typeof env.BroadcastChannel === 'function') {
        const channel = new env.BroadcastChannel(`dwc:${name}`);
        channel.postMessage(payload);
        channel.close();
        return;
      }
      try {
        env.localStorage?.setItem(
          storageKey,
          JSON.stringify({ at: Date.now(), payload })
        );
      } catch {
        /* stockage indisponible : rien à diffuser */
      }
    },
  };
}
