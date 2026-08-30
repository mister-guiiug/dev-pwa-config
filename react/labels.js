import { createContext, createElement, useContext, useMemo } from 'react';

/**
 * Libellés des composants du paquet, en français et en anglais.
 *
 * LE PROBLÈME. Onze libellés étaient codés en dur en français dans six
 * composants (`'Fermer'`, `'Réessayer'`, `'Plus tard'`…). Tous étaient
 * surchargeables par prop — mais aucun pont n'existait avec `createI18n`, que
 * huit apps utilisent : chacune recâblait donc les mêmes onze chaînes, à la
 * main, dans chaque écran qui monte un composant.
 *
 * POURQUOI UN CONTEXTE À PART, et pas celui de `createI18n`. `createI18n`
 * fabrique un contexte ISOLÉ par app, avec son propre dictionnaire métier : le
 * paquet ne peut pas le lire, et n'a pas à imposer ses clés dedans. Ce contexte
 * n'est donc chargé que des libellés des composants — une quinzaine de chaînes,
 * rien d'autre.
 *
 * TROIS NIVEAUX, dans cet ordre : la **prop** l'emporte toujours, puis le
 * **contexte**, puis le **français par défaut**. Une app qui ne fait rien
 * obtient exactement ce qu'elle avait avant — aucune rupture.
 *
 *   import { LabelsProvider } from '@mister-guiiug/dev-wpa-config/react/labels';
 *
 *   const { locale } = useI18n();          // le i18n de l'app
 *   <LabelsProvider locale={locale}>…</LabelsProvider>
 *
 * Pour changer un mot sans changer de langue :
 *
 *   <LabelsProvider locale="fr" overrides={{ sheet: { close: 'Retour' } }}>
 */

/** @type {Record<string, Record<string, Record<string, string>>>} */
export const LABELS = {
  fr: {
    sheet: { close: 'Fermer' },
    confirm: {
      confirm: 'Confirmer',
      cancel: 'Annuler',
      destructiveConfirm: 'Supprimer',
      // Mode mono-action : le bouton prend acte, il ne « confirme » rien.
      ok: 'OK',
    },
    toast: { close: 'Fermer la notification', region: 'Notifications' },
    error: { retry: 'Réessayer', close: 'Fermer' },
    install: {
      title: 'Installer l’application',
      description:
        'Ajoutez cette application à votre écran d’accueil : accès rapide, hors-ligne.',
      install: 'Installer',
      dismiss: 'Plus tard',
    },
    update: {
      title: 'Mise à jour disponible',
      update: 'Recharger',
      updating: 'Mise à jour…',
      snooze: 'Plus tard',
      dismiss: 'Plus tard',
      force: 'Forcer la mise à jour',
      forceHint:
        'Vide le cache de l’application et recharge. Vos données sont conservées.',
    },
    footer: { source: 'Code source', sponsor: 'M’offrir un café' },
    share: {
      label: 'Partager',
      copied: 'Lien copié',
      failed: 'Partage impossible',
    },
    version: {
      label: 'Version',
      updated: 'Mis à jour vers {version}',
      available: 'Version {version} disponible',
      built: 'Compilée le {date}',
      release: 'Notes de version',
    },
    apps: {
      repo: 'Code source de {app}',
      source: 'Code source',
      sponsor: 'M’offrir un café',
      otherApps: 'Nos autres applications',
    },
    maturity: { alpha: 'Alpha', beta: 'Bêta', stable: 'Stable' },
    sync: {
      synced: 'Synchronisé',
      pending: 'En attente',
      offline: 'Hors ligne',
      error: 'Erreur',
    },
    guard: {
      offline: 'Indisponible hors ligne',
      readonly: 'Données non synchronisées — action indisponible',
    },
    theme: {
      label: 'Thème',
      light: 'clair',
      dark: 'sombre',
      system: 'système',
      next: 'Thème : {current}. Activer le thème {next}.',
    },
    nav: {
      label: 'Navigation principale',
      current: 'Page actuelle',
      more: 'Plus',
    },
  },
  en: {
    sheet: { close: 'Close' },
    confirm: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      destructiveConfirm: 'Delete',
      ok: 'OK',
    },
    toast: { close: 'Dismiss notification', region: 'Notifications' },
    error: { retry: 'Try again', close: 'Dismiss' },
    install: {
      title: 'Install the app',
      description:
        'Add this app to your home screen: quick access, works offline.',
      install: 'Install',
      dismiss: 'Not now',
    },
    update: {
      title: 'Update available',
      update: 'Reload',
      updating: 'Updating…',
      snooze: 'Later',
      dismiss: 'Later',
      force: 'Force update',
      forceHint: 'Clears the app cache and reloads. Your data is kept.',
    },
    footer: { source: 'Source code', sponsor: 'Buy me a coffee' },
    share: {
      label: 'Share',
      copied: 'Link copied',
      failed: 'Sharing failed',
    },
    version: {
      label: 'Version',
      updated: 'Updated to {version}',
      available: 'Version {version} available',
      built: 'Built on {date}',
      release: 'Release notes',
    },
    apps: {
      repo: 'Source code for {app}',
      source: 'Source code',
      sponsor: 'Buy me a coffee',
      otherApps: 'Our other apps',
    },
    maturity: { alpha: 'Alpha', beta: 'Beta', stable: 'Stable' },
    sync: {
      synced: 'Synced',
      pending: 'Pending',
      offline: 'Offline',
      error: 'Error',
    },
    guard: {
      offline: 'Unavailable while offline',
      readonly: 'Data not synced — action unavailable',
    },
    theme: {
      label: 'Theme',
      light: 'light',
      dark: 'dark',
      system: 'system',
      next: 'Theme: {current}. Switch to the {next} theme.',
    },
    nav: { label: 'Main navigation', current: 'Current page', more: 'More' },
  },
};

export const DEFAULT_LOCALE = 'fr';

const LabelsContext = createContext(null);

/** Fusionne un jeu de libellés avec des surcharges, groupe par groupe. */
export function mergeLabels(base, overrides = {}) {
  const out = {};
  for (const [group, entries] of Object.entries(base)) {
    out[group] = { ...entries, ...(overrides[group] ?? {}) };
  }
  for (const [group, entries] of Object.entries(overrides)) {
    if (!(group in out)) out[group] = { ...entries };
  }
  return out;
}

/**
 * Fournit les libellés aux composants du paquet.
 *
 * @param {{ locale?: string, overrides?: object, children?: unknown }} props
 */
export function LabelsProvider(props = {}) {
  const { locale = DEFAULT_LOCALE, overrides, children } = props;
  const value = useMemo(() => {
    // Une locale inconnue retombe sur le français plutôt que sur un objet vide :
    // un libellé manquant est un bouton sans nom accessible.
    const base = LABELS[locale] ?? LABELS[DEFAULT_LOCALE];
    return overrides ? mergeLabels(base, overrides) : base;
  }, [locale, overrides]);
  return createElement(LabelsContext.Provider, { value }, children);
}

/**
 * Libellés d'un groupe. Utilisable HORS provider : renvoie alors le français,
 * ce que les composants faisaient déjà en dur.
 *
 * @param {string} group
 */
export function useLabels(group) {
  const ctx = useContext(LabelsContext);
  const source = ctx ?? LABELS[DEFAULT_LOCALE];
  return source[group] ?? LABELS[DEFAULT_LOCALE][group] ?? {};
}
