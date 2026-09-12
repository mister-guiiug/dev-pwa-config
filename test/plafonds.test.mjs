// La sonde des plafonds : ce qu'une plage interdit, et ce que le registre
// publie. Aucun accès réseau ici — `fetch` est injecté.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  analyse,
  DECISIONS,
  enRetard,
  format,
  plafond,
  versionsPubliees,
} from '../scripts/plafonds.mjs';

test('plafond : la borne haute de chaque forme de plage', () => {
  assert.deepEqual(plafond('^9.39.4'), { majeure: 9, mineure: Infinity });
  assert.deepEqual(plafond('~6.0.3'), { majeure: 6, mineure: 0 });
  // Une union prend la plus haute des bornes : c'est ce qu'une app peut monter.
  assert.deepEqual(plafond('^9.39.4 || ^10.0.0'), {
    majeure: 10,
    mineure: Infinity,
  });
  // `^0.5.2` s'arrête à `0.5.x` — semver traite les 0.x comme des majeures.
  assert.deepEqual(plafond('^0.5.2'), { majeure: 0, mineure: 5 });
});

test('une plage sans borne haute n’interdit rien', () => {
  for (const ouverte of ['>=8.0.0', '>=22', '*', 'x', '', 'workspace:*']) {
    assert.equal(
      plafond(ouverte).majeure,
      Infinity,
      `${ouverte} ne devrait pas plafonner`
    );
  }
  // Et donc jamais de retard, quelle que soit la version publiée.
  assert.equal(enRetard('>=8.0.0', '10.74.0'), false);
});

test('enRetard compare des majeures, pas des chaînes', () => {
  assert.equal(enRetard('^9.39.4', '10.10.0'), true);
  assert.equal(enRetard('^9.39.4 || ^10.0.0', '10.10.0'), false);
  // 9.40 > 9.39 en version, mais la plage l'accepte : ce n'est pas un plafond.
  assert.equal(enRetard('^9.39.4', '9.40.0'), false);
  // Le cas 0.x : `^0.5.2` interdit bien 0.6.
  assert.equal(enRetard('^0.5.2', '0.6.0'), true);
  assert.equal(enRetard('^0.5.2', '0.5.9'), false);
  // Une version illisible ne fabrique pas un retard.
  assert.equal(enRetard('^4.0.0', 'latest'), false);
});

test('une version non lue est « inconnue », jamais un retard', () => {
  const lignes = analyse({ a: '^1.0.0', b: '^2.0.0' }, { a: null, b: '3.0.0' });
  assert.deepEqual(
    lignes.map(l => [l.nom, l.verdict]),
    [
      ['a', 'inconnue'],
      ['b', 'retard'],
    ]
  );
});

test('versionsPubliees lit dist-tags.latest, et encaisse une panne', async () => {
  const vus = [];
  const fetchImpl = async url => {
    vus.push(url);
    if (url.endsWith('casse')) throw new Error('registre injoignable');
    if (url.endsWith('absent')) return { ok: false };
    return {
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '5.0.0' } }),
    };
  };
  const versions = await versionsPubliees(
    ['vitest', '@scope/paquet', 'casse', 'absent'],
    { fetchImpl, registre: 'https://registre.test' }
  );
  assert.deepEqual(versions, {
    vitest: '5.0.0',
    '@scope/paquet': '5.0.0',
    casse: null,
    absent: null,
  });
  // Le chemin est reconstruit segment par segment : sans la barre encodée, le
  // registre rend un 404 ; sans l'arobase encodée non plus — les deux formes
  // sont acceptées, on prend celle qui n'interpole rien de brut.
  assert.ok(vus.includes('https://registre.test/%40scope%2fpaquet'));
});

test('un nom qui n’est pas un nom de paquet n’est JAMAIS interrogé', async () => {
  // Ce script lit un fichier et met ce qu'il y trouve dans une URL qu'il
  // appelle. Sans garde, une entrée malformée de `package.json` désignerait une
  // tout autre ressource que le paquet qu'on croit interroger.
  const vus = [];
  const fetchImpl = async url => {
    vus.push(url);
    return {
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '1.0.0' } }),
    };
  };
  const versions = await versionsPubliees(
    [
      'vitest',
      '../../ailleurs',
      'https://autre.test/x',
      'nom?query',
      'nom#ancre',
      'MAJUSCULES',
      '',
    ],
    { fetchImpl, registre: 'https://registre.test' }
  );
  assert.deepEqual(vus, ['https://registre.test/vitest'], 'une seule requête');
  assert.equal(versions.vitest, '1.0.0');
  for (const refuse of [
    '../../ailleurs',
    'https://autre.test/x',
    'nom?query',
    'nom#ancre',
    'MAJUSCULES',
    '',
  ]) {
    assert.equal(
      versions[refuse],
      null,
      `${refuse} ne doit pas être interrogé`
    );
  }
});

test('format : le tableau ne montre que ce qui est en retard', () => {
  const sortie = format([
    {
      nom: 'vitest',
      plage: '^4.0.0',
      publiee: '5.0.0',
      verdict: 'retard',
      portee: 'dur',
    },
    {
      nom: 'react',
      plage: '^19.0.0',
      publiee: '19.2.0',
      verdict: 'ok',
      portee: 'mou',
    },
    {
      nom: 'sharp',
      plage: '>=0.33',
      publiee: null,
      verdict: 'inconnue',
      portee: 'mou',
    },
  ]);
  assert.match(sortie, /vitest/);
  assert.doesNotMatch(sortie, /\| `react`/);
  assert.match(sortie, /sharp/);
});

test('une peer OPTIONNELLE ne mord pas, une peer dure oui', () => {
  // Le point qui manquait à cette sonde, et qui a coûté un ordonnancement :
  // npm refuse l'installation sur une peer non optionnelle, et laisse passer
  // une peer optionnelle. Les deux étaient signalées à l'identique.
  const lignes = analyse(
    { vitest: '^4.0.0', 'jest-dom': '^6.0.0', prettier: '^3.0.0' },
    { vitest: '5.0.0', 'jest-dom': '7.0.1', prettier: '4.0.0' },
    { optionnelles: ['jest-dom'] }
  );
  assert.deepEqual(
    lignes.map(l => [l.nom, l.portee]),
    [
      ['jest-dom', 'mou'],
      ['prettier', 'dur'],
      ['vitest', 'dur'],
    ]
  );
  const sortie = format(lignes);
  assert.match(sortie, /dont 2 qui mordent/);
  assert.match(sortie, /`jest-dom`.*non \(peer optionnelle\)/);
  assert.match(sortie, /`vitest`.*ERESOLVE/);
});

test('une devDependency du socle n’engage aucune app', () => {
  const lignes = analyse(
    { vitest: '^4.0.0', jsdom: '^26.0.0' },
    { vitest: '5.0.0', jsdom: '30.0.1' },
    { peers: ['vitest'] }
  );
  assert.deepEqual(
    lignes.map(l => [l.nom, l.portee]),
    [
      ['jsdom', 'interne'],
      ['vitest', 'dur'],
    ]
  );
});

test('un plafond inscrit dans DECISIONS est assumé, pas une chose à faire', () => {
  const lignes = analyse(
    { typescript: '~6.0.3', jsdom: '^26.0.0' },
    { typescript: '7.0.2', jsdom: '30.0.1' },
    { decisions: { typescript: 'TypeScript 7 est un chantier à part.' } }
  );
  const parNom = Object.fromEntries(lignes.map(l => [l.nom, l]));
  assert.equal(parNom.typescript.verdict, 'assume');
  assert.equal(
    parNom.typescript.raison,
    'TypeScript 7 est un chantier à part.'
  );
  assert.equal(parNom.jsdom.verdict, 'retard');

  // Le tableau d'action ne le porte plus ; le pied de page le rappelle.
  const sortie = format(lignes);
  assert.doesNotMatch(sortie, /\| `typescript`/);
  assert.match(sortie, /1 plafond assumé/);
  assert.match(sortie, /TypeScript 7 est un chantier à part\./);
});

test('un parc entièrement assumé ne montre aucun tableau d’action', () => {
  const lignes = analyse(
    { vitest: '^4.0.0' },
    { vitest: '5.0.0' },
    { decisions: { vitest: 'la 4 vient d’être adoptée' } }
  );
  const sortie = format(lignes);
  assert.match(sortie, /aucun plafond à trancher/);
  assert.match(sortie, /la 4 vient d’être adoptée/);
});

test('DECISIONS ne nomme que des paquets réellement déclarés', () => {
  // Une décision qui porte sur un paquet retiré des peers ne serait jamais
  // relue : elle deviendrait un commentaire mort qui dit le contraire du réel.
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  for (const nom of Object.keys(DECISIONS)) {
    assert.ok(
      nom in pkg.peerDependencies,
      `${nom} est dans DECISIONS mais n’est plus une peer`
    );
  }
});

test('format : le silence est explicite quand tout est à jour', () => {
  const sortie = format([
    { nom: 'react', plage: '^19.0.0', publiee: '19.2.0', verdict: 'ok' },
  ]);
  assert.match(sortie, /aucun plafond/);
});
