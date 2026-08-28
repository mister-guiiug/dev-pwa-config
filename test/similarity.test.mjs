// Similarité et rapprochement (`similarity.js`).
//
// PROMU de `mister-family-map/src/shared/lib/dedupe.ts`. Les cas repris de son
// test d'origine sont marqués ; les autres éprouvent ce que la promotion
// ajoute — l'explication du verdict, et le fait que la distance ne soit plus
// forcément géographique.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REASONS,
  findSimilar,
  nameSimilarity,
  normalizeName,
} from '../similarity.js';

/* ── La similarité elle-même ───────────────────────────────────────────── */

test('la normalisation efface ce qui ne compte pas', () => {
  assert.equal(normalizeName('Parc de la Tête d’Or'), 'parc de la tete d or');
  assert.equal(normalizeName('  ÉCOLE—Jean_Jaurès  '), 'ecole jean jaures');
  assert.equal(normalizeName(null), '');
});

test('les inversions de mots et les fautes ne cassent pas la comparaison', () => {
  // C'est la raison d'être de Sørensen–Dice ici : une distance d'édition
  // punirait un mot déplacé autant qu'un mot faux.
  assert.ok(
    nameSimilarity('Tête d’Or, parc de la', 'Parc de la Tête d’Or') > 0.7
  );
  assert.ok(nameSimilarity('Parc Tête d’Or', 'Parc de la Tête d’Or') > 0.6);
  // MAIS pas 1 : l'apostrophe est une ponctuation, donc une espace après
  // normalisation — « d or » n'est pas « dor ». C'est le comportement de
  // family-map, promu tel quel ; le noter ici évite qu'on le « corrige » un
  // jour sans mesurer ce que ça déplace.
  const presque = nameSimilarity('Parc de la Tête d’Or', 'PARC DE LA TETE DOR');
  assert.ok(
    presque > 0.9 && presque < 1,
    `attendu ]0,9 ; 1[, obtenu ${presque}`
  );
  assert.equal(
    nameSimilarity('Parc de la Tête d’Or', 'PARC DE LA TÊTE D’OR'),
    1
  );
});

test('deux noms sans rapport restent bas', () => {
  assert.ok(nameSimilarity('Piscine municipale', 'Médiathèque') < 0.3);
});

test('les chaînes trop courtes pour un bigramme', () => {
  // Sans ce cas, deux « A » identiques rendraient 0 : il n'y a aucun bigramme
  // à comparer.
  assert.equal(nameSimilarity('A', 'A'), 1);
  assert.equal(nameSimilarity('A', 'B'), 0);
  assert.equal(nameSimilarity('', ''), 0);
});

/* ── Le verdict expliqué — ce que la promotion ajoute ──────────────────── */

const LIEUX = [
  {
    id: 'tete-or',
    name: 'Parc de la Tête d’Or',
    at: { lat: 45.7797, lng: 4.8524 },
  },
  {
    id: 'kiosque',
    name: 'Kiosque à musique',
    at: { lat: 45.7799, lng: 4.8529 },
  },
  { id: 'blandan', name: 'Parc Blandan', at: { lat: 45.7458, lng: 4.8542 } },
];

/** Distance grossière en kilomètres, suffisante pour un test. */
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 78);

test('un nom identique se dit « même nom », pas « peut-être »', () => {
  const [premier] = findSimilar(
    { name: 'PARC DE LA TÊTE D’OR', at: { lat: 45.78, lng: 4.85 } },
    LIEUX,
    { distance: km, maxDistance: 1 }
  );
  assert.equal(premier.item.id, 'tete-or');
  assert.equal(premier.reason, REASONS.sameName);
  assert.equal(premier.similarity, 1);
});

test('à quelques mètres, le nom ne prouve plus rien', () => {
  // Le même toboggan est saisi « Aire de jeux » puis « Square des enfants ».
  const trouves = findSimilar(
    { name: 'Square des enfants', at: { lat: 45.7799, lng: 4.8529 } },
    LIEUX,
    { distance: km, maxDistance: 0.5, closeEnough: 0.1 }
  );
  const kiosque = trouves.find(m => m.item.id === 'kiosque');
  assert.ok(kiosque, 'un lieu à 0 m doit être proposé malgré un nom différent');
  assert.equal(kiosque.reason, REASONS.veryClose);
});

test('un homonyme lointain n’est PAS proposé', () => {
  // Le défaut que le rayon existe pour empêcher.
  const trouves = findSimilar(
    { name: 'Parc de la Tête d’Or', at: { lat: 48.8566, lng: 2.3522 } },
    LIEUX,
    { distance: km, maxDistance: 0.5 }
  );
  assert.deepEqual(trouves, []);
});

test('les résultats sont ordonnés du plus probable au moins', () => {
  const trouves = findSimilar(
    { name: 'Parc Tête d’Or', at: { lat: 45.7798, lng: 4.8526 } },
    LIEUX,
    { distance: km, maxDistance: 1, closeEnough: 0.1, minSimilarity: 0.5 }
  );
  assert.ok(trouves.length >= 2);
  assert.equal(trouves[0].item.id, 'tete-or', 'le mieux nommé d’abord');
  for (let i = 1; i < trouves.length; i += 1) {
    assert.ok(trouves[i - 1].similarity >= trouves[i].similarity);
  }
});

/* ── La distance n'est plus forcément géographique ─────────────────────── */

test('sans fonction `distance`, seuls les noms comptent', () => {
  const trouves = findSimilar({ name: 'Parc Blandan' }, LIEUX, {
    minSimilarity: 0.6,
  });
  assert.equal(trouves.length, 1);
  assert.equal(trouves[0].item.id, 'blandan');
  assert.equal(trouves[0].distance, null, 'aucune distance à rapporter');
});

test('la distance peut être un écart de prix', () => {
  // C'est le cas de miss-lookhouse : deux annonces du même bien, publiées sur
  // deux sites, à quelques centaines d'euros près.
  const annonces = [
    { ref: 'A', name: 'T3 lumineux centre-ville', at: 249000 },
    { ref: 'B', name: 'Studio gare', at: 98000 },
  ];
  const trouves = findSimilar(
    { name: 'T3 lumineux, centre ville', at: 251000 },
    annonces,
    { distance: (a, b) => Math.abs(a - b), maxDistance: 5000 }
  );
  assert.equal(trouves.length, 1);
  assert.equal(trouves[0].item.ref, 'A');
  assert.equal(trouves[0].distance, 2000);
});

test('un champ de nom différent se déclare', () => {
  const trouves = findSimilar({ name: 'Lyon' }, [{ ville: 'lyon' }], {
    nameOf: item => item.ville,
  });
  assert.equal(trouves.length, 1);
  assert.equal(trouves[0].reason, REASONS.sameName);
});

test('une liste vide ne lève pas', () => {
  assert.deepEqual(findSimilar({ name: 'x' }, []), []);
  assert.deepEqual(findSimilar({ name: 'x' }, undefined), []);
});
