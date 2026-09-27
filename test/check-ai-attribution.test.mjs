import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estExempt,
  findAttribution,
} from '../scripts/check-ai-attribution.mjs';

test('une signature d’assistant est refusée, un co-auteur humain non', () => {
  const assistant = findAttribution(
    'fix: cible\n\nCo-Authored-By: Cursor <cursoragent@cursor.com>\n'
  );
  assert.equal(assistant.length, 1);
  assert.equal(assistant[0].id, 'co-authored-ia');

  const humain = findAttribution(
    'fix: cible\n\nCo-Authored-By: Camille Martin <camille@example.com>\n'
  );
  assert.equal(humain.length, 0);
});

test('les fichiers qui énoncent la règle peuvent citer les motifs', () => {
  assert.equal(estExempt('scripts/check-ai-attribution.mjs'), true);
  assert.equal(estExempt('src/pages/MatchLivePage.tsx'), false);
});
