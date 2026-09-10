/**
 * `usePullToRefresh` (`react/use-pull-to-refresh.js`) — sous-chemin sans test.
 *
 * Le geste est ce qu'il y a de plus difficile à relire : il n'existe qu'en
 * séquence. Quatre promesses s'y jouent, chacune payée dans une app avant
 * d'être promue ici — le seuil n'est atteint qu'avec l'amorti appliqué, un
 * tirage vers le HAUT ne déclenche rien, `overscroll-behavior` est neutralisé
 * pendant l'activation puis RESTITUÉ (sinon l'app garde le rechargement natif
 * du navigateur en plein match), et un tirage qui n'atteint pas le seuil ne
 * rafraîchit pas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom, renderHook } from './helpers/dom.mjs';
import { usePullToRefresh } from '../react/use-pull-to-refresh.js';

/** Fabrique un évènement tactile à une seule touche. */
function toucher(dom, type, clientY) {
  const evenement = new dom.window.Event(type);
  Object.defineProperty(evenement, 'touches', {
    value: clientY === undefined ? [] : [{ clientY }],
  });
  return evenement;
}

const envoyer = (dom, type, y) =>
  dom.window.dispatchEvent(toucher(dom, type, y));

test('un tirage franc rafraîchit, et la progression suit l’amorti', async () => {
  const dom = setupDom();
  try {
    let rafraichissements = 0;
    const vue = await renderHook(() =>
      usePullToRefresh({
        onRefresh: () => {
          rafraichissements += 1;
        },
        threshold: 100,
      })
    );

    await vue.act(() => envoyer(dom, 'touchstart', 0));
    // 100 px de doigt ne font que 55 px de tirage : l'amorti est la sensation
    // élastique, et il déplace le seuil réel.
    await vue.act(() => envoyer(dom, 'touchmove', 100));
    assert.equal(vue.result.current.pulling, true);
    assert.equal(vue.result.current.progress, 0.55);

    await vue.act(() => envoyer(dom, 'touchend'));
    assert.equal(rafraichissements, 0, '55 % du seuil ne rafraîchit pas');
    assert.equal(vue.result.current.pulling, false);
    assert.equal(vue.result.current.progress, 0);

    // Cette fois, on va au bout.
    await vue.act(() => envoyer(dom, 'touchstart', 0));
    await vue.act(() => envoyer(dom, 'touchmove', 200));
    assert.equal(vue.result.current.progress, 1);
    await vue.act(() => envoyer(dom, 'touchend'));
    assert.equal(rafraichissements, 1);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('tirer vers le haut ne déclenche rien', async () => {
  const dom = setupDom();
  try {
    let rafraichissements = 0;
    const vue = await renderHook(() =>
      usePullToRefresh({
        onRefresh: () => {
          rafraichissements += 1;
        },
        threshold: 10,
      })
    );
    await vue.act(() => envoyer(dom, 'touchstart', 300));
    await vue.act(() => envoyer(dom, 'touchmove', 100));
    assert.equal(vue.result.current.pulling, false);
    await vue.act(() => envoyer(dom, 'touchend'));
    assert.equal(rafraichissements, 0);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('un tirage annulé (touchcancel) ne rafraîchit pas, et remet tout à zéro', async () => {
  const dom = setupDom();
  try {
    let rafraichissements = 0;
    const vue = await renderHook(() =>
      usePullToRefresh({
        onRefresh: () => {
          rafraichissements += 1;
        },
        threshold: 10,
      })
    );
    await vue.act(() => envoyer(dom, 'touchstart', 0));
    await vue.act(() => envoyer(dom, 'touchmove', 50));
    await vue.act(() => envoyer(dom, 'touchcancel'));
    // LE SEUIL ÉTAIT ATTEINT, ET POURTANT RIEN NE PART. `touchcancel` dit que
    // le système a repris la main — un appel, une alerte, un geste de bord :
    // le geste n'a jamais été relâché. Les deux évènements partageaient le
    // même gestionnaire jusqu'au 10/09/2026, et un tirage interrompu lançait
    // donc une requête réseau que personne n'avait demandée.
    assert.equal(rafraichissements, 0);
    assert.equal(vue.result.current.pulling, false);
    assert.equal(vue.result.current.progress, 0);

    // Et l'état est bien propre : le geste suivant repart de zéro.
    await vue.act(() => envoyer(dom, 'touchstart', 0));
    await vue.act(() => envoyer(dom, 'touchmove', 50));
    await vue.act(() => envoyer(dom, 'touchend'));
    assert.equal(rafraichissements, 1);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('overscroll-behavior est neutralisé pendant, et RESTITUÉ après', async () => {
  const dom = setupDom();
  try {
    const html = dom.window.document.documentElement;
    const body = dom.window.document.body;
    html.style.overscrollBehaviorY = 'contain';
    body.style.overscrollBehaviorY = 'contain';

    const vue = await renderHook(() =>
      usePullToRefresh({ onRefresh: () => {} })
    );
    assert.equal(html.style.overscrollBehaviorY, 'auto');
    assert.equal(body.style.overscrollBehaviorY, 'auto');

    await vue.unmount();
    // Le `contain` de l'app est RENDU : sans cela, quitter l'écran laisserait
    // le rechargement natif armé sur tout le reste de l'application.
    assert.equal(html.style.overscrollBehaviorY, 'contain');
    assert.equal(body.style.overscrollBehaviorY, 'contain');
  } finally {
    dom.restore();
  }
});

test('`enabled: false` ne pose aucun écouteur et ne touche à rien', async () => {
  const dom = setupDom();
  try {
    const html = dom.window.document.documentElement;
    html.style.overscrollBehaviorY = 'contain';
    let rafraichissements = 0;
    const vue = await renderHook(() =>
      usePullToRefresh({
        onRefresh: () => {
          rafraichissements += 1;
        },
        enabled: false,
        threshold: 10,
      })
    );
    await vue.act(() => envoyer(dom, 'touchstart', 0));
    await vue.act(() => envoyer(dom, 'touchmove', 200));
    await vue.act(() => envoyer(dom, 'touchend'));
    assert.equal(rafraichissements, 0);
    assert.equal(html.style.overscrollBehaviorY, 'contain');
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('le geste ne part pas si la page est déjà défilée', async () => {
  const dom = setupDom();
  try {
    // Tirer au milieu d'une liste défilée est un défilement, pas un
    // rafraîchissement : seul le haut de page arme le geste.
    Object.defineProperty(dom.window, 'scrollY', {
      value: 120,
      configurable: true,
    });
    let rafraichissements = 0;
    const vue = await renderHook(() =>
      usePullToRefresh({
        onRefresh: () => {
          rafraichissements += 1;
        },
        threshold: 10,
      })
    );
    await vue.act(() => envoyer(dom, 'touchstart', 0));
    await vue.act(() => envoyer(dom, 'touchmove', 200));
    assert.equal(vue.result.current.pulling, false);
    await vue.act(() => envoyer(dom, 'touchend'));
    assert.equal(rafraichissements, 0);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});
