// Corrélation : l'identifiant doit être le MÊME dans les quatre canaux — c'est
// tout l'intérêt. Les tests portent donc autant sur la propagation que sur la
// génération, et sur le fait qu'un observateur cassé ne casse pas la requête.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const {
  DEFAULT_CORRELATION_HEADER,
  DEFAULT_SESSION_HEADER,
  correlationContext,
  correlationHeaders,
  getSessionId,
  newRequestId,
  resetSessionId,
  withCorrelation,
} = await import('../correlation.js');

test('l’identifiant de session est stable, et distinct par requête', () => {
  const first = getSessionId();
  assert.equal(getSessionId(), first, 'stable d’un appel à l’autre');
  assert.notEqual(newRequestId(), newRequestId(), 'un id de requête par appel');
  assert.notEqual(resetSessionId(), first, 'reset produit un id neuf');
});

test('les en-têtes portent la requête ET la session', () => {
  const headers = correlationHeaders({ requestId: 'req-1' });
  assert.equal(headers[DEFAULT_CORRELATION_HEADER], 'req-1');
  assert.equal(headers[DEFAULT_SESSION_HEADER], getSessionId());
});

test('le contexte des autres canaux porte le même identifiant de session', () => {
  assert.deepEqual(correlationContext(), {
    correlationSessionId: getSessionId(),
  });
});

test('withCorrelation pose les en-têtes et rend l’identifiant à l’appelant', async () => {
  const seen = [];
  const fake = async (_input, init) => {
    seen.push(new Headers(init.headers));
    return new Response('ok', { status: 200 });
  };
  const observed = [];
  const fetchWith = withCorrelation(fake, {
    onRequest: info => observed.push(['request', info.requestId]),
    onResponse: info =>
      observed.push(['response', info.requestId, info.status]),
  });

  await fetchWith('https://exemple.test/a', { method: 'POST' });

  const sent = seen[0];
  const id = sent.get(DEFAULT_CORRELATION_HEADER);
  assert.ok(id, 'en-tête de corrélation posé');
  assert.equal(sent.get(DEFAULT_SESSION_HEADER), getSessionId());
  // L'identifiant rendu aux observateurs est CELUI envoyé : sans cela, le
  // journal de l'app et celui du serveur ne se rejoignent pas.
  assert.deepEqual(observed, [
    ['request', id],
    ['response', id, 200],
  ]);
});

test('withCorrelation respecte un en-tête déjà posé par l’appelant', async () => {
  let sent = null;
  const fetchWith = withCorrelation(async (_i, init) => {
    sent = new Headers(init.headers);
    return new Response(null, { status: 204 });
  });
  await fetchWith('https://exemple.test/b', {
    headers: { [DEFAULT_CORRELATION_HEADER]: 'venu-d-ailleurs' },
  });
  assert.equal(sent.get(DEFAULT_CORRELATION_HEADER), 'venu-d-ailleurs');
});

test('withCorrelation relance l’erreur d’origine, en la signalant', async () => {
  const boom = new Error('réseau coupé');
  const errors = [];
  const fetchWith = withCorrelation(
    async () => {
      throw boom;
    },
    { onError: (error, info) => errors.push([error, info.requestId]) }
  );
  await assert.rejects(
    () => fetchWith('https://exemple.test/c'),
    /réseau coupé/
  );
  assert.equal(errors[0][0], boom, 'la MÊME erreur, pas une enveloppe');
  assert.ok(errors[0][1], 'signalée avec son identifiant');
});

test('un observateur qui jette ne casse pas la requête qu’il observe', async () => {
  const fetchWith = withCorrelation(async () => new Response('ok'), {
    onRequest: () => {
      throw new Error('observateur cassé');
    },
    onResponse: () => {
      throw new Error('observateur cassé');
    },
  });
  const response = await fetchWith('https://exemple.test/d');
  assert.equal(response.status, 200);
});

test('un stockage qui jette n’empêche pas d’obtenir un identifiant', async () => {
  // Le chemin d'observabilité ne doit JAMAIS lever : en navigation privée
  // stricte, `sessionStorage` jette à la simple lecture. Sans repli, toute
  // erreur survenant ensuite deviendrait invisible — l'inverse du but.
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage'
  );
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() {
      throw new Error('accès au stockage refusé');
    },
  });
  try {
    const { getSessionId: freshId } = await import(
      '../correlation.js?storage-throws'
    );
    assert.ok(freshId(), 'repli mémoire');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else delete globalThis.sessionStorage;
  }
});
