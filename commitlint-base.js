/**
 * Conventional Commits + extensions famille miss-* / mister-*.
 *
 * Usage côté consumer (commitlint.config.js) :
 *   export { default } from '@mister-guiiug/dev-wpa-config/commitlint';
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // nouvelle fonctionnalité
        'fix', // correction de bug
        'docs', // documentation
        'style', // formatage (sans changement de logique)
        'refactor', // refactoring sans bug ni feature
        'perf', // amélioration performance
        'test', // ajout/correction tests
        'build', // build system / dépendances
        'ci', // CI/CD
        'chore', // maintenance
        'revert', // annulation d'un commit antérieur
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'header-max-length': [2, 'always', 100],
  },
};
