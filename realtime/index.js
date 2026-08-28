/**
 * Synchronisation vivante — le PORT, agnostique du service.
 *
 * PROVENANCE : AUCUNE, et c'est écrit ici parce que la règle du dépôt est « le
 * socle promeut, il n'invente pas ». Six apps annoncent de la synchronisation
 * en temps réel — miss-carbook, mister-puzzle, mister-doc, mister-molkky,
 * mister-qowa, mister-family-map — sur deux services (Supabase Realtime,
 * Firestore). Mais cette session n'atteint que trois dépôts sur dix-sept : je
 * n'ai pas pu lire une seule de leurs implémentations. Ce module est donc
 * conçu à partir de ce que la PLATEFORME impose, pas de ce que les apps font.
 *
 * CE QUI JUSTIFIE QUAND MÊME DE L'ÉCRIRE. Trois problèmes se posent
 * identiquement quel que soit le service, et se règlent mal du premier coup :
 *
 * 1. **La reconnexion.** Une connexion temps réel tombe — tunnel, veille de
 *    l'écran, bascule wifi/4G. Sans retrait exponentiel, six apps qui
 *    reconnectent en boucle serrée transforment une panne passagère en
 *    martèlement du serveur ; avec un délai fixe, elles reviennent toutes en
 *    même temps.
 * 2. **Le trou.** Se reconnecter ne suffit pas : ce qui s'est passé PENDANT la
 *    coupure n'est jamais rejoué par l'abonnement. Sans rattrapage explicite,
 *    l'écran affiche des données périmées en se croyant à jour — le pire des
 *    deux mondes, parce que rien ne le signale.
 * 3. **La veille.** Sur mobile, l'onglet est suspendu, pas fermé. Au réveil,
 *    la connexion est morte sans qu'aucun évènement ne l'ait dit. Il faut la
 *    sonder au retour de `visibilitychange`, sinon l'app paraît figée.
 *
 * Le TRANSPORT reste un adaptateur (`realtime/supabase`, `realtime/firebase`,
 * `realtime/local`), comme `MapProvider` l'est pour Leaflet et MapLibre.
 *
 * CE QUE ÇA N'EST PAS. Ni un CRDT, ni une résolution de conflits, ni une file
 * d'écriture — celle-ci existe déjà (`react/use-offline-queue`). C'est le
 * chemin DESCENDANT : recevoir ce que les autres ont changé, et savoir quand
 * on ne le reçoit plus.
 */

/** États d'un canal, du plus sain au plus dégradé. */
export const STATUS = {
  idle: 'idle',
  connecting: 'connecting',
  live: 'live',
  /** Connexion perdue, reconnexion programmée. */
  retrying: 'retrying',
  /** Abandonné : plus aucune tentative n'est prévue. */
  closed: 'closed',
};

const DEFAULTS = {
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  maxAttempts: Infinity,
  jitter: 0.3,
};

/**
 * Le délai avant la n-ième tentative : exponentiel, plafonné, dispersé.
 *
 * LA DISPERSION N'EST PAS UN DÉTAIL. Sans elle, tous les clients déconnectés
 * par la même coupure reviennent à la même milliseconde et refont tomber le
 * serveur qui vient de se relever. C'est le troupeau tonnant, et il est
 * d'autant plus probable que les apps de la famille partagent un projet
 * Supabase gratuit.
 *
 * @param {number} attempt Numéro de tentative, à partir de 1.
 */
export function backoffDelay(attempt, options = {}) {
  const { baseDelayMs, maxDelayMs, jitter } = { ...DEFAULTS, ...options };
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const spread = exponential * jitter;
  // Centré sur la valeur exponentielle, jamais négatif.
  return Math.max(
    0,
    Math.round(exponential - spread / 2 + Math.random() * spread)
  );
}

/**
 * Un canal résilient au-dessus d'un transport.
 *
 * Le transport est une seule fonction :
 *
 *   connect({ onMessage, onError }) → Promise<{ close(): void, alive?(): boolean }>
 *
 * Elle s'abonne et rend de quoi se désabonner. Tout le reste — reconnexion,
 * rattrapage, veille — vit ici, une fois pour les dix-sept apps.
 *
 * @param {{
 *   connect: Function,
 *   onMessage?: (message: unknown) => void,
 *   onStatus?: (status: string, info?: object) => void,
 *   catchUp?: (since: unknown) => Promise<unknown> | unknown,
 *   cursorOf?: (message: unknown) => unknown,
 *   baseDelayMs?: number, maxDelayMs?: number, maxAttempts?: number,
 *   jitter?: number,
 *   setTimeout?: Function, clearTimeout?: Function, env?: object,
 * }} options
 */
export function createChannel(options) {
  const {
    connect,
    onMessage,
    onStatus,
    catchUp,
    cursorOf,
    setTimeout: schedule = globalThis.setTimeout,
    clearTimeout: unschedule = globalThis.clearTimeout,
    env = globalThis,
  } = options ?? {};

  if (typeof connect !== 'function') {
    throw new Error('realtime: un transport `connect` est requis');
  }
  const config = { ...DEFAULTS, ...options };

  let status = STATUS.idle;
  let subscription = null;
  let timer = null;
  let attempt = 0;
  let stopped = false;
  /** Dernier repère reçu : c'est lui qui borne le rattrapage. */
  let cursor = options?.since ?? null;
  let onVisible = null;

  const setStatus = (next, info) => {
    if (status === next) return;
    status = next;
    onStatus?.(next, info);
  };

  const handleMessage = message => {
    if (cursorOf) {
      const next = cursorOf(message);
      if (next !== undefined && next !== null) cursor = next;
    }
    onMessage?.(message);
  };

  async function open() {
    if (stopped) return;
    setStatus(attempt === 0 ? STATUS.connecting : STATUS.retrying, { attempt });

    try {
      subscription = await connect({
        onMessage: handleMessage,
        onError: error => fail(error),
      });
      if (stopped) {
        subscription?.close?.();
        return;
      }
      attempt = 0;
      setStatus(STATUS.live);

      // LE RATTRAPAGE VIENT APRÈS L'ABONNEMENT, jamais avant : l'inverse
      // laisserait un trou entre la fin du rattrapage et le début de l'écoute,
      // et ce trou-là est invisible.
      if (catchUp) {
        try {
          const missed = await catchUp(cursor);
          for (const message of missed ?? []) handleMessage(message);
        } catch (error) {
          // UN RATTRAPAGE EN ÉCHEC NE TUE PAS UN ABONNEMENT QUI MARCHE. Le
          // traiter comme une coupure ferait boucler la reconnexion sur une
          // cause qui ne bougera pas — une politique de lecture absente, par
          // exemple — en laissant croire à un problème de réseau. On le
          // signale, on garde le canal, et la prochaine reconnexion
          // retentera.
          onStatus?.(STATUS.live, { catchUpError: error, cursor });
        }
      }
    } catch (error) {
      fail(error);
    }
  }

  function fail(error) {
    if (stopped) return;
    subscription?.close?.();
    subscription = null;
    attempt += 1;

    if (attempt > config.maxAttempts) {
      setStatus(STATUS.closed, { error, attempt });
      return;
    }
    const delay = backoffDelay(attempt, config);
    setStatus(STATUS.retrying, { error, attempt, delay });
    timer = schedule(open, delay);
  }

  /**
   * Au réveil de l'onglet, on ne CROIT pas la connexion vivante : on la sonde.
   * Une connexion suspendue est morte sans qu'aucun évènement ne l'ait dit.
   */
  function watchVisibility() {
    if (!env?.document?.addEventListener) return;
    onVisible = () => {
      if (env.document.visibilityState !== 'visible' || stopped) return;
      if (status === STATUS.live && subscription?.alive?.() === false) {
        fail(new Error('realtime: connexion morte au réveil'));
      } else if (status === STATUS.retrying) {
        // De retour au premier plan : on ne fait pas patienter l'utilisateur
        // le reste du retrait, on retente tout de suite.
        unschedule(timer);
        void open();
      }
    };
    env.document.addEventListener('visibilitychange', onVisible);
  }

  return {
    get status() {
      return status;
    },
    get cursor() {
      return cursor;
    },
    /** Ouvre le canal. Rend une promesse résolue à la première connexion. */
    async start() {
      stopped = false;
      watchVisibility();
      await open();
      return this;
    },
    /** Ferme définitivement : aucune reconnexion ne sera tentée. */
    stop() {
      stopped = true;
      unschedule(timer);
      subscription?.close?.();
      subscription = null;
      if (onVisible) {
        env?.document?.removeEventListener?.('visibilitychange', onVisible);
        onVisible = null;
      }
      setStatus(STATUS.closed);
    },
  };
}
