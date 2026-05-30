/**
 * Types pour vite-pwa-base. Le plugin est typé structurellement pour éviter
 * d'importer `vite` (peerDep côté consumer).
 */
export function parseGtmContainerId(raw: string | undefined): string | null;
export function parseGaMeasurementId(raw: string | undefined): string | null;

export function resolveSeoPublicUrls(basePath?: string): {
  origin: string;
  homeUrl: string;
};

export function buildAnalyticsHtmlFragments(): { head: string; body: string };

export interface PwaSeoPluginOptions {
  siteName?: string;
  sitemap?: boolean;
  outDir?: string;
  changefreq?: string;
}

/** Renvoie un objet Plugin Vite (structurel). */
export function pwaSeoPlugin(opts?: PwaSeoPluginOptions): {
  name: string;
  transformIndexHtml(html: string): string;
  closeBundle(): Promise<void>;
};
