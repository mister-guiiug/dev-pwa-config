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

test('FamilyApps : liens dépôt, tri et coupe', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');
  const { FAMILY_APPS, sortApps } = await import('../apps-catalog.js');

  const html = renderToStaticMarkup(
    h(FamilyApps, {
      currentAppId: 'aucune',
      showRepoLinks: true,
      sort: 'maturity',
      max: 3,
    })
  );

  // Une carte = un `<li>` ; la coupe s'applique APRÈS le tri.
  assert.equal(
    html.match(/data-dwc="family-app-item"/g).length,
    3,
    '`max` n’a pas coupé la grille'
  );
  const attendus = sortApps(FAMILY_APPS, 'maturity').slice(0, 3);
  for (const app of attendus) {
    assert.ok(html.includes(app.name), `${app.id} attendu dans les 3 premiers`);
  }

  // Deux destinations distinctes, deux ancres FRÈRES : une ancre dans une
  // ancre serait invalide, et un lecteur d'écran n'en annoncerait qu'une.
  assert.equal(
    html.match(/data-dwc="family-app-repo"/g).length,
    3,
    'un lien dépôt par carte'
  );
  assert.ok(
    !/<a[^>]*>(?:(?!<\/a>)[\s\S])*<a /.test(html),
    'ancre imbriquée dans la grille'
  );
  assert.ok(
    html.includes(`href="${attendus[0].repoUrl}"`),
    'le lien dépôt pointe sur le dépôt'
  );
  // Le libellé accessible nomme l'app : seize fois « Code source » ne
  // distinguerait rien à la lecture d'écran.
  assert.ok(html.includes(`Code source de ${attendus[0].name}`));

  // Facettes exposées au CSS de l'app consommatrice.
  assert.match(html, /data-maturity="stable"/);
  assert.match(html, /data-platform="web"/);
});

test('FamilyApps : sans showRepoLinks, le DOM reste celui d’avant', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');

  const html = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: 'miss-dice' })
  );
  assert.ok(
    !html.includes('family-app-repo'),
    'le lien dépôt est opt-in, pas un défaut'
  );
  assert.ok(!html.includes('data-with-repo'), 'marqueur de variante inattendu');
});
