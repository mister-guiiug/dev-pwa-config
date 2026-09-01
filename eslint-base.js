/**
 * Config ESLint de base — projets sans React (vanilla TS, scripts Node, etc.).
 * Utilisée telle quelle ; pour un projet React, importer plutôt `./eslint-react`.
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  /**
   * `.claude/worktrees` CONTIENT DES COPIES COMPLÈTES DU DÉPÔT.
   *
   * Un agent lancé en `isolation: worktree` y checkoute l'arbre entier. ESLint
   * n'a aucune raison de le deviner : il ne lit pas `.gitignore`, et git, lui,
   * masque déjà le dossier par `.git/info/exclude`. Le résultat est un angle
   * mort exact — `git status` ne montre rien, `npm run lint` compte les erreurs
   * en double, et rien ne dit d'où elles viennent.
   *
   * Ça s'est produit : quatre dépôts de la famille traînaient cinq worktrees
   * périmés (2,3 Go). Sur `miss-contraction`, les 47 erreurs d'`eslint .`
   * venaient TOUTES de là — son propre code en avait zéro. On perd un temps
   * fou à chercher un défaut dans du code qu'on ne lit pas.
   *
   * L'ignore est volontairement étroit. `.claude` tout entier couperait aussi
   * ce qu'un dépôt y écrit à la main et versionne (`launch.json`, `skills/`) ;
   * seul `worktrees` est engendré par la machine.
   */
  globalIgnores(['dist', 'node_modules', 'dev-dist', '.claude/worktrees']),
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
