/**
 * ESLint DE CE DÉPÔT.
 *
 * Le paquet publiait deux configurations ESLint et n'en appliquait aucune à
 * lui-même : la CI vérifiait seulement qu'elles s'IMPORTENT, jamais qu'elles
 * fonctionnent. Une règle cassée ou trop stricte n'était donc découverte que
 * par les quinze apps qui l'installent.
 *
 * `eslint-base` ne cible que `**\/*.{ts,tsx}` — ce dépôt n'a pas une ligne de
 * TypeScript hors déclarations. On l'étend donc (pour prouver qu'il se charge
 * et s'applique) et on ajoute la couche JavaScript qui correspond à ce qui est
 * réellement écrit ici. Élargir `eslint-base` lui-même aux `.js` casserait le
 * lint des treize apps qui l'utilisent sans l'avoir demandé : ce serait un
 * changement à leur soumettre, pas à leur imposer depuis ce fichier.
 */
import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

import base from './eslint-base.js';

// Les fichiers de DONNÉES du showroom : `<script src>` classiques qui posent un
// objet sur `globalThis`, chargeables tels quels par `node:test`. Tout autre
// `showroom/*.js` est un module ES, chargé par `showroom.js` ou par la page.
const DONNEES_SHOWROOM = [
  'showroom/adoption.js',
  'showroom/catalogue.js',
  'showroom/i18n.js',
  'showroom/screenshots.js',
  'showroom/snippets.js',
];

const GLOBAUX_SHOWROOM = {
  SHOWROOM_APPS: 'readonly',
  SHOWROOM_THEMES: 'readonly',
  SHOWROOM_METRICS: 'readonly',
  SHOWROOM_SCREENSHOTS: 'readonly',
  SHOWROOM_SNIPPETS: 'readonly',
  SHOWROOM_CATALOGUE: 'readonly',
  SHOWROOM_I18N: 'readonly',
};

export default defineConfig([
  ...base,
  globalIgnores([
    'node_modules',
    // Miroirs engendrés : leur forme appartient au générateur, pas au linter.
    'showroom/apps.js',
    'showroom/themes.js',
    'showroom/metrics.js',
    'showroom/components.css',
  ]),
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Données du showroom : `<script src>` classiques posés sur `globalThis`.
    files: DONNEES_SHOWROOM,
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...GLOBAUX_SHOWROOM },
    },
  },
  {
    // Modules ES du showroom : `showroom.js`, la copie de `command.js`, et ce
    // qu'ils importent. Tout reste dans `showroom/`, seul dossier publié.
    files: ['showroom/*.js'],
    ignores: DONNEES_SHOWROOM,
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser, ...GLOBAUX_SHOWROOM },
    },
  },
]);
