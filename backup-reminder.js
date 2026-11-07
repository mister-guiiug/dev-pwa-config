/**
 * LE RAPPEL DE SAUVEGARDE — quand une application dont la seule copie est sur
 * l'appareil doit-elle dire « pensez à exporter » ?
 *
 * PROMU, PAS INVENTÉ. miss-contraction rappelle tous les sept jours
 * d'exporter son journal (le bandeau « Pensez à exporter une sauvegarde »,
 * `mc_export_nudge_dismissed_at`), et huit applications ont écrit chacune leur
 * export : la carte `react/backup-card` en est la forme commune, ce module en
 * est la règle, sans React, pour qu'une app puisse aussi l'afficher ailleurs.
 *
 * L'ÉTAT EST PAR APPLICATION. Les applications partagent l'origine, donc le
 * `localStorage` : une clé nue (`dwc_backup`) ferait croire à toutes qu'une
 * seule a été sauvegardée. La clé porte donc l'identifiant de l'app.
 */

/** Jours entre deux rappels, comme le bandeau de miss-contraction. */
export const BACKUP_REMINDER_DAYS = 7;

const JOUR = 86_400_000;

/** La clé de l'état de sauvegarde d'une app : `dwc_backup:<app>`. */
export function backupStateKey(app) {
  return `dwc_backup:${app}`;
}

function stockageParDefaut() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const date = valeur => {
  if (typeof valeur !== 'string') return null;
  return Number.isNaN(Date.parse(valeur)) ? null : valeur;
};

/**
 * La dernière sauvegarde et le dernier « plus tard » d'une app, en dates ISO.
 *
 * @param {string} app
 * @param {Storage | null} [storage]
 * @returns {{ last: string | null, snoozed: string | null }}
 */
export function readBackupState(app, storage = stockageParDefaut()) {
  try {
    const lu = JSON.parse(storage?.getItem(backupStateKey(app)) ?? 'null');
    return { last: date(lu?.last), snoozed: date(lu?.snoozed) };
  } catch {
    return { last: null, snoozed: null };
  }
}

function ecrire(app, etat, storage) {
  try {
    storage?.setItem(backupStateKey(app), JSON.stringify(etat));
    return true;
  } catch {
    return false;
  }
}

/** Une sauvegarde vient d'être exportée. */
export function markBackupDone(
  app,
  now = new Date(),
  storage = stockageParDefaut()
) {
  const etat = { ...readBackupState(app, storage), last: now.toISOString() };
  ecrire(app, etat, storage);
  return etat;
}

/** « Plus tard » : le rappel se tait pour un cycle. */
export function snoozeBackupReminder(
  app,
  now = new Date(),
  storage = stockageParDefaut()
) {
  const etat = { ...readBackupState(app, storage), snoozed: now.toISOString() };
  ecrire(app, etat, storage);
  return etat;
}

/**
 * Faut-il rappeler ? Oui s'il y a des données, et que ni une sauvegarde ni un
 * « plus tard » ne date de moins de `days` jours. `days: false` éteint le
 * rappel.
 *
 * @param {{ last: string | null, snoozed: string | null }} state
 * @param {{ now?: Date, days?: number | false, hasData?: boolean }} [options]
 */
export function isBackupReminderDue(state, options = {}) {
  const {
    now = new Date(),
    days = BACKUP_REMINDER_DAYS,
    hasData = true,
  } = options;
  if (!hasData || days === false) return false;
  const reperes = [state?.last, state?.snoozed]
    .filter(Boolean)
    .map(v => Date.parse(v));
  if (reperes.length === 0) return true;
  return now.getTime() - Math.max(...reperes) >= days * JOUR;
}
