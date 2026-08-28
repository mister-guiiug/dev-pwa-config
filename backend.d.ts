export interface ResolveKindOptions {
  /** Par backend, les variables d'environnement qu'il exige. */
  kinds: Record<string, readonly string[]>;
  /** Défaut : `'local'`. */
  fallback?: string;
  /** Variable qui force le choix. Défaut : `'VITE_BACKEND'`. */
  override?: string;
}

/**
 * Le backend à utiliser : un choix explicite gagne, sinon la présence des
 * variables décide, sinon le repli. Un choix explicite INCONNU est ignoré —
 * mieux vaut démarrer en local qu'échouer sur une faute de frappe.
 */
export declare function resolveBackendKind(
  env: Record<string, unknown>,
  options: ResolveKindOptions
): string;

/** Les variables requises qui manquent. */
export declare function missingConfig(
  env: Record<string, unknown>,
  required?: readonly string[]
): string[];

/**
 * Une base complète, des ports remplacés un par un. Les surcharges
 * `undefined`/`null` sont ignorées : c'est ce qui rend lisible un adaptateur
 * pas encore écrit.
 */
export declare function composeBackend<T extends object>(
  base: T,
  overrides?: Partial<T>
): T;

export interface BackendCoverage {
  kind: string | null;
  /** Ports servis par le backend distant. */
  remote: string[];
  /** Ports restés locaux. */
  local: string[];
}

/** Où en est la migration : une app à moitié migrée doit pouvoir le dire. */
export declare function backendCoverage<T extends object>(
  base: T,
  overrides?: Partial<T>,
  kind?: string | null
): BackendCoverage;

export interface BackendSpec<T extends object> {
  /** Variables sans lesquelles ce backend n'est pas configuré. */
  requires?: readonly string[];
  /** Les ports que ce backend prend en charge. Peut lever : on retombe alors. */
  create: (env: Record<string, unknown>, base: T) => Partial<T> | undefined;
}

export interface BackendSelectorConfig<T extends object> {
  /** Le backend complet qui marche sans configuration. Obligatoire. */
  fallback: () => T;
  backends: Record<string, BackendSpec<T>>;
  override?: string;
  /** Appelé quand on retombe sur le repli — configuration absente, ou création en échec. */
  onFallback?: (info: {
    kind: string;
    missing: string[];
    error?: unknown;
  }) => void;
}

export type SelectedBackend<T> = BackendCoverage & { backend: T };

/** Le sélecteur de backend d'une app, déclaré en une fois. */
export declare function createBackendSelector<T extends object>(
  config: BackendSelectorConfig<T>
): (env?: Record<string, unknown>) => SelectedBackend<T>;
