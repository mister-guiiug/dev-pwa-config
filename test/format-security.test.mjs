/**
 * `format.js` et `security.js` — les deux modules sans dépendance.
 *
 * Trois apps portaient la MÊME liste de dix fonctions de formatage, et deux un
 * `security.ts` identique à l'octet. Les tests ci-dessous verrouillent surtout
 * ce qui a été CORRIGÉ à la promotion : promouvoir un défaut le généraliserait
 * à seize apps.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  truncate,
  capitalize,
  slugify,
  formatPhoneNumber,
  formatBytes,
} from '../format.js';
import {
  escapeHtml,
  escapeRegex,
  sanitizeInput,
  generateSecureId,
  hashString,
  isValidHttpsUrl,
  isValidEmail,
  extractDomainFromEmail,
  maskEmail,
  maskPhone,
  redact,
} from '../security.js';

/* ── format ─────────────────────────────────────────────────────────────── */

test('formatCurrency et formatNumber suivent la locale', () => {
  // Espace insécable étroit en fr-FR : on compare les chiffres, pas l'espace.
  assert.match(formatCurrency(1234.5), /1.234,50\s*€/u);
  assert.match(formatCurrency(1234.5, 'en-US', 'USD'), /\$1,234\.50/u);
  assert.match(formatNumber(1234567), /1.234.567/u);
});

test('une valeur non finie rend une chaîne vide, jamais « NaN »', () => {
  // Les copies affichaient « NaN € » dans l'interface.
  for (const bad of [NaN, Infinity, undefined, null, 'x']) {
    assert.equal(formatCurrency(bad), '');
    assert.equal(formatNumber(bad), '');
    assert.equal(formatPercentage(bad), '');
  }
});

test('formatPercentage prend une proportion, pas un nombre déjà multiplié', () => {
  assert.match(formatPercentage(0.42), /42\s*%/u);
  assert.match(formatPercentage(0.423, 'fr-FR', 1), /42,3\s*%/u);
});

test('formatDate et formatDateTime acceptent Date, chaîne et horodatage', () => {
  const expected = formatDate(new Date('2026-08-12T10:00:00Z'));
  assert.equal(formatDate('2026-08-12T10:00:00Z'), expected);
  assert.equal(formatDate(Date.parse('2026-08-12T10:00:00Z')), expected);
  assert.match(formatDateTime('2026-08-12T10:00:00Z'), /\d{2}:\d{2}/);
});

test('une date invalide rend une chaîne vide, pas « Invalid Date »', () => {
  assert.equal(formatDate('pas une date'), '');
  assert.equal(formatRelativeTime('pas une date'), '');
});

test('formatRelativeTime accepte une référence, donc se teste', () => {
  const now = new Date('2026-08-12T12:00:00Z');
  assert.equal(
    formatRelativeTime('2026-08-09T12:00:00Z', 'fr-FR', now),
    'il y a 3 jours'
  );
  assert.equal(
    formatRelativeTime('2026-08-11T12:00:00Z', 'fr-FR', now),
    'hier'
  );
  assert.equal(
    formatRelativeTime('2026-08-13T12:00:00Z', 'fr-FR', now),
    'demain'
  );
  assert.match(
    formatRelativeTime('2026-08-12T14:00:00Z', 'fr-FR', now),
    /2 heures/
  );
});

test('slugify retire les diacritiques ET les tirets de bord', () => {
  // Les copies s'appuyaient sur `[^\w-]` pour faire tomber les diacritiques —
  // un effet de bord — et laissaient « bonjour- » pour « Bonjour ! ».
  assert.equal(slugify('Été à Paris'), 'ete-a-paris');
  assert.equal(slugify('Bonjour !'), 'bonjour');
  assert.equal(slugify('—Ça va ?—'), 'ca-va');
  assert.equal(slugify('  double   espace  '), 'double-espace');
  assert.equal(slugify(''), '');
});

test('truncate et capitalize gèrent les bords', () => {
  assert.equal(truncate('abcdefghij', 6), 'abcde…');
  assert.equal(truncate('court', 80), 'court');
  assert.equal(truncate(null), '');
  assert.equal(capitalize('élan'), 'Élan');
  assert.equal(capitalize(''), '');
});

test('formatPhoneNumber rend la saisie inchangée plutôt qu’un faux groupage', () => {
  assert.equal(formatPhoneNumber('0612345678'), '06 12 34 56 78');
  assert.equal(formatPhoneNumber('+33 6 12 34 56 78'), '+33 6 12 34 56 78');
  assert.equal(formatPhoneNumber('123'), '123');
});

test('formatBytes monte d’unité et arrondit', () => {
  assert.equal(formatBytes(0), '0 o');
  assert.equal(formatBytes(999), '999 o');
  assert.match(formatBytes(1503238), /1,4 Mo/u);
  assert.equal(formatBytes(-1), '');
});

/* ── security ───────────────────────────────────────────────────────────── */

test('escapeHtml échappe les cinq caractères qui comptent, sans DOM', () => {
  // La copie créait un élément DOM : inutilisable en test Node, en service
  // worker ou en rendu serveur — et elle n'échappait pas les guillemets, donc
  // ne protégeait pas une insertion dans un attribut.
  assert.equal(
    escapeHtml(`<b>"a" & 'b'</b>`),
    '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;'
  );
  assert.equal(escapeHtml(null), '');
});

test('escapeRegex neutralise les métacaractères', () => {
  const escaped = escapeRegex('a.b*c');
  assert.ok(new RegExp(`^${escaped}$`).test('a.b*c'));
  assert.ok(!new RegExp(`^${escaped}$`).test('axbxc'));
});

test('sanitizeInput rogne, plafonne et échappe', () => {
  assert.equal(sanitizeInput('  <script>  '), '&lt;script&gt;');
  assert.equal(sanitizeInput('a'.repeat(50), 10).length, 10);
  assert.equal(sanitizeInput(42), '');
});

test('generateSecureId ne repose pas sur Math.random', () => {
  const ids = new Set(Array.from({ length: 200 }, generateSecureId));
  assert.equal(ids.size, 200, 'collision sur 200 tirages');
  for (const id of ids) assert.match(id, /^[0-9a-f]{32}$/);
});

test('hashString rend le SHA-256 de référence', async () => {
  // Vecteur connu : SHA-256("abc").
  assert.equal(
    await hashString('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('isValidHttpsUrl refuse http, les URL relatives et javascript:', () => {
  assert.ok(isValidHttpsUrl('https://exemple.fr/a'));
  assert.ok(!isValidHttpsUrl('http://exemple.fr'));
  assert.ok(!isValidHttpsUrl('/relatif'));
  assert.ok(!isValidHttpsUrl('javascript:alert(1)'));
});

test('adresses : validation, domaine, masquage', () => {
  assert.ok(isValidEmail('a@b.fr'));
  assert.ok(!isValidEmail('a@b'));
  assert.ok(!isValidEmail('a b@c.fr'));
  assert.equal(extractDomainFromEmail('A@Exemple.FR'), 'exemple.fr');
  assert.equal(extractDomainFromEmail('nawak'), null);
  assert.equal(maskEmail('jeanmichel@exemple.fr'), 'j********l@exemple.fr');
  assert.equal(maskEmail('ab@exemple.fr'), '**@exemple.fr');
  assert.equal(maskEmail('pas-une-adresse'), 'pas-une-adresse');
  assert.equal(maskPhone('06 12 34 56 78'), '********78');
  assert.equal(maskPhone('12'), '12');
});

test('redact masque en profondeur, sans boucler indéfiniment', () => {
  const journal = {
    user: { email: 'a@b.fr', nom: 'Léa' },
    apiKey: 'secret',
    liste: [{ token: 't' }, { ok: 1 }],
  };
  const propre = redact(journal);
  assert.equal(propre.user.email, '[masqué]');
  assert.equal(propre.user.nom, 'Léa', 'un champ anodin doit survivre');
  assert.equal(propre.apiKey, '[masqué]');
  assert.equal(propre.liste[0].token, '[masqué]');
  assert.equal(propre.liste[1].ok, 1);

  // Profondeur bornée : une structure très imbriquée ne fait pas exploser la pile.
  let profond = { valeur: 1 };
  for (let i = 0; i < 50; i += 1) profond = { niveau: profond };
  assert.doesNotThrow(() => redact(profond));

  // Clés supplémentaires, propres à une app.
  assert.equal(redact({ matricule: 'x' }, ['matricule']).matricule, '[masqué]');
});

test('les deux modules sont exportés, livrés, et sans dépendance', async () => {
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  for (const name of ['format', 'security']) {
    assert.deepEqual(pkg.exports[`./${name}`], {
      types: `./${name}.d.ts`,
      default: `./${name}.js`,
    });
    assert.ok(pkg.files.includes(`${name}.js`));
    assert.ok(pkg.files.includes(`${name}.d.ts`));
    const source = readFileSync(
      new URL(`../${name}.js`, import.meta.url),
      'utf8'
    );
    assert.doesNotMatch(source, /^import /m, `${name}.js doit rester autonome`);
  }
});
