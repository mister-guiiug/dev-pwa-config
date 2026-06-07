// Smoke-test de rendu des composants `/react`. React/react-dom sont des peers
// OPTIONNELS du package : s'ils ne sont pas installés (cas de la CI du package),
// le test est ignoré plutôt que d'échouer. Le rendu réel est exercé par le build
// des apps consommatrices.
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function loadDeps() {
  try {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    return { createElement, renderToStaticMarkup };
  } catch {
    return null;
  }
}

test('FamilyApps : grille des autres apps + badges + exclusion app courante', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');
  const { FAMILY_APPS } = await import('../apps-catalog.js');

  const current = FAMILY_APPS[0].id;
  const html = renderToStaticMarkup(
    h(FamilyApps, {
      currentAppId: current,
      repoUrl: 'https://example.com/repo',
    })
  );

  assert.match(html, /data-dwc="family-apps"/);
  assert.match(
    html,
    /data-dwc="family-source"/,
    'lien source rendu si repoUrl'
  );
  assert.match(html, /data-dwc="family-sponsor"/, 'lien sponsor par défaut');
  assert.match(html, /data-maturity="/, 'au moins un badge de maturité');
  assert.ok(
    !html.includes(`/${current}/`) && !html.includes(`/${current}"`),
    'l’app courante est exclue de la grille'
  );
});
