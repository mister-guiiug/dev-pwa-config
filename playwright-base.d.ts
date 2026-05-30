/**
 * Types minimaux pour playwright-base (évite d'importer `@playwright/test`
 * dans dev-wpa-config — peerDep optionnelle). Les objets sont volontairement
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
