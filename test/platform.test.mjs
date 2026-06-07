// Tests du "platform layer" partagé : helpers purs (retryableQuery,
// observability) toujours exécutés ; smoke-render des composants /react ignoré
// si react/react-dom ne sont pas installés (peers optionnels du package).
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function loadReact() {
  try {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    return { h: createElement, renderToStaticMarkup };
  } catch {
    return null;
  }
}

test('retryableQuery : réussit après quelques échecs', async () => {
  const { retryableQuery } = await import('../react/net.js');
  let calls = 0;
  const result = await retryableQuery(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('flaky');
      return 'ok';
    },
    { retries: 5, baseDelayMs: 1, maxDelayMs: 2 }
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('retryableQuery : relance la dernière erreur si épuisé + respecte shouldRetry', async () => {
  const { retryableQuery } = await import('../react/net.js');
  let calls = 0;
  await assert.rejects(
    () =>
      retryableQuery(
        async () => {
          calls += 1;
          throw new Error('boom');
        },
        { retries: 2, baseDelayMs: 1 }
      ),
    /boom/
  );
  assert.equal(calls, 3); // 1 + 2 retries

  let onceCalls = 0;
  await assert.rejects(
    () =>
      retryableQuery(
        async () => {
          onceCalls += 1;
          throw new Error('nope');
        },
        { retries: 5, baseDelayMs: 1, shouldRetry: () => false }
      ),
    /nope/
  );
  assert.equal(onceCalls, 1); // shouldRetry=false → aucune relance
});

test('observability : recordError relaie au forwarder et renvoie une entrée', async () => {
  const obs = await import('../react/observability.js');
  const seen = [];
  obs.setForwarder((err, ctx) => seen.push({ err, ctx }));
  const entry = obs.recordError(new Error('explosion'), { feature: 'test' });
  assert.equal(entry.message, 'explosion');
  assert.equal(entry.context.feature, 'test');
  assert.ok(typeof entry.ts === 'string');
  assert.equal(seen.length, 1);
  assert.ok(seen[0].err instanceof Error);
  assert.equal(seen[0].ctx.feature, 'test');
  obs.setForwarder(null);
  assert.ok(Array.isArray(obs.getErrorLog()));
});

test('observability : un forwarder qui throw ne casse pas recordError', async () => {
  const obs = await import('../react/observability.js');
  obs.setForwarder(() => {
    throw new Error('forwarder cassé');
  });
  assert.doesNotThrow(() => obs.recordError('texte simple'));
  obs.setForwarder(null);
});

test('initSentry : no-op (null) sans dsn', async () => {
  const { initSentry } = await import('../react/observability.js');
  assert.equal(await initSentry(), null);
  assert.equal(await initSentry({ dsn: '' }), null);
});

test('composants /react : smoke-render markup data-dwc', async t => {
  const deps = await loadReact();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { h, renderToStaticMarkup } = deps;
  const { EmptyState } = await import('../react/empty-state.js');
  const { ErrorBanner } = await import('../react/error-banner.js');
  const { SyncStatusBadge } = await import('../react/sync-status-badge.js');
  const { ErrorBoundary } = await import('../react/error-boundary.js');

  const empty = renderToStaticMarkup(
    h(EmptyState, {
      title: 'Vide',
      description: 'Rien',
      action: h('button', null, 'Créer'),
    })
  );
  assert.match(empty, /data-dwc="empty-state"/);
  assert.match(empty, /data-dwc="empty-state-action"/);

  const banner = renderToStaticMarkup(
    h(ErrorBanner, { message: 'Échec', severity: 'warning', onRetry: () => {} })
  );
  assert.match(banner, /data-dwc="error-banner"/);
  assert.match(banner, /data-severity="warning"/);
  assert.match(banner, /data-dwc="error-banner-retry"/);
  // Pas de message → ne rend rien.
  assert.equal(renderToStaticMarkup(h(ErrorBanner, {})), '');

  const badge = renderToStaticMarkup(
    h(SyncStatusBadge, { status: 'pending', pending: 3 })
  );
  assert.match(badge, /data-status="pending"/);
  assert.match(badge, /\(3\)/);

  const ok = renderToStaticMarkup(
    h(ErrorBoundary, null, h('span', null, 'contenu'))
  );
  assert.match(ok, /contenu/, 'ErrorBoundary rend ses enfants sans erreur');
});
