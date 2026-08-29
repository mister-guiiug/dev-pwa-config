// Géographie pure (`geo.js`), promue de mister-family-map.
//
// Les cas repris du test d'origine (vitest, chez la source) sont conservés ;
// s'y ajoute l'antiméridien, qui est LA raison de promouvoir plutôt que de
// laisser réécrire : le bug qu'il évite est silencieux — une liste vide, pas
// une erreur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  distanceKm,
  formatDistance,
  isInBoundingBox,
  isValidCoordinates,
  isValidLatitude,
  isValidLongitude,
} from '../geo.js';

test('les bornes exactes sont valides, l’au-delà ne l’est pas', () => {
  assert.equal(isValidLatitude(90), true);
  assert.equal(isValidLatitude(-90), true);
  assert.equal(isValidLongitude(180), true);
  assert.equal(isValidLongitude(-180), true);
  assert.equal(isValidLatitude(90.0001), false);
  assert.equal(isValidLongitude(-180.5), false);
  assert.equal(isValidLatitude(NaN), false);
  assert.equal(isValidLongitude(Infinity), false);
});

test('un couple complet se valide d’un coup, null compris', () => {
  assert.equal(isValidCoordinates({ lat: 45.76, lng: 4.83 }), true);
  assert.equal(isValidCoordinates({ lat: 95, lng: 4.83 }), false);
  assert.equal(isValidCoordinates(null), false);
  assert.equal(isValidCoordinates(undefined), false);
});

test('haversine : distance nulle sur place, Lyon → Paris ≈ 392 km', () => {
  const lyon = { lat: 45.764, lng: 4.8357 };
  assert.equal(distanceKm(lyon, lyon), 0);
  const paris = { lat: 48.8566, lng: 2.3522 };
  const d = distanceKm(lyon, paris);
  assert.ok(d > 380 && d < 400, `attendu ≈ 392, obtenu ${d}`);
  // Et la symétrie : la distance n'a pas de sens de parcours.
  assert.equal(distanceKm(lyon, paris), distanceKm(paris, lyon));
});

test('cent mètres restent cent mètres', () => {
  // L'échelle de la détection de doublons : ~0,1 km entre deux entrées du parc.
  const a = { lat: 45.7797, lng: 4.8524 };
  const b = { lat: 45.7806, lng: 4.8524 };
  const d = distanceKm(a, b);
  assert.ok(d > 0.08 && d < 0.12, `attendu ≈ 0,1 km, obtenu ${d}`);
});

test('la boîte englobante ordinaire', () => {
  const lyonnais = { north: 45.9, south: 45.6, east: 5.0, west: 4.7 };
  assert.equal(isInBoundingBox({ lat: 45.76, lng: 4.83 }, lyonnais), true);
  assert.equal(isInBoundingBox({ lat: 48.85, lng: 2.35 }, lyonnais), false);
  assert.equal(isInBoundingBox({ lat: 45.76, lng: 5.1 }, lyonnais), false);
});

test('l’ANTIMÉRIDIEN : west > east, et l’appartenance devient un OU', () => {
  // Une boîte sur les Fidji : de 177° E à -178° (soit 182° E). Le test naïf
  // `lng >= west && lng <= east` rendrait FAUX pour tout point qu'elle
  // contient — silencieusement.
  const fidji = { north: -15, south: -20, west: 177, east: -178 };
  assert.equal(isInBoundingBox({ lat: -18, lng: 179 }, fidji), true);
  assert.equal(isInBoundingBox({ lat: -18, lng: -179 }, fidji), true);
  assert.equal(isInBoundingBox({ lat: -18, lng: 170 }, fidji), false);
  assert.equal(isInBoundingBox({ lat: -18, lng: -170 }, fidji), false);
});

test('formatDistance parle français, aux trois échelles', () => {
  assert.equal(formatDistance(0.35), '350 m');
  assert.equal(formatDistance(2.4), '2,4 km');
  assert.equal(formatDistance(12.3), '12 km');
  assert.equal(formatDistance(0.9994), '999 m');
});
