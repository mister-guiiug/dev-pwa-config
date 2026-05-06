/**
 * Preset Tailwind 4 commun aux PWA miss-* / mister-*.
 *
 * Tailwind 4 utilise un système de presets via @theme dans CSS, pas via JS.
 * Ce fichier expose les variables design-tokens à inclure dans le CSS principal.
 *
 * Usage côté consumer (src/index.css) :
 *   @import 'tailwindcss';
 *   @import '@mister-guiiug/dev-wpa-config/tailwind-preset.css';
 *
 * Pour étendre : redéfinir des variables après l'import.
 */
export const designTokens = {
  fontFamily: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  spacing: {
    'safe-top': 'env(safe-area-inset-top)',
    'safe-bottom': 'env(safe-area-inset-bottom)',
    'safe-left': 'env(safe-area-inset-left)',
    'safe-right': 'env(safe-area-inset-right)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

export default designTokens;
