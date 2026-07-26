/**
 * Config ESLint pour projets React 19+.
 * Étend `./eslint-base` (ignores, no-unused-vars, override e2e) avec les plugins
 * react-hooks, react-refresh et jsx-a11y, et active les règles React Compiler et
 * d'accessibilité en mode `warn` (passage en `error` recommandé une fois les
 * patterns adaptés).
 *
 * Pour passer en mode strict (toutes les règles compiler en `error`) :
 *   import { default as base } from '@mister-guiiug/dev-wpa-config/eslint-react';
 *   export default [...base, {
 *     files: ['**\/*.{ts,tsx}'],
 *     rules: {
 *       'react-hooks/set-state-in-effect': 'error',
 *       'react-hooks/purity': 'error',
 *       'react-hooks/immutability': 'error',
 *       'react-hooks/preserve-manual-memoization': 'error',
 *       'react-hooks/refs': 'error',
 *       'react-hooks/static-components': 'error',
 *     },
 *   }];
 */
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { defineConfig } from 'eslint/config';
import base from './eslint-base.js';

// Règles a11y « recommended » de jsx-a11y ramenées à `warn` : visibles au lint
// sans bloquer la CI (même trajectoire famille que les règles React Compiler
// ci-dessous ; le filet e2e axe reste en aval). Passer en `error` par app une
// fois les warnings résorbés.
const a11yRecommendedAsWarn = Object.fromEntries(
  Object.keys(jsxA11y.flatConfigs.recommended.rules).map(name => [name, 'warn'])
);

export default defineConfig([
  // Base partagée : globalIgnores, recommended TS, no-unused-vars (^_), override e2e.
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    rules: {
      // Règles a11y (jsx-a11y) en `warn` — cf. commentaire en tête de fichier.
      ...a11yRecommendedAsWarn,
      // React Compiler rules : `warn` famille (vs off avant).
      // Permet d'identifier les patterns à adapter sans bloquer la CI.
      // Passer en `error` localement pour forcer la conformité.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      // Hooks et fichiers utilitaires co-localisés sont autorisés (warn only).
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Re-applique l'assouplissement e2e APRÈS le bloc React (les blocs suivants
  // l'emportent en flat config) pour que les specs Playwright restent permissives.
  {
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
