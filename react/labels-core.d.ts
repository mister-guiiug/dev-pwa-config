import type { FC, ReactNode } from 'react';

/** Groupes de libellés portés par le paquet. */
export interface LabelGroups {
  sheet: { close: string };
  confirm: {
    confirm: string;
    cancel: string;
    destructiveConfirm: string;
    /** Mode mono-action : le bouton prend acte, il ne « confirme » rien. */
    ok: string;
  };
  toast: { close: string; region: string; undo: string };
  error: { retry: string; close: string };
  install: {
    title: string;
    description: string;
    /** Marche à suivre sur iOS / iPadOS, où aucune invite n'est programmable. */
    howIos: string;
    /** Marche à suivre dans Safari de bureau (« Ajouter au Dock »). */
    howSafari: string;
    /** Marche à suivre ailleurs : le menu du navigateur. */
    howGeneric: string;
    install: string;
    dismiss: string;
  };
  update: {
    title: string;
    update: string;
    updating: string;
    snooze: string;
    dismiss: string;
    /** Seconde sortie du mode `secondaryActions: 'both'`, distincte de `snooze`. */
    ignore: string;
    force: string;
    forceHint: string;
    /** Message « prêt hors ligne », rendu par le bandeau sur `showOfflineReady`. */
    offlineReady: string;
    offlineReadyOk: string;
  };
  footer: { source: string; sponsor: string; issues: string };
  share: { label: string; copied: string; failed: string };
  version: {
    label: string;
    /** `{version}` remplacé par le numéro. */
    updated: string;
    /** `{version}` remplacé par le numéro publié. */
    available: string;
    /** `{date}` remplacé par la date de compilation. */
    built: string;
    release: string;
  };
  apps: {
    repo: string;
    source: string;
    sponsor: string;
    otherApps: string;
  };
  maturity: { alpha: string; beta: string; stable: string };
  sync: { synced: string; pending: string; offline: string; error: string };
  theme: {
    label: string;
    light: string;
    dark: string;
    system: string;
    next: string;
  };
  nav: { label: string; current: string; more: string; back: string };
  auth: {
    title: string;
    signUpTitle: string;
    /** Titre du mode `otp` : « Recevoir un lien de connexion ». */
    otpTitle: string;
    /** Bouton du mode `otp` : « Recevoir un lien ». */
    sendLink: string;
    email: string;
    password: string;
    signIn: string;
    signUp: string;
    mfaTitle: string;
    mfaHint: string;
    mfaCode: string;
    mfaRecoveryCode: string;
    mfaVerify: string;
    mfaRecovery: string;
    mfaUseApp: string;
    signOut: string;
  };
}

/** Surcharges partielles, groupe par groupe. */
export type LabelOverrides = {
  [G in keyof LabelGroups]?: Partial<LabelGroups[G]>;
};

/** Locale de repli : le français, ce que les composants codaient en dur. */
export declare const DEFAULT_LOCALE: string;

/** Le seul dictionnaire embarqué par le noyau : le français. */
export declare const DEFAULT_LABELS: LabelGroups;

/** Fusionne un jeu de libellés avec des surcharges, groupe par groupe. */
export declare function mergeLabels(
  base: LabelGroups,
  overrides?: LabelOverrides
): LabelGroups;

export interface LabelsProviderProps {
  /**
   * `'fr'` par défaut. Le NOYAU ne résout que le français : toute autre locale
   * exige `dictionary`, faute de quoi le français est rendu — et le repli est
   * dit en développement. Pour une résolution automatique des sept langues,
   * importer le provider de `react/labels`.
   */
  locale?: string;
  /**
   * Le dictionnaire à servir, explicitement. C'est la voie légère : une app
   * qui parle espagnol importe `react/labels-es` et le passe ici, sans
   * embarquer les cinq autres langues.
   */
  dictionary?: LabelGroups;
  /** Remplace des libellés sans changer de langue. */
  overrides?: LabelOverrides;
  children?: ReactNode;
}

/** Fournit les libellés des composants du paquet à tout l'arbre. */
export declare const LabelsProvider: FC<LabelsProviderProps>;

/**
 * Libellés d'un groupe. Utilisable HORS provider : renvoie alors le français.
 */
export declare function useLabels<G extends keyof LabelGroups>(
  group: G
): LabelGroups[G];
