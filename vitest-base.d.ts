/**
 * Options de test partagées pour Vitest. Volontairement typées comme un
 * objet libre pour éviter les conflits de versions de vitest entre le paquet
 * dev-wpa-config et le projet consommateur.
 *
 * Le projet consommateur peut spread cet objet dans son propre `defineConfig({ test: ... })`.
 */
export const baseTestOptions: {
  environment: string;
  globals: boolean;
  setupFiles: string[];
  include: string[];
  passWithNoTests: boolean;
};
