// Génération de QR (`qr.js`) : la peer `qrcode` est OPTIONNELLE et absente de
// ce dépôt — exactement la situation d'une app qui ne l'a pas installée. On
// vérifie donc les deux faces du contrat : l'erreur EXPLICITE quand elle
// manque, et le passage fidèle des arguments quand un `loader` la fournit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrToDataUrl, qrToSvg } from '../qr.js';

test('le module s’importe sans la peer — elle n’est chargée qu’à l’appel', () => {
  // L'import en tête de fichier a déjà réussi alors que `qrcode` n'est pas
  // installé : le chargement est bien paresseux (motif map/leaflet.js).
  assert.equal(typeof qrToDataUrl, 'function');
  assert.equal(typeof qrToSvg, 'function');
});

test('peer absente : l’erreur nomme le paquet ET la commande', async () => {
  await assert.rejects(qrToDataUrl('https://exemple.test'), error => {
    assert.match(error.message, /peer optionnelle `qrcode`/);
    assert.match(error.message, /npm install qrcode/);
    assert.ok(error.cause, 'la cause d’origine est conservée');
    return true;
  });
  await assert.rejects(qrToSvg('https://exemple.test'), /npm install qrcode/);
});

test('qrToDataUrl : texte et options transmis tels quels, sans `loader`', async () => {
  const calls = [];
  const fake = {
    default: {
      toDataURL: async (text, opts) => {
        calls.push({ text, opts });
        return 'data:image/png;base64,xyz';
      },
    },
  };
  const url = await qrToDataUrl('molkky:join?code=MZ7K2A', {
    loader: async () => fake,
    width: 240,
    margin: 1,
    color: { dark: '#1b1d18', light: '#ffffff' },
  });
  assert.equal(url, 'data:image/png;base64,xyz');
  assert.deepEqual(calls, [
    {
      text: 'molkky:join?code=MZ7K2A',
      opts: {
        width: 240,
        margin: 1,
        color: { dark: '#1b1d18', light: '#ffffff' },
      },
    },
  ]);
});

test('qrToSvg impose `type: svg` et accepte un module sans `default`', async () => {
  const calls = [];
  // Espace de noms ESM direct (pas de `default`) : le repli `mod.default ??
  // mod` le prend aussi.
  const fake = {
    toString: async (text, opts) => {
      calls.push({ text, opts });
      return '<svg/>';
    },
  };
  const svg = await qrToSvg('texte', { loader: async () => fake, margin: 0 });
  assert.equal(svg, '<svg/>');
  assert.deepEqual(calls, [
    { text: 'texte', opts: { margin: 0, type: 'svg' } },
  ]);
});

test('un loader qui échoue produit la même erreur explicite', async () => {
  await assert.rejects(
    qrToSvg('texte', {
      loader: async () => {
        throw new Error('réseau coupé');
      },
    }),
    /peer optionnelle `qrcode`/
  );
});
