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
   *
   * `coverage` EST LE MÊME ANGLE MORT, POUR LA MÊME RAISON.
   *
   * Il est dans le `.gitignore` des dépôts — mais ESLint ne lit toujours pas
   * `.gitignore`. Le rapporteur HTML d'istanbul y dépose ses propres assets
   * (`block-navigation.js`, `prettify.js`, `sorter.js`, à la racine ET sous
   * `lcov-report/`) et chacun s'ouvre par un commentaire `eslint-disable`.
   * Comme aucun bloc `files` ci-dessous ne cible le `.js`, ces directives ne
   * désactivent rien : ESLint les compte « inutilisées » et rend six
   * avertissements par dépôt.
   *
   * Mesuré le 13/09/2026 sur `mister-molkky` après `npm run test:coverage` :
   * « ✖ 26 problems », dont SIX venus de `coverage/` — et « 6 warnings
   * potentially fixable with --fix », c'est-à-dire que `eslint --fix`
   * réécrirait des fichiers engendrés. Le bruit noie les vingt avertissements
   * qui, eux, portent sur le code de l'application.
   *
   * La CI ne le voit pas : dans `pwa-ci.yml`, l'étape `Lint` passe AVANT
   * `Test`, donc le dossier n'existe pas encore sur le runner. C'est en local
   * — seul endroit où les deux commandes se suivent — que le défaut se voit,
   * et il se généralise maintenant que le réutilisable sait jouer
   * `run-coverage` : six dépôts produisent désormais ce rapport.
   *
   * Motif nu (`coverage`, comme `dist`) : en flat config les ignores sont
   * relatifs au dossier de la config, ils ne visent donc QUE la racine. Un
   * dépôt qui aurait un domaine métier sous `src/.../coverage/` reste analysé,
   * et `test/configs.test.mjs` le vérifie.
   */
  globalIgnores([
    'dist',
    'node_modules',
    'dev-dist',
    'coverage',
    '.claude/worktrees',
  ]),
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
