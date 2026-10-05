/**
 * Primitifs purs de `command.js` — pas de DOM, pas de jsdom.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isEditableTarget,
  isCommandHotkey,
  isSlashHotkey,
  moveActiveIndex,
  itemMatchesQuery,
  filterCommandItems,
} from '../command.js';

/** @param {Partial<KeyboardEvent>} partial */
function keyEvent(partial) {
  return {
    key: '',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: null,
    ...partial,
  };
}

test('isCommandHotkey : Ctrl/Meta+K sans Alt ni Shift', () => {
  assert.equal(isCommandHotkey(keyEvent({ key: 'k', ctrlKey: true })), true);
  assert.equal(isCommandHotkey(keyEvent({ key: 'K', metaKey: true })), true);
  assert.equal(isCommandHotkey(keyEvent({ key: 'k' })), false);
  assert.equal(
    isCommandHotkey(keyEvent({ key: 'k', ctrlKey: true, altKey: true })),
    false
  );
  assert.equal(
    isCommandHotkey(keyEvent({ key: 'k', ctrlKey: true, shiftKey: true })),
    false
  );
  assert.equal(isCommandHotkey(keyEvent({ key: 'p', ctrlKey: true })), false);
});

test('isSlashHotkey : `/` sans modificateur, hors éditable', () => {
  assert.equal(isSlashHotkey(keyEvent({ key: '/' })), true);
  assert.equal(isSlashHotkey(keyEvent({ key: '/', ctrlKey: true })), false);
  assert.equal(isSlashHotkey(keyEvent({ key: '/', metaKey: true })), false);
  assert.equal(isSlashHotkey(keyEvent({ key: '/', altKey: true })), false);
  assert.equal(isSlashHotkey(keyEvent({ key: 'a' })), false);
  assert.equal(
    isSlashHotkey(keyEvent({ key: '/', target: { tagName: 'INPUT' } })),
    false
  );
  assert.equal(
    isSlashHotkey(
      keyEvent({
        key: '/',
        target: { tagName: 'DIV', isContentEditable: true },
      })
    ),
    false
  );
});

test('isEditableTarget : balises et contenteditable', () => {
  assert.equal(isEditableTarget(null), false);
  assert.equal(isEditableTarget(undefined), false);
  assert.equal(isEditableTarget({ tagName: 'INPUT' }), true);
  assert.equal(isEditableTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isEditableTarget({ tagName: 'SELECT' }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV' }), false);
  assert.equal(
    isEditableTarget({ tagName: 'DIV', isContentEditable: true }),
    true
  );
  assert.equal(
    isEditableTarget({
      closest: sel => (sel.includes('input') ? { tagName: 'INPUT' } : null),
    }),
    true
  );
  assert.equal(
    isEditableTarget({
      closest: () => null,
      tagName: 'SPAN',
    }),
    false
  );
});

test('moveActiveIndex : bornes et départ depuis -1', () => {
  assert.equal(moveActiveIndex(0, 0, 1), -1);
  assert.equal(moveActiveIndex(-1, 3, 1), 0);
  assert.equal(moveActiveIndex(-1, 3, -1), 2);
  assert.equal(moveActiveIndex(0, 3, 1), 1);
  assert.equal(moveActiveIndex(2, 3, 1), 2);
  assert.equal(moveActiveIndex(1, 3, -1), 0);
  assert.equal(moveActiveIndex(0, 3, -1), 0);
});

test('itemMatchesQuery : search, label, chaîne', () => {
  assert.equal(itemMatchesQuery('Alpha', ''), true);
  assert.equal(itemMatchesQuery('Alpha', '  '), true);
  assert.equal(itemMatchesQuery('Alpha', 'alp'), true);
  assert.equal(itemMatchesQuery('Alpha', 'z'), false);
  assert.equal(itemMatchesQuery({ label: 'Bouton' }, 'bout'), true);
  assert.equal(
    itemMatchesQuery({ label: 'Bouton', search: 'btn primary' }, 'prim'),
    true
  );
  assert.equal(
    itemMatchesQuery({ label: 'Bouton', search: 'btn primary' }, 'bout'),
    false
  );
});

test('filterCommandItems : match, limite', () => {
  const items = [{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Alpine' }];
  assert.deepEqual(
    filterCommandItems(items, 'alp').map(i => i.label),
    ['Alpha', 'Alpine']
  );
  assert.deepEqual(
    filterCommandItems(items, 'alp', { limit: 1 }).map(i => i.label),
    ['Alpha']
  );
  assert.deepEqual(
    filterCommandItems(items, 'x', {
      match: (item, q) => item.label.startsWith(q.toUpperCase()),
    }),
    []
  );
  assert.deepEqual(filterCommandItems(['a', 'ab', 'c'], 'a'), ['a', 'ab']);
});
