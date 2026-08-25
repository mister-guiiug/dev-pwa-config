/**
 * Types pour vite-pwa-base. Le plugin est typé structurellement pour éviter
 * d'importer `vite` (peerDep côté consumer).
 */
export function parseGtmContainerId(raw: string | undefined): string | null;
export function parseGaMeasurementId(raw: string | undefined): string | null;

export function resolveSeoPublicUrls(
  arg?: string | { basePath?: string; logoPath?: string; iconQuery?: string }
): {
  origin: string;
  homeUrl: string;
  logoUrl?: string;
};

export function buildAnalyticsHtmlFragments(overrides?: {
  gtmContainerId?: string;
  gaMeasurementId?: string;
  /**
   * `false` n'écrit PAS l'état de consentement par défaut. À réserver aux
   * déploiements qui le gèrent ailleurs (une CMP, GTM). Par défaut, tous les
   * signaux sont `denied` avant le chargement du tag — une commande
   * postérieure n'aurait pas d'effet rétroactif.
   */
  consent?: boolean;
}): { head: string; body: string };

export interface PwaSeoPluginOptions {
  siteName?: string;
  sitemap?: boolean;
  robots?: boolean;
  outDir?: string;
  changefreq?: string;
  basePath?: string;
  logoPath?: string;
  iconQuery?: string;
  llms?: string;
  /** Force le conteneur GTM (sinon `VITE_GTM_CONTAINER_ID`). */
  gtmContainerId?: string;
  /** Force l'ID GA4 (sinon `VITE_GA_MEASUREMENT_ID`). */
  gaMeasurementId?: string;
  /** `false` pour ne pas écrire l'état de consentement par défaut. */
  consent?: boolean;
  /**
   * Injecte le script anti-FOUC en tête de `<head>`. `true` pour les valeurs
   * par défaut, ou les options de `themeBootSource` (dont `legacyKeys`, sans
   * lesquelles adopter le script perd la préférence déjà enregistrée).
   */
  themeBoot?: boolean | import('./theme-boot.js').ThemeBootOptions;
  /**
   * Remplace les `<meta name="theme-color">` par deux balises `media`, qui
   * suivent le thème système dès le premier rendu.
   */
  themeColor?: { light?: string; dark?: string };
  extraReplacements?: Record<string, string>;
}

/** Renvoie un objet Plugin Vite (structurel). */
export function pwaSeoPlugin(opts?: PwaSeoPluginOptions): {
  name: string;
  configResolved(config: {
    command?: string;
    build?: { outDir?: string };
  }): void;
  transformIndexHtml(html: string): string;
  closeBundle(): Promise<void>;
};
