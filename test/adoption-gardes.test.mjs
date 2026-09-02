// LES GARDES : ce qu'une app garde à elle, et la raison écrite.
//
// Une garde retire une ligne du décompte de dette. C'est utile — sans elle, le
// chiffre mesure aussi le travail impossible — et c'est exactement pour ça
// qu'elle doit coûter quelque chose : une clé bien formée, une app qui existe,
// un besoin que la table connaît, et une raison qu'on peut relire.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EQUIVALENTS,
  GARDES,
  garde,
} from '../scripts/adoption-equivalents.mjs';
import { findDuplicates } from '../scripts/adoption-scan.mjs';
import { FAMILY_APPS } from '../apps-catalog.js';

const APPS = new Set(FAMILY_APPS.map(app => app.id));

test('chaque garde nomme une app du catalogue et un besoin de la table', () => {
  for (const cle of Object.keys(GARDES)) {
    const [appId, exported, ...reste] = cle.split(':');
    assert.equal(reste.length, 0, `clé mal formée : ${cle}`);
    assert.ok(APPS.has(appId), `${cle} : « ${appId} » n'est pas une app`);
    assert.ok(
      Object.hasOwn(EQUIVALENTS, exported),
      `${cle} : « ${exported} » n'est pas un besoin de la table`
    );
  }
});

test('une garde sans raison lisible est refusée — un oubli déguisé', () => {
  for (const [cle, raison] of Object.entries(GARDES)) {
    assert.equal(
      typeof raison,
      'string',
      `${cle} : la raison doit être écrite`
    );
    assert.ok(
      raison.trim().length >= 30,
      `${cle} : « ${raison} » n'explique rien`
    );
    assert.ok(
      !/^(non|refus|pas d'adoption|à garder)\.?$/i.test(raison.trim()),
      `${cle} : « ${raison} » répète la décision au lieu de la motiver`
    );
  }
});

test('`garde` répond pour la paire exacte, et pour elle seule', () => {
  assert.match(
    garde('mister-cim10', 'AppHeader') ?? '',
    /slogan|route/,
    'la garde de cim10 dit pourquoi'
  );
  assert.equal(garde('miss-genius', 'AppHeader'), undefined);
  assert.equal(garde('mister-cim10', 'Card'), undefined);
});

/** État minimal : une app qui déclare un composant portant le nom guetté. */
const etat = (appId, fichier, kept = []) => ({
  appId,
  garde,
  onKept: g => kept.push(g),
  symbols: new Set(),
  sourceFile: new Map([[fichier, `/tmp/${fichier}`]]),
  declares: new Map(),
  read: () => 'export function X() {}',
  toPath: path => path,
});

test('une garde sort du décompte et remonte par `onKept`, avec sa raison', () => {
  const rule = { AppHeader: { files: ['AppHeader.tsx'] } };

  const gardees = [];
  const rien = findDuplicates(
    etat('mister-cim10', 'AppHeader.tsx', gardees),
    rule
  );
  assert.deepEqual(rien, [], 'gardé : ce n’est pas une dette');
  assert.equal(gardees.length, 1);
  assert.equal(gardees[0].exported, 'AppHeader');
  assert.match(gardees[0].reason, /slogan/);

  // La même copie, dans une app sans garde, reste une dette.
  const autres = [];
  const dette = findDuplicates(
    etat('miss-genius', 'AppHeader.tsx', autres),
    rule
  );
  assert.deepEqual(dette, [{ exported: 'AppHeader', file: 'AppHeader.tsx' }]);
  assert.deepEqual(autres, []);
});

test('sans `appId`, rien n’est gardé — un appelant qui l’ignore mesure comme avant', () => {
  const state = etat('mister-cim10', 'AppHeader.tsx');
  delete state.appId;
  const trouves = findDuplicates(state, {
    AppHeader: { files: ['AppHeader.tsx'] },
  });
  assert.deepEqual(trouves, [{ exported: 'AppHeader', file: 'AppHeader.tsx' }]);
});

test('`AppUpdates` acquitte `UpdatePromptBanner` : rendre le bandeau par le fournisseur est une adoption', () => {
  assert.ok(EQUIVALENTS.UpdatePromptBanner.symbols.includes('AppUpdates'));
  const trouves = findDuplicates(
    {
      symbols: new Set(['AppUpdates']),
      sourceFile: new Map([['UpdatePrompt.tsx', '/tmp/UpdatePrompt.tsx']]),
      declares: new Map(),
    },
    { UpdatePromptBanner: EQUIVALENTS.UpdatePromptBanner }
  );
  assert.deepEqual(trouves, []);
});
