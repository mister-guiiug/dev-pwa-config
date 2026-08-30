// Le traitement d'images — ce qui se prouve, et ce qui ne se prouve pas ici.
//
// CE MODULE N'AVAIT AUCUN TEST au-delà de sa partie pure, et deux adoptions
// (bac-sable #22, mister-puzzle #15) l'ont relevé le même jour. La raison
// n'était pas l'oubli : `stripImageMetadata` et `compressImageToMaxBytes`
// touchaient le canvas au milieu de leur boucle, et `createImageBitmap` est
// ABSENT de jsdom — vérifié par mister-puzzle. Simuler un canvas aurait donné
// des tests qui ne prouvent que leur propre bouchon : exactement le défaut que
// cette campagne a déjà payé une fois (voir `jsdom ne fait pas de hit-testing`
// dans CAMPAGNE.md).
//
// La réponse est structurelle : la GÉOMÉTRIE est pure (`fitWithin`) et le DOM
// est isolé derrière deux coutures (`render`, `encode`). Ce qui se teste ici,
// c'est donc la DÉCISION — quelle taille, quelle qualité, quand s'arrêter.
// Le dessin lui-même reste hors de portée, et c'est assumé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPRESS_QUALITIES,
  IMAGE_ACCEPTED_TYPES,
  IMAGE_COMPRESS_START_DIMENSION,
  IMAGE_MAX_DIMENSION,
  compressImageToMaxBytes,
  fitWithin,
  stripImageMetadata,
  validateImageFile,
} from '../image.js';

/* ── La géométrie ───────────────────────────────────────────────────────── */

test('fitWithin n’agrandit jamais', () => {
  // Une vignette ré-encodée en 2048 pèserait plus que l'originale, pour zéro
  // détail supplémentaire.
  assert.deepEqual(fitWithin(80, 60, 2048), { width: 80, height: 60 });
});

test('fitWithin conserve le rapport d’aspect', () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 });
});

test('fitWithin plancher à 1 px : une bande extrême ne donne pas un canvas nul', () => {
  // 1 × 5000 réduit à 2048 : la largeur arrondit à 0, et un canvas de largeur
  // 0 fait échouer `toBlob` sans rien dire. C'est le cas que bac-sable a
  // corrigé à la promotion.
  const size = fitWithin(1, 5000, 2048);
  assert.equal(size.width, 1);
  assert.equal(size.height, 2048);
});

test('fitWithin ne divise pas par zéro', () => {
  assert.deepEqual(fitWithin(0, 0, 2048), { width: 1, height: 1 });
});

/* ── Ce que le défaut refuse EXPRÈS ─────────────────────────────────────── */

test('le défaut refuse le GIF que la compression sait pourtant lire', () => {
  // L'écart a été relevé pendant l'adoption de `miss-carbook` (#16) :
  // `compressImageToMaxBytes` documente le GIF (« deviennent une image fixe »)
  // pendant que le validateur du MÊME fichier le refuse. Il est intentionnel —
  // cette liste dit ce qu'une app accepte de RECEVOIR, pas ce que le module
  // sait LIRE.
  //
  // Ce test existe pour empêcher qu'on « corrige » l'incohérence en ajoutant
  // 'image/gif' au défaut : `bac-sable` appelle `validateImageFile(file)` SANS
  // option, sous un `accept="image/jpeg,image/png,image/webp"` et un message
  // qui annonce « Formats acceptés : JPEG, PNG, WebP ». Un défaut plus large
  // lui ferait accepter en silence ce que son propre écran refuse.
  assert.deepEqual(
    [...IMAGE_ACCEPTED_TYPES],
    ['image/jpeg', 'image/png', 'image/webp'],
    'élargir le défaut change ce que TOUTES les apps acceptent : voir l’en-tête'
  );
  assert.equal(validateImageFile({ type: 'image/gif', size: 10 }), 'type');
});

test('la liste s’élargit au site d’appel, sans déplacer le défaut', () => {
  // La couture que les deux apps utilisent : miss-carbook (GIF), mister-puzzle
  // (GIF, AVIF, HEIC, HEIF). Sans elle, chacune reperdrait sa promesse écran.
  const gif = { type: 'image/gif', size: 10 };
  assert.equal(
    validateImageFile(gif, {
      acceptedTypes: [...IMAGE_ACCEPTED_TYPES, 'image/gif'],
    }),
    null
  );
  assert.equal(validateImageFile(gif), 'type', 'le défaut ne doit pas bouger');
});

/* ── Les deux constantes de dimension, et pourquoi elles diffèrent ──────── */

test('le départ de la compression est AU-DESSUS du plafond d’affichage', () => {
  // Elles ont divergé par accident : `compressImageToMaxBytes` codait 2560 en
  // dur pendant que sa voisine lisait la constante à 2048, sous le même nom
  // d'option `maxDimension`. La divergence est maintenant intentionnelle et
  // nommée — ce test empêche qu'on la « corrige » en les unifiant.
  assert.ok(
    IMAGE_COMPRESS_START_DIMENSION > IMAGE_MAX_DIMENSION,
    'viser un budget d’octets autorise à partir plus haut : voir l’en-tête'
  );
});

test('les qualités descendent, sans trou ni doublon', () => {
  const trie = [...COMPRESS_QUALITIES].sort((a, b) => b - a);
  assert.deepEqual([...COMPRESS_QUALITIES], trie);
  assert.equal(new Set(COMPRESS_QUALITIES).size, COMPRESS_QUALITIES.length);
});

/* ── Les coutures : de quoi observer la décision ────────────────────────── */

/**
 * Un banc d'essai qui ENREGISTRE chaque tentative. `sizeFor` décide du poids
 * du blob rendu : c'est le seul levier dont un test a besoin pour dessiner un
 * scénario (« rien ne passe », « seule la 3e qualité passe »…).
 */
function bench({ width, height, sizeFor }) {
  const attempts = [];
  let closed = 0;
  return {
    attempts,
    closed: () => closed,
    seams: {
      decode: async () => ({
        width,
        height,
        close: () => {
          closed += 1;
        },
      }),
      render: (_bitmap, w, h) => ({ width: w, height: h }),
      encode: async (frame, quality, type) => {
        attempts.push({ ...frame, quality, type });
        const size = sizeFor(frame, quality);
        return size === null ? null : { size };
      },
    },
  };
}

const FILE = { name: 'photo de vacances.HEIC', type: 'image/heic', size: 9e6 };

test('la qualité est dégradée AVANT la taille', () => {
  // Le premier palier épuise les dix qualités à taille constante ; ce n'est
  // qu'ensuite que l'image rétrécit.
  const b = bench({ width: 4000, height: 3000, sizeFor: () => 9e9 });
  return compressImageToMaxBytes(FILE, 1000, b.seams).then(
    () => assert.fail('aucune taille ne devait passer'),
    () => {
      const premierPalier = b.attempts.filter(
        a => a.width === b.attempts[0].width
      );
      assert.equal(premierPalier.length, COMPRESS_QUALITIES.length);
      assert.deepEqual(
        premierPalier.map(a => a.quality),
        [...COMPRESS_QUALITIES]
      );
    }
  );
});

test('la première tentative part du plafond de compression, pas de celui d’affichage', async () => {
  const b = bench({ width: 4000, height: 3000, sizeFor: () => 10 });
  await compressImageToMaxBytes(FILE, 1000, b.seams);
  assert.deepEqual(
    { width: b.attempts[0].width, height: b.attempts[0].height },
    fitWithin(4000, 3000, IMAGE_COMPRESS_START_DIMENSION)
  );
});

test('le premier blob sous le budget gagne, et rien n’est essayé après', async () => {
  const seuil = COMPRESS_QUALITIES[2];
  const b = bench({
    width: 4000,
    height: 3000,
    sizeFor: (_f, quality) => (quality <= seuil ? 500 : 9e9),
  });
  const out = await compressImageToMaxBytes(FILE, 1000, {
    ...b.seams,
    now: () => 1234,
  });
  assert.equal(b.attempts.length, 3, 'la recherche doit s’arrêter net');
  assert.equal(b.attempts.at(-1).quality, seuil);
  assert.equal(out.type, 'image/jpeg');
  assert.equal(out.lastModified, 1234);
});

test('le nom de sortie est assaini et perd son extension d’origine', async () => {
  const b = bench({ width: 100, height: 100, sizeFor: () => 10 });
  const out = await compressImageToMaxBytes(FILE, 1000, b.seams);
  // « photo de vacances.HEIC » → les espaces deviennent `_`, l'extension est
  // remplacée : le fichier rendu est un JPEG, son nom doit le dire.
  assert.equal(out.name, 'photo_de_vacances.jpg');
});

test('un encodeur qui refuse le format ne fait pas passer un blob vide', async () => {
  // `toBlob` rend `null` quand le navigateur ne sait pas encoder le type
  // demandé. Confondre ça avec « c'est tout petit, ça passe » livrerait un
  // fichier de 0 octet à l'utilisateur.
  const b = bench({ width: 100, height: 100, sizeFor: () => null });
  await assert.rejects(compressImageToMaxBytes(FILE, 1000, b.seams), /dwc/);
});

test('la descente s’arrête, et le bitmap est libéré même en échec', async () => {
  const b = bench({ width: 4000, height: 3000, sizeFor: () => 9e9 });
  await assert.rejects(
    compressImageToMaxBytes(FILE, 1000, b.seams),
    /Impossible d’obtenir une image/
  );
  const paliers = [...new Set(b.attempts.map(a => a.width))];
  assert.ok(paliers.length > 1, 'l’image doit rétrécir quand rien ne passe');
  assert.deepEqual(
    paliers,
    [...paliers].sort((x, y) => y - x),
    'les paliers doivent décroître'
  );
  // Le plancher vaut 320 px et la boucle s'arrête APRÈS l'avoir franchi : un
  // seul palier passe sous la barre, et c'est le dernier. Se contenter d'un
  // « pas trop petit » laisserait passer un plancher déplacé à 40 px.
  assert.equal(
    paliers.filter(p => p <= 320).length,
    1,
    'un seul palier doit franchir le plancher de 320 px'
  );
  assert.ok(paliers.at(-1) <= 320, 'et ce palier doit être le dernier');
  assert.equal(b.closed(), 1, 'un bitmap non libéré retient sa mémoire');
});

test('compressImageToMaxBytes suit un maxDimension explicite', async () => {
  // Le défaut est éprouvé plus haut ; reste à prouver que l'option est LUE.
  // C'est précisément ce qui manquait quand le 2560 était écrit dans le corps
  // de la fonction au lieu d'être une constante nommée.
  const b = bench({ width: 4000, height: 3000, sizeFor: () => 10 });
  await compressImageToMaxBytes(FILE, 1000, { ...b.seams, maxDimension: 800 });
  assert.deepEqual(
    { width: b.attempts[0].width, height: b.attempts[0].height },
    fitWithin(4000, 3000, 800)
  );
});

test('un blob de 0 octet ne passe pas pour « sous le budget »', async () => {
  // `0 <= maxBytes` est vrai. Sans le garde `size > 0`, une surface vide
  // serait livrée à l'utilisateur avec l'air d'un succès — un fichier .jpg
  // que rien n'ouvre.
  const b = bench({ width: 100, height: 100, sizeFor: () => 0 });
  await assert.rejects(
    compressImageToMaxBytes(FILE, 1000, b.seams),
    /Impossible d’obtenir une image/
  );
  assert.equal(
    b.attempts.length,
    COMPRESS_QUALITIES.length,
    'chaque qualité doit avoir été essayée et refusée'
  );
});

test('un nom vide, absent ou réduit à son extension retombe sur « photo »', async () => {
  const b = bench({ width: 100, height: 100, sizeFor: () => 10 });
  // `.jpeg` compte : retirer l'extension d'un nom qui n'est QUE son extension
  // ne laisse rien, et un fichier nommé `.jpg` serait caché sous Unix.
  for (const name of ['', undefined, null, '.jpeg']) {
    const out = await compressImageToMaxBytes({ ...FILE, name }, 1000, b.seams);
    assert.equal(out.name, 'photo.jpg', `nom d’origine : ${String(name)}`);
  }
});

test('un nom d’espaces donne « _ », pas le repli « photo »', async () => {
  // Les séparateurs sont assainis AVANT le test de vacuité : trois espaces
  // deviennent un `_`, qui est un tronc non vide. Comportement réel et sans
  // danger — noté ici pour qu'on ne le prenne pas plus tard pour une
  // régression du repli.
  const b = bench({ width: 100, height: 100, sizeFor: () => 10 });
  const out = await compressImageToMaxBytes(
    { ...FILE, name: '   ' },
    1000,
    b.seams
  );
  assert.equal(out.name, '_.jpg');
});

test('un nom à rallonge est tronqué, extension retirée d’abord', async () => {
  const b = bench({ width: 100, height: 100, sizeFor: () => 10 });
  const out = await compressImageToMaxBytes(
    { ...FILE, name: `${'a'.repeat(200)}.jpeg` },
    1000,
    b.seams
  );
  // 80 caractères comptés sur le tronc, pas sur le nom complet : tronquer
  // avant de retirer l'extension laisserait un « .jpe » collé au bout.
  assert.equal(out.name, `${'a'.repeat(80)}.jpg`);
});

test('une image illisible donne un message actionnable, qui ne promet aucun format refusé', async () => {
  // Le message disait « Essayez un autre fichier (JPEG, PNG, WebP ou GIF) » :
  // il annonçait à l'UTILISATEUR un format que le défaut de validation de ce
  // module refuse. Ce module ne connaît pas la liste de son appelant — il ne
  // peut nommer sans risque que le plancher, que toute app accepte.
  await assert.rejects(
    compressImageToMaxBytes(FILE, 1000, {
      decode: async () => {
        throw new Error('boom');
      },
    }),
    err => {
      assert.match(err.message, /Essayez une photo JPEG ou PNG/);
      assert.doesNotMatch(err.message, /GIF/);
      return true;
    }
  );
});

test('des dimensions nulles sont refusées avant tout dessin', async () => {
  const b = bench({ width: 0, height: 0, sizeFor: () => 10 });
  await assert.rejects(
    compressImageToMaxBytes(FILE, 1000, b.seams),
    /dimensions nulles/
  );
  assert.equal(b.attempts.length, 0);
  assert.equal(b.closed(), 1);
});

/* ── Le retrait des métadonnées ─────────────────────────────────────────── */

test('stripImageMetadata plafonne à la dimension d’AFFICHAGE', async () => {
  const b = bench({ width: 4000, height: 3000, sizeFor: () => 10 });
  await stripImageMetadata({}, b.seams);
  assert.deepEqual(
    { width: b.attempts[0].width, height: b.attempts[0].height },
    fitWithin(4000, 3000, IMAGE_MAX_DIMENSION)
  );
});

test('stripImageMetadata rend du WebP à 0,85 par défaut', async () => {
  const b = bench({ width: 100, height: 100, sizeFor: () => 10 });
  await stripImageMetadata({}, b.seams);
  assert.equal(b.attempts[0].type, 'image/webp');
  assert.equal(b.attempts[0].quality, 0.85);
});

test('stripImageMetadata libère le bitmap même si le dessin échoue', async () => {
  const b = bench({ width: 100, height: 100, sizeFor: () => 10 });
  await assert.rejects(
    stripImageMetadata(
      {},
      {
        ...b.seams,
        render: () => {
          throw new Error('[dwc] Canvas 2D indisponible.');
        },
      }
    ),
    /Canvas 2D indisponible/
  );
  assert.equal(b.closed(), 1);
});

test('un ré-encodage refusé lève au lieu de rendre null', async () => {
  const b = bench({ width: 100, height: 100, sizeFor: () => null });
  await assert.rejects(stripImageMetadata({}, b.seams), /ré-encodage/);
});

test('stripImageMetadata suit ses options plutôt que ses défauts', async () => {
  // Les trois défauts sont éprouvés juste au-dessus — mais un défaut testé ne
  // prouve pas que l'option est LUE : une valeur codée en dur dans le corps
  // passerait ces deux tests sans broncher. Il faut donc les faire diverger.
  const b = bench({ width: 4000, height: 3000, sizeFor: () => 10 });
  await stripImageMetadata(
    {},
    { ...b.seams, maxDimension: 512, type: 'image/png', quality: 0.4 }
  );
  assert.deepEqual(
    { width: b.attempts[0].width, height: b.attempts[0].height },
    fitWithin(4000, 3000, 512)
  );
  assert.equal(b.attempts[0].type, 'image/png');
  assert.equal(b.attempts[0].quality, 0.4);
});

test('une bande 1 × 5000 traverse stripImageMetadata sans côté nul', async () => {
  // Le plancher est prouvé sur `fitWithin`, mais c'est le CÂBLAGE qui avait
  // lâché chez bac-sable : la géométrie était juste et la fonction appelait
  // quand même `toBlob` sur un canvas de largeur 0, qui échoue en silence.
  const b = bench({ width: 1, height: 5000, sizeFor: () => 10 });
  await stripImageMetadata({}, b.seams);
  assert.equal(b.attempts[0].width, 1, 'la largeur ne doit pas arrondir à 0');
  assert.equal(b.attempts[0].height, IMAGE_MAX_DIMENSION);
});
