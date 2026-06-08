/**
 * Options de test partagées pour Vitest. Volontairement typées comme un
 * objet libre pour éviter les conflits de versions de vitest entre le paquet
 * dev-wpa-config et le projet consommateur.
 *
 * Le projet consommateur peut spread cet objet dans son propre `defineConfig({ test: ... })`.
 */
/** Chemin du fichier de setup par défaut (pour composer sans écraser). */
export const DEFAULT_SETUP_FILE: string;

export const baseTestOptions: {
  environment: string;
  globals: boolean;
  setupFiles: string[];
  include: string[];
  passWithNoTests: boolean;
};

/** Preset de couverture (provider v8 + reporters). Thresholds laissés au projet. */
export const coveragePreset: {
  provider: string;
  reporter: string[];
  exclude: string[];
};

/** Planchers de couverture recommandés (domaine critique) — à monter, jamais baisser. */
export const recommendedThresholds: {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
};
