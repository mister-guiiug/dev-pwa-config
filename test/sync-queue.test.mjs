// File d'écritures hors-ligne (`sync-queue.js`).
//
// Tout est pur ou injecté — Store, horloge, réseau, transport — donc tout
// s'éprouve : le rejeu automatique que la copie de miss-lookhouse avait perdu,
// la lettre morte qui ne bloque pas la tête, le plafond, la fusion par entité,
// et la relecture qui empêche d'écraser une écriture enfilée pendant l'envoi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncQueue } from '../sync-queue.js';

/**
 * Un Store en mémoire, au contrat de `createStore` (./storage.js). Le passage
 * par JSON reproduit ce que le vrai stockage ferait des valeurs (perte des
 * `undefined`, copies sans référence).
 */
function memoryStore() {
  const data = new Map();
  return {
    prefix: 'test_',
    kind: 'local',
    available: () => true,
    get: (key, fallback) =>
      data.has(key) ? JSON.parse(data.get(key)) : fallback,
    set(key, value) {
      data.set(key, JSON.stringify(value));
      return true;
    },
    getRaw: key => data.get(key) ?? null,
    setRaw(key, value) {
      data.set(key, value);
      return true;
    },
    remove: key => void data.delete(key),
    keys: () => [...data.keys()],
    clear: () => data.clear(),
    _data: data,
  };
}

/** Horloge maîtrisée : les tests ne doivent pas attendre le retrait réel. */
function fakeClock() {
  let seq = 0;
  const pending = new Map();
  return {
    setTimeout: (fn, delay) => {
      pending.set(++seq, { fn, delay });
      return seq;
    },
    clearTimeout: id => pending.delete(id),
    async tick() {
      const due = [...pending.entries()];
      pending.clear();
      for (const [, { fn }] of due) await fn();
    },
    get delays() {
      return [...pending.values()].map(t => t.delay);
    },
  };
}

/** Une file prête à éprouver, tout injecté. */
function makeQueue(overrides = {}) {
  const store = overrides.store ?? memoryStore();
  const clock = fakeClock();
  const sent = [];
  const queue = createSyncQueue({
    store,
    process: payload => {
      sent.push(payload);
      return Promise.resolve();
    },
    backoff: { jitter: 0 },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
    ...overrides,
  });
  return { queue, store, clock, sent };
}

/** Une erreur portant un statut HTTP, comme celles de supabase-js/PostgREST. */
function httpError(status, message = `HTTP ${status}`) {
  return Object.assign(new Error(message), { status });
}

/* ── Le contrat de base ────────────────────────────────────────────────── */

test('un `store` et un `process` sont OBLIGATOIRES', () => {
  assert.throws(() => createSyncQueue({}), /`store` est requis/);
  assert.throws(
    () => createSyncQueue({ store: memoryStore() }),
    /`process` est requis/
  );
});

test('enfiler persiste : une nouvelle instance sur le même store la voit', () => {
  const store = memoryStore();
  const { queue } = makeQueue({ store });
  const entry = queue.enqueue({ kind: 'entry.upsert', id: 'e1' });

  assert.ok(entry, 'l’entrée est rendue à l’appelant');
  assert.equal(entry.attempts, 0);
  assert.match(entry.enqueuedAt, /^\d{4}-\d{2}-\d{2}T/);

  // Redémarrage de l'app : le store est la source de vérité, pas l'instance.
  const { queue: relue } = makeQueue({ store });
  assert.equal(relue.pending(), 1);
  assert.deepEqual(relue.list()[0].payload, { kind: 'entry.upsert', id: 'e1' });
});

test('un contenu stocké corrompu est ignoré, pas propagé', () => {
  const store = memoryStore();
  store.setRaw('queue', JSON.stringify([{ sans: 'id' }, null, 'texte']));
  const { queue } = makeQueue({ store });
  assert.equal(queue.pending(), 0);
  store.setRaw('queue', '{"pas":"un tableau"}');
  assert.equal(queue.pending(), 0);
});

/* ── La fusion par entité ──────────────────────────────────────────────── */

test('deux écritures sur la MÊME entité fusionnent : seule la dernière part', async () => {
  const { queue, sent } = makeQueue({ keyOf: p => `adherent:${p.id}` });
  queue.enqueue({ id: 'a1', nom: 'Ancien' });
  queue.enqueue({ id: 'a2', nom: 'Autre' });
  queue.enqueue({ id: 'a1', nom: 'Récent' });

  assert.equal(queue.pending(), 2, 'a1 est remplacé, pas ajouté');
  await queue.flush();
  // L'op fusionnée prend la place de la plus récente : l'ordre relatif
  // restant est celui des dernières intentions.
  assert.deepEqual(sent, [
    { id: 'a2', nom: 'Autre' },
    { id: 'a1', nom: 'Récent' },
  ]);
});

test('une clé `null` ne fusionne jamais (lots, changements d’état)', () => {
  const { queue } = makeQueue({ keyOf: () => null });
  queue.enqueue({ kind: 'season.close' });
  queue.enqueue({ kind: 'season.close' });
  assert.equal(queue.pending(), 2);
});

/* ── Le plafond ────────────────────────────────────────────────────────── */

test('au-delà du plafond, `enqueue` refuse VISIBLEMENT', () => {
  const { queue } = makeQueue({ maxQueueSize: 2 });
  assert.ok(queue.enqueue({ n: 1 }));
  assert.ok(queue.enqueue({ n: 2 }));
  assert.equal(queue.enqueue({ n: 3 }), null);
  assert.equal(queue.pending(), 2);
});

test('file pleine, une entité DÉJÀ en attente se met quand même à jour', () => {
  // La fusion remplace au lieu d'ajouter : refuser ici jetterait l'état le
  // plus frais au seul motif que la file est pleine.
  const { queue } = makeQueue({ maxQueueSize: 2, keyOf: p => p.id });
  queue.enqueue({ id: 'a', v: 1 });
  queue.enqueue({ id: 'b', v: 1 });
  const entry = queue.enqueue({ id: 'a', v: 2 });
  assert.ok(entry, 'le remplacement passe');
  assert.equal(queue.pending(), 2);
});

/* ── Le drain ──────────────────────────────────────────────────────────── */

test('le drain est FIFO et vide la file', async () => {
  const { queue, sent } = makeQueue();
  queue.enqueue({ n: 1 });
  queue.enqueue({ n: 2 });
  queue.enqueue({ n: 3 });

  const result = await queue.flush();
  assert.deepEqual(sent, [{ n: 1 }, { n: 2 }, { n: 3 }]);
  assert.deepEqual(result, { done: 3, retried: 0, dead: 0 });
  assert.equal(queue.pending(), 0);
});

test('une écriture enfilée PENDANT l’envoi n’est pas perdue', async () => {
  // Le défaut historique de la famille : retirer par `slice(1)` sur un
  // instantané écrasait ce qui venait d'arriver. Ici on relit et on retire par
  // identifiant.
  const store = memoryStore();
  const sent = [];
  let queue;
  queue = createSyncQueue({
    store,
    process: payload => {
      sent.push(payload);
      if (payload.n === 1) queue.enqueue({ n: 'pendant' });
      return Promise.resolve();
    },
    env: {},
  });

  queue.enqueue({ n: 1 });
  await queue.flush();
  assert.deepEqual(sent, [{ n: 1 }, { n: 'pendant' }]);
  assert.equal(queue.pending(), 0);
});

test('le drain est SÉRIALISÉ : un second appel ne double pas les envois', async () => {
  let release;
  let inFlight = 0;
  const gate = new Promise(resolve => {
    release = resolve;
  });
  const queue = createSyncQueue({
    store: memoryStore(),
    process: () => {
      inFlight += 1;
      return gate;
    },
    env: {},
  });

  queue.enqueue({ n: 1 });
  const first = queue.flush();
  const second = await queue.flush(); // pendant que le premier tient la tête
  assert.deepEqual(second, { done: 0, retried: 0, dead: 0 });
  assert.equal(inFlight, 1, 'un seul envoi en vol');

  release();
  const result = await first;
  assert.equal(result.done, 1);
});

test('hors ligne, le drain s’arrête SANS consommer de tentative', async () => {
  const { queue, sent, clock } = makeQueue({ isOnline: () => false });
  queue.enqueue({ n: 1 });

  const result = await queue.flush();
  assert.deepEqual(result, { done: 0, retried: 0, dead: 0 });
  assert.deepEqual(sent, []);
  assert.equal(queue.list()[0].attempts, 0, 'aucune tentative comptée');
  assert.deepEqual(clock.delays, [], 'aucun rejeu programmé hors ligne');
});

/* ── L’échec transitoire : compter, s’interrompre, se reprogrammer ─────── */

test('échec réseau : tentative comptée, ordre préservé, rejeu PROGRAMMÉ', async () => {
  let panne = true;
  const sent = [];
  const clock = fakeClock();
  const queue = createSyncQueue({
    store: memoryStore(),
    process: payload => {
      if (panne) return Promise.reject(new Error('Failed to fetch'));
      sent.push(payload);
      return Promise.resolve();
    },
    backoff: { baseDelayMs: 1000, jitter: 0 },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });
  queue.enqueue({ n: 1 });
  queue.enqueue({ n: 2 });

  const result = await queue.flush();
  assert.deepEqual(result, { done: 0, retried: 1, dead: 0 });
  assert.equal(queue.pending(), 2, 'rien n’est perdu ni réordonné');
  assert.equal(queue.list()[0].attempts, 1);
  assert.match(queue.list()[0].lastError, /Failed to fetch/);

  // LE REJEU AUTOMATIQUE — ce que la copie de miss-lookhouse avait perdu : un
  // échec transitoire sans évènement `online` (serveur qui tousse) doit se
  // réessayer seul, en retrait.
  assert.deepEqual(clock.delays, [1000]);
  panne = false;
  await clock.tick();
  assert.deepEqual(sent, [{ n: 1 }, { n: 2 }], 'la tête part en premier');
  assert.equal(queue.pending(), 0);
});

test('le retrait CROÎT d’un échec au suivant — exponentiel, réutilisé de ./realtime', async () => {
  const clock = fakeClock();
  const queue = createSyncQueue({
    store: memoryStore(),
    process: () => Promise.reject(new Error('network down')),
    backoff: { baseDelayMs: 500, jitter: 0 },
    maxAttempts: 10,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });
  queue.enqueue({ n: 1 });

  await queue.flush();
  assert.deepEqual(clock.delays, [500], '1re tentative : base');
  await clock.tick();
  assert.deepEqual(clock.delays, [1000], '2e : doublé');
  await clock.tick();
  assert.deepEqual(clock.delays, [2000], '3e : doublé encore');
});

test('un flush MANUEL remplace le rejeu programmé (pas de double drain)', async () => {
  let panne = true;
  const clock = fakeClock();
  const sent = [];
  const queue = createSyncQueue({
    store: memoryStore(),
    process: payload => {
      if (panne) return Promise.reject(new Error('offline'));
      sent.push(payload);
      return Promise.resolve();
    },
    backoff: { jitter: 0 },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });
  queue.enqueue({ n: 1 });
  await queue.flush();
  assert.equal(clock.delays.length, 1);

  panne = false;
  await queue.flush(); // l'utilisateur clique « Réessayer »
  assert.deepEqual(sent, [{ n: 1 }]);
  assert.deepEqual(clock.delays, [], 'le minuteur en attente a été annulé');
});

/* ── L’échec durable : lettre morte, la file continue ──────────────────── */

test('un rejet serveur (4xx) part en lettre morte SANS bloquer la tête', async () => {
  // `defaultShouldRetry` (./react/net.js) : une requête refusée échouera à
  // l'identique trois fois de plus — la rejouer bloquerait la file pour rien.
  const morts = [];
  const envoyes = [];
  const { queue, clock } = makeQueue({
    process: payload => {
      if (payload.n === 1)
        return Promise.reject(httpError(403, 'RLS: permission denied'));
      envoyes.push(payload);
      return Promise.resolve();
    },
    onDead: (entry, error) => morts.push([entry.payload, String(error)]),
  });
  queue.enqueue({ n: 1 });
  queue.enqueue({ n: 2 });

  const result = await queue.flush();
  assert.deepEqual(result, { done: 1, retried: 0, dead: 1 });
  assert.deepEqual(
    envoyes,
    [{ n: 2 }],
    'la file a CONTINUÉ après la lettre morte'
  );
  assert.equal(queue.pending(), 0);
  assert.equal(queue.deadLetters().length, 1);
  assert.match(queue.deadLetters()[0].lastError, /permission denied/);
  assert.deepEqual(morts, [[{ n: 1 }, 'Error: RLS: permission denied']]);
  assert.deepEqual(
    clock.delays,
    [],
    'aucun rejeu programmé pour un rejet durable'
  );
});

test('la politique par défaut rejoue les 5xx et 429, pas les autres 4xx', async () => {
  const cases = [
    [500, 'retried'],
    [429, 'retried'],
    [400, 'dead'],
  ];
  for (const [status, attendu] of cases) {
    const { queue } = makeQueue({
      process: () => Promise.reject(httpError(status)),
    });
    queue.enqueue({ n: status });
    const result = await queue.flush();
    assert.equal(
      result[attendu],
      1,
      `statut ${status} : attendu ${attendu}, reçu ${JSON.stringify(result)}`
    );
  }
});

test('un échec « transitoire » récidivant finit en lettre morte (plafond)', async () => {
  // Sinon une erreur mal classée bloquerait la file pour toujours, en silence
  // — le plafond de miss-uwh.
  const clock = fakeClock();
  const queue = createSyncQueue({
    store: memoryStore(),
    process: () => Promise.reject(new Error('timeout')),
    maxAttempts: 3,
    backoff: { jitter: 0 },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });
  queue.enqueue({ n: 1 });

  await queue.flush(); // tentative 1
  await clock.tick(); // tentative 2
  assert.equal(queue.pending(), 1);
  await clock.tick(); // tentative 3 → plafond
  assert.equal(queue.pending(), 0);
  assert.equal(queue.deadLetters().length, 1);
  assert.equal(queue.deadLetters()[0].attempts, 3);
  assert.deepEqual(clock.delays, [], 'plus aucun rejeu programmé');
});

test('un `shouldRetry` qui JETTE vaut lettre morte, pas boucle', async () => {
  const { queue } = makeQueue({
    process: () => Promise.reject(new Error('boom')),
    shouldRetry: () => {
      throw new Error('classificateur cassé');
    },
  });
  queue.enqueue({ n: 1 });
  const result = await queue.flush();
  // Un élément mis de côté se rejoue depuis les réglages ; une file qui
  // boucle sur un classificateur cassé ne se répare pas.
  assert.deepEqual(result, { done: 0, retried: 0, dead: 1 });
});

/* ── Les lettres mortes : consultables, rejouables ─────────────────────── */

test('`requeueDead` relance en tête, compteurs remis à zéro', async () => {
  const { queue } = makeQueue({
    process: () => Promise.reject(httpError(403)),
  });
  queue.enqueue({ n: 1 });
  await queue.flush();
  assert.equal(queue.deadLetters().length, 1);

  assert.equal(queue.requeueDead(), 1);
  assert.equal(queue.deadLetters().length, 0);
  assert.equal(queue.pending(), 1);
  assert.equal(queue.list()[0].attempts, 0, 'nouvelle chance, compteur neuf');
});

test('`requeueDead` abandonne la lettre morte si l’entité a été MODIFIÉE depuis', async () => {
  // La file détient l'état le plus frais : relancer la vieille écriture
  // écraserait la récente.
  const rejets = new Set(['v1']);
  const { queue } = makeQueue({
    keyOf: p => p.id,
    process: p =>
      rejets.has(p.v) ? Promise.reject(httpError(403)) : Promise.resolve(),
  });
  queue.enqueue({ id: 'a', v: 'v1' });
  await queue.flush(); // v1 → lettre morte
  queue.enqueue({ id: 'a', v: 'v2' }); // l'utilisateur a corrigé

  assert.equal(queue.requeueDead(), 0, 'rien à relancer : v2 fait foi');
  assert.equal(queue.deadLetters().length, 0);
  assert.equal(queue.pending(), 1);
  assert.equal(queue.list()[0].payload.v, 'v2');
});

test('`clearDead`, `remove` et `clear` font ce qu’ils disent', async () => {
  const { queue } = makeQueue({
    process: p =>
      p.n === 1 ? Promise.reject(httpError(400)) : Promise.resolve(),
  });
  queue.enqueue({ n: 1 });
  await queue.flush();
  assert.equal(queue.deadLetters().length, 1);
  queue.clearDead();
  assert.equal(queue.deadLetters().length, 0);

  const kept = queue.enqueue({ n: 2 });
  queue.enqueue({ n: 3 });
  queue.remove(kept.id);
  assert.equal(queue.pending(), 1);

  queue.clear();
  assert.equal(queue.pending(), 0);
});

/* ── Le stockage qui refuse ────────────────────────────────────────────── */

test('quand le stockage refuse, la file continue EN MÉMOIRE', async () => {
  // Quota, mode privé : `Store.set` rend `false`. Les copies perdaient ces
  // écritures en silence ; ici la session courante les garde et les envoie.
  const store = memoryStore();
  store.set = () => false;
  const { queue, sent } = makeQueue({ store });

  const entry = queue.enqueue({ n: 1 });
  assert.ok(entry);
  assert.equal(queue.pending(), 1);

  const result = await queue.flush();
  assert.deepEqual(sent, [{ n: 1 }]);
  assert.equal(result.done, 1);
  assert.equal(queue.pending(), 0);
});

/* ── start / stop et l’évènement `online` ──────────────────────────────── */

test('`start` draine tout de suite, puis à chaque retour en ligne', async () => {
  const listeners = {};
  const env = {
    addEventListener: (name, fn) => (listeners[name] = fn),
    removeEventListener: name => delete listeners[name],
  };
  let enLigne = true;
  const { queue, sent } = makeQueue({ env, isOnline: () => enLigne });

  queue.enqueue({ n: 1 });
  await queue.start();
  assert.deepEqual(sent, [{ n: 1 }], 'le démarrage pousse ce qui attend');

  enLigne = false;
  queue.enqueue({ n: 2 });
  await queue.flush();
  assert.equal(queue.pending(), 1, 'hors ligne : l’écriture attend');

  enLigne = true;
  await listeners.online();
  assert.deepEqual(sent, [{ n: 1 }, { n: 2 }]);
});

test('`stop` désabonne et annule le rejeu programmé', async () => {
  const listeners = {};
  const env = {
    addEventListener: (name, fn) => (listeners[name] = fn),
    removeEventListener: name => delete listeners[name],
  };
  const clock = fakeClock();
  const queue = createSyncQueue({
    store: memoryStore(),
    process: () => Promise.reject(new Error('network down')),
    backoff: { jitter: 0 },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env,
  });

  queue.enqueue({ n: 1 });
  await queue.start();
  assert.equal(clock.delays.length, 1, 'un rejeu était programmé');

  queue.stop();
  assert.equal(listeners.online, undefined, 'plus d’écouteur réseau');
  assert.deepEqual(clock.delays, [], 'plus de rejeu programmé');
  assert.equal(queue.pending(), 1, 'la file, elle, reste');
});

/* ── L’observation ─────────────────────────────────────────────────────── */

test('`onChange` dit l’état après chaque évolution — de quoi nourrir un badge', async () => {
  const vues = [];
  const { queue } = makeQueue({
    process: p =>
      p.n === 1 ? Promise.reject(httpError(400)) : Promise.resolve(),
    onChange: status => vues.push(status),
  });

  queue.enqueue({ n: 1 });
  assert.deepEqual(vues.at(-1), { pending: 1, dead: 0 });
  await queue.flush();
  assert.deepEqual(vues.at(-1), { pending: 0, dead: 1 });
  queue.clearDead();
  assert.deepEqual(vues.at(-1), { pending: 0, dead: 0 });
});

test('un `onChange` qui jette ne casse pas la file', () => {
  const { queue } = makeQueue({
    onChange: () => {
      throw new Error('observateur cassé');
    },
  });
  assert.ok(queue.enqueue({ n: 1 }), 'l’enfilage survit à son observateur');
});
