/**
 * Le noyau des libellés et les sept dictionnaires par langue.
 *
 * CE QUE CE FICHIER GARDE, et que rien d'autre ne peut garder : le découpage
 * n'a de valeur que si les composants continuent de n'atteindre QUE le
 * français. Un seul `import { useLabels } from './labels.js'` réintroduit dans
 * un composant, et les sept langues repartent dans le bundle des vingt apps,
 * sans qu'aucun test de comportement ne s'en aperçoive.
 *
 * Mesure du 10/09/2026 : les sept dictionnaires pèsent 6,2 kB gzip, le
 * français seul 1,8 — 4,4 kB morts pour une app monolingue, derrière le
 * moindre `<ErrorBanner>`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import {
  DEFAULT_LABELS,
  DEFAULT_LOCALE,
  LabelsProvider,
  mergeLabels,
  useLabels,
} from '../react/labels-core.js';
import { LABELS, labelsFor } from '../react/labels.js';
import { LabelsProvider as ProviderComplet } from '../react/labels.js';
import fr from '../react/labels-fr.js';
import en from '../react/labels-en.js';
import es from '../react/labels-es.js';
import de from '../react/labels-de.js';
import it from '../react/labels-it.js';
import pt from '../react/labels-pt.js';
import nl from '../react/labels-nl.js';

const at = chemin => fileURLToPath(new URL(`../${chemin}`, import.meta.url));
const lire = chemin => readFileSync(at(chemin), 'utf8');

const LANGUES = { fr, en, es, de, it, pt, nl };

test('les sept modules portent exactement les sept dictionnaires de LABELS', () => {
  assert.deepEqual(Object.keys(LABELS).sort(), Object.keys(LANGUES).sort());
  for (const [code, dictionnaire] of Object.entries(LANGUES)) {
    // Même objet, pas seulement même contenu : `labels.js` ne recopie rien.
    assert.equal(LABELS[code], dictionnaire, `${code} n'est pas le module`);
  }
  assert.equal(DEFAULT_LABELS, fr);
  assert.equal(DEFAULT_LOCALE, 'fr');
});

test('aucune langue ne peut diverger d’une autre, clé par clé', () => {
  const aplatir = (objet, prefixe = '') =>
    Object.entries(objet).flatMap(([cle, valeur]) =>
      typeof valeur === 'object' && valeur
        ? aplatir(valeur, `${prefixe}${cle}.`)
        : [`${prefixe}${cle}`]
    );
  const reference = aplatir(fr).sort();
  for (const [code, dictionnaire] of Object.entries(LANGUES)) {
    assert.deepEqual(
      aplatir(dictionnaire).sort(),
      reference,
      `${code} ne porte pas les mêmes clés que le français`
    );
  }
});

test('LE GARDE DU DÉCOUPAGE : aucun composant n’atteint les sept langues', () => {
  const composants = readdirSync(at('react')).filter(
    nom =>
      nom.endsWith('.js') &&
      !nom.startsWith('labels') &&
      // `i18n` monte le provider complet, et c'est documenté : il reçoit la
      // locale de l'app et doit la résoudre pour de bon.
      nom !== 'i18n.js' &&
      // Le barrel réexporte la surface publique, `LABELS` compris ; ce qu'une
      // app n'en utilise pas, l'élagage le retire.
      nom !== 'index.js'
  );
  const fautifs = composants.filter(nom =>
    lire(`react/${nom}`).includes("from './labels.js'")
  );
  assert.deepEqual(
    fautifs,
    [],
    `ces composants tirent les sept langues dans le bundle de toutes les apps : ${fautifs.join(', ')} — importer './labels-core.js'`
  );
});

test('le noyau n’embarque que le français', () => {
  const source = lire('react/labels-core.js');
  for (const code of ['en', 'es', 'de', 'it', 'pt', 'nl']) {
    assert.ok(
      !source.includes(`./labels-${code}.js`),
      `labels-core importe ${code} : le noyau doit rester monolingue`
    );
  }
  assert.ok(source.includes('./labels-fr.js'));
});

test('hors provider, un composant lit le français', async () => {
  const dom = setupDom();
  try {
    let vu = null;
    function Sonde() {
      vu = useLabels('sheet');
      return null;
    }
    const vue = await mount(h(Sonde));
    assert.equal(vu.close, fr.sheet.close);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('le noyau sert le dictionnaire qu’on lui passe, sans rien charger', async () => {
  const dom = setupDom();
  try {
    let vu = null;
    function Sonde() {
      vu = useLabels('sheet');
      return null;
    }
    const vue = await mount(h(LabelsProvider, { dictionary: es }, h(Sonde)));
    assert.equal(vu.close, es.sheet.close);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('une locale que le noyau ne porte pas est un repli DIT, jamais silencieux', async () => {
  const dom = setupDom();
  const avertissements = [];
  const console_warn = console.warn;
  console.warn = message => avertissements.push(String(message));
  try {
    let vu = null;
    function Sonde() {
      vu = useLabels('sheet');
      return null;
    }
    const vue = await mount(h(LabelsProvider, { locale: 'es' }, h(Sonde)));
    assert.equal(vu.close, fr.sheet.close, 'le repli reste le français');
    assert.equal(avertissements.length, 1);
    assert.match(avertissements[0], /react\/labels-es|react\/labels/);
    await vue.unmount();
  } finally {
    console.warn = console_warn;
    dom.restore();
  }
});

test('le provider COMPLET résout les sept langues, synchronement', async () => {
  const dom = setupDom();
  try {
    let vu = null;
    function Sonde() {
      vu = useLabels('sheet');
      return null;
    }
    for (const [code, dictionnaire] of Object.entries(LANGUES)) {
      const vue = await mount(h(ProviderComplet, { locale: code }, h(Sonde)));
      assert.equal(vu.close, dictionnaire.sheet.close, `locale ${code}`);
      await vue.unmount();
    }
    // Étiquette régionale, et locale inconnue : le comportement d'avant.
    const regional = await mount(
      h(ProviderComplet, { locale: 'pt-BR' }, h(Sonde))
    );
    assert.equal(vu.close, pt.sheet.close);
    await regional.unmount();
    const inconnue = await mount(
      h(ProviderComplet, { locale: 'kl' }, h(Sonde))
    );
    assert.equal(vu.close, fr.sheet.close);
    await inconnue.unmount();
  } finally {
    dom.restore();
  }
});

test('les surcharges s’appliquent par-dessus la langue, des deux côtés', async () => {
  const dom = setupDom();
  try {
    let vu = null;
    function Sonde() {
      vu = useLabels('sheet');
      return null;
    }
    const vue = await mount(
      h(
        ProviderComplet,
        { locale: 'en', overrides: { sheet: { close: 'Dismiss' } } },
        h(Sonde)
      )
    );
    assert.equal(vu.close, 'Dismiss');
    await vue.unmount();

    const noyau = await mount(
      h(
        LabelsProvider,
        { dictionary: de, overrides: { sheet: { close: 'Zu' } } },
        h(Sonde)
      )
    );
    assert.equal(vu.close, 'Zu');
    await noyau.unmount();
  } finally {
    dom.restore();
  }
});

test('mergeLabels et labelsFor gardent leur contrat', () => {
  assert.equal(labelsFor('nl'), nl);
  assert.equal(labelsFor('de-CH'), de);
  assert.equal(labelsFor('kl'), null);
  assert.equal(labelsFor(''), null);
  const fusion = mergeLabels(fr, {
    sheet: { close: 'Retour' },
    neuf: { a: 1 },
  });
  assert.equal(fusion.sheet.close, 'Retour');
  assert.equal(fusion.confirm.confirm, fr.confirm.confirm);
  assert.deepEqual(fusion.neuf, { a: 1 });
});
