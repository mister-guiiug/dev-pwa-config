// Une traduction ne survit pas en silence au français qu'elle traduit.
//
// Séparé de `showroom-i18n.test.mjs` pour une raison de dépendance : le relevé
// du français lit la page avec un vrai analyseur HTML (jsdom, devDependency).
// Le job de publication du showroom n'installe rien et rejoue
// `showroom-i18n.test.mjs` avant de publier ; ce test-ci tourne avec
// `npm test`, donc dans la CI de chaque PR, là où une traduction périmée doit
// être refusée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  empreinteTexte,
  empreintesAJour,
  lireEmpreintes,
  replisDuCode,
  sourcesFrancaises,
} from '../scripts/showroom-i18n.mjs';

await import('../showroom/i18n.js');
const DICTS = globalThis.SHOWROOM_I18N;

test('aucune traduction ne traduit un français qui a changé depuis', () => {
  // `showroom-i18n.test.mjs` vérifie qu'une clé EXISTE dans chaque langue,
  // jamais qu'elle dit encore la même chose. On garde donc l'empreinte du
  // français que traduisait chaque clé anglaise quand elle a été écrite.
  const enregistrees = lireEmpreintes();
  const { empreintes, aRelire } = empreintesAJour(DICTS, enregistrees);
  assert.deepEqual(
    aRelire,
    [],
    'le français de ces clés a changé depuis leur traduction : revoir l’anglais, puis `npm run sync -- --traductions-revues`'
  );
  assert.deepEqual(
    empreintes,
    enregistrees,
    'empreintes de traduction absentes ou en trop : `npm run sync`'
  );
  assert.ok(
    Object.keys(enregistrees.en ?? {}).length > 400,
    'trop peu de clés empreintées : relevé du français cassé ?'
  );
});

test('modifier le français signale la traduction, sans la réécrire', () => {
  const sources = sourcesFrancaises();
  const cle = 'intro.title';
  assert.ok(sources.has(cle), 'le titre de la page a disparu des sources');
  // Une empreinte enregistrée qui ne correspond plus : le français a bougé.
  const enregistrees = { en: { [cle]: 'periment00' } };
  const { empreintes, aRelire } = empreintesAJour(
    { en: { [cle]: DICTS.en[cle] } },
    enregistrees
  );
  assert.deepEqual(aRelire, [`en : ${cle}`]);
  assert.equal(empreintes.en[cle], 'periment00', 'sync ne doit rien réécrire');
  // Après relecture, l'empreinte suit le français courant.
  const revue = empreintesAJour(
    { en: { [cle]: DICTS.en[cle] } },
    enregistrees,
    {
      revues: true,
    }
  );
  assert.equal(revue.empreintes.en[cle], empreinteTexte(sources.get(cle)));
});

test('les replis du code sont lus comme des chaînes, pas comme du texte', () => {
  const lus = replisDuCode(
    [
      "t('a', 'Un repli');",
      "t('b', 'Concaténé ' + x);",
      "// t('c', 'Dans un commentaire');",
      "t('d', 'Premier'); t('d', 'Second');",
    ].join('\n')
  );
  assert.deepEqual(
    [...lus],
    [
      ['a', 'Un repli'],
      ['d', 'Premier'],
    ]
  );
});
