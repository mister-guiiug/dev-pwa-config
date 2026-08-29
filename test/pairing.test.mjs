// Appairage (`pairing.js`), promu de mister-qowa, mister-molkky et
// miss-ticket-pwa.
//
// Exhaustif parce que PUR : alphabets, tirage (injectable), normalisation —
// dont LE cas qui a motivé la promotion : le `normalizeCode` de molkky
// poussait I et O hors de son propre alphabet, et le code corrompu échouait
// en silence — et les liens profonds `schéma:action?clé=valeur`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHABETS,
  buildDeepLink,
  generateCode,
  normalizeCode,
  parseDeepLink,
} from '../pairing.js';

/* ── Alphabets ──────────────────────────────────────────────────────────── */

test('les trois alphabets tiennent leurs promesses typographiques', () => {
  assert.equal(ALPHABETS.numeric.chars, '0123456789');

  // Crockford, le vrai : 32 caractères, sans I/L/O/U — mais AVEC 0 et 1,
  // puisque les confusions se corrigent au lieu d'être interdites.
  assert.equal(ALPHABETS.crockford32.chars.length, 32);
  for (const banni of 'ILOU') {
    assert.ok(!ALPHABETS.crockford32.chars.includes(banni), `${banni} exclu`);
  }
  assert.deepEqual(ALPHABETS.crockford32.aliases, { I: '1', L: '1', O: '0' });

  // Anti-confusion (molkky + miss-ticket) : 32 caractères, aucun des quatre
  // ambigus — rien à corriger, l'ambiguïté n'existe pas.
  assert.equal(ALPHABETS.antiConfusion.chars.length, 32);
  for (const banni of '01IO') {
    assert.ok(!ALPHABETS.antiConfusion.chars.includes(banni), `${banni} exclu`);
  }

  // Aucun doublon nulle part : un doublon fausserait l'équiprobabilité.
  for (const [nom, { chars }] of Object.entries(ALPHABETS)) {
    assert.equal(new Set(chars).size, chars.length, `${nom} sans doublon`);
  }
});

/* ── generateCode ───────────────────────────────────────────────────────── */

test('generateCode : longueur demandée, caractères de l’alphabet seulement', () => {
  const code = generateCode(6);
  assert.equal(code.length, 6);
  for (const ch of code) {
    assert.ok(ALPHABETS.antiConfusion.chars.includes(ch), `${ch} autorisé`);
  }

  // Le PIN de mister-qowa : 8 chiffres, alphabet nommé.
  assert.match(generateCode(8, { alphabet: 'numeric' }), /^\d{8}$/);
});

test('generateCode : l’aléa s’injecte, le code devient déterministe', () => {
  // Octets 0, 1, 2… → premiers caractères de l'alphabet, dans l'ordre.
  const random = count => Uint8Array.from({ length: count }, (_, i) => i);
  assert.equal(generateCode(4, { alphabet: 'crockford32', random }), '0123');
  assert.equal(generateCode(3, { alphabet: 'numeric', random }), '012');
});

test('generateCode REJETTE les octets hors zone équiprobable (biais modulo)', () => {
  // 256 = 25 × 10 + 6 : les octets 250-255 rendraient 0-5 plus probables.
  // Ils sont rejetés et retirés — pas repliés par `% 10`.
  const draws = [];
  const feed = [[250], [255], [7]];
  const random = count => {
    draws.push(count);
    return Uint8Array.from(feed.shift() ?? []);
  };
  assert.equal(generateCode(1, { alphabet: 'numeric', random }), '7');
  assert.deepEqual(draws, [1, 1, 1], 'deux rejets = deux retirages');
});

test('generateCode : 32 caractères = aucun octet rejeté (256 est un multiple)', () => {
  const random = count => Uint8Array.from({ length: count }, () => 255);
  // 255 % 32 = 31 → dernier caractère de l'alphabet, jamais rejeté.
  assert.equal(generateCode(2, { alphabet: 'antiConfusion', random }), '99');
});

test('generateCode : alphabet personnalisé, et défaut anti-confusion', () => {
  const random = count => Uint8Array.from({ length: count }, (_, i) => i);
  assert.equal(generateCode(4, { alphabet: { chars: 'AB' }, random }), 'ABAB');

  // Défaut : anti-confusion — sur un grand tirage réel, jamais de 0/O/1/I.
  const long = generateCode(256);
  assert.ok(![...long].some(ch => '01IO'.includes(ch)));
});

test('generateCode refuse ce qui ne peut pas produire un code honnête', () => {
  assert.throws(() => generateCode(0), /Longueur de code invalide/);
  assert.throws(() => generateCode(2.5), /Longueur de code invalide/);
  assert.throws(() => generateCode(6, { alphabet: 'base64' }), /inconnu/);
  assert.throws(
    () => generateCode(6, { alphabet: { chars: 'A' } }),
    /invalide/
  );
  assert.throws(
    () => generateCode(1, { random: () => new Uint8Array(0) }),
    /au moins un octet/
  );
});

/* ── normalizeCode ──────────────────────────────────────────────────────── */

test('normalizeCode : majuscules, blancs et séparateurs écartés (molkky)', () => {
  assert.equal(normalizeCode('mz7k2a'), 'MZ7K2A');
  assert.equal(normalizeCode(' mz-7k 2a '), 'MZ7K2A');
  assert.equal(normalizeCode(''), '');
});

test('normalizeCode, anti-confusion : I et O DISPARAISSENT au lieu de corrompre', () => {
  // LE défaut de molkky : son normalizeCode transformait I en « 1 » et O en
  // « 0 » — deux caractères hors de son propre alphabet. Le code gardait la
  // bonne longueur, et la recherche échouait en silence. Ici : écartés, la
  // saisie continue.
  assert.equal(normalizeCode('IOMZ7K'), 'MZ7K');
  assert.equal(normalizeCode('M10Z'), 'MZ');
});

test('normalizeCode, crockford32 : les confusions se CORRIGENT', () => {
  const alphabet = 'crockford32';
  assert.equal(normalizeCode('oil', { alphabet }), '011');
  assert.equal(normalizeCode('7O-8I', { alphabet }), '7081');
  // U est exclu de Crockford sans correction : écarté.
  assert.equal(normalizeCode('7U8', { alphabet }), '78');
});

test('normalizeCode, numeric : le collage d’un PIN se nettoie (qowa)', () => {
  assert.equal(
    normalizeCode('PIN : 1234 5678', { alphabet: 'numeric', maxLength: 8 }),
    '12345678'
  );
});

test('normalizeCode : maxLength borne la saisie d’un champ contrôlé', () => {
  assert.equal(normalizeCode('ABCDEFGH', { maxLength: 6 }), 'ABCDEF');
  assert.equal(normalizeCode('AB', { maxLength: 6 }), 'AB');
});

/* ── Liens profonds ─────────────────────────────────────────────────────── */

test('buildDeepLink reconstruit le schéma de miss-ticket, sans le coder en dur', () => {
  assert.equal(
    buildDeepLink('missticket', 'pair', { token: 'T123', id: 'desk-9' }),
    'missticket:pair?token=T123&id=desk-9'
  );
  assert.equal(buildDeepLink('molkky', 'join'), 'molkky:join');
  // `undefined` et `null` sont omis — pas de `id=undefined` dans un QR.
  assert.equal(
    buildDeepLink('app', 'pair', { a: '1', b: undefined, c: null }),
    'app:pair?a=1'
  );
});

test('buildDeepLink encode les valeurs, et le tour repart par parseDeepLink', () => {
  const lien = buildDeepLink('app', 'join', { name: 'été & co', n: 2 });
  const retour = parseDeepLink(lien);
  assert.ok(retour);
  assert.deepEqual(retour.params, { name: 'été & co', n: '2' });
});

test('buildDeepLink refuse schéma et action malformés', () => {
  assert.throws(() => buildDeepLink('1app', 'pair'), /Schéma invalide/);
  assert.throws(() => buildDeepLink('a pp', 'pair'), /Schéma invalide/);
  assert.throws(() => buildDeepLink('app', 'pa ir'), /Action invalide/);
  assert.throws(() => buildDeepLink('app', 'pair?x'), /Action invalide/);
  assert.throws(() => buildDeepLink('app', ''), /Action invalide/);
});

test('parseDeepLink : le cas réel de miss-ticket, filtres compris', () => {
  const attendu = { scheme: 'missticket', action: 'pair' };
  const brut = 'missticket:pair?token=XXX&id=YYY';
  assert.deepEqual(parseDeepLink(brut, attendu), {
    scheme: 'missticket',
    action: 'pair',
    params: { token: 'XXX', id: 'YYY' },
  });
  // Le schéma est insensible à la casse (RFC 3986), l'action est exacte.
  assert.ok(parseDeepLink('MISSTICKET:pair?token=X', attendu));
  assert.equal(parseDeepLink('missticket:PAIR?token=X', attendu), null);
  assert.equal(parseDeepLink('autre:pair?token=X', attendu), null);
});

test('parseDeepLink rend null pour tout ce qui n’a pas la forme', () => {
  assert.equal(parseDeepLink('MZ7K2A'), null); // un code nu, pas un lien
  assert.equal(parseDeepLink(''), null);
  assert.equal(parseDeepLink(':pair?x=1'), null);
  assert.equal(parseDeepLink('app:'), null);
  assert.equal(parseDeepLink('9app:pair'), null);
});

test('parseDeepLink : fragment ignoré, première occurrence retenue', () => {
  const lien = parseDeepLink('app:join?code=A&code=B#reste');
  assert.ok(lien);
  assert.deepEqual(lien.params, { code: 'A' });
});

test('parseDeepLink : une clé __proto__ forgée reste une donnée', () => {
  const lien = parseDeepLink('app:pair?__proto__=zz&ok=1');
  assert.ok(lien);
  assert.equal(lien.params['__proto__'], 'zz'); // propriété PROPRE
  assert.equal(Object.getPrototypeOf(lien.params), Object.prototype);
  assert.equal(lien.params.ok, '1');
});

test('parseDeepLink tolère les blancs d’un contenu scanné', () => {
  const lien = parseDeepLink('  app:join?code=MZ7K2A\n');
  assert.ok(lien);
  assert.equal(lien.params.code, 'MZ7K2A');
});
