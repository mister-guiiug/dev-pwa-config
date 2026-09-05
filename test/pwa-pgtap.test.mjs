// `pwa-pgtap` — la réécriture d'un fichier pgTAP pour `supabase db query`, et
// la lecture de ce qui en revient. Le CLI Supabase ne se teste pas ; ce qu'on
// lui envoie et ce qu'on fait de sa réponse, si.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTap, rewrite, run, tally } from '../scripts/pwa-pgtap.mjs';

const SUITE = `begin;
select plan(2);
select is((select 1), 1, 'un');
select throws_ok('select 1/0', 'division by zero');
select * from finish();
rollback;
`;

test('rewrite : la table de collecte naît après begin, ouverte aux rôles de l’API', () => {
  const out = rewrite(SUITE);
  assert.match(
    out,
    /^begin;\ncreate temp table tap \(ord serial, line text\);/m
  );
  // Les tests changent de rôle (`set local role anon`) : sans ces deux grants,
  // « permission denied for table tap » — payé un aller-retour dans miss-koh.
  assert.match(out, /grant select, insert on tap to anon, authenticated;/);
  assert.match(
    out,
    /grant usage on sequence tap_ord_seq to anon, authenticated;/
  );
});

test('rewrite : chaque assertion dépose son verdict dans la colonne NOMMÉE', () => {
  const out = rewrite(SUITE);
  // `(line)` explicite : sans lui, l'insertion tombe dans `ord`, la séquence.
  assert.match(out, /^insert into tap \(line\) select plan\(2\);/m);
  assert.match(
    out,
    /^insert into tap \(line\) select is\(\(select 1\), 1, 'un'\);/m
  );
  assert.match(out, /^insert into tap \(line\) select throws_ok\(/m);
  assert.doesNotMatch(out, /^select is\(/m, 'aucune assertion laissée nue');
});

test('rewrite : le bloc de verdicts est renvoyé AVANT finish(), qui reste', () => {
  const out = rewrite(SUITE);
  const bloc = out.indexOf(
    "select string_agg(line, E'\\n' order by ord) as tap from tap;"
  );
  const finish = out.indexOf('select * from finish();');
  assert.ok(bloc > -1 && finish > bloc, 'le bloc précède finish()');
  assert.match(
    out,
    /rollback;\s*$/,
    'le rollback final est intact : rien ne reste'
  );
});

test('parseTap : ne lit que la colonne tap, dans le bruit du CLI', () => {
  const output = `Connecting to linked project...\nWARNING: docker absent\n[{"tap":"1..2\\nok 1 - un\\nnot ok 2 - deux"}]\n`;
  assert.deepEqual(parseTap(output), {
    lines: ['1..2', 'ok 1 - un', 'not ok 2 - deux'],
  });
});

test('parseTap : sans verdict, la raison est le message du serveur, sinon la fin de la sortie', () => {
  const erreur = parseTap(
    '{"message":"permission denied for table tap","code":"42501"}'
  );
  assert.equal(erreur.lines, null);
  assert.equal(erreur.reason, 'permission denied for table tap');

  const muet = parseTap('ligne 1\nligne 2\nligne 3');
  assert.equal(muet.lines, null);
  assert.match(muet.reason, /ligne 3$/);
});

test('tally : vert seulement si rien n’échoue ET que le compte égale le plan', () => {
  assert.deepEqual(tally(['1..2', 'ok 1 - a', 'ok 2 - b']), {
    failed: 0,
    passed: 2,
    planned: 2,
    ok: true,
  });
  assert.equal(tally(['1..2', 'ok 1 - a', 'not ok 2 - b']).ok, false);
  // Un plan faux masque des verdicts : deux `ok` pour trois prévus n'est pas
  // un succès, c'est un test qui n'a pas parlé.
  assert.equal(tally(['1..3', 'ok 1 - a', 'ok 2 - b']).ok, false);
});

test('run : sans fichier à jouer, code 2 et un message qui nomme le dossier', async () => {
  const messages = [];
  const original = console.error;
  console.error = m => messages.push(String(m));
  try {
    assert.equal(await run(['--dir', '/nulle/part']), 2);
  } finally {
    console.error = original;
  }
  assert.match(messages.join('\n'), /supabase[\\/]tests/);
});

test('run --help ne touche à rien et rend 0', async () => {
  const logs = [];
  const original = console.log;
  console.log = m => logs.push(String(m));
  try {
    assert.equal(await run(['--help']), 0);
  } finally {
    console.log = original;
  }
  assert.match(logs.join('\n'), /pwa-pgtap/);
});
