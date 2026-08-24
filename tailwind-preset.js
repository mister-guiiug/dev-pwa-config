/*
 * Design tokens famille (miss-* / mister-*) — export INFORMATIONNEL.
 *
 * ⚠️ Source de vérité = `tailwind-preset.css` (`@theme`). Tailwind 4 lit les
 * tokens depuis le CSS, PAS depuis ce JS. Ce module n'est pas consommé par
 * Tailwind ; il sert de référence programmatique (tests, scripts, génération de
 * doc, lecture d'un token hors CSS). Garder ces valeurs alignées sur le `.css`.
 *
 * Usage Tailwind côté consumer (src/index.css) — noter que ce bloc n'est
 * volontairement PAS un JSDoc (`/**`) : TypeScript y lirait les lignes
 * `@import` comme des directives de type et échouerait à les parser.
 *   @import 'tailwindcss';
 *   @import '@mister-guiiug/dev-wpa-config/tailwind-preset.css';
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
    'fluid-sm': 'clamp(0.5rem, 1.4vw, 0.75rem)',
    'fluid-md': 'clamp(0.75rem, 2.4vw, 1.25rem)',
    'fluid-lg': 'clamp(1rem, 3.2vw, 1.75rem)',
  },
  fontSize: {
    'fluid-xs': 'clamp(0.7rem, 1.6vw, 0.8125rem)',
    'fluid-sm': 'clamp(0.8125rem, 1.9vw, 0.95rem)',
    'fluid-base': 'clamp(0.9rem, 2.2vw, 1.05rem)',
    'fluid-lg': 'clamp(1rem, 2.6vw, 1.25rem)',
    'fluid-xl': 'clamp(1.15rem, 3vw, 1.5rem)',
    'fluid-2xl': 'clamp(1.35rem, 4.2vw, 2rem)',
  },
  breakpoints: {
    sm: '40rem',
    md: '48rem',
    lg: '64rem',
    xl: '80rem',
  },
};

export default designTokens;
