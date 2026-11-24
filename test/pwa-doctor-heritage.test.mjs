// `pwa-doctor` : les visuels reçus du squelette et pas encore refaits
// (`herite-du-squelette`), lus dans les empreintes que le générateur écrit à
// la naissance (`pwaDoctor.heritage`).
//
// Relevé du 24/11/2026 : trois apps servaient l'image de partage du squelette,
// « PWA Starter Kit » sur la carte du hub, des semaines après leur naissance,
// sans que rien ne le dise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  diagnose,
  fichiersHerites,
  format,
  resumeHeritage,
} from '../scripts/pwa-doctor.mjs';

const empreinte = octets => createHash('sha256').update(octets).digest('hex');

/** Les octets d'un « visuel du squelette » : peu importe leur format ici. */
const DU_SQUELETTE = {
  'public/og-image.jpg': Buffer.from('jpeg du squelette'),
  'public/screenshots/narrow.png': Buffer.from('capture narrow du squelette'),
  'public/screenshots/wide.png': Buffer.from('capture wide du squelette'),
  'public/favicon.svg': Buffer.from('<svg>P.</svg>'),
  'public/icons/icon-192.png': Buffer.from('icône 192 du squelette'),
};
const HERITAGE = Object.fromEntries(
  Object.entries(DU_SQUELETTE).map(([c, o]) => [c, empreinte(o)])
);

/**
 * Un dépôt factice : les fichiers (Buffer ou texte), et un package.json.
 * @param {Record<string, Buffer | string>} fichiers
 * @param {Record<string, unknown>} pkg
 * @param {(root: string) => void | Promise<void>} corps
 */
async function depot(fichiers, pkg, corps) {
  const root = mkdtempSync(join(tmpdir(), 'heritage-'));
  try {
    for (const [rel, contenu] of Object.entries(fichiers)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), contenu);
    }
    writeFileSync(join(root, 'package.json'), JSON.stringify(pkg));
    await corps(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const constat = (report, id) => report.findings.find(f => f.id === id);

test('un visuel resté tel que le squelette l’a donné est nommé, avec son geste', async () => {
  await depot(
    DU_SQUELETTE,
    { name: 'miss-neuve', pwaDoctor: { heritage: HERITAGE } },
    root => {
      const f = constat(diagnose(root), 'herite-du-squelette');
      assert.equal(f.level, 'dette');
      // Un dossier qui en porte plusieurs est cité une fois, avec leur nombre.
      assert.equal(
        f.message,
        '5 fichier(s) encore identique(s) à ceux du squelette : public/favicon.svg, public/icons/icon-192.png, public/og-image.jpg, public/screenshots/ (2)'
      );
      // Les gestes, dans l'ordre où les faire : les icônes partent du favicon,
      // l'image de partage montre la capture.
      assert.match(
        f.fix,
        /npm run icons.*npm run screenshots.*npx pwa-og-image.*retirer leur ligne de pwaDoctor\.heritage/
      );
    }
  );
});

test('un visuel refait n’est plus nommé ; le dernier refait, la clé se signale', async () => {
  await depot(
    { ...DU_SQUELETTE, 'public/og-image.jpg': Buffer.from('jpeg de l’app') },
    { name: 'miss-en-cours', pwaDoctor: { heritage: HERITAGE } },
    root => {
      const f = constat(diagnose(root), 'herite-du-squelette');
      assert.match(f.message, /^4 fichier/);
      assert.ok(!f.message.includes('og-image'));
      assert.ok(
        !f.fix.includes('pwa-og-image'),
        'pas de geste pour un fichier refait'
      );
    }
  );
  await depot(
    { 'public/og-image.jpg': Buffer.from('jpeg de l’app') },
    { name: 'miss-faite', pwaDoctor: { heritage: HERITAGE } },
    root => {
      const report = diagnose(root);
      assert.equal(constat(report, 'herite-du-squelette'), undefined);
      const solde = constat(report, 'heritage-solde');
      assert.equal(solde.level, 'info');
      assert.equal(solde.fix, 'retirer pwaDoctor.heritage de package.json');
    }
  );
});

test('le refus posé à la naissance garde la liste visible, puis se dit périmé', async () => {
  const refus = {
    'herite-du-squelette':
      'née du générateur avec les visuels du squelette : les refaire, puis retirer cette ligne.',
  };
  await depot(
    DU_SQUELETTE,
    { name: 'miss-neuve', pwaDoctor: { heritage: HERITAGE, refus } },
    root => {
      const report = diagnose(root);
      const f = constat(report, 'herite-du-squelette');
      assert.equal(f.level, 'refus');
      assert.match(f.message, /public\/og-image\.jpg/);
      assert.match(format(report), /refusé ici : née du générateur/);
    }
  );
  await depot(
    {},
    { name: 'miss-faite', pwaDoctor: { heritage: HERITAGE, refus } },
    root => {
      const report = diagnose(root);
      assert.equal(
        constat(report, 'refus-perime-herite-du-squelette').level,
        'info'
      );
      assert.equal(constat(report, 'heritage-solde').level, 'info');
    }
  );
});

test('sans pwaDoctor.heritage, le contrôle se tait (le squelette, une app ancienne)', async () => {
  await depot(DU_SQUELETTE, { name: 'pwa-starter-kit' }, root => {
    const report = diagnose(root);
    assert.equal(constat(report, 'herite-du-squelette'), undefined);
    assert.equal(constat(report, 'heritage-solde'), undefined);
  });
});

test('une entrée mal formée est ignorée, jamais lue hors du dépôt', async () => {
  const ailleurs = mkdtempSync(join(tmpdir(), 'heritage-ailleurs-'));
  try {
    writeFileSync(join(ailleurs, 'secret.txt'), 'hors du dépôt');
    await depot(DU_SQUELETTE, { name: 'x' }, root => {
      const relatif = join('..', ailleurs.split(/[\\/]/).pop(), 'secret.txt');
      assert.deepEqual(
        fichiersHerites(root, {
          [relatif]: empreinte(Buffer.from('hors du dépôt')),
          'public/og-image.jpg': 'pas une empreinte',
          'public/favicon.svg': HERITAGE['public/favicon.svg'].toUpperCase(),
          'public/absent.png': HERITAGE['public/og-image.jpg'],
          'public/icons/icon-192.png': HERITAGE['public/icons/icon-192.png'],
        }),
        ['public/icons/icon-192.png']
      );
      assert.deepEqual(fichiersHerites(root, ['public/og-image.jpg']), []);
      assert.deepEqual(fichiersHerites(root, null), []);
    });
  } finally {
    rmSync(ailleurs, { recursive: true, force: true });
  }
});

test('les neuf icônes du squelette font une entrée, pas neuf', () => {
  const icones = [96, 144, 192, 256, 384, 512].map(
    t => `public/icons/icon-${t}.png`
  );
  assert.equal(
    resumeHeritage(['public/favicon.svg', ...icones, 'public/og-image.jpg']),
    'public/favicon.svg, public/icons/ (6), public/og-image.jpg'
  );
  // `public/` lui-même n'est pas résumé : ses fichiers sont des visuels distincts.
  assert.equal(
    resumeHeritage(['public/favicon.svg', 'public/og-image.jpg']),
    'public/favicon.svg, public/og-image.jpg'
  );
  assert.equal(resumeHeritage(['README.md']), 'README.md');
});
