// Le rappel de sauvegarde : une clé par application, et un rappel tous les
// sept jours tant qu'aucune sauvegarde ni « plus tard » n'est récent.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKUP_REMINDER_DAYS,
  backupStateKey,
  isBackupReminderDue,
  markBackupDone,
  readBackupState,
  snoozeBackupReminder,
} from '../backup-reminder.js';

function memoire() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

const JOUR = 86_400_000;
const T0 = new Date('2026-11-07T10:00:00Z');
const plus = jours => new Date(T0.getTime() + jours * JOUR);

test('une clé PAR application : l’origine est partagée par la famille', () => {
  assert.equal(backupStateKey('miss-genius'), 'dwc_backup:miss-genius');
  const s = memoire();
  markBackupDone('miss-genius', T0, s);
  assert.deepEqual(readBackupState('miss-dice', s), {
    last: null,
    snoozed: null,
  });
  assert.equal(readBackupState('miss-genius', s).last, T0.toISOString());
});

test('jamais sauvegardé, avec des données : il faut rappeler', () => {
  assert.equal(
    isBackupReminderDue({ last: null, snoozed: null }, { now: T0 }),
    true
  );
});

test('sans données, ou rappel éteint : silence', () => {
  const vide = { last: null, snoozed: null };
  assert.equal(isBackupReminderDue(vide, { now: T0, hasData: false }), false);
  assert.equal(isBackupReminderDue(vide, { now: T0, days: false }), false);
});

test('une sauvegarde ou un « plus tard » tait le rappel sept jours', () => {
  const s = memoire();
  markBackupDone('x', T0, s);
  const apres = readBackupState('x', s);
  assert.equal(BACKUP_REMINDER_DAYS, 7);
  assert.equal(isBackupReminderDue(apres, { now: plus(6) }), false);
  assert.equal(isBackupReminderDue(apres, { now: plus(7) }), true);

  snoozeBackupReminder('x', plus(7), s);
  const reporte = readBackupState('x', s);
  assert.equal(reporte.last, T0.toISOString(), 'le report garde la sauvegarde');
  assert.equal(isBackupReminderDue(reporte, { now: plus(13) }), false);
  assert.equal(isBackupReminderDue(reporte, { now: plus(14) }), true);
});

test('un état illisible ou un stockage absent ne fait pas planter', () => {
  const s = memoire();
  s.setItem(backupStateKey('x'), '{pas du json');
  assert.deepEqual(readBackupState('x', s), { last: null, snoozed: null });
  assert.deepEqual(readBackupState('x', null), { last: null, snoozed: null });
  assert.doesNotThrow(() => markBackupDone('x', T0, null));
});
