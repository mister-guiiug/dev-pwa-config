import { createElement as h, useEffect, useId, useRef, useState } from 'react';
import { useLabels } from './labels-core.js';
import { ConfirmDialog } from './confirm-dialog.js';
import { dateSlug, downloadJson } from '../download.js';
import {
  BACKUP_REMINDER_DAYS,
  isBackupReminderDue,
  markBackupDone,
  readBackupState,
  snoozeBackupReminder,
} from '../backup-reminder.js';
import {
  isStoragePersisted,
  requestPersistentStorage,
} from '../persistent-storage.js';

const remplir = (modele, valeurs) =>
  String(modele).replace(/\{(\w+)\}/g, (_, nom) => String(valeurs[nom] ?? ''));

function dateLisible(iso) {
  try {
    const langue =
      (typeof document !== 'undefined' && document.documentElement.lang) ||
      undefined;
    return new Intl.DateTimeFormat(langue, { dateStyle: 'long' }).format(
      new Date(iso)
    );
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Le rappel de sauvegarde d'une app, pour l'afficher où l'utilisateur passe
 * (l'accueil), en plus de la carte des réglages.
 *
 * @param {string} app
 * @param {{ days?: number | false, hasData?: boolean }} [options]
 */
export function useBackupReminder(app, options = {}) {
  const { days = BACKUP_REMINDER_DAYS, hasData = true } = options;
  const [etat, setEtat] = useState(() => readBackupState(app));
  return {
    last: etat.last,
    due: isBackupReminderDue(etat, { days, hasData }),
    snooze: () => setEtat(snoozeBackupReminder(app)),
    markDone: () => setEtat(markBackupDone(app)),
  };
}

/**
 * LA CARTE « SAUVEGARDE » DES RÉGLAGES — exporter, importer, savoir de quand
 * date la dernière sauvegarde, et demander au navigateur de garder les données.
 *
 * PROMUE, PAS INVENTÉE : huit applications ont écrit chacune leur export et
 * leur import (contraction, genius, devises, cim10, molkky, settle, uwh,
 * carbook…), une seule rappelait de s'en servir, et miss-badminton avait perdu
 * le sien sans que rien ne le dise. La carte ne sait rien du stockage de
 * l'app : `exportData` rend ce qu'il faut écrire dans le fichier,
 * `importData` le reprend. Elle sert donc aussi bien un magasin `localStorage`
 * qu'une base IndexedDB.
 *
 * Non stylée au-delà de `components.css` : cibler `[data-dwc="backup-card*"]`.
 *
 * @param {{
 *   app: string,
 *   exportData: () => unknown | Promise<unknown>,
 *   importData?: (data: unknown) => { ok: boolean, problems?: string[] } | void | Promise<{ ok: boolean, problems?: string[] } | void>,
 *   fileName?: string,
 *   reminderDays?: number | false,
 *   hasData?: boolean,
 *   headingLevel?: 2 | 3 | 4,
 *   className?: string,
 * }} props
 */
export function BackupCard(props) {
  const {
    app,
    exportData,
    importData,
    fileName,
    reminderDays = BACKUP_REMINDER_DAYS,
    hasData = true,
    headingLevel = 2,
    className,
  } = props;
  const labels = useLabels('backup');
  const titre = useId();
  const fichier = useRef(null);
  const rappel = useBackupReminder(app, { days: reminderDays, hasData });
  const [message, setMessage] = useState('');
  const [enAttente, setEnAttente] = useState(null);
  const [garde, setGarde] = useState(null);

  useEffect(() => {
    let vivant = true;
    void isStoragePersisted().then(oui => {
      if (vivant) setGarde(oui);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const exporter = async () => {
    try {
      const donnees = await exportData();
      const nom = fileName ?? `${app}-sauvegarde-${dateSlug()}.json`;
      if (downloadJson(donnees, nom)) {
        rappel.markDone();
        setMessage(labels.exported);
      }
    } catch (erreur) {
      setMessage(
        remplir(labels.importFailed, {
          reason: erreur instanceof Error ? erreur.message : String(erreur),
        })
      );
    }
  };

  const lire = async evenement => {
    const choisi = evenement.target.files?.[0];
    evenement.target.value = '';
    if (!choisi) return;
    try {
      setEnAttente(JSON.parse(await choisi.text()));
    } catch {
      setMessage(remplir(labels.importFailed, { reason: labels.unreadable }));
    }
  };

  const importer = async () => {
    const donnees = enAttente;
    setEnAttente(null);
    try {
      const resultat = await importData?.(donnees);
      if (resultat && resultat.ok === false) {
        setMessage(
          remplir(labels.importFailed, {
            reason: (resultat.problems ?? []).join(' ; ') || labels.unreadable,
          })
        );
        return;
      }
      setMessage(labels.imported);
    } catch (erreur) {
      setMessage(
        remplir(labels.importFailed, {
          reason: erreur instanceof Error ? erreur.message : String(erreur),
        })
      );
    }
  };

  const garder = async () => {
    const accorde = await requestPersistentStorage();
    setGarde(accorde);
    if (accorde === false) setMessage(labels.persistRefused);
  };

  return h(
    'section',
    {
      'data-dwc': 'backup-card',
      'aria-labelledby': titre,
      className,
    },
    h(`h${headingLevel}`, { id: titre }, labels.title),
    h('p', null, labels.description),
    h(
      'p',
      { 'data-dwc': 'backup-card-last' },
      rappel.last
        ? remplir(labels.last, { date: dateLisible(rappel.last) })
        : labels.never,
      rappel.due ? ' ' : null,
      rappel.due
        ? h('strong', { 'data-dwc': 'backup-card-due' }, labels.due)
        : null
    ),
    garde === null
      ? null
      : h(
          'p',
          { 'data-dwc': 'backup-card-persist' },
          garde ? labels.persisted : labels.notPersisted,
          garde
            ? null
            : h(
                'button',
                { type: 'button', onClick: () => void garder() },
                labels.persist
              )
        ),
    h('p', { 'data-dwc': 'backup-card-shared' }, labels.sharedOrigin),
    h(
      'div',
      { 'data-dwc': 'backup-card-actions' },
      h(
        'button',
        { type: 'button', onClick: () => void exporter() },
        labels.export
      ),
      importData
        ? h(
            'button',
            { type: 'button', onClick: () => fichier.current?.click() },
            labels.import
          )
        : null,
      importData
        ? h('input', {
            ref: fichier,
            type: 'file',
            accept: 'application/json,.json',
            hidden: true,
            'aria-hidden': true,
            tabIndex: -1,
            onChange: e => void lire(e),
          })
        : null
    ),
    h('p', { role: 'status', 'data-dwc': 'backup-card-status' }, message),
    h(ConfirmDialog, {
      open: enAttente !== null,
      title: labels.importConfirm,
      confirmLabel: labels.importConfirmLabel,
      destructive: true,
      onConfirm: () => void importer(),
      onCancel: () => setEnAttente(null),
    })
  );
}
