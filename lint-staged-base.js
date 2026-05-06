/**
 * Configuration lint-staged commune.
 *
 * Usage côté consumer (lint-staged.config.js) :
 *   export { default } from '@mister-guiiug/dev-wpa-config/lint-staged';
 */
export default {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write'],
};
