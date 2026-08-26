/**
 * L'affichage et la surveillance de la version, montés dans un vrai DOM.
 *
 * `renderToStaticMarkup` ne suffit pas ici : `VersionProvider` ne calcule
 * `justUpdated` qu'au premier rendu, et son sondage vit dans un effet. Sans
 * montage réel, les deux comportements qui comptent ne seraient pas testés.
 *
 * CE QUI EST VERROUILLÉ :
 *   1. sans version injectée, `AppVersion` rend `null` — pas un « v » orphelin ;
 *   2. `AppVersion` fonctionne HORS fournisseur, ce qui est son cas d'usage
 *      dans un pied de page ;
 *   3. la confirmation « mis à jour vers » apparaît APRÈS une bascule réussie,
 *      et jamais après un rollback ;
 *   4. sans `checkEvery`, aucune requête n'est émise ;
 *   5. `AppFooter` sans `version` rend exactement ce qu'il rendait avant.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { BUILD_INFO_GLOBAL, VERSION_STORAGE_KEY } from '../version.js';
import { VersionProvider, useAppVersion } from '../react/version.js';
import { AppVersion } from '../react/app-version.js';
import { AppFooter } from '../react/app-footer.js';
import { LabelsProvider } from '../react/labels.js';

const BUILD = {
  version: '3.13.0',
  buildTime: '2026-08-26T07:54:00.000Z',
  commit: '104c944abcdef',
};

const text = (container, selector) =>
  container.querySelector(`[data-dwc="${selector}"]`)?.textContent ?? null;

test('sans version injectée, AppVersion ne rend rien', async () => {
  const dom = setupDom();
  try {
    const view = await mount(h(AppVersion, {}));
    assert.equal(
      view.container.textContent,
      '',
      'un « v » orphelin est pire que rien'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('hors fournisseur, AppVersion affiche la version du global', async () => {
  const dom = setupDom();
  globalThis[BUILD_INFO_GLOBAL] = BUILD;
  try {
    const view = await mount(h(AppVersion, {}));
    assert.equal(text(view.container, 'app-version-value'), '3.13.0');
    assert.equal(text(view.container, 'app-version-label'), 'Version ');
    // Aucune surveillance hors fournisseur : rien d'autre ne s'affiche.
    assert.equal(text(view.container, 'app-version-updated'), null);
    assert.equal(text(view.container, 'app-version-available'), null);
    await view.unmount();
  } finally {
    delete globalThis[BUILD_INFO_GLOBAL];
    dom.restore();
  }
});

test('AppVersion lie le numéro à sa release, en lien externe sûr', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        VersionProvider,
        { info: BUILD, remember: false },
        h(AppVersion, {
          repoUrl: 'https://github.com/mister-guiiug/mister-family-map/',
        })
      )
    );
    const link = view.container.querySelector(
      'a[data-dwc="app-version-value"]'
    );
    // Le `repoUrl` porte une barre finale — comme celui d'`AppFooter`, où il
    // sert aussi de lien source.
    assert.equal(
      link.getAttribute('href'),
      'https://github.com/mister-guiiug/mister-family-map/releases/tag/v3.13.0'
    );
    assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
    await view.unmount();

    // Les barres de fin sont retirées SANS expression régulière : celle qui le
    // faisait avant repartait en arrière une fois par position, et `repoUrl`
    // est une prop — c'est-à-dire une entrée libre. Cinq cents barres doivent
    // se traiter comme une.
    const many = await mount(
      h(
        VersionProvider,
        { info: BUILD, remember: false },
        h(AppVersion, {
          repoUrl: `https://exemple.test/depot${'/'.repeat(500)}`,
        })
      )
    );
    assert.equal(
      many.container
        .querySelector('a[data-dwc="app-version-value"]')
        .getAttribute('href'),
      'https://exemple.test/depot/releases/tag/v3.13.0'
    );
    await many.unmount();
  } finally {
    dom.restore();
  }
});

test('les détails affichent la date et le commit court, pas le SHA entier', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        VersionProvider,
        { info: BUILD, remember: false },
        h(AppVersion, { details: true, locale: 'fr-FR' })
      )
    );
    const details = text(view.container, 'app-version-details');
    assert.match(details, /104c944/);
    assert.ok(
      !details.includes('104c944abcdef'),
      'le SHA complet n’a rien à faire à l’écran'
    );
    assert.match(details, /2026/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('« mis à jour vers » n’apparaît qu’après une montée réelle', async () => {
  const dom = setupDom();
  try {
    // Premier démarrage : rien de mémorisé, donc aucune confirmation.
    let view = await mount(
      h(VersionProvider, { info: BUILD }, h(AppVersion, {}))
    );
    assert.equal(text(view.container, 'app-version-updated'), null);
    assert.equal(localStorage.getItem(VERSION_STORAGE_KEY), '3.13.0');
    await view.unmount();

    // Démarrage suivant, version plus haute : la confirmation que les cinq
    // modules de mise à jour ne savaient pas donner.
    view = await mount(
      h(VersionProvider, { info: { version: '3.14.0' } }, h(AppVersion, {}))
    );
    assert.equal(
      text(view.container, 'app-version-updated'),
      'Mis à jour vers 3.14.0'
    );
    await view.unmount();

    // Rollback : la version a changé, mais ce n'est pas une nouveauté.
    view = await mount(h(VersionProvider, { info: BUILD }, h(AppVersion, {})));
    assert.equal(text(view.container, 'app-version-updated'), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans checkEvery, aucune requête n’est émise', async () => {
  const dom = setupDom();
  let calls = 0;
  try {
    const view = await mount(
      h(
        VersionProvider,
        { info: BUILD, remember: false, fetch: async () => (calls += 1) },
        h(AppVersion, {})
      )
    );
    assert.equal(
      calls,
      0,
      'un sondage qu’on n’a pas demandé est un sondage de trop'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le sondage annonce la version publiée, et l’annonce est une région status', async () => {
  const dom = setupDom();
  try {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ version: '3.14.0' }), { status: 200 });
    const view = await mount(
      h(
        VersionProvider,
        { info: BUILD, remember: false, checkEvery: '1h', fetch: fetchImpl },
        h(AppVersion, {})
      )
    );
    // Le premier sondage part immédiatement : attendre une heure pour savoir
    // qu'une version est en ligne annulerait l'intérêt du canal.
    await view.act(async () => {});
    const badge = view.container.querySelector(
      '[data-dwc="app-version-available"]'
    );
    assert.equal(badge.textContent, 'Version 3.14.0 disponible');
    assert.equal(
      badge.getAttribute('role'),
      'status',
      'apparue après coup, elle doit être annoncée'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('une version publiée plus ANCIENNE n’annonce rien', async () => {
  const dom = setupDom();
  try {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ version: '3.12.0' }), { status: 200 });
    const view = await mount(
      h(
        VersionProvider,
        { info: BUILD, remember: false, checkEvery: '1h', fetch: fetchImpl },
        h(AppVersion, {})
      )
    );
    await view.act(async () => {});
    assert.equal(text(view.container, 'app-version-available'), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useAppVersion hors fournisseur ne mémorise rien', async () => {
  const dom = setupDom();
  globalThis[BUILD_INFO_GLOBAL] = BUILD;
  try {
    let seen = null;
    const Probe = () => {
      seen = useAppVersion();
      return null;
    };
    const view = await mount(h(Probe, {}));
    assert.equal(seen.version, '3.13.0');
    assert.equal(seen.justUpdated, false);
    assert.equal(
      localStorage.getItem(VERSION_STORAGE_KEY),
      null,
      'écrire hors fournisseur volerait la détection au fournisseur monté ailleurs'
    );
    await view.unmount();
  } finally {
    delete globalThis[BUILD_INFO_GLOBAL];
    dom.restore();
  }
});

test('AppFooter sans `version` rend exactement ce qu’il rendait', async () => {
  const dom = setupDom();
  globalThis[BUILD_INFO_GLOBAL] = BUILD;
  try {
    const props = {
      repoUrl: 'https://github.com/mister-guiiug/mister-family-map',
    };
    let view = await mount(h(AppFooter, props));
    assert.equal(
      view.container.querySelector('[data-dwc="app-version"]'),
      null
    );
    await view.unmount();

    view = await mount(h(AppFooter, { ...props, version: true }));
    assert.equal(text(view.container, 'app-version-value'), '3.13.0');
    // Le `repoUrl` du pied de page sert aussi de lien vers la release.
    assert.match(
      view.container
        .querySelector('a[data-dwc="app-version-value"]')
        .getAttribute('href'),
      /releases\/tag\/v3\.13\.0$/
    );
    await view.unmount();
  } finally {
    delete globalThis[BUILD_INFO_GLOBAL];
    dom.restore();
  }
});

test('les libellés suivent la locale du LabelsProvider', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(
          VersionProvider,
          { info: BUILD, remember: false },
          h(AppVersion, { details: true, locale: 'en-GB' })
        )
      )
    );
    // « Version » s'écrit pareil dans les deux langues : c'est la date de
    // compilation qui prouve que la locale a bien traversé le fournisseur.
    assert.match(text(view.container, 'app-version-details'), /^Built on /);
    await view.unmount();
  } finally {
    dom.restore();
  }
});
