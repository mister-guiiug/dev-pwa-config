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
      // Browser + Node : la base sert aussi aux scripts Node (`scripts/*.mjs`,
      // `vite.config.ts`) où `process`/`Buffer`/… ne doivent pas être flaggés.
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Le préfixe `_` marque une variable / un paramètre / une erreur capturée
      // intentionnellement inutilisé(e) — convention standard, alignée sur le
      // comportement de TypeScript (`noUnusedLocals`/`noUnusedParameters`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
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
