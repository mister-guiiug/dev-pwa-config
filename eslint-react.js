/**
 * Config ESLint pour projets React.
 * Étend `./eslint-base` avec les plugins react-hooks et react-refresh,
 * et désactive les règles "React Compiler" trop strictes pour les patterns actuels.
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
      // React Compiler rules désactivées : trop strictes pour les patterns actuels.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      // Hooks et fichiers utilitaires co-localisés sont autorisés (warn only).
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]);
