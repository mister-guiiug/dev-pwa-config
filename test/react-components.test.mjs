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

test('ObservabilityBoundary affiche la référence à citer au support', async t => {
  let setupDom, mount;
  try {
    ({ setupDom, mount } = await import('./helpers/dom.mjs'));
  } catch {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h } = await import('react');
  const dom = setupDom();
  try {
    const { ObservabilityBoundary } =
      await import('../react/error-boundary.js');
    // Un crash sans référence oblige l'utilisateur à décrire « ça a planté » ;
    // l'identifiant affiché est le MÊME que celui parti en en-tête et en Sentry.
    const Boom = () => {
      throw new Error('boum');
    };
    const view = await mount(
      h(ObservabilityBoundary, { reference: 'corr-visible' }, h(Boom))
    );
    const shown = view.container.querySelector(
      '[data-dwc="error-boundary-reference"]'
    );
    assert.ok(shown, 'la référence est rendue');
    assert.match(shown.textContent, /corr-visible/);
    await view.unmount();

    // `reference: false` retire l'affichage sans rien casser d'autre.
    const muet = await mount(
      h(ObservabilityBoundary, { reference: false }, h(Boom))
    );
    assert.equal(
      muet.container.querySelector('[data-dwc="error-boundary-reference"]'),
      null
    );
    assert.ok(
      muet.container.querySelector('[data-dwc="error-boundary"]'),
      'la frontière fonctionne toujours'
    );
    await muet.unmount();
  } finally {
    dom.restore();
  }
});

test('FamilyApps groupBy : un repli par catégorie, compté, dans l’ordre du catalogue', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');
  const { CATEGORIES, FAMILY_APPS, otherApps } =
    await import('../apps-catalog.js');

  const current = FAMILY_APPS[0].id;
  const html = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: current, groupBy: 'category' })
  );

  const attendus = new Map();
  for (const app of otherApps(current)) {
    attendus.set(app.category, (attendus.get(app.category) ?? 0) + 1);
  }

  // AUCUNE CARTE NE DOIT DISPARAÎTRE. C'est le risque propre au regroupement :
  // une facette absente ou une valeur hors catalogue, et l'app tombe dans un
  // seau que personne ne rend — sans la moindre erreur.
  const rendus = [...html.matchAll(/data-dwc="family-app-item"/g)].length;
  assert.equal(rendus, otherApps(current).length);

  const groupes = [
    ...html.matchAll(/data-dwc="family-app-group" data-category="([a-z]+)"/g),
  ].map(m => m[1]);
  assert.deepEqual(
    groupes,
    CATEGORIES.filter(c => attendus.has(c)),
    'ordre du catalogue, et aucun groupe vide'
  );

  // Le compte affiché est ce qui rend un repli honnête : sans lui, rien ne dit
  // si le groupe cache une app ou six.
  for (const [categorie, compte] of attendus) {
    const bloc = html.slice(
      html.indexOf(`data-category="${categorie}"`),
      html.indexOf(
        `data-dwc="family-app-list"`,
        html.indexOf(`data-category="${categorie}"`)
      )
    );
    assert.match(
      bloc,
      new RegExp(`family-app-group-count"[^>]*>${compte}<`),
      `le groupe ${categorie} doit annoncer ${compte}`
    );
  }

  // TOUS LES GROUPES NAISSENT DÉPLIÉS, celui de six apps comme celui d'une.
  // Le défaut inverse faisait payer un clic pour voir ce que l'écran venait
  // d'annoncer — et masquait la grille à `axe`, qui ne lit pas un `<details>`
  // fermé : l'audit passait sans avoir rien analysé.
  for (const [categorie] of attendus) {
    assert.match(
      html,
      new RegExp(
        `<details open="" data-dwc="family-app-group" data-category="${categorie}"`
      ),
      `le groupe ${categorie} doit naître déplié`
    );
  }
  assert.equal(
    [...html.matchAll(/<details(?! open)/g)].length,
    0,
    'aucun groupe replié au premier rendu'
  );
});

test('FamilyApps groupBy : replier écrit le choix, et le rendu suivant l’honore', async t => {
  let setupDom, mount;
  try {
    ({ setupDom, mount } = await import('./helpers/dom.mjs'));
  } catch {
    t.skip('react / react-dom / jsdom non installés (peers optionnels)');
    return;
  }
  const { createElement: h } = await import('react');
  const dom = setupDom();
  try {
    const { FamilyApps } = await import('../react/family-apps.js');
    const { FAMILY_APPS } = await import('../apps-catalog.js');
    const current = FAMILY_APPS[0].id;

    // LE SEUL CHEMIN QUE `renderToStaticMarkup` NE PEUT PAS ÉPROUVER : le clic.
    // Sans DOM, `onToggle` ne part jamais — la mémoire tiendrait donc entièrement
    // dans du code que rien n'exécute.
    const vue = await mount(
      h(FamilyApps, { currentAppId: current, groupBy: 'category' })
    );
    const groupes = () => [
      ...vue.container.querySelectorAll('[data-dwc="family-app-group"]'),
    ];
    assert.ok(groupes().length > 1, 'plusieurs groupes rendus');
    assert.ok(
      groupes().every(d => d.open),
      'tous dépliés au montage'
    );
    assert.equal(
      localStorage.getItem('dwc_family_groups'),
      null,
      'le montage seul n’écrit rien'
    );

    // Replier le premier groupe — comme le fait un clic sur son `<summary>`.
    const premier = groupes()[0];
    const categorie = premier.getAttribute('data-category');
    await vue.act(() => {
      premier.open = false;
      premier.dispatchEvent(new window.Event('toggle'));
    });

    const memoire = JSON.parse(localStorage.getItem('dwc_family_groups'));
    assert.equal(
      memoire[categorie],
      false,
      `le repli de ${categorie} doit être mémorisé`
    );
    assert.equal(
      Object.keys(memoire).length,
      1,
      'seul le groupe touché est mémorisé — pas les six autres'
    );
    await vue.unmount();

    // Un montage neuf, sur le même appareil : le repli revient.
    const rouverte = await mount(
      h(FamilyApps, { currentAppId: current, groupBy: 'category' })
    );
    const reprise = rouverte.container.querySelector(
      `[data-dwc="family-app-group"][data-category="${categorie}"]`
    );
    assert.equal(reprise.open, false, 'le repli survit au remontage');
    // Et les autres n'ont pas été emportés.
    assert.ok(
      [...rouverte.container.querySelectorAll('[data-dwc="family-app-group"]')]
        .filter(d => d !== reprise)
        .every(d => d.open),
      'les groupes non touchés restent dépliés'
    );
    await rouverte.unmount();
  } finally {
    dom.restore();
  }
});

test('FamilyApps groupBy : le repli choisi est retenu, et rien d’autre n’est écrit', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;

  // Un `localStorage` de fortune : `storage.js` du socle lit
  // `globalThis.localStorage`, il suffit donc de le poser.
  const donnees = new Map();
  const faux = {
    getItem: k => (donnees.has(k) ? donnees.get(k) : null),
    setItem: (k, v) => donnees.set(k, String(v)),
    removeItem: k => donnees.delete(k),
  };
  const avant = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    value: faux,
    configurable: true,
    writable: true,
  });
  t.after(() => {
    if (avant) Object.defineProperty(globalThis, 'localStorage', avant);
    else delete globalThis.localStorage;
  });

  const { FamilyApps } = await import('../react/family-apps.js');
  const { FAMILY_APPS, otherApps } = await import('../apps-catalog.js');
  const current = FAMILY_APPS[0].id;
  // Une catégorie réellement présente, sinon l'épreuve ne prouve rien.
  const categorie = otherApps(current)[0].category;

  // 1. Un repli mémorisé l'emporte sur le défaut.
  donnees.set('dwc_family_groups', JSON.stringify({ [categorie]: false }));
  const replie = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: current, groupBy: 'category' })
  );
  assert.match(
    replie,
    new RegExp(
      `<details data-dwc="family-app-group" data-category="${categorie}"`
    ),
    `le groupe ${categorie} était replié : il doit le rester`
  );

  // 2. LE RENDU N'ÉCRIT RIEN. Si le montage gravait son propre défaut, aucun
  // changement de défaut n'atteindrait plus jamais un appareil déjà visité.
  donnees.clear();
  renderToStaticMarkup(
    h(FamilyApps, { currentAppId: current, groupBy: 'category' })
  );
  assert.equal(
    donnees.get('dwc_family_groups'),
    undefined,
    'un simple rendu ne doit rien mémoriser'
  );

  // 3. Une valeur illisible ou d'une autre forme retombe sur le défaut, sans
  //    lever : `null` n'est pas un choix, seul un booléen compte.
  donnees.set('dwc_family_groups', '{ tronqué');
  assert.match(
    renderToStaticMarkup(
      h(FamilyApps, { currentAppId: current, groupBy: 'category' })
    ),
    /<details open=""/,
    'JSON illisible → défaut déplié'
  );
  donnees.set('dwc_family_groups', JSON.stringify({ [categorie]: null }));
  assert.match(
    renderToStaticMarkup(
      h(FamilyApps, { currentAppId: current, groupBy: 'category' })
    ),
    new RegExp(
      `<details open="" data-dwc="family-app-group" data-category="${categorie}"`
    ),
    'null n’est pas un choix → défaut déplié'
  );

  // 4. `groupStorageKey: null` renonce à la mémoire sans renoncer au groupement.
  donnees.set('dwc_family_groups', JSON.stringify({ [categorie]: false }));
  const sansMemoire = renderToStaticMarkup(
    h(FamilyApps, {
      currentAppId: current,
      groupBy: 'category',
      groupStorageKey: null,
    })
  );
  assert.match(sansMemoire, /data-dwc="family-app-group"/, 'toujours groupé');
  assert.match(
    sansMemoire,
    new RegExp(
      `<details open="" data-dwc="family-app-group" data-category="${categorie}"`
    ),
    'sans clé, le repli mémorisé est ignoré'
  );
});

test('FamilyApps groupBy : la liste interne garde le marqueur que les apps habillent', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');
  const { FAMILY_APPS } = await import('../apps-catalog.js');

  // CE QUI REND L'ADOPTION GRATUITE. Vingt apps ont déjà écrit du CSS pour
  // `family-app-list` ; si le regroupement renommait cette liste, chacune
  // verrait sa grille retomber en pile à la montée de version, sans rien avoir
  // demandé. Le marqueur est donc le MÊME, replié ou non.
  const plat = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: FAMILY_APPS[0].id })
  );
  const groupe = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: FAMILY_APPS[0].id, groupBy: 'category' })
  );

  assert.match(plat, /data-dwc="family-app-list"/);
  assert.match(groupe, /data-dwc="family-app-list"/);
  assert.ok(
    !plat.includes('family-app-group'),
    'sans groupBy, aucun repli : la grille reste plate'
  );
});

test('FamilyApps layout : « list » pose la facette, le défaut ne pose rien', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');
  const { FAMILY_APPS } = await import('../apps-catalog.js');

  const defaut = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: FAMILY_APPS[0].id })
  );
  const liste = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: FAMILY_APPS[0].id, layout: 'list' })
  );

  // Le défaut doit rester MUET : les quatre apps qui rendent déjà la grille
  // responsive ne doivent pas voir leur DOM changer sous elles.
  assert.ok(
    !defaut.includes('data-layout'),
    'layout par défaut : aucune facette ne doit être posée'
  );
  assert.match(liste, /data-layout="list"/);
  // La facette vit sur la section, pas sur la liste : c'est elle que le CSS
  // du paquet fait descendre jusqu'aux colonnes.
  assert.match(liste, /data-dwc="family-apps" data-layout="list"/);
});

test('FamilyApps showTitle : false retire le <h3>, jamais le nom de la section', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');
  const { FAMILY_APPS } = await import('../apps-catalog.js');

  const avec = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: FAMILY_APPS[0].id })
  );
  const sans = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: FAMILY_APPS[0].id, showTitle: false })
  );

  assert.match(avec, /<h3 data-dwc="family-apps-title">/);
  assert.ok(
    !sans.includes('family-apps-title'),
    'showTitle: false ne doit rendre aucun titre'
  );
  // CE QUI NE DOIT PAS PARTIR AVEC LUI. Neuf apps masquaient ce titre en
  // `display: none`, ce qui le retirait aussi de l'arbre d'accessibilité. La
  // région restait nommée par son `aria-label` : elle doit le rester ici.
  assert.match(sans, /aria-label="Nos autres applications"/);
});

test('FamilyApps groupBy maturity : les trois niveaux, traduits par le dictionnaire', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');
  const { FAMILY_APPS, MATURITIES } = await import('../apps-catalog.js');

  const html = renderToStaticMarkup(
    h(FamilyApps, { currentAppId: FAMILY_APPS[0].id, groupBy: 'maturity' })
  );

  const groupes = [
    ...html.matchAll(/data-dwc="family-app-group" data-maturity="([a-z]+)"/g),
  ].map(m => m[1]);
  assert.deepEqual(groupes, [...MATURITIES]);
  // Le libellé vient du dictionnaire, pas de la clé brute du catalogue.
  assert.match(html, /family-app-group-name">Stable</);
});

test('FamilyApps groupBy : une facette inconnue est rendue, jamais avalée', async t => {
  const deps = await loadDeps();
  if (!deps) {
    t.skip('react / react-dom non installés (peers optionnels)');
    return;
  }
  const { createElement: h, renderToStaticMarkup } = deps;
  const { FamilyApps } = await import('../react/family-apps.js');

  /*
   * LE RISQUE PROPRE AU REGROUPEMENT, et que le vrai catalogue ne peut pas
   * éprouver : toutes ses apps portent une catégorie connue. Si `repartir` ne
   * rendait que les seaux du catalogue, une app à facette absente ou inventée
   * disparaîtrait de la grille — sans erreur, sans trou visible, sans rien.
   * Seule une app sans catégorie du tout le montre.
   */
  const inventees = [
    {
      id: 'app-connue',
      name: 'App connue',
      description: 'Rangée dans une catégorie du catalogue.',
      maturity: 'stable',
      category: 'jeux',
      appUrl: 'https://example.test/a/',
      repoUrl: 'https://example.test/a',
    },
    {
      id: 'app-hors-catalogue',
      name: 'App hors catalogue',
      description: 'Sa catégorie n’existe pas.',
      maturity: 'stable',
      category: 'archeologie',
      appUrl: 'https://example.test/b/',
      repoUrl: 'https://example.test/b',
    },
    {
      id: 'app-sans-categorie',
      name: 'App sans catégorie',
      description: 'Aucune facette.',
      maturity: 'stable',
      appUrl: 'https://example.test/c/',
      repoUrl: 'https://example.test/c',
    },
  ];

  const html = renderToStaticMarkup(
    h(FamilyApps, {
      currentAppId: 'aucune',
      apps: inventees,
      groupBy: 'category',
      showSponsor: false,
    })
  );

  assert.equal(
    [...html.matchAll(/data-dwc="family-app-item"/g)].length,
    3,
    'les trois cartes sont rendues, connues ou non'
  );
  for (const app of inventees) assert.ok(html.includes(app.name), app.id);

  // Les valeurs hors catalogue viennent APRÈS les connues, sous leur propre
  // nom — faute de traduction, la clé brute vaut mieux qu'un groupe muet.
  const ordre = [
    ...html.matchAll(/data-dwc="family-app-group" data-category="([a-z]+)"/g),
  ].map(m => m[1]);
  assert.deepEqual(ordre, ['jeux', 'archeologie', 'autres']);
  assert.match(html, /family-app-group-name">archeologie</);
});
