/**
 * Types minimaux pour playwright-base (évite d'importer `@playwright/test`
 * dans dev-pwa-config — peerDep optionnelle). Les objets sont volontairement
 * typés en `Record<string, unknown>` pour rester compatibles cross-version.
 */
export const basePlaywrightOptions: Record<string, unknown>;

/** Matrice 5 navigateurs famille. `devices` vient de `@playwright/test`. */
export function pwaProjects(
  devices: Record<string, unknown>
): Array<Record<string, unknown>>;

/** Reporters multi-format (html + json + junit + list [+ github en CI]). */
export function pwaReporters(): Array<unknown>;

export interface DefinePwaPlaywrightConfigOptions {
  /** L'objet `devices` de `@playwright/test`. Obligatoire. */
  devices: Record<string, unknown>;
  port?: number;
  /** Tester un build de prod (`build` + `preview`) au lieu du dev server. */
  preview?: boolean;
  command?: string;
  testMatch?: RegExp | string;
  expectTimeout?: number;
  localWorkers?: number;
  localRetries?: number;
  extraProjects?: Array<Record<string, unknown>>;
  reducedMotion?: boolean;
  overrides?: Record<string, unknown>;
}

/** Construit une config Playwright PWA complète, prête pour `defineConfig`. */
export function definePwaPlaywrightConfig(
  opts: DefinePwaPlaywrightConfigOptions
): Record<string, unknown>;

export interface AppStateOptions {
  /** Clés dont les VALEURS sont voulues (les clés seules sont toujours listées). */
  keys?: readonly string[];
  /** Exécuté dans la page — l'état propre à l'app, joint sous `app`. */
  evaluate?: () => unknown;
}

export interface AppState {
  url: string | null;
  heading: string | null;
  storageKeys: string[];
  values?: Record<string, string | null>;
  app?: unknown;
  /** Présent si le relevé lui-même a échoué — jamais levé. */
  dumpError?: string;
}

/**
 * L'état de l'app au moment d'un échec : URL, titre courant, clés du stockage,
 * plus ce que l'app veut dire. Ne lève jamais.
 */
export declare function dumpAppState(
  page: {
    /** `page.evaluate` de Playwright — typé large pour ne pas dépendre du paquet. */
    evaluate: (fn: (arg: never) => unknown, arg?: unknown) => Promise<unknown>;
    url?: () => string;
  },
  options?: AppStateOptions
): Promise<AppState>;

/** Relance l'erreur avec l'état joint, pile d'origine conservée. */
export declare function rethrowWithState(error: unknown, state: object): never;
