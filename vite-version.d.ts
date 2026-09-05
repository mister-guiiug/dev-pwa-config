/**
 * Types de `./vite-version`. Le plugin est typé structurellement pour éviter
 * d'importer `vite` (peerDep côté consumer).
 */

export interface BuildInfoOptions {
  /** Force la version (sinon `VITE_APP_VERSION`, sinon le `package.json`). */
  version?: string;
  /** Force le SHA (sinon `VITE_COMMIT_SHA`, sinon `GITHUB_SHA`). */
  commit?: string;
  /** Force la date ISO — un build reproductible n'a pas de « maintenant ». */
  buildTime?: string;
  /** Racine où chercher le `package.json` (défaut `process.cwd()`). */
  root?: string;
  env?: Record<string, string | undefined>;
}

export interface VersionPluginOptions extends BuildInfoOptions {
  /** Poser `__APP_VERSION__`, `__APP_BUILD_TIME__`, `__APP_COMMIT__`. */
  define?: boolean;
  /** Poser `globalThis.__DWC_BUILD__` par un script inline dans `<head>`. */
  inject?: boolean;
  /** Écrire `version.json` à la racine du build, et le servir en dev. */
  manifest?: boolean;
  outDir?: string;
}

/** La version du `package.json` de l'app, ou `''`. */
export declare function readPackageVersion(root?: string): string;

/** La version, la date et le commit de ce build. */
export declare function resolveBuildInfo(options?: BuildInfoOptions): {
  version: string;
  commit: string;
  buildTime: string;
};

/**
 * Renvoie un objet Plugin Vite (structurel). À placer AVANT `cspPlugin`, qui
 * hache les scripts inline du HTML final.
 */
export declare function versionPlugin(options?: VersionPluginOptions): {
  name: string;
  config(): { define?: Record<string, string> };
  configResolved(config?: {
    command?: string;
    build?: { outDir?: string };
  }): void;
  configureServer(server?: unknown): void;
  transformIndexHtml(html: string): string;
  closeBundle(): Promise<void>;
};

/**
 * Les identifiants posés par `define`. À déclarer dans un `env.d.ts` d'app pour
 * que TypeScript les connaisse :
 *
 *   /// <reference types="@mister-guiiug/dev-pwa-config/vite-version" />
 */
declare global {
  const __APP_VERSION__: string;
  const __APP_BUILD_TIME__: string;
  const __APP_COMMIT__: string;
}
