// Canal temps réel (`realtime/`).
//
// MODULE NEUF, sans usage réel à généraliser : la seule protection contre
// l'invention gratuite est d'éprouver chacune des trois décisions qu'il prend
// à la place des apps — le retrait, le rattrapage, le réveil. Ce sont
// précisément celles qui ne se voient pas en développement, où la connexion ne
// tombe jamais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, backoffDelay, createChannel } from '../realtime/index.js';

/** Horloge maîtrisée : les tests ne doivent pas attendre trente secondes. */
function fakeClock() {
  let seq = 0;
  const pending = new Map();
  return {
    setTimeout: (fn, delay) => {
      pending.set(++seq, { fn, delay });
      return seq;
    },
    clearTimeout: id => pending.delete(id),
    /** Déclenche les minuteries en attente, dans l'ordre. */
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

/* ── Le retrait ────────────────────────────────────────────────────────── */

test('le délai croît, plafonne, et reste dispersé', () => {
  const options = { baseDelayMs: 1000, maxDelayMs: 8000, jitter: 0.3 };
  const d1 = backoffDelay(1, options);
  const d4 = backoffDelay(4, options);

  // 1000 ± 15 %, puis 8000 plafonné ± 15 %.
  assert.ok(d1 >= 850 && d1 <= 1150, `1re tentative : ${d1}`);
  assert.ok(d4 >= 6800 && d4 <= 9200, `4e tentative : ${d4}`);
  assert.ok(backoffDelay(20, options) <= 9200, 'le plafond tient');
});

test('la dispersion existe vraiment — sinon c’est un troupeau tonnant', () => {
  // Sans elle, tous les clients coupés par la même panne reviennent à la même
  // milliseconde et refont tomber le serveur qui vient de se relever.
  const tirages = new Set(
    Array.from({ length: 40 }, () => backoffDelay(3, { jitter: 0.3 }))
  );
  assert.ok(
    tirages.size > 5,
    `trop peu de dispersion : ${tirages.size} valeurs`
  );
});

test('sans dispersion, le délai est exact — le réglage est réel', () => {
  assert.equal(backoffDelay(1, { baseDelayMs: 500, jitter: 0 }), 500);
  assert.equal(backoffDelay(3, { baseDelayMs: 500, jitter: 0 }), 2000);
});

/* ── La reconnexion ────────────────────────────────────────────────────── */

test('une coupure reconnecte, et l’état le DIT', async () => {
  const clock = fakeClock();
  const etats = [];
  let handlers;
  let connexions = 0;

  const channel = createChannel({
    connect: h => {
      connexions += 1;
      handlers = h;
      return Promise.resolve({ close() {}, alive: () => true });
    },
    onStatus: s => etats.push(s),
    jitter: 0,
    baseDelayMs: 100,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });

  await channel.start();
  assert.equal(channel.status, STATUS.live);

  // Le serveur coupe.
  handlers.onError(new Error('coupure'));
  assert.equal(channel.status, STATUS.retrying);

  await clock.tick();
  assert.equal(connexions, 2, 'une reconnexion doit avoir eu lieu');
  assert.equal(channel.status, STATUS.live);
  assert.deepEqual(etats, ['connecting', 'live', 'retrying', 'live']);
});

test('après `maxAttempts`, on ferme au lieu de marteler', async () => {
  const clock = fakeClock();
  const channel = createChannel({
    connect: () => Promise.reject(new Error('serveur absent')),
    maxAttempts: 2,
    jitter: 0,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });

  await channel.start();
  await clock.tick();
  await clock.tick();
  assert.equal(channel.status, STATUS.closed);
  assert.deepEqual(clock.delays, [], 'plus aucune tentative programmée');
});

test('`stop()` annule la reconnexion en attente', async () => {
  const clock = fakeClock();
  let connexions = 0;
  const channel = createChannel({
    connect: () => {
      connexions += 1;
      return Promise.reject(new Error('non'));
    },
    jitter: 0,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });

  await channel.start();
  channel.stop();
  await clock.tick();
  assert.equal(connexions, 1, 'aucune tentative après l’arrêt');
  assert.equal(channel.status, STATUS.closed);
});

/* ── Le trou ───────────────────────────────────────────────────────────── */

test('ce qui s’est passé PENDANT la coupure est rejoué', async () => {
  const clock = fakeClock();
  const recus = [];
  let handlers;
  let rattrapages = 0;

  const channel = createChannel({
    connect: h => {
      handlers = h;
      return Promise.resolve({ close() {} });
    },
    cursorOf: m => m.at,
    catchUp: since => {
      rattrapages += 1;
      // Au premier abonnement il n'y a pas de trou : `since` vaut `null`.
      if (rattrapages === 1) {
        assert.equal(since, null);
        return [];
      }
      // Après la coupure, le rattrapage est BORNÉ par le dernier repère reçu :
      // sans ça, on rejouerait tout l'historique à chaque reconnexion.
      assert.equal(since, 'T2', 'le rattrapage doit partir du dernier reçu');
      return [{ at: 'T3', v: 'manqué' }];
    },
    onMessage: m => recus.push(m.v),
    jitter: 0,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });

  await channel.start();
  handlers.onMessage({ at: 'T1', v: 'a' });
  handlers.onMessage({ at: 'T2', v: 'b' });

  handlers.onError(new Error('coupure'));
  await clock.tick();

  assert.equal(rattrapages, 2, 'un au démarrage, un après la coupure');
  assert.deepEqual(recus, ['a', 'b', 'manqué']);
  assert.equal(channel.cursor, 'T3');
});

test('au premier abonnement, on ne rejoue RIEN', async () => {
  // Sans repère il n'y a pas de trou à combler : tout retélécharger ferait
  // passer un démarrage pour un rattrapage.
  let vu = 'jamais appelé';
  const channel = createChannel({
    connect: () => Promise.resolve({ close() {} }),
    catchUp: since => {
      vu = since;
      return [];
    },
    env: {},
  });
  await channel.start();
  assert.equal(vu, null, 'le rattrapage reçoit `null`, à lui de ne rien faire');
});

test('le rattrapage vient APRÈS l’abonnement, jamais avant', async () => {
  // L'inverse laisserait un trou entre la fin du rattrapage et le début de
  // l'écoute — invisible, et donc impossible à déboguer plus tard.
  const ordre = [];
  const channel = createChannel({
    connect: () => {
      ordre.push('abonnement');
      return Promise.resolve({ close() {} });
    },
    since: 'T0',
    catchUp: () => {
      ordre.push('rattrapage');
      return [];
    },
    env: {},
  });
  await channel.start();
  assert.deepEqual(ordre, ['abonnement', 'rattrapage']);
});

test('un rattrapage en échec ne tue PAS un abonnement qui marche', async () => {
  // Le traiter comme une coupure ferait boucler la reconnexion sur une cause
  // qui ne bougera pas — une politique de lecture absente, typiquement — en
  // laissant croire à un problème de réseau.
  const clock = fakeClock();
  const infos = [];
  let connexions = 0;

  const channel = createChannel({
    connect: () => {
      connexions += 1;
      return Promise.resolve({ close() {} });
    },
    since: 'T0',
    catchUp: () => {
      throw new Error('permission denied for table places');
    },
    onStatus: (status, info) => infos.push([status, info]),
    jitter: 0,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env: {},
  });

  await channel.start();

  assert.equal(channel.status, STATUS.live, 'le canal reste ouvert');
  assert.equal(connexions, 1, 'aucune reconnexion inutile');
  assert.deepEqual(clock.delays, [], 'aucune boucle programmée');

  // Mais l'échec se DIT : sinon l'écran ne se met jamais à jour, sans raison
  // affichable.
  const signale = infos.find(([, info]) => info?.catchUpError);
  assert.ok(signale, `aucun signalement dans ${JSON.stringify(infos)}`);
  assert.match(String(signale[1].catchUpError), /permission denied/);
});

/* ── Le réveil ─────────────────────────────────────────────────────────── */

test('au réveil de l’onglet, une connexion morte est détectée', async () => {
  // Sur mobile l'onglet est suspendu, pas fermé : la connexion meurt sans
  // qu'aucun évènement ne le dise, et l'app paraît figée.
  const clock = fakeClock();
  const listeners = {};
  const env = {
    document: {
      visibilityState: 'visible',
      addEventListener: (name, fn) => (listeners[name] = fn),
      removeEventListener: () => delete listeners.visibilitychange,
    },
  };

  let vivante = true;
  let connexions = 0;
  const channel = createChannel({
    connect: () => {
      connexions += 1;
      return Promise.resolve({ close() {}, alive: () => vivante });
    },
    jitter: 0,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env,
  });

  await channel.start();
  assert.equal(channel.status, STATUS.live);

  // L'onglet a dormi ; la connexion est morte en silence.
  vivante = false;
  listeners.visibilitychange();
  assert.equal(channel.status, STATUS.retrying);

  vivante = true;
  await clock.tick();
  assert.equal(connexions, 2);
  assert.equal(channel.status, STATUS.live);
});

test('revenir au premier plan écourte l’attente', async () => {
  const clock = fakeClock();
  const listeners = {};
  const env = {
    document: {
      visibilityState: 'visible',
      addEventListener: (name, fn) => (listeners[name] = fn),
      removeEventListener: () => {},
    },
  };

  let ok = false;
  let connexions = 0;
  const channel = createChannel({
    connect: () => {
      connexions += 1;
      return ok
        ? Promise.resolve({ close() {} })
        : Promise.reject(new Error('non'));
    },
    baseDelayMs: 30_000,
    jitter: 0,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    env,
  });

  await channel.start();
  assert.equal(channel.status, STATUS.retrying);

  // Trente secondes de retrait : l'utilisateur qui revient ne doit pas les
  // attendre.
  ok = true;
  await listeners.visibilitychange();
  assert.equal(connexions, 2);
  assert.equal(channel.status, STATUS.live);
});

test('un transport est OBLIGATOIRE', () => {
  assert.throws(() => createChannel({}), /transport `connect` est requis/);
});

/* ── Le transport local, éprouvé pour de vrai ──────────────────────────── */

test('local : deux onglets se parlent par BroadcastChannel', async () => {
  const { localRealtimeTransport } = await import('../realtime/local.js');

  // Un BroadcastChannel de test : même contrat, un bus en mémoire.
  const bus = new Map();
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      if (!bus.has(name)) bus.set(name, new Set());
      bus.get(name).add(this);
    }
    postMessage(data) {
      for (const other of bus.get(this.name)) {
        if (other !== this) other.onmessage?.({ data });
      }
    }
    close() {
      bus.get(this.name).delete(this);
    }
  }

  const env = { BroadcastChannel: FakeBroadcastChannel };
  const recus = [];
  const onglet1 = localRealtimeTransport({ name: 'scores', env });
  const onglet2 = localRealtimeTransport({ name: 'scores', env });

  await onglet1.connect({ onMessage: m => recus.push(m), onError: () => {} });
  onglet2.post({ joueur: 'A', points: 12 });

  assert.deepEqual(recus, [{ joueur: 'A', points: 12 }]);
});

test('local : repli sur l’évènement `storage` sans BroadcastChannel', async () => {
  const { localRealtimeTransport } = await import('../realtime/local.js');
  const listeners = {};
  const env = {
    addEventListener: (name, fn) => (listeners[name] = fn),
    removeEventListener: () => {},
    localStorage: { setItem: () => {} },
  };

  const recus = [];
  const transport = localRealtimeTransport({ name: 'scores', env });
  await transport.connect({ onMessage: m => recus.push(m), onError: () => {} });

  listeners.storage({
    key: 'dwc_bc_scores',
    newValue: JSON.stringify({ at: 1, payload: { x: 1 } }),
  });
  // Une autre clé ne doit rien déclencher.
  listeners.storage({ key: 'autre-chose', newValue: '{}' });
  // Un message illisible non plus.
  listeners.storage({ key: 'dwc_bc_scores', newValue: 'pas du json' });

  assert.deepEqual(recus, [{ x: 1 }]);
});

/* ── Le transport Supabase : le nommage des canaux ─────────────────────── */

/**
 * Un client Supabase factice FIDÈLE aux trois comportements de
 * `@supabase/realtime-js` 2.107.0 qui font tout le problème. Un faux
 * complaisant — un `channel()` qui crée toujours, un `subscribe()` qui marche
 * toujours — validerait le bogue au lieu de le montrer.
 */
function fakeSupabase() {
  /** Sujet → canal, comme `client.channels`. */
  const registered = new Map();
  const leaving = [];

  class FakeChannel {
    constructor(topic) {
      this.topic = topic;
      this.state = 'closed';
      this.bindings = [];
      this.callback = null;
    }
    on(type, filter, handler) {
      this.bindings.push({ type, filter, handler });
      return this;
    }
    subscribe(callback) {
      // (2) `subscribe()` est un NO-OP sur un canal qui n'est pas `closed` :
      // pas d'erreur, pas de rappel, rien. C'est ce silence qui laisse la
      // promesse de `connect()` en suspens pour toujours.
      if (this.state !== 'closed') return this;
      this.state = 'joining';
      this.callback = callback;
      return this;
    }
    /** Le serveur répond enfin. */
    ack(status = 'SUBSCRIBED') {
      this.state = status === 'SUBSCRIBED' ? 'joined' : 'errored';
      this.callback?.(status);
    }
    /** Un changement arrive sur ce canal-ci. */
    emit(payload) {
      for (const { handler } of this.bindings) handler(payload);
    }
  }

  return {
    get channels() {
      return [...registered.values()];
    },
    channel(topic) {
      // (1) le client REND le canal déjà enregistré sous ce sujet, au lieu
      // d'en créer un second.
      const existing = registered.get(topic);
      if (existing) return existing;
      const created = new FakeChannel(topic);
      registered.set(topic, created);
      return created;
    },
    removeChannel(channel) {
      // (3) le retrait est ASYNCHRONE : le canal reste enregistré, en
      // `leaving`, le temps de l'aller-retour serveur.
      channel.state = 'leaving';
      leaving.push(channel);
      return Promise.resolve('ok');
    },
    /** L'aller-retour aboutit : le client oublie enfin les canaux sortants. */
    flushRemovals() {
      for (const channel of leaving) {
        if (registered.get(channel.topic) === channel) {
          registered.delete(channel.topic);
        }
        channel.state = 'closed';
      }
      leaving.length = 0;
    },
    from() {
      throw new Error('aucun rattrapage attendu dans ce test');
    },
  };
}

const EN_SUSPENS = Symbol('promesse jamais résolue');

/**
 * Attendre une promesse SANS risquer de pendre : le bogue d'origine laisse
 * `connect()` en suspens pour toujours, et un test qui pend ne dit rien.
 */
function within(promise, ms = 50) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(EN_SUSPENS), ms);
    timer.unref?.();
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

test('supabase : deux filtres sur la MÊME table, deux canaux distincts', async () => {
  // Le cas d'école : un fil de commentaires par candidat et un journal par
  // espace de travail. Avec un sujet `dwc:<schema>:<table>`, le second
  // abonnement recevait le canal du premier — ses écouteurs s'y greffaient et
  // son `subscribe()` ne faisait rien.
  const { supabaseRealtimeTransport } = await import('../realtime/supabase.js');
  const client = fakeSupabase();

  const commentaires = supabaseRealtimeTransport({
    client,
    table: 'comments',
    filter: 'candidate_id=eq.1',
  });
  const journal = supabaseRealtimeTransport({
    client,
    table: 'comments',
    filter: 'workspace_id=eq.7',
  });

  const recusA = [];
  const recusB = [];
  const pA = commentaires.connect({
    onMessage: m => recusA.push(m),
    onError: () => {},
  });
  const pB = journal.connect({
    onMessage: m => recusB.push(m),
    onError: () => {},
  });

  assert.equal(client.channels.length, 2, 'deux abonnements = deux canaux');
  const [canalA, canalB] = client.channels;
  canalA.ack();
  canalB.ack();

  const abonnementA = await within(pA);
  const abonnementB = await within(pB);
  assert.notEqual(
    abonnementA,
    EN_SUSPENS,
    'le premier abonnement doit aboutir'
  );
  assert.notEqual(abonnementB, EN_SUSPENS, 'le second aussi — c’est le bogue');

  // Chacun n'écoute QUE son canal : un écouteur greffé sur celui du voisin
  // ferait entrer les commentaires d'un candidat dans le journal de l'espace.
  canalA.emit({ eventType: 'INSERT', new: { id: 'a' } });
  assert.deepEqual(recusA, [{ eventType: 'INSERT', new: { id: 'a' } }]);
  assert.deepEqual(recusB, [], 'le journal ne doit rien avoir reçu');
});

test('supabase : le sujet nomme le filtre, et reste unique', async () => {
  const { supabaseRealtimeTransport } = await import('../realtime/supabase.js');
  const client = fakeSupabase();
  const transport = supabaseRealtimeTransport({
    client,
    table: 'comments',
    filter: 'candidate_id=eq.1',
  });

  void transport.connect({ onMessage: () => {}, onError: () => {} });
  void transport.connect({ onMessage: () => {}, onError: () => {} });
  const sujets = client.channels.map(c => c.topic);

  // Lisible en débogage : le schéma, la table, le filtre. Et un numéro, parce
  // que deux abonnements RIGOUREUSEMENT identiques doivent coexister aussi.
  for (const sujet of sujets) {
    assert.match(sujet, /^dwc:public:comments:candidate_id=eq\.1#\d+$/, sujet);
  }
  assert.equal(new Set(sujets).size, 2, `sujets en collision : ${sujets}`);
});

test('supabase : `channelName` renomme le sujet sans le figer', async () => {
  const { supabaseRealtimeTransport } = await import('../realtime/supabase.js');
  const client = fakeSupabase();
  const transport = supabaseRealtimeTransport({
    client,
    table: 'comments',
    channelName: 'carbook:fil-candidat',
  });

  void transport.connect({ onMessage: () => {}, onError: () => {} });
  void transport.connect({ onMessage: () => {}, onError: () => {} });
  const sujets = client.channels.map(c => c.topic);

  assert.match(sujets[0], /^carbook:fil-candidat#\d+$/);
  assert.equal(
    new Set(sujets).size,
    2,
    'un nom donné par l’appelant ne doit pas réintroduire la collision'
  );
});

test('supabase : démonter puis remonter aussitôt rouvre VRAIMENT', async () => {
  // Le démontage-remontage de React dans le même commit : `removeChannel()`
  // étant asynchrone, le canal sortant est encore enregistré quand le second
  // montage demande le sien.
  const { supabaseRealtimeTransport } = await import('../realtime/supabase.js');
  const client = fakeSupabase();
  const transport = supabaseRealtimeTransport({ client, table: 'comments' });

  const p1 = transport.connect({ onMessage: () => {}, onError: () => {} });
  const [premier] = client.channels;
  premier.ack();
  const abonnement = await within(p1);
  assert.notEqual(abonnement, EN_SUSPENS);

  abonnement.close();
  assert.equal(premier.state, 'leaving', 'le retrait n’est pas immédiat');

  const p2 = transport.connect({ onMessage: () => {}, onError: () => {} });
  const second = client.channels.find(c => c !== premier);
  assert.ok(second, 'le remontage doit ouvrir un canal NEUF');
  second.ack();
  assert.notEqual(
    await within(p2),
    EN_SUSPENS,
    'le second montage reste muet, sans la moindre erreur'
  );
});

test('supabase : un échec avant SUBSCRIBED ne laisse pas de canal orphelin', async () => {
  // Sans poignée de fermeture, l'appelant ne PEUT pas nettoyer : le canal
  // reste dans `client.channels` pour toujours, un par montage.
  const { supabaseRealtimeTransport } = await import('../realtime/supabase.js');
  const client = fakeSupabase();
  const transport = supabaseRealtimeTransport({ client, table: 'places' });

  const promesse = transport.connect({
    onMessage: () => {},
    onError: () => {},
  });
  const [canal] = client.channels;
  canal.ack('CHANNEL_ERROR');

  await assert.rejects(within(promesse), /CHANNEL_ERROR/);
  assert.equal(canal.state, 'leaving', 'le canal doit avoir été RETIRÉ');
  client.flushRemovals();
  assert.deepEqual(client.channels, [], 'aucun canal orphelin');
});

test('supabase : un canal mort-né ne laisse pas la promesse en suspens', async () => {
  // `CLOSED` avant `SUBSCRIBED` : sans ce cas, l'appelant attendrait un
  // évènement qui ne viendra plus — ni erreur, ni reconnexion.
  const { supabaseRealtimeTransport } = await import('../realtime/supabase.js');
  const client = fakeSupabase();
  const transport = supabaseRealtimeTransport({ client, table: 'places' });

  const promesse = transport.connect({
    onMessage: () => {},
    onError: () => {},
  });
  client.channels[0].ack('CLOSED');

  await assert.rejects(within(promesse), /CLOSED/);
  client.flushRemovals();
  assert.deepEqual(client.channels, [], 'aucun canal orphelin');
});

test('supabase : une coupure APRÈS coup se signale, sans double fermeture', async () => {
  const { supabaseRealtimeTransport } = await import('../realtime/supabase.js');
  const client = fakeSupabase();
  const transport = supabaseRealtimeTransport({ client, table: 'places' });

  const erreurs = [];
  const promesse = transport.connect({
    onMessage: () => {},
    onError: e => erreurs.push(e),
  });
  const [canal] = client.channels;
  canal.ack();
  const abonnement = await within(promesse);

  canal.ack('CHANNEL_ERROR');
  assert.equal(erreurs.length, 1, 'la coupure établie passe par `onError`');
  assert.equal(abonnement.alive(), false, 'et `alive()` le dit');

  // Le port ferme alors lui-même ; un `CLOSED` de courtoisie ne doit pas
  // rouvrir le dossier.
  abonnement.close();
  abonnement.close();
  canal.ack('CLOSED');
  assert.equal(erreurs.length, 1, 'aucun signalement après la fermeture');
});
