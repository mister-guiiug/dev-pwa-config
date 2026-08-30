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
 * ⚠ `catchUp` N'APPLIQUE PAS `filter`. L'abonnement est filtré côté serveur,
 * le rattrapage ne l'est pas : il interroge la table sur la seule colonne
 * curseur. Sur une base où la RLS laisse passer plusieurs espaces — le cas
 * NORMAL d'une app multi-espaces —, le rattrapage fait donc entrer des lignes
 * d'un AUTRE espace que celui écouté, sans qu'aucune erreur ne le dise. Ce
 * n'est pas une fuite de données (la RLS tient), c'est un mélange : le journal
 * d'un espace se met à afficher l'activité d'un autre après une simple
 * reconnexion. Deux issues, au choix de l'app :
 *
 *   - filtrer soi-même ce que `catchUp` rend, dans `onMessage` ;
 *   - ne pas prendre `catchUp` du tout — ne câbler que `connect` — et
 *     recharger l'écran avec SA requête, déjà filtrée, à chaque retour à
 *     `live` (c'est ce que fait miss-carbook, cf. `useRealtimeTable`).
 *
 * PRÉREQUIS CÔTÉ BASE, que le paquet ne peut pas poser à votre place :
 *
 *   alter publication supabase_realtime add table public.places;
 *   -- et une politique de LECTURE, sinon l'abonnement se connecte
 *   -- sans jamais rien recevoir — l'échec le plus déroutant du lot.
 */

/**
 * Numéro de canal, monotone et interne au module.
 *
 * POURQUOI UN COMPTEUR PLUTÔT QU'UN NOM STABLE. Trois comportements de
 * `@supabase/realtime-js` se combinent en un échec MUET :
 *
 * 1. `RealtimeClient.channel(sujet)` REND le canal déjà enregistré sous ce
 *    sujet au lieu d'en créer un ;
 * 2. `RealtimeChannel.subscribe()` ne fait RIEN sur un canal qui n'est pas
 *    `closed` — pas d'erreur, pas de rappel, rien ;
 * 3. `removeChannel()` est ASYNCHRONE : le canal sortant reste enregistré, en
 *    état `leaving`, le temps de l'aller-retour serveur.
 *
 * Le sujet valait `dwc:<schema>:<table>`, sans le filtre. Deux abonnements à
 * la même table avec des filtres DIFFÉRENTS — un fil de commentaires par
 * candidat et un journal par espace de travail, cas d'école — recevaient donc
 * le même canal : le second y greffait ses écouteurs, `subscribe()` ne faisait
 * rien, la promesse de `connect()` ne se résolvait JAMAIS et l'écran restait
 * muet sans qu'aucune erreur ne le signale. Même chose au démontage-remontage
 * dans le même commit React, où le canal sortant est encore là.
 *
 * Le filtre entre donc dans le nom pour la LISIBILITÉ en débogage, et le
 * compteur garantit l'UNICITÉ — les deux séparément, parce que deux
 * abonnements rigoureusement identiques doivent eux aussi coexister.
 */
let channelSeq = 0;

/**
 * @param {{ client: object, table: string, schema?: string, event?: string,
 *   filter?: string, cursorColumn?: string, channelName?: string }} options
 */
export function supabaseRealtimeTransport(options) {
  const {
    client,
    table,
    schema = 'public',
    event = '*',
    filter,
    cursorColumn = 'updated_at',
    channelName,
  } = options ?? {};

  if (!client?.channel) {
    throw new Error('realtime/supabase: un client Supabase est requis');
  }
  if (!table) throw new Error('realtime/supabase: `table` est requis');

  /**
   * La part LISIBLE du sujet : ce qu'on veut retrouver dans une trace réseau
   * ou dans `supabase.getChannels()`. `channelName` la remplace, mais ne fige
   * pas le sujet — le compteur reste, sans quoi l'appelant réintroduirait la
   * collision d'un simple nom en dur.
   */
  const topicBase =
    channelName ?? `dwc:${schema}:${table}${filter ? `:${filter}` : ''}`;

  return {
    /** Le repère porté par un message : ce qui borne le prochain rattrapage. */
    cursorOf: message => message?.new?.[cursorColumn] ?? null,

    connect({ onMessage, onError }) {
      return new Promise((resolve, reject) => {
        // Un sujet NEUF à chaque tentative, pas un par transport : après une
        // coupure, le canal précédent peut encore être en `leaving`.
        const topic = `${topicBase}#${++channelSeq}`;

        let settled = false;
        let released = false;
        let channel = null;

        /**
         * Rendre le canal au client, une seule fois.
         *
         * FERMETURE GARANTIE : tant que ce retrait n'a pas lieu, le canal
         * reste dans `client.channels` POUR TOUJOURS. Une tentative qui échoue
         * avant `SUBSCRIBED` ne donnait aucune poignée à l'appelant — il ne
         * pouvait donc pas nettoyer —, et le double montage de React en
         * développement en produisait un canal orphelin par montage.
         */
        const release = () => {
          if (released || !channel) return;
          released = true;
          client.removeChannel(channel);
        };

        try {
          // Assigné AVANT de s'abonner : un client qui rappellerait
          // `subscribe` de façon synchrone trouverait sinon `channel` nul, et
          // `release()` ne retirerait rien.
          channel = client.channel(topic);
          channel.on(
            'postgres_changes',
            { event, schema, table, ...(filter ? { filter } : {}) },
            payload => onMessage(payload)
          );
          channel.subscribe(status => {
            // Le canal est parti : plus rien de ce qu'il dit ne compte —
            // `removeChannel()` déclenche lui-même un `CLOSED`.
            if (released) return;

            if (status === 'SUBSCRIBED') {
              if (settled) return;
              settled = true;
              resolve({
                close: release,
                // `joinedOnce` reste vrai après une perte : c'est l'état du
                // canal qui dit s'il est encore debout.
                alive: () => channel.state === 'joined',
              });
              return;
            }

            // `CLOSED` ne compte que TANT QUE l'abonnement n'a pas abouti : un
            // canal mort-né laisserait sinon la promesse en suspens pour
            // toujours, sans erreur ni tentative suivante. Passé `SUBSCRIBED`,
            // la fermeture est celle qu'on a demandée — et si elle vient du
            // serveur, c'est `alive()` qui la rapporte au réveil de l'onglet,
            // plutôt qu'une reconnexion déclenchée sur un état que realtime-js
            // traverse aussi de lui-même.
            const broken =
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              (status === 'CLOSED' && !settled);
            if (!broken) return;

            const error = new Error(`realtime/supabase: ${status} (${topic})`);
            if (settled) {
              onError(error);
              return;
            }
            settled = true;
            release();
            reject(error);
          });
        } catch (error) {
          // `channel()` ou `on()` qui lève laisse un canal enregistré que
          // personne ne réclamera jamais : c'est la fuite qu'on refuse.
          if (settled) return;
          settled = true;
          release();
          reject(error);
        }
      });
    },

    /**
     * Ce qui a changé depuis `since`. Sans repère, on ne rejoue RIEN : au
     * premier abonnement il n'y a pas de trou à combler, et tout retélécharger
     * ferait passer un démarrage pour un rattrapage.
     *
     * ⚠ `filter` N'EST PAS APPLIQUÉ ici — voir l'en-tête du module.
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
