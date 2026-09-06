/** Ce qu'il faut savoir de l'environnement. Injectable pour les tests. */
export interface InstallEnv {
  userAgent?: string;
  /** `> 1` sur un iPad, `0` sur un Mac : le seul écart qui reste entre eux. */
  maxTouchPoints?: number;
  /** `navigator.standalone`, propriété non standard d'iOS. */
  standalone?: boolean;
  /** `navigator.platform`, encore utile pour démasquer un iPad. */
  platformName?: string;
  matchMedia?: (query: string) => { matches: boolean } | null | undefined;
}

/** Comment installer, si `beforeinstallprompt` ne vient jamais. */
export interface InstallFallback {
  /**
   * `instructions` — le navigateur installe, mais sans invite programmable :
   * il faut le dire à l'utilisateur. `unavailable` — soit l'événement va
   * venir (Chromium), soit rien n'est possible (Firefox de bureau, webview) ;
   * dans les deux cas on se tait.
   */
  method: 'instructions' | 'unavailable';
  /** Le libellé d'instructions à choisir : `install.howIos`, `howSafari`… */
  platform: 'ios' | 'safari' | 'generic' | 'chromium' | 'in-app' | 'unknown';
}

/** Quand reproposer, et combien de fois. */
export interface InstallCadence {
  /** Silence après un affichage ou un « Plus tard ». `0` : aucun report. */
  snoozeDays: number;
  /** Nombre total d'invites, report compris. `0` ou moins : sans limite. */
  maxPrompts: number;
  /** Lancements à attendre. `1` (défaut) : dès le premier. */
  minVisits: number;
}

/** L'enregistrement rangé sous {@link INSTALL_STATE_KEY}. */
export interface InstallState {
  v: 1;
  /** Chargements de page comptés depuis le premier. */
  visits: number;
  /** Fois où l'invite a été affichée. */
  shown: number;
  /** Horodatage avant lequel on ne repropose pas. */
  until: number;
  /** Installée, ou refusée définitivement. */
  done: boolean;
}

export type InstallEvent =
  | 'visit'
  | 'shown'
  | 'snooze'
  | 'dismiss'
  | 'installed';

export interface InstallStateOptions {
  /** Défaut : {@link INSTALL_STATE_KEY}. */
  key?: string;
  /**
   * L'ancienne clé booléenne à migrer. Défaut : {@link LEGACY_DISMISS_KEY}.
   * À passer par une app qui avait personnalisé `dismissKey`, sinon son refus
   * passé est perdu et l'invite repart de zéro.
   */
  legacyKey?: string;
  /** Défaut : `localStorage`. `sessionStorage` pour ne rien garder. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  cadence?: Partial<InstallCadence>;
  now?: number;
}

export declare const INSTALL_STATE_KEY: string;
export declare const LEGACY_DISMISS_KEY: string;
export declare const DEFAULT_CADENCE: Readonly<InstallCadence>;

/** `true` si la page tourne DEPUIS l'application installée. */
export declare function isAppInstalled(env?: InstallEnv): boolean;

/**
 * `true` si le navigateur connaît l'app comme installée, même dans un onglet.
 * Ne répond que sur Chrome Android, et seulement si le manifeste se déclare
 * dans `related_applications` : sert à CONFIRMER, jamais à infirmer.
 */
export declare function installedRelatedApps(): Promise<boolean>;

/** Comment installer sur ce navigateur, si l'événement natif ne vient pas. */
export declare function installFallback(env?: InstallEnv): InstallFallback;

/** Lit l'état, en tolérant tout ce qu'un stockage peut contenir. */
export declare function readInstallState(
  options?: InstallStateOptions
): InstallState;

/** Écrit l'état ; ne lève jamais si le stockage refuse. */
export declare function writeInstallState(
  state: InstallState,
  options?: InstallStateOptions
): InstallState;

/** La transition, et rien d'autre : n'écrit pas. */
export declare function nextInstallState(
  state: InstallState,
  event: InstallEvent,
  cadence?: Partial<InstallCadence>,
  now?: number
): InstallState;

/**
 * Compte ce lancement — une seule fois par chargement de page, quel que soit
 * le nombre d'appelants — et rend l'état à jour.
 */
export declare function countInstallVisit(
  options?: InstallStateOptions
): InstallState;

/** Faut-il proposer l'installation maintenant ? */
export declare function shouldOfferInstall(
  state: InstallState,
  cadence?: Partial<InstallCadence>,
  now?: number
): boolean;
