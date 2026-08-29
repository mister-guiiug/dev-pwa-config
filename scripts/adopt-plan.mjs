/**
 * Le PLAN d'adoption : quel fichier recopié remplacer par quel import.
 *
 * POURQUOI CE MODULE EST À PART. `scripts/adopt.mjs` parcourt des dossiers et
 * écrit des fichiers ; ici il n'y a que la décision — quel fichier local fait
 * le travail de quel export, qui l'importe, et ce que deviendrait chaque
 * import. Séparée du disque, elle s'éprouve.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */

/**
 * Où vit chaque export du socle. La table `EQUIVALENTS` de
 * `measure-adoption.mjs` dit quel FICHIER local double quel export ; celle-ci
 * dit par quel SOUS-CHEMIN le remplacer. Les deux ensemble forment la carte de
 * la migration.
 */
export const SUBPATHS = {
  Badge: 'react/badge',
  BottomNav: 'react/bottom-nav',
  Button: 'react/button',
  ConfirmDialog: 'react/confirm-dialog',
  EmptyState: 'react/empty-state',
  ErrorBanner: 'react/error-banner',
  ErrorBoundary: 'react/error-boundary',
  AppFooter: 'react/app-footer',
  Sheet: 'react/sheet',
  Skeleton: 'react/skeleton',
  Stat: 'react/stat',
  ThemeToggle: 'react/theme-toggle',
  Toast: 'react/toast',
  UpdatePromptBanner: 'react/update-prompt-banner',
  'TextField / SelectField / TextAreaField': 'react/field',
  useI18n: 'react/i18n',
  useOnline: 'react/use-online',
  useTheme: 'react/use-theme',
  applyUpdate: 'sw-update',
  backup: 'storage',
  format: 'format',
  geo: 'geo',
  // `links.ts` recopie deux constantes que le catalogue porte déjà —
  // `SPONSOR_URL` à l'identique, et l'URL du dépôt sous forme de FONCTION
  // (`repoUrl(id)`) plutôt que de constante. Le codemod signalera donc
  // `REPO_URL` comme bloquant : c'est exact, et c'est une ligne à changer à la
  // main, pas un module à promouvoir.
  links: 'apps-catalog',
  security: 'security',
  share: 'share',
  webVitals: 'web-vitals',
};

/** Les symboles réellement exportés par chaque sous-chemin. */
export const EXPORTS = {
  geo: [
    'isValidLatitude',
    'isValidLongitude',
    'isValidCoordinates',
    'distanceKm',
    'isInBoundingBox',
    'formatDistance',
  ],
  'apps-catalog': [
    'SPONSOR_URL',
    'GITHUB_OWNER',
    'repoUrl',
    'pagesUrl',
    'FAMILY_APPS',
  ],
  'react/field': ['TextField', 'SelectField', 'TextAreaField'],
  'sw-update': ['applyUpdate', 'hardNavigate'],
  storage: [
    'createStore',
    'readJson',
    'writeJson',
    'removeKey',
    'readRaw',
    'writeRaw',
    'isStorageAvailable',
    'listKeys',
  ],
};

const PACKAGE = '@mister-guiiug/dev-wpa-config';

/**
 * Les symboles importés d'un module, dans un fichier source.
 *
 * Analyse volontairement étroite : `import { A, B as C } from '…'`. Les
 * imports par défaut et les `import *` sont IGNORÉS plutôt que devinés — un
 * codemod qui interprète mal réécrit du code juste en code faux, et c'est pire
 * que de ne rien faire.
 */
export function importedSymbols(source, moduleSpecifier) {
  const pattern = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegExp(moduleSpecifier)}['"]`,
    'g'
  );
  const found = [];
  for (const match of source.matchAll(pattern)) {
    for (const part of match[1].split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (name && name !== 'type') found.push(name);
    }
  }
  return found;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Le chemin d'import qu'un fichier utilise pour atteindre un module voisin.
 *
 * On ne construit pas le chemin relatif : on RELÈVE celui que le fichier
 * écrit déjà. Deviner `../../shared/ui/Button` à partir d'une arborescence
 * suppose une convention que les dix-sept apps ne partagent pas.
 */
export function findLocalImports(source, fileBaseName) {
  const pattern = new RegExp(
    `from\\s*['"]([^'"]*\\/${escapeRegExp(fileBaseName)})(\\.[jt]sx?)?['"]`,
    'g'
  );
  return [
    ...new Set([...source.matchAll(pattern)].map(m => m[1] + (m[2] ?? ''))),
  ];
}

/**
 * Réécrit les imports d'un fichier local vers le sous-chemin du socle.
 *
 * Rend `null` quand rien ne change : l'appelant distingue ainsi « déjà
 * migré » de « migré maintenant », ce qui compte pour un rapport honnête.
 *
 * @returns {{ source: string, symbols: string[], from: string, to: string }|null}
 */
export function rewriteImports(source, options) {
  const { localPath, subpath, expected } = options;
  const symbols = importedSymbols(source, localPath);
  if (symbols.length === 0) return null;

  // TOUT ce que le fichier importe doit exister dans le sous-chemin. Un seul
  // symbole absent — un helper maison ajouté à côté du composant — et la
  // réécriture casserait la compilation. Dans ce cas on ne touche à rien et on
  // le SIGNALE : c'est une décision humaine.
  const known = expected ?? [];
  const unknown = symbols.filter(name => !known.includes(name));
  if (known.length > 0 && unknown.length > 0) {
    return { blocked: unknown, symbols, from: localPath, to: subpath };
  }

  const target = `${PACKAGE}/${subpath}`;
  const pattern = new RegExp(
    `(import\\s*\\{[^}]*\\}\\s*from\\s*)['"]${escapeRegExp(localPath)}['"]`,
    'g'
  );
  return {
    source: source.replace(pattern, `$1'${target}'`),
    symbols,
    from: localPath,
    to: target,
  };
}

/**
 * Le plan pour une app : ce qui peut être migré, ce qui bloque, et pourquoi.
 *
 * @param {{ duplicates: Array<{exported: string, file: string}> }} measurement
 *   L'entrée de cette app dans `showroom/adoption.js`.
 */
export function planForApp(measurement) {
  const steps = [];
  for (const duplicate of measurement?.duplicates ?? []) {
    const subpath = SUBPATHS[duplicate.exported];
    if (!subpath) {
      steps.push({
        exported: duplicate.exported,
        file: duplicate.file,
        status: 'no-subpath',
        // Pas d'équivalent publié : c'est un candidat à la PROMOTION, pas à la
        // migration. Les deux ne se confondent pas.
        reason: 'aucun sous-chemin ne publie cet export',
      });
      continue;
    }
    steps.push({
      exported: duplicate.exported,
      file: duplicate.file,
      subpath,
      expected: EXPORTS[subpath] ?? [duplicate.exported],
      status: 'ready',
    });
  }
  return steps;
}
