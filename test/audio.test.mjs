/**
 * Sons synthétisés (`audio.js`) — le sous-chemin `./audio` n'avait aucun test.
 *
 * TROIS PROMESSES, dont deux ne se voient qu'à l'exécution : le module est
 * importable là où Web Audio n'existe pas (SSR, tests, navigateur restreint) et
 * s'y tait ; le contexte est créé une seule fois pour la session ; et sur iOS,
 * où il naît `suspended`, `resume()` est retenté avant chaque planification —
 * sans quoi le premier son après un geste utilisateur reste muet.
 *
 * L'ORDRE DES TESTS COMPTE. Le contexte est mémorisé dans une variable de
 * module : le cas « pas de Web Audio » doit passer AVANT qu'un contexte n'ait
 * été créé, sinon il testerait un cache et non un repli.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { playSound, playTone, TONE_PRESETS } from '../audio.js';

/** Un `AudioContext` d'essai qui note tout ce qu'on lui demande. */
function fakeAudioContext(journal, { state = 'running' } = {}) {
  return class FakeAudioContext {
    constructor() {
      this.state = state;
      this.currentTime = 10;
      this.destination = { nom: 'destination' };
      journal.contextes.push(this);
    }
    resume() {
      journal.resumes += 1;
      this.state = 'running';
      return Promise.resolve();
    }
    createOscillator() {
      const osc = {
        type: null,
        frequency: { setValueAtTime: (v, t) => journal.freqs.push([v, t]) },
        connect: cible => cible,
        start: t => journal.starts.push(t),
        stop: t => journal.stops.push(t),
      };
      journal.oscillateurs.push(osc);
      return osc;
    }
    createGain() {
      const gain = {
        gain: {
          setValueAtTime: (v, t) => journal.gains.push(['set', v, t]),
          linearRampToValueAtTime: (v, t) => journal.gains.push(['lin', v, t]),
          exponentialRampToValueAtTime: (v, t) =>
            journal.gains.push(['exp', v, t]),
        },
        connect: cible => cible,
      };
      return gain;
    }
  };
}

const nouveauJournal = () => ({
  contextes: [],
  oscillateurs: [],
  freqs: [],
  gains: [],
  starts: [],
  stops: [],
  resumes: 0,
});

/**
 * UN SEUL journal pour les tests qui partagent le contexte mémorisé.
 *
 * Le contexte survit d'un test à l'autre — c'est précisément ce que le
 * troisième test vérifie. Il porte donc le journal qu'il avait à sa création :
 * en fabriquer un neuf par test ferait écrire les notes dans l'ancien, et le
 * test échouerait pour une raison qui n'est pas celle qu'il mesure.
 */
const journalPartage = nouveauJournal();
const reinitialiser = () => {
  for (const cle of [
    'contextes',
    'oscillateurs',
    'freqs',
    'gains',
    'starts',
    'stops',
  ])
    journalPartage[cle].length = 0;
  journalPartage.resumes = 0;
};

test('sans Web Audio, jouer un son ne lève pas et ne fait rien', () => {
  // `window` n'existe pas : c'est le cas SSR, et celui de tout test qui
  // importe un module qui sonne.
  assert.equal(typeof globalThis.window, 'undefined');
  assert.doesNotThrow(() => playSound('success'));
  assert.doesNotThrow(() => playTone({ freq: 440, duration: 0.1 }));
});

test('un preset joue une note par entrée, décalée par `at`', () => {
  const journal = journalPartage;
  reinitialiser();
  globalThis.window = { AudioContext: fakeAudioContext(journal) };
  try {
    playSound('confirm');
    assert.equal(journal.oscillateurs.length, TONE_PRESETS.confirm.length);
    // `currentTime` vaut 10 ; la seconde note de `confirm` part à +0,06.
    assert.deepEqual(journal.freqs, [
      [520, 10],
      [780, 10.06],
    ]);
    // L'oscillateur s'arrête après la durée, plus la queue de l'enveloppe.
    assert.deepEqual(journal.stops, [10 + 0.1 + 0.05, 10.06 + 0.12 + 0.05]);
    assert.deepEqual(
      journal.oscillateurs.map(o => o.type),
      ['square', 'sine']
    );
  } finally {
    delete globalThis.window;
  }
});

test('le contexte est créé une seule fois pour la session', () => {
  const journal = journalPartage;
  reinitialiser();
  globalThis.window = { AudioContext: fakeAudioContext(journal) };
  try {
    playSound('tap');
    playSound('tap');
    // Aucun nouveau contexte : celui du test précédent sert encore. Créer un
    // `AudioContext` par son épuise le quota des navigateurs (six sur Safari).
    assert.equal(journal.contextes.length, 0);
    assert.equal(journal.oscillateurs.length, 2);
  } finally {
    delete globalThis.window;
  }
});

test('un nom de preset inconnu, ou une valeur qui n’est pas une séquence, se tait', () => {
  const journal = journalPartage;
  reinitialiser();
  globalThis.window = { AudioContext: fakeAudioContext(journal) };
  try {
    playSound('inexistant');
    playSound(null);
    playSound(42);
    assert.equal(journal.oscillateurs.length, 0);
  } finally {
    delete globalThis.window;
  }
});

test('les presets couvrent les mêmes évènements que les vibrations', async () => {
  // `useFeedback` promet qu'un évènement puisse sonner ET vibrer sous le même
  // nom : si les deux tables divergent, la promesse est fausse en silence.
  const { HAPTIC_PATTERNS } = await import('../haptics.js');
  for (const nom of ['tap', 'success', 'warning', 'error']) {
    assert.ok(nom in TONE_PRESETS, `${nom} manque à TONE_PRESETS`);
    assert.ok(nom in HAPTIC_PATTERNS, `${nom} manque à HAPTIC_PATTERNS`);
  }
});

test('un contexte suspendu (iOS) est réveillé avant chaque planification', async () => {
  // Le module a déjà mémorisé un contexte : on le rejoue dans un registre neuf
  // en important le module dans un espace de modules séparé.
  const journal = nouveauJournal();
  globalThis.window = {
    AudioContext: fakeAudioContext(journal, { state: 'suspended' }),
  };
  try {
    const frais = await import(`../audio.js?iso=${Date.now()}`);
    frais.playSound('tap');
    assert.equal(journal.contextes.length, 1);
    assert.equal(journal.resumes, 1, 'resume() doit être tenté');
    frais.playSound('tap');
    // Repassé en `running` par le premier réveil : on ne le rappelle pas.
    assert.equal(journal.resumes, 1);
  } finally {
    delete globalThis.window;
  }
});
