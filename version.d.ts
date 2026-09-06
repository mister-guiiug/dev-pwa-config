/**
 * Types de `./version`. La version arrive par UNE porte :
 * `globalThis.__DWC_BUILD__`, posé par le plugin `./vite-version`.
 */

/** Ce que le build a injecté. Les champs absents valent `''`, jamais `undefined`. */
export interface BuildInfo {
  version: string;
  /** Date ISO de compilation. */
  buildTime: string;
  /** SHA complet du commit, si le build le connaissait. */
  commit: string;
  /** Les sept premiers caractères de `commit`, ou `''`. */
  shortCommit: string;
  /** La base du build (`/miss-genius/`), si le plugin l'a injectée ; sinon `''`. */
  base: string;
}

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  build: string;
  raw: string;
}

/** Comparaison d'une version au démarrage précédent. */
export interface VersionHistory {
  current: string;
  previous: string;
  /** Aucune version mémorisée jusqu'ici : première ouverture, ou stockage vidé. */
  firstRun: boolean;
  /** La version a changé, dans un sens ou dans l'autre. */
  changed: boolean;
  /** La version a MONTÉ : un rollback n'est pas une nouveauté. */
  upgraded: boolean;
}

/** Le fichier écrit à la racine du build (`version.json`). */
export declare const VERSION_MANIFEST: string;
/** Le nom du global posé par `./vite-version` (`__DWC_BUILD__`). */
export declare const BUILD_INFO_GLOBAL: string;
/** Clé de mémorisation (`dwc_app_version`). */
export declare const VERSION_STORAGE_KEY: string;

/** Décompose une version SemVer (`v` initial toléré), ou `null`. */
export declare function parseVersion(input: unknown): ParsedVersion | null;

/** `-1`, `0` ou `1`. Une version illisible est la plus ancienne. */
export declare function compareVersions(a: unknown, b: unknown): number;

/** Strictement postérieur — et `false` dès qu'un des deux côtés est illisible. */
export declare function isNewerVersion(
  candidate: unknown,
  current: unknown
): boolean;

/** Version affichable (`v3.13.0`), ou `''` si elle est illisible. */
export declare function formatVersion(
  input: unknown,
  options?: { prefix?: string; build?: boolean }
): string;

/** Lit `globalThis.__DWC_BUILD__`, ou l'objet donné. Ne lève jamais. */
export declare function readBuildInfo(source?: unknown): BuildInfo;

/** Le contexte pour `setSessionContext`, champs vides omis. */
export declare function versionContext(
  source?: unknown
): Partial<Pick<BuildInfo, 'version' | 'buildTime' | 'commit' | 'base'>>;

/**
 * L'URL de `version.json` sous la base du build injectée par le plugin
 * (`/miss-genius/version.json`) ; sans base, le relatif `version.json`.
 */
export declare function versionManifestUrl(source?: unknown): string;

/** Compare à la version du démarrage précédent, et la mémorise. */
export declare function rememberVersion(
  version: unknown,
  options?: { key?: string; storage?: Storage | null }
): VersionHistory;

/** Lit le `version.json` du serveur. Rend `null` plutôt que de lever. */
export declare function fetchAppVersion(
  url?: string,
  options?: { fetch?: typeof fetch; timeoutMs?: number; signal?: AbortSignal }
): Promise<BuildInfo | null>;

/** La source du script inline qui pose `globalThis.__DWC_BUILD__`. */
export declare function buildInfoSource(source?: unknown): string;

/** Le même script, balise comprise. */
export declare function buildInfoScript(source?: unknown): string;
