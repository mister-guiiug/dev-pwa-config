/**
 * Config ESLint pour projets React 19+.
 * Étend `./eslint-base` avec les plugins react-hooks et react-refresh,
 * et active les règles React Compiler en mode `warn` (passage en `error`
 * recommandé une fois les patterns adaptés au compiler).
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
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'dev-dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2025,
      globals: globals.browser,
    },
    rules: {
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
]);
