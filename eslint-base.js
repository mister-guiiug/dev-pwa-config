/**
 * Config ESLint de base — projets sans React (vanilla TS, scripts Node, etc.).
 * Utilisée telle quelle ; pour un projet React, importer plutôt `./eslint-react`.
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'dev-dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2025,
      globals: globals.browser,
    },
  },
  // Specs E2E : `any` et variables inutilisées tolérés (fixtures, page objects,
  // helpers de test). Override historiquement dupliqué dans badminton /
  // contraction / molkky — centralisé ici.
  {
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]);
