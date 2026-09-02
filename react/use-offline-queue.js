import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnline } from './use-online.js';
import { retryableQuery } from './net.js';
// Le repli `randomUUID` vivait ici en copie ; il est dans `id.js` désormais.
import { createUuid as newId } from '../id.js';

/**
 * Le stockage est la source de vérité, jamais l'état React : `flush` et
 * `enqueue` peuvent s'exécuter en même temps (l'utilisateur saisit pendant que
 * la file part). Une entrée illisible ne doit pas faire perdre les autres, donc
 * on valide la forme au lieu de faire confiance à `JSON.parse`.
 *
 * @param {string} key
 * @returns {Array<{ id: string, payload: unknown, attempts?: number, dead?: boolean }>}
 */
function readQueue(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      entry =>
        entry !== null &&
        typeof entry === 'object' &&
        typeof entry.id === 'string'
    );
  } catch {
    return [];
  }
}

function writeQueue(key, entries) {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* quota / mode privé : la file reste en mémoire le temps de la session */
  }
}

/**
 * File de mutations persistante, rejouée au retour en ligne, avec backoff
 * exponentiel (`retryableQuery`).
 *
 *   const { enqueue, pending, failed } = useOfflineMutationQueue({
 *     storageKey: 'carbook_queue',
 *     process: payload => supabase.from('candidates').upsert(payload),
 *   });
 *
 * CE QUE LA FILE GARANTIT — et que la version précédente ratait :
 *
 *  - **Aucune écriture perdue.** `flush` relit le stockage à chaque itération et
 *    retire l'élément traité PAR SON IDENTIFIANT. L'ancienne version gardait un
 *    instantané et réécrivait `instantané.slice(1)` : une mutation ajoutée
 *    pendant le rejeu était écrasée sans trace (`test/react-hooks.test.mjs`).
 *  - **Pas de tête de file bloquante.** Un élément qui échoue `maxAttempts` fois
 *    est mis en quarantaine (`failed`) au lieu d'empêcher indéfiniment les
 *    suivants de partir.
 *  - **Pas de croissance sans fin.** Au-delà de `maxQueueSize`, `enqueue`
 *    refuse et renvoie `null` — l'app peut prévenir l'utilisateur. Refuser
 *    visiblement vaut mieux que jeter en silence.
 *  - **Contenu stocké validé.** Une valeur corrompue est ignorée, pas propagée.
 *
 * LIMITE CONNUE : le stockage est `localStorage`, inaccessible depuis un service
 * worker — le rejeu a donc lieu quand l'app est ouverte, pas via Background Sync.
 *
 * VARIANTE HORS-REACT : `sync-queue` (racine du paquet) — même file, mais
 * `Store` injecté (./storage.js), fusion par entité, lettres mortes rejouables
 * et rejeu automatique en retrait exponentiel entre deux retours en ligne. À
 * préférer hors de l'arbre React (couche backend, service de synchronisation) ;
 * ce hook reste le bon choix quand un composant re-rend au fil de la file.
 *
 * @template P
 * @param {{ storageKey?: string, process?: (payload: P) => Promise<unknown>,
 *   retries?: number, maxAttempts?: number, maxQueueSize?: number,
 *   onDead?: (entry: { id: string, payload: P, attempts: number }) => void }} [options]
 */
export function useOfflineMutationQueue(options = {}) {
  const {
    storageKey = 'dwc_mutation_queue',
    process,
    retries = 3,
    maxAttempts = 5,
    maxQueueSize = 200,
    onDead,
  } = options;
  const online = useOnline();
  const processing = useRef(false);

  const [entries, setEntries] = useState(() => readQueue(storageKey));

  // Relit le stockage et réaligne l'état React dessus.
  const sync = useCallback(() => {
    const next = readQueue(storageKey);
    setEntries(next);
    return next;
  }, [storageKey]);

  const commit = useCallback(
    next => {
      writeQueue(storageKey, next);
      setEntries(next);
      return next;
    },
    [storageKey]
  );

  useEffect(() => {
    sync();
  }, [sync]);

  /**
   * Ajoute une mutation. Renvoie son identifiant, ou `null` si le plafond est
   * atteint.
   */
  const enqueue = useCallback(
    payload => {
      const current = readQueue(storageKey);
      const alive = current.filter(entry => !entry.dead);
      if (alive.length >= maxQueueSize) return null;
      const id = newId();
      commit([...current, { id, payload, attempts: 0 }]);
      return id;
    },
    [storageKey, maxQueueSize, commit]
  );

  /** Retire une entrée (traitée, ou abandonnée par l'app). */
  const remove = useCallback(
    id => commit(readQueue(storageKey).filter(entry => entry.id !== id)),
    [storageKey, commit]
  );

  /** Vide la file, quarantaine comprise. */
  const clear = useCallback(() => commit([]), [commit]);

  const flush = useCallback(async () => {
    if (processing.current || typeof process !== 'function') return;
    processing.current = true;
    try {
      for (;;) {
        // Relecture à CHAQUE tour : c'est ce qui empêche d'écraser une mutation
        // ajoutée pendant l'envoi précédent.
        const current = readQueue(storageKey);
        const item = current.find(entry => !entry.dead);
        if (!item) break;

        try {
          await retryableQuery(() => process(item.payload), { retries });
          commit(readQueue(storageKey).filter(entry => entry.id !== item.id));
        } catch {
          const attempts = (item.attempts ?? 0) + 1;
          const dead = attempts >= maxAttempts;
          commit(
            readQueue(storageKey).map(entry =>
              entry.id === item.id ? { ...entry, attempts, dead } : entry
            )
          );
          if (dead) {
            // Mis de côté : on passe au suivant plutôt que de bloquer la file.
            if (typeof onDead === 'function') {
              onDead({ id: item.id, payload: item.payload, attempts });
            }
            continue;
          }
          break; // échec temporaire : on retentera au prochain passage en ligne
        }
      }
    } finally {
      processing.current = false;
    }
  }, [process, retries, maxAttempts, storageKey, commit, onDead]);

  useEffect(() => {
    if (online) void flush();
  }, [online, flush]);

  const queue = entries.filter(entry => !entry.dead);
  const failed = entries.filter(entry => entry.dead);

  return {
    queue,
    pending: queue.length,
    failed,
    online,
    enqueue,
    flush,
    remove,
    clear,
  };
}
