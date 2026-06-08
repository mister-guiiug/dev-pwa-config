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
