/**
 * Synthèse vocale (`speech.js`) — le sous-chemin `./speech` n'avait aucun
 * test, et il portait deux défauts de Chrome qui coupent la FIN de la phrase.
 *
 * CE QUI EST VÉRIFIÉ ICI, ce sont les trois promesses qui ne se voient qu'à
 * l'exécution : on n'énonce jamais dans le même tour de boucle qu'un
 * `cancel()` ; l'utterance reçoit de quoi relâcher la référence qui le
 * protège du ramasse-miettes ; et une voix n'est choisie que si elle parle
 * vraiment la langue demandée.
 *
 * CHAQUE TEST PREND UN MODULE NEUF. `speech.js` garde un état de module — le
 * cache des voix, l'écoute `voiceschanged` branchée une seule fois, l'énoncé
 * en cours. Sans instance fraîche, un test hériterait du cache du précédent
 * et vérifierait ce cache au lieu du comportement.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

let compteur = 0;
/** Instance fraîche de `speech.js` (état de module remis à zéro). */
function moduleNeuf() {
  compteur += 1;
  return import(`../speech.js?essai=${compteur}`);
}

/** Fausse synthèse : `speaking`/`pending` pilotent la branche testée. */
function fausseSynthese({ speaking = false, pending = false, voix = [] } = {}) {
  const journal = { cancels: 0, enonces: [], ecoutes: [] };
  const synth = {
    speaking,
    pending,
    cancel() {
      journal.cancels += 1;
    },
    speak(u) {
      journal.enonces.push(u);
    },
    getVoices: () => voix,
    addEventListener(nom, gestionnaire) {
      journal.ecoutes.push(nom);
      synth.__reveille = gestionnaire;
    },
  };
  return { synth, journal };
}

/** Utterance d'essai : retient ce qu'on lui pose. */
class FauxUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.voice = null;
    this.onend = null;
    this.onerror = null;
  }
}

/** Pose les globales Web Speech le temps d'un test. */
function poseGlobales(synth) {
  const avant = {
    synth: globalThis.speechSynthesis,
    utter: globalThis.SpeechSynthesisUtterance,
  };
  globalThis.speechSynthesis = synth;
  globalThis.SpeechSynthesisUtterance = FauxUtterance;
  return () => {
    globalThis.speechSynthesis = avant.synth;
    globalThis.SpeechSynthesisUtterance = avant.utter;
  };
}

const patiente = ms => new Promise(r => setTimeout(r, ms));

test('localeToBcp47 traduit, laisse passer une étiquette complète, et retombe', async () => {
  const { localeToBcp47 } = await moduleNeuf();
  assert.equal(localeToBcp47('fr'), 'fr-FR');
  assert.equal(localeToBcp47('pt'), 'pt-PT');
  assert.equal(localeToBcp47('fr-CA'), 'fr-CA');
  assert.equal(localeToBcp47('xx'), 'en-US');
});

test('speak se tait sans API, et sur un texte vide', async () => {
  const { speak } = await moduleNeuf();
  assert.equal(speak('coucou', 'fr'), false);

  const { synth, journal } = fausseSynthese();
  const rends = poseGlobales(synth);
  try {
    assert.equal(speak('', 'fr'), false);
    assert.equal(journal.enonces.length, 0);
  } finally {
    rends();
  }
});

test('speak énonce sans attendre quand rien ne parle, et sans annuler', async () => {
  const { speak } = await moduleNeuf();
  const { synth, journal } = fausseSynthese({ speaking: false });
  const rends = poseGlobales(synth);
  try {
    assert.equal(speak('Résultat : 5.', 'fr'), true);
    // La garde évite de payer le délai de reprise pour rien.
    assert.equal(journal.cancels, 0);
    assert.equal(journal.enonces.length, 1);
    assert.equal(journal.enonces[0].text, 'Résultat : 5.');
    assert.equal(journal.enonces[0].lang, 'fr-FR');
  } finally {
    rends();
  }
});

/**
 * LE PREMIER DÉFAUT CORRIGÉ. `cancel()` est asynchrone : enchaîner `speak()`
 * dans le même tour de boucle fait avaler le début — parfois la totalité — de
 * la nouvelle phrase, et c'est nettement pire sur Android.
 */
test('speak n’énonce PAS dans le même tour de boucle qu’un cancel', async () => {
  const { speak } = await moduleNeuf();
  const { synth, journal } = fausseSynthese({ speaking: true });
  const rends = poseGlobales(synth);
  try {
    assert.equal(speak('Résultat : 5.', 'fr'), true);
    assert.equal(journal.cancels, 1);
    assert.equal(
      journal.enonces.length,
      0,
      'rien ne doit partir tout de suite'
    );

    await patiente(250);
    assert.equal(journal.enonces.length, 1);
    assert.equal(journal.enonces[0].text, 'Résultat : 5.');
  } finally {
    rends();
  }
});

test('une annonce plus récente remplace celle qui attendait son tour', async () => {
  const { speak } = await moduleNeuf();
  const { synth, journal } = fausseSynthese({ speaking: true });
  const rends = poseGlobales(synth);
  try {
    speak('Résultat : 1.', 'fr');
    speak('Résultat : 2.', 'fr');
    await patiente(250);
    assert.equal(journal.enonces.length, 1);
    assert.equal(journal.enonces[0].text, 'Résultat : 2.');
  } finally {
    rends();
  }
});

/**
 * LE SECOND DÉFAUT CORRIGÉ. Un utterance que plus rien ne référence peut être
 * ramassé par le GC pendant qu'il parle, et le son se coupe. Le module en
 * garde une référence jusqu'à `onend`/`onerror` : leur présence est la trace
 * OBSERVABLE de cette tenue. Le ramassage lui-même ne se teste pas.
 */
test('speak branche de quoi relâcher sa référence à la fin', async () => {
  const { speak } = await moduleNeuf();
  const { synth, journal } = fausseSynthese();
  const rends = poseGlobales(synth);
  try {
    speak('Résultat : 5.', 'fr');
    const u = journal.enonces[0];
    assert.equal(typeof u.onend, 'function');
    assert.equal(typeof u.onerror, 'function');
    assert.doesNotThrow(() => u.onend());
  } finally {
    rends();
  }
});

test('pickVoice prend l’étiquette exacte, sinon la même langue', async () => {
  const { pickVoice } = await moduleNeuf();
  const voix = [
    { name: 'Anglaise', lang: 'en-US' },
    { name: 'Québécoise', lang: 'fr-CA' },
    { name: 'Française', lang: 'fr-FR' },
  ];
  const { synth } = fausseSynthese({ voix });

  assert.equal(pickVoice('fr-FR', synth).name, 'Française');
  assert.equal(pickVoice('fr-BE', synth).name, 'Québécoise', 'même langue');
  assert.equal(pickVoice('EN-us', synth).name, 'Anglaise', 'casse ignorée');
});

/**
 * LA VOIX DU SYSTÈME GAGNE DANS SA LANGUE. `voice.default` est le choix
 * EXPLICITE de l'utilisateur ; l'ordre de `getVoices()` n'est spécifié nulle
 * part. Prendre la première correspondance imposait une voix là où l'app
 * laissait auparavant le moteur prendre celle du système — invisible sur une
 * machine où la voix par défaut est AUSSI la première, ce qui était le cas de
 * celle où cette fonction a été écrite.
 */
test('pickVoice préfère la voix par défaut du système, même en second', async () => {
  const { pickVoice } = await moduleNeuf();
  const voix = [
    { name: 'Première', lang: 'fr-FR' },
    { name: 'Choisie par l’utilisateur', lang: 'fr-FR', default: true },
  ];
  const { synth } = fausseSynthese({ voix });
  assert.equal(pickVoice('fr-FR', synth).name, 'Choisie par l’utilisateur');
});

/**
 * Et la région ne départage qu'APRÈS : mieux vaut la voix qu'on a choisie
 * avec un accent d'ailleurs qu'une voix qu'on n'a pas choisie.
 */
test('pickVoice préfère le défaut d’une autre région à une exacte non choisie', async () => {
  const { pickVoice } = await moduleNeuf();
  const voix = [
    { name: 'Exacte', lang: 'fr-FR' },
    { name: 'Québécoise par défaut', lang: 'fr-CA', default: true },
  ];
  const { synth } = fausseSynthese({ voix });
  assert.equal(pickVoice('fr-FR', synth).name, 'Québécoise par défaut');
});

/** Un défaut d'une AUTRE langue ne compte pas : la langue reste la contrainte. */
test('pickVoice ignore une voix par défaut qui ne parle pas la langue', async () => {
  const { pickVoice } = await moduleNeuf();
  const voix = [
    { name: 'Anglaise par défaut', lang: 'en-US', default: true },
    { name: 'Française', lang: 'fr-FR' },
  ];
  const { synth } = fausseSynthese({ voix });
  assert.equal(pickVoice('fr-FR', synth).name, 'Française');
});

/**
 * LE CHOIX QUI SÉPARE CE MODULE DE SA SOURCE. `mister-molkky`, d'où vient
 * l'idée de choisir une voix, retombait sur `voix[0]` — la première de la
 * liste, quelle que soit sa langue. C'est précisément ce qui fait lire du
 * français par une voix anglaise. Ici, pas de voix dans la langue demandée
 * veut dire AUCUNE voix : le moteur décidera depuis `utterance.lang`.
 */
test('pickVoice ne retombe JAMAIS sur une voix d’une autre langue', async () => {
  const { pickVoice, speak } = await moduleNeuf();
  const voix = [
    { name: 'Anglaise', lang: 'en-US' },
    { name: 'Allemande', lang: 'de-DE' },
  ];
  const { synth, journal } = fausseSynthese({ voix });
  assert.equal(pickVoice('fr-FR', synth), null);

  const rends = poseGlobales(synth);
  try {
    speak('Résultat : 5.', 'fr');
    const u = journal.enonces[0];
    assert.equal(u.voice, null, 'aucune voix forcée');
    assert.equal(u.lang, 'fr-FR', 'la langue reste demandée au moteur');
  } finally {
    rends();
  }
});

/**
 * `getVoices()` rend un tableau VIDE au premier appel sur la plupart des
 * navigateurs — mesuré sur miss-dice : 0 voix juste après le chargement, 3
 * après `voiceschanged`. Sans cette écoute, la première annonce d'une session
 * partirait sans voix, et le cache vide resterait.
 */
test('pickVoice rattrape les voix qui arrivent en retard', async () => {
  const { pickVoice } = await moduleNeuf();
  let voix = [];
  const { synth, journal } = fausseSynthese();
  synth.getVoices = () => voix;

  assert.equal(pickVoice('fr-FR', synth), null, 'liste encore vide');
  assert.ok(journal.ecoutes.includes('voiceschanged'), 'écoute branchée');

  voix = [{ name: 'Française', lang: 'fr-FR' }];
  synth.__reveille();
  assert.equal(pickVoice('fr-FR', synth).name, 'Française');
});
