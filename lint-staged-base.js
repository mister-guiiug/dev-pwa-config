/**
 * Configuration lint-staged commune.
 *
 * Usage côté consumer (lint-staged.config.js) :
 *   export { default } from '@mister-guiiug/dev-pwa-config/lint-staged';
 *
 * Note type-check : `tsc -b --noEmit` est renvoyé par une **fonction** (sans
 * argument de fichier) pour s'exécuter **une seule fois** sur le graphe de
 * projets (`tsconfig.app.json` + `tsconfig.node.json`), pas une fois par
 * fichier — sinon `tsc <fichier>` ignorerait le tsconfig et perdrait les
 * références. Cela attrape les erreurs de type avant le commit.
 */
export default {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write'],
  '*.{ts,tsx}': () => 'tsc -b --noEmit',
};
