/**
 * La décision de `migrate-consumers.mjs` — l'outil qui écrit dans les DIX-SEPT
 * dépôts du parc. C'est le script du dépôt dont une erreur porte le plus loin,
 * et il n'avait aucun test.
 *
 * DEUX DÉFAUTS, constatés le 31/08/2026 en l'utilisant pour aligner les
 * planchers sur la 3.29.0 :
 *
 *   1. Il proposait de modifier `mister-family-map`, qui est un MIROIR publié
 *      à la main depuis `elowner-ax/bac-sable`. Lancé avec `--write`, il y
 *      écrivait une modification interdite — qu'un `npm run mirror` suivant
 *      aurait écrasée en silence, donc sans que personne ne la voie jamais.
 *   2. Il alignait les peerDependencies SANS qu'on le demande. Sur
 *      `mister-quota`, seule app Electron du parc et restée en arrière, cela
 *      transformait « monte le plancher du socle » en cinq montées majeures —
 *      React 18→19, Vite 5→8, TypeScript 5→6, Vitest 2→4, ESLint 8→9.
 *
 * Les deux défauts ont la même forme : un outil qui fait PLUS que ce qu'on lui
 * demande, dans un geste qu'on croit anodin.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MIRRORS,
  PKG_NAME,
  isConsumerDir,
  majorOf,
  planUpdates,
} from '../scripts/migrate-plan.mjs';

/** Un consommateur type : le paquet en devDependencies, plus deux peers. */
const CONSOMMATEUR = {
  dependencies: { react: '^18.3.1' },
  devDependencies: { [PKG_NAME]: '^3.24.0', vite: '^5.4.11' },
};

const PEERS = { react: '^19.0.0', vite: '^8.0.0' };

test('un miroir n’est jamais un consommateur à migrer', () => {
  assert.equal(
    isConsumerDir('mister-family-map', CONSOMMATEUR),
    false,
    'une PR y est interdite : le développement se fait dans le dépôt privé'
  );
  // La source, elle, reste découverte — ce sont deux dossiers distincts.
  assert.equal(isConsumerDir('bac-sable', CONSOMMATEUR), true);
  assert.equal(isConsumerDir('dev-pwa-config', CONSOMMATEUR), false);
});

test('la liste des miroirs n’est pas vide — sinon la garde ne garde rien', () => {
  assert.ok(MIRRORS.size > 0);
  assert.ok(MIRRORS.has('mister-family-map'));
});

test('un dossier qui ne déclare pas le paquet est ignoré', () => {
  assert.equal(isConsumerDir('un-autre-projet', { dependencies: {} }), false);
  assert.equal(isConsumerDir('vide', {}), false);
});

test('par défaut, SEULE la ligne du paquet bouge', () => {
  const plan = planUpdates(CONSOMMATEUR, { target: '^3.29.0', peers: PEERS });
  assert.deepEqual(plan, [
    {
      section: 'devDependencies',
      name: PKG_NAME,
      from: '^3.24.0',
      to: '^3.29.0',
    },
  ]);
});

test('`--peers` reste possible, mais il se demande', () => {
  const plan = planUpdates(CONSOMMATEUR, {
    target: '^3.29.0',
    peers: PEERS,
    withPeers: true,
  });
  const noms = plan.map(u => u.name).sort();
  assert.deepEqual(noms, [PKG_NAME, 'react', 'vite']);
});

test('une app déjà à la cible ne bouge pas', () => {
  const plan = planUpdates(
    { devDependencies: { [PKG_NAME]: '^3.29.0' } },
    { target: '^3.29.0', peers: PEERS, withPeers: true }
  );
  assert.deepEqual(plan, []);
});

test('un peer DÉJÀ au-dessus n’est pas rétrogradé', () => {
  // La comparaison porte sur la majeure : une app en avance sur le socle ne
  // doit pas être ramenée en arrière par un alignement.
  const plan = planUpdates(
    { devDependencies: { [PKG_NAME]: '^3.29.0', vite: '^9.0.0' } },
    { target: '^3.29.0', peers: PEERS, withPeers: true }
  );
  assert.deepEqual(plan, []);
});

test('majorOf lit la majeure, y compris sur un 0.x', () => {
  assert.equal(majorOf('^1.2.3'), 1);
  assert.equal(majorOf('0.469.0'), 0);
  assert.equal(majorOf('~6.0.3'), 6);
  assert.equal(majorOf('latest'), null);
});
