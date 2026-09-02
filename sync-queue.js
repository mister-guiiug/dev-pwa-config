/**
 * File d'écritures hors-ligne — le chemin MONTANT, agnostique du transport.
 *
 * PROMU DE TROIS APPS, et la deuxième est la preuve que la promotion était
 * due. miss-uwh (`src/backend/syncQueue.ts`, plus le drain de `sync.ts`) est
 * la référence : file persistante, rejeu en série, retrait exponentiel
 * dispersé, lettres mortes rejouables. miss-lookhouse
 * (`src/backend/syncQueue.ts`) s'ouvre sur « Inspiré du syncQueue de
 * miss-uwh » — et la copie a PERDU le retrait : chaque échec transitoire y
 * attend le prochain évènement `online` au lieu de réessayer toute seule.
 * C'est le destin de tout code recopié, et la raison d'être de ce dépôt.
 * mister-puzzle (`src/utils/offlinePieceQueue.ts`) montre le même besoin côté
 * FIREBASE : le module est donc agnostique — `process` est injecté, la file ne
 * sait pas vers quoi elle rejoue.
 *
 * CE QUE LA FILE GARANTIT :
 *
 *  - **Aucune écriture perdue.** Le `Store` injecté est la source de vérité,
 *    relu à chaque tour du drain, et l'élément traité est retiré PAR SON
 *    IDENTIFIANT — jamais `file.slice(1)` sur un instantané, qui écrasait une
 *    écriture ajoutée pendant l'envoi. Quand le stockage refuse (quota, mode
 *    privé), la file continue en mémoire au lieu de jeter en silence.
 *  - **Pas de tête bloquante.** Un rejet durable (RLS, requête malformée) part
 *    en lettre morte, consultable et rejouable, et la file CONTINUE — la
 *    politique par défaut est `defaultShouldRetry` (./react/net.js) : un 4xx
 *    hors 408/429 ne réussira pas mieux la quatrième fois.
 *  - **Le rejeu se reprogramme SEUL.** Après un échec transitoire, un rejeu
 *    part en retrait exponentiel dispersé — `backoffDelay` de ./realtime, le
 *    même que la reconnexion — sans attendre l'évènement `online`, qui ne
 *    vient jamais quand c'est le serveur qui toussait.
 *  - **Pas de croissance sans fin.** Au-delà de `maxQueueSize`, `enqueue`
 *    refuse et rend `null` : refuser visiblement vaut mieux que jeter en
 *    silence.
 *  - **Une entité, une opération.** Avec `keyOf`, les écritures en attente sur
 *    la même entité fusionnent — seule la dernière part (upsert idempotent,
 *    le motif de miss-uwh et de mister-puzzle).
 *
 * COMPLÉMENTS DANS LE SOCLE. `realtime/` est le chemin DESCENDANT — recevoir
 * ce que les autres ont changé — et cette file le chemin montant du même
 * aller-retour. `react/use-offline-queue` en est la variante React : un
 * composant qui veut re-rendre à chaque évolution de la file la préfère ;
 * cette version-ci vit hors de l'arbre React (couche backend, service de
 * synchro) et ajoute ce que le hook n'a pas — fusion par entité, lettres
 * mortes rejouables, retrait automatique entre deux passages en ligne.
 */
import { backoffDelay } from './realtime/index.js';
import { defaultShouldRetry } from './react/net.js';
// Le repli `randomUUID` vivait ici en copie ; il est dans `id.js` désormais.
import { createUuid as newId } from './id.js';

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/** Un observateur qui jette ne doit jamais casser la file qu'il observe. */
function safely(fn, ...args) {
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch {
    /* ignore */
  }
}

/**
 * Une entrée illisible ne doit pas faire perdre les autres : on valide la
 * forme au lieu de faire confiance à ce qu'une version antérieure a écrit.
 */
function sanitize(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    entry =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof entry.id === 'string'
  );
}

/**
 * La file : enfiler, drainer en série, reprogrammer, mettre de côté.
 *
 *   const queue = createSyncQueue({
 *     store: createStore('uwh_sync_'),
 *     process: op => repository.apply(op),
 *     keyOf: op => (op.id ? `${op.kind}:${op.id}` : null),
 *   });
 *   queue.start();          // draine, puis rejoue à chaque retour en ligne
 *   queue.enqueue(op);      // → l'entrée, ou `null` si le plafond est atteint
 *
 * @param {{
 *   store: import('./storage.js').Store,
 *   process: (payload: unknown, entry: object) => Promise<unknown>,
 *   keyOf?: (payload: unknown) => string | null,
 *   shouldRetry?: (error: unknown, attempts: number) => boolean,
 *   maxAttempts?: number,
 *   maxQueueSize?: number,
 *   queueKey?: string, deadKey?: string,
 *   backoff?: { baseDelayMs?: number, maxDelayMs?: number, jitter?: number },
 *   isOnline?: () => boolean,
 *   onDead?: (entry: object, error: unknown) => void,
 *   onChange?: (status: { pending: number, dead: number }) => void,
 *   setTimeout?: Function, clearTimeout?: Function, env?: object,
 * }} options `store` vient de `createStore(prefix)` (./storage.js) : c'est le
 *   préfixe de l'app qui évite que deux files servies depuis le même domaine
 *   se marchent dessus. `onChange` alimente un indicateur d'interface
 *   (`react/sync-status-badge`) sans que la file connaisse React.
 */
export function createSyncQueue(options) {
  const {
    store,
    process,
    keyOf,
    shouldRetry = defaultShouldRetry,
    maxAttempts = 5,
    maxQueueSize = 200,
    queueKey = 'queue',
    deadKey = 'dead',
    backoff = {},
    isOnline = () => globalThis.navigator?.onLine !== false,
    onDead,
    onChange,
    setTimeout: schedule = globalThis.setTimeout,
    clearTimeout: unschedule = globalThis.clearTimeout,
    env = globalThis,
  } = options ?? {};

  if (typeof store?.get !== 'function' || typeof store?.set !== 'function') {
    throw new Error(
      'sync-queue : un `store` est requis — `createStore(prefix)` de ./storage.js'
    );
  }
  if (typeof process !== 'function') {
    throw new Error(
      'sync-queue : un `process` est requis — le transport est injecté'
    );
  }

  // Reflet mémoire du dernier état écrit. Le stockage reste la source de
  // vérité tant qu'il répond ; dès qu'une écriture est REFUSÉE (`set` rend
  // `false` — quota, mode privé), on lit le reflet : la valeur stockée est
  // plus vieille que ce que la file sait. Les trois copies perdaient ces
  // écritures-là en silence.
  let memoryQueue = [];
  let memoryDead = [];
  let queueStored = true;
  let deadStored = true;

  const readQueue = () =>
    queueStored ? sanitize(store.get(queueKey, memoryQueue)) : memoryQueue;
  const readDead = () =>
    deadStored ? sanitize(store.get(deadKey, memoryDead)) : memoryDead;
  const writeQueue = entries => {
    memoryQueue = entries;
    queueStored = store.set(queueKey, entries) !== false;
  };
  const writeDead = entries => {
    memoryDead = entries;
    deadStored = store.set(deadKey, entries) !== false;
  };

  const notifyChange = () =>
    safely(onChange, { pending: readQueue().length, dead: readDead().length });

  let draining = false;
  let timer = null;
  let onOnline = null;

  const cancelRetry = () => {
    if (timer !== null) {
      unschedule(timer);
      timer = null;
    }
  };

  /** Le rejeu automatique — précisément ce que la copie de miss-lookhouse a perdu. */
  function scheduleRetry(attempts) {
    cancelRetry();
    // Le rappel REND la promesse du drain : `setTimeout` l'ignore, mais une
    // horloge de test peut l'attendre — sans quoi le rejeu serait invérifiable.
    timer = schedule(
      () => {
        timer = null;
        return flush();
      },
      backoffDelay(attempts, backoff)
    );
  }

  function retryable(error, attempts) {
    if (attempts >= maxAttempts) return false;
    try {
      return shouldRetry(error, attempts) !== false;
    } catch {
      // Un classificateur qui jette n'a pas d'avis : lettre morte — un élément
      // mis de côté se rejoue, une file qui boucle ne se répare pas.
      return false;
    }
  }

  /**
   * Draine la file EN SÉRIE, ordre préservé. Succès → retiré ; échec
   * transitoire → tentative comptée, drain interrompu, rejeu programmé ; échec
   * durable → lettre morte, et la file CONTINUE. Hors ligne, le drain
   * s'interrompt sans consommer de tentative : un réseau coupé n'est pas un
   * échec de l'opération.
   */
  async function flush() {
    // Sérialisé : un drain à la fois. Le second appel ne fait rien — c'est le
    // premier qui détient la tête de file.
    if (draining) return { done: 0, retried: 0, dead: 0 };
    draining = true;
    cancelRetry();
    const result = { done: 0, retried: 0, dead: 0 };
    try {
      for (;;) {
        if (!isOnline()) break;
        // Relecture à CHAQUE tour : c'est ce qui empêche d'écraser une
        // écriture ajoutée pendant l'envoi précédent.
        const item = readQueue()[0];
        if (!item) break;

        try {
          await process(item.payload, item);
          writeQueue(readQueue().filter(entry => entry.id !== item.id));
          result.done += 1;
        } catch (error) {
          const attempts = (item.attempts ?? 0) + 1;
          if (retryable(error, attempts)) {
            writeQueue(
              readQueue().map(entry =>
                entry.id === item.id
                  ? { ...entry, attempts, lastError: messageOf(error) }
                  : entry
              )
            );
            result.retried += 1;
            if (isOnline()) scheduleRetry(attempts);
            break; // ordre préservé : on retentera par la tête
          }
          writeQueue(readQueue().filter(entry => entry.id !== item.id));
          writeDead([
            ...readDead(),
            { ...item, attempts, lastError: messageOf(error) },
          ]);
          result.dead += 1;
          safely(onDead, { ...item, attempts }, error);
        }
      }
    } finally {
      draining = false;
      notifyChange();
    }
    return result;
  }

  return {
    /**
     * Enfile une écriture. Rend l'entrée créée, ou `null` quand le plafond est
     * atteint. Les entrées en attente sur la MÊME clé (`keyOf`) sont
     * remplacées : c'est pourquoi une entité déjà en file se met à jour même
     * quand la file est pleine.
     */
    enqueue(payload) {
      const key = keyOf ? (keyOf(payload) ?? null) : null;
      const queue = readQueue();
      const kept =
        key === null ? queue : queue.filter(entry => entry.key !== key);
      if (kept.length >= maxQueueSize) return null;
      const entry = {
        id: newId(),
        payload,
        key,
        attempts: 0,
        enqueuedAt: new Date().toISOString(),
      };
      writeQueue([...kept, entry]);
      notifyChange();
      return entry;
    },

    /** Les entrées en attente, dans l'ordre d'envoi. */
    list: () => [...readQueue()],
    pending: () => readQueue().length,
    /** Les écritures refusées durablement — à montrer, pas à cacher. */
    deadLetters: () => [...readDead()],

    /** Retire une entrée en attente (abandonnée par l'app). */
    remove(id) {
      writeQueue(readQueue().filter(entry => entry.id !== id));
      notifyChange();
    },

    flush,

    /**
     * Redonne leur chance aux lettres mortes : en TÊTE de file, compteurs
     * remis à zéro. Si la même entité a depuis été modifiée (entrée plus
     * récente en attente), la lettre morte est abandonnée — la file détient
     * l'état le plus frais. Rend le nombre d'entrées relancées.
     */
    requeueDead() {
      const dead = readDead();
      if (dead.length === 0) return 0;
      const pending = readQueue();
      const pendingKeys = new Set(
        pending.map(entry => entry.key).filter(key => key != null)
      );
      const revived = dead
        .filter(entry => entry.key == null || !pendingKeys.has(entry.key))
        .map(entry => ({ ...entry, attempts: 0 }));
      writeQueue([...revived, ...pending]);
      writeDead([]);
      notifyChange();
      return revived.length;
    },

    /** Abandonne définitivement les lettres mortes. */
    clearDead() {
      writeDead([]);
      notifyChange();
    },

    /** Vide tout — file ET lettres mortes — et annule le rejeu programmé. */
    clear() {
      cancelRetry();
      writeQueue([]);
      writeDead([]);
      notifyChange();
    },

    /**
     * Draine tout de suite, puis rejoue à chaque retour en ligne. Rend la
     * promesse du premier drain — le démarrage de miss-uwh : pousser ce qui
     * attend AVANT de tirer l'état du serveur.
     */
    start() {
      if (!onOnline && env?.addEventListener) {
        // Même raison que le rappel du minuteur : rendre la promesse ne coûte
        // rien à `addEventListener` et rend le rejeu attendable en test.
        onOnline = () => flush();
        env.addEventListener('online', onOnline);
      }
      return flush();
    },

    /** Cesse d'écouter le réseau et annule le rejeu programmé. La file reste. */
    stop() {
      if (onOnline) {
        env?.removeEventListener?.('online', onOnline);
        onOnline = null;
      }
      cancelRetry();
    },
  };
}
