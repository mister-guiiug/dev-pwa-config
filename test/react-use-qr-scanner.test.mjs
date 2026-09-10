/**
 * `useQrScanner` (`react/use-qr-scanner.js`) — sous-chemin sans test.
 *
 * Le module documente deux pièges payés dans `mister-molkky`, et aucun des deux
 * ne se relit : la `<video>` n'existe pas encore au clic (le scanner se câblait
 * sur `null`, en silence), et la caméra doit s'éteindre par TOUS les chemins —
 * démontage, annulation, code lu. Le décodeur est injecté par `loader`, ce qui
 * rend la peer optionnelle testable sans l'installer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { useQrScanner } from '../react/use-qr-scanner.js';

/** Un décodeur d'essai : note ce qu'on lui demande, rejoue un code à la demande. */
function faireDecodeur(journal, { echecDemarrage = null } = {}) {
  return class FauxQrScanner {
    constructor(video, onResult, options) {
      this.video = video;
      this.onResult = onResult;
      this.options = options;
      journal.instances.push(this);
    }
    async start() {
      if (echecDemarrage) throw echecDemarrage;
      journal.starts += 1;
    }
    stop() {
      journal.stops += 1;
    }
    destroy() {
      journal.destroys += 1;
    }
  };
}

const nouveauJournal = () => ({
  instances: [],
  starts: 0,
  stops: 0,
  destroys: 0,
});

/** Monte un écran qui rend sa `<video>` seulement pendant le scan. */
function Ecran({ options, sur }) {
  const scanner = useQrScanner(options);
  sur(scanner);
  return h(
    'div',
    null,
    h('button', { type: 'button', id: 'go', onClick: scanner.start }),
    h('button', { type: 'button', id: 'stop', onClick: scanner.stop }),
    scanner.scanning ? h('video', { ref: scanner.videoRef, id: 'flux' }) : null
  );
}

test('sans <video> reliée, l’échec est DIT au lieu d’être silencieux', async () => {
  const dom = setupDom();
  const journal = nouveauJournal();
  try {
    let dernier = null;
    // L'écran ne rend jamais de vidéo : c'est le bug d'origine de molkky.
    function SansVideo({ sur }) {
      const scanner = useQrScanner({
        loader: async () => faireDecodeur(journal),
      });
      sur(scanner);
      return h('button', { type: 'button', id: 'go', onClick: scanner.start });
    }
    const vue = await mount(h(SansVideo, { sur: s => (dernier = s) }));
    await vue.act(() => vue.container.querySelector('#go').click());

    assert.match(dernier.error?.message ?? '', /aucune <video>/);
    assert.equal(dernier.scanning, false, 'on ne reste pas « en scan »');
    assert.equal(journal.instances.length, 0);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('la caméra démarre une fois la vidéo commitée, et s’éteint au démontage', async () => {
  const dom = setupDom();
  const journal = nouveauJournal();
  try {
    let dernier = null;
    const vue = await mount(
      h(Ecran, {
        sur: s => (dernier = s),
        options: { loader: async () => faireDecodeur(journal) },
      })
    );
    await vue.act(() => vue.container.querySelector('#go').click());

    assert.equal(journal.instances.length, 1);
    assert.equal(journal.starts, 1);
    // La vidéo passée au décodeur est bien celle du DOM commité.
    assert.equal(
      journal.instances[0].video,
      vue.container.querySelector('#flux')
    );
    assert.equal(dernier.scanning, true);
    // La caméra arrière par défaut : personne ne scanne un QR avec la frontale.
    assert.equal(journal.instances[0].options.preferredCamera, 'environment');

    await vue.unmount();
    assert.equal(journal.stops >= 1, true, 'stop() au démontage');
    assert.equal(journal.destroys, 1, 'destroy() au démontage');
  } finally {
    dom.restore();
  }
});

test('un code lu arrête le flux SYNCHRONEMENT et ne se livre qu’une fois', async () => {
  const dom = setupDom();
  const journal = nouveauJournal();
  try {
    const lus = [];
    let dernier = null;
    const vue = await mount(
      h(Ecran, {
        sur: s => (dernier = s),
        options: {
          onScan: code => lus.push(code),
          loader: async () => faireDecodeur(journal),
        },
      })
    );
    await vue.act(() => vue.container.querySelector('#go').click());
    const decodeur = journal.instances[0];

    // Le décodeur tourne en continu : il rend le même code plusieurs fois
    // avant que React n'ait commité quoi que ce soit.
    await vue.act(() => {
      decodeur.onResult({ data: 'https://exemple.test/partie/42' });
      decodeur.onResult({ data: 'https://exemple.test/partie/42' });
    });

    assert.deepEqual(lus, ['https://exemple.test/partie/42']);
    assert.equal(dernier.scanning, false);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('un résultat vide, ou l’ancienne API en chaîne nue, sont tous deux gérés', async () => {
  const dom = setupDom();
  const journal = nouveauJournal();
  try {
    const lus = [];
    const vue = await mount(
      h(Ecran, {
        sur: () => {},
        options: {
          onScan: code => lus.push(code),
          stopOnScan: false,
          loader: async () => faireDecodeur(journal),
        },
      })
    );
    await vue.act(() => vue.container.querySelector('#go').click());
    const decodeur = journal.instances[0];
    await vue.act(() => {
      decodeur.onResult({ data: '' });
      decodeur.onResult(null);
      decodeur.onResult('chaîne-nue');
    });
    assert.deepEqual(lus, ['chaîne-nue']);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('peer absente : l’erreur nomme le paquet et la commande', async () => {
  const dom = setupDom();
  try {
    let dernier = null;
    const erreurs = [];
    const vue = await mount(
      h(Ecran, {
        sur: s => (dernier = s),
        options: {
          onError: e => erreurs.push(e),
          loader: async () => {
            throw new Error("Cannot find package 'qr-scanner'");
          },
        },
      })
    );
    await vue.act(() => vue.container.querySelector('#go').click());

    assert.match(dernier.error?.message ?? '', /npm install qr-scanner/);
    assert.equal(erreurs.length, 1, 'onError reçoit la même erreur');
    assert.equal(dernier.scanning, false);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('caméra refusée : l’erreur du navigateur est rendue telle quelle', async () => {
  const dom = setupDom();
  const journal = nouveauJournal();
  const refus = new Error('NotAllowedError');
  try {
    let dernier = null;
    const vue = await mount(
      h(Ecran, {
        sur: s => (dernier = s),
        options: {
          loader: async () => faireDecodeur(journal, { echecDemarrage: refus }),
        },
      })
    );
    await vue.act(() => vue.container.querySelector('#go').click());
    assert.equal(dernier.error, refus);
    assert.equal(dernier.scanning, false);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});
