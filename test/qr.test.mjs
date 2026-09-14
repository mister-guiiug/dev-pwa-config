// Génération de QR (`qr.js`) : la peer `uqr` est OPTIONNELLE et absente de ce
// dépôt — exactement la situation d'une app qui ne l'a pas installée. On
// vérifie donc les deux faces du contrat : l'erreur EXPLICITE quand elle
// manque, et la TRADUCTION des options quand un `loader` la fournit.
//
// La traduction est le cœur de ce fichier. Le module garde le vocabulaire de
// `qrcode` — celui qu'emploient déjà molkky, koh et qowa — et le convertit vers
// celui d'`uqr`. Une correspondance fausse ne casserait rien de visible : le QR
// s'afficherait, simplement avec la mauvaise correction d'erreur ou la mauvaise
// marge. C'est le genre de défaut qu'on ne voit qu'au lecteur qui refuse de
// scanner, des mois plus tard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrToDataUrl, qrToSvg } from '../qr.js';

/** Faux `uqr` : enregistre ce qu'on lui passe, rend un SVG reconnaissable. */
function fauxUqr(
  svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23"><rect/></svg>'
) {
  const appels = [];
  return {
    appels,
    module: {
      renderSVG: (text, opts) => {
        appels.push({ text, opts });
        return svg;
      },
    },
  };
}

test('le module s’importe sans la peer — elle n’est chargée qu’à l’appel', () => {
  // L'import en tête de fichier a déjà réussi alors qu'`uqr` n'est pas
  // installé : le chargement est bien paresseux (motif map/leaflet.js).
  assert.equal(typeof qrToDataUrl, 'function');
  assert.equal(typeof qrToSvg, 'function');
});

test('peer absente : l’erreur nomme le paquet ET la commande', async () => {
  await assert.rejects(qrToDataUrl('https://exemple.test'), error => {
    assert.match(error.message, /peer optionnelle `uqr`/);
    assert.match(error.message, /npm install uqr/);
    assert.ok(error.cause, 'la cause d’origine est conservée');
    return true;
  });
  await assert.rejects(qrToSvg('https://exemple.test'), /npm install uqr/);
});

test('un loader qui échoue produit la même erreur explicite', async () => {
  await assert.rejects(
    qrToSvg('texte', {
      loader: async () => {
        throw new Error('réseau coupé');
      },
    }),
    /peer optionnelle `uqr`/
  );
});

test('les options `qrcode` sont traduites vers `uqr`', async () => {
  const f = fauxUqr();
  await qrToSvg('molkky:join?code=MZ7K2A', {
    loader: async () => f.module,
    margin: 4,
    errorCorrectionLevel: 'M',
    scale: 8,
    color: { dark: '#1b1d18', light: '#ffffff' },
  });
  assert.deepEqual(f.appels, [
    {
      text: 'molkky:join?code=MZ7K2A',
      opts: {
        ecc: 'M', // errorCorrectionLevel — même alphabet L|M|Q|H
        border: 4, // margin, en MODULES des deux côtés
        pixelSize: 8, // scale
        blackColor: '#1b1d18',
        whiteColor: '#ffffff',
      },
    },
  ]);
});

test('sans options, les défauts posés sont ceux de `qrcode`', async () => {
  // LE DÉFAUT REPRODUIT. Entre la 4.16.0 et le 15/09/2026, rien n'était
  // transmis ici et `uqr` appliquait les SIENS : 1 module de marge au lieu de
  // 4, correction `'L'` au lieu de `'M'`. Mesuré contre le vrai `uqr`, en
  // cherchant une longueur de contenu où L et M donnent des tailles
  // différentes — à 43 caractères, 31 modules contre 35.
  //
  // Le vocabulaire commun masquait l'écart : garder les noms de `qrcode` sans
  // garder ses valeurs était une promesse à moitié tenue. mister-molkky, seul
  // appelant à laisser la correction au défaut, avait glissé de M à L.
  const f = fauxUqr();
  await qrToSvg('texte', { loader: async () => f.module });
  assert.deepEqual(f.appels[0].opts, { ecc: 'M', border: 4 });
});

test('`margin: 0` passe — c’est une valeur, pas une absence', async () => {
  // C'est `??` et non `||` qui pose le défaut : un `||` remplacerait ce zéro
  // explicite par quatre, et le QR de miss-ticket-pwa gagnerait une marge que
  // personne n'a demandée.
  const f = fauxUqr();
  await qrToSvg('texte', { loader: async () => f.module, margin: 0 });
  assert.equal(f.appels[0].opts.border, 0);
});

test('les options fournies l’emportent sur les défauts', async () => {
  const f = fauxUqr();
  await qrToSvg('texte', {
    loader: async () => f.module,
    margin: 1,
    errorCorrectionLevel: 'H',
  });
  assert.deepEqual(f.appels[0].opts, { ecc: 'H', border: 1 });
});

/**
 * La balise RACINE seule.
 *
 * Chercher `width=` dans le SVG entier ne prouve rien : `uqr` rend des
 * `<rect width="…">` pour chaque module, et l'assertion passerait au vert quoi
 * qu'il arrive. Le défaut a été pris en flagrant délit le 14/09/2026, en
 * rejouant ces tests contre le VRAI `uqr` — le faux de ce fichier n'a pas de
 * rects, donc il ne pouvait pas le révéler.
 */
const racine = svg => svg.slice(0, svg.indexOf('>') + 1);

test('`width` ne part pas chez `uqr` : il dimensionne le SVG rendu', async () => {
  // `uqr` raisonne en pixels PAR MODULE, pas en largeur d'image. Lui passer
  // `width` produirait un QR de 512 pixels par module.
  const f = fauxUqr();
  const svg = await qrToSvg('texte', {
    loader: async () => f.module,
    width: 512,
  });
  assert.equal(f.appels[0].opts.width, undefined);
  assert.match(svg, /^<svg width="512" height="512" /);
  assert.match(svg, /viewBox="0 0 23 23"/, 'le viewBox d’origine est conservé');
});

test('sans `width`, la racine garde son seul viewBox', async () => {
  // C'est ce que veut un rendu inline : le SVG s'étire à son conteneur.
  const f = fauxUqr(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23"><rect width="10" height="10"/></svg>'
  );
  const svg = await qrToSvg('texte', { loader: async () => f.module });
  assert.doesNotMatch(racine(svg), /width=/);
  assert.match(
    svg,
    /<rect width="10"/,
    'les modules gardent bien leur largeur'
  );
});

test('une largeur absurde est ignorée plutôt qu’écrite', async () => {
  const f = fauxUqr(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23"><rect width="10"/></svg>'
  );
  for (const w of [0, -10, Number.NaN, 'grand']) {
    const svg = await qrToSvg('texte', {
      loader: async () => f.module,
      width: w,
    });
    assert.doesNotMatch(racine(svg), /width=/, String(w));
  }
});

test('qrToDataUrl rend une data-URL SVG lisible par un <img>', async () => {
  const f = fauxUqr();
  const url = await qrToDataUrl('https://exemple.test/a', {
    loader: async () => f.module,
  });
  assert.match(url, /^data:image\/svg\+xml,/);
  // Décodable, et c'est bien le SVG rendu — pas une chaîne tronquée.
  const svg = decodeURIComponent(url.slice('data:image/svg+xml,'.length));
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 23 23"/);
});

test('qrToDataUrl échappe ce qui casserait une URL', async () => {
  // `#` coupe une data-URL à la fragment, `&` et les espaces la déforment.
  // C'est la raison du choix d'`encodeURIComponent` plutôt que de `btoa`.
  const f = fauxUqr('<svg fill="#1b1d18" data-x="a b&c"></svg>');
  const url = await qrToDataUrl('texte', { loader: async () => f.module });
  assert.doesNotMatch(url.slice('data:image/svg+xml,'.length), /[#&\s]/);
  assert.equal(
    decodeURIComponent(url.slice('data:image/svg+xml,'.length)),
    '<svg fill="#1b1d18" data-x="a b&c"></svg>'
  );
});

test('le texte est converti en chaîne', async () => {
  const f = fauxUqr();
  await qrToSvg(42, { loader: async () => f.module });
  assert.equal(f.appels[0].text, '42');
});

test('un espace de noms ESM sans `default` est accepté', async () => {
  // `import('uqr')` rend un espace de noms ; un faux module de test peut
  // arriver avec ou sans `default`. Le repli `mod.default ?? mod` prend les deux.
  const f = fauxUqr();
  const svg = await qrToSvg('texte', {
    loader: async () => ({ default: f.module }),
  });
  assert.match(svg, /^<svg /);
});
