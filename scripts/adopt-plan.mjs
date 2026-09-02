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
  Card: 'react/card',
  id: 'id',
  BottomNav: 'react/bottom-nav',
  Button: 'react/button',
  ConfirmDialog: 'react/confirm-dialog',
  EmptyState: 'react/empty-state',
  ErrorBanner: 'react/error-banner',
  ErrorBoundary: 'react/error-boundary',
  AppFooter: 'react/app-footer',
  AppHeader: 'react/app-header',
  PageContainer: 'react/page-container',
  AuthProvider: 'react/auth-provider',
  LoginForm: 'react/login-form',
  MfaChallenge: 'react/mfa-challenge',
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
  'testing/pwa-register': 'testing/pwa-register',
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

/**
 * Les TYPES exportés par chaque sous-chemin, à part des valeurs.
 *
 * POURQUOI DEUX TABLES. `import { distanceKm, type Coordinates }` importe un
 * symbole qui n'existe pas à l'exécution : le vérifier dans le module comme on
 * vérifie `distanceKm` échouerait toujours. Les confondre coûtait six
 * réécritures légitimes de `mister-family-map`, déclarées « bloquées » pour un
 * type que le socle publie pourtant.
 */
export const EXPORTED_TYPES = {
  geo: ['Coordinates', 'BoundingBox'],
  'apps-catalog': [
    'Maturity',
    'Category',
    'Backend',
    'Platform',
    'FacetKey',
    'AppFilter',
    'SortBy',
    'FamilyApp',
  ],
  'sw-update': ['ApplyUpdateOptions', 'ApplyUpdateResult'],
  storage: ['StorageKind', 'StoreOptions', 'Store'],
  share: ['ShareResult', 'ShareData'],
  'web-vitals': [
    'WebVitalName',
    'WebVitalRating',
    'WebVitalReport',
    'InitWebVitalsOptions',
  ],
  'react/field': ['TextFieldProps', 'SelectFieldProps', 'TextAreaFieldProps'],
  'react/card': ['CardProps', 'CardHeaderProps'],
  id: ['UuidSource'],
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
  'react/card': ['Card', 'CardHeader'],
  id: ['createId', 'createUuid', 'isUuid'],
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
 *
 * Les TYPES sont relevés à part, sous leur nom nu : `import type { A }` comme
 * `import { type A }`. Confondus avec les valeurs, ils bloquaient un fichier
 * entier au motif qu'un module JavaScript n'exporte pas une interface — ce
 * qu'aucun module JavaScript ne fait.
 *
 * @returns {{ values: string[], types: string[], all: string[] }}
 */
export function splitImportedSymbols(source, moduleSpecifier) {
  const pattern = new RegExp(
    `import\\s*(?:(type)\\s+)?\\{([^}]*)\\}\\s*from\\s*['"]${escapeRegExp(moduleSpecifier)}['"]`,
    'g'
  );
  const values = [];
  const types = [];
  for (const match of source.matchAll(pattern)) {
    const clauseIsType = Boolean(match[1]);
    for (const part of match[2].split(',')) {
      const raw = part.trim();
      if (!raw) continue;
      const inlineType = /^type\s+/.test(raw);
      const name = raw
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      if (!name) continue;
      (clauseIsType || inlineType ? types : values).push(name);
    }
  }
  return { values, types, all: [...values, ...types] };
}

/**
 * Les symboles importés d'un module — valeurs et types confondus, sous leur
 * nom nu. Conservé pour ce qui ne distingue pas les deux.
 */
export function importedSymbols(source, moduleSpecifier) {
  return splitImportedSymbols(source, moduleSpecifier).all;
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
 *
 * LE SOCLE N'EST PAS UN VOISIN. `@mister-guiiug/dev-wpa-config/storage` se
 * termine lui aussi par `/storage` : sans cette exclusion, le codemod prenait
 * un import DÉJÀ migré pour un fichier local, le réécrivait vers lui-même, et
 * comptait la non-modification comme une réécriture. Le chiffre de la campagne
 * — le seul argument du dépôt — grossissait de tout ce qui était déjà fait.
 */
export function findLocalImports(source, fileBaseName) {
  const pattern = new RegExp(
    `from\\s*['"]([^'"]*\\/${escapeRegExp(fileBaseName)})(\\.[jt]sx?)?['"]`,
    'g'
  );
  return [
    ...new Set(
      [...source.matchAll(pattern)]
        .map(m => m[1] + (m[2] ?? ''))
        .filter(specifier => !specifier.startsWith(PACKAGE))
    ),
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
  const { localPath, subpath, expected, expectedTypes } = options;
  const {
    values,
    types,
    all: symbols,
  } = splitImportedSymbols(source, localPath);
  if (symbols.length === 0) return null;

  // TOUT ce que le fichier importe doit exister dans le sous-chemin. Un seul
  // symbole absent — un helper maison ajouté à côté du composant — et la
  // réécriture casserait la compilation. Dans ce cas on ne touche à rien et on
  // le SIGNALE : c'est une décision humaine.
  //
  // Les types se vérifient contre LEUR table : un `.js` n'exporte pas
  // d'interface, et les chercher là revenait à bloquer tout fichier qui importe
  // le type à côté de la fonction.
  const known = expected ?? [];
  const knownTypes = expectedTypes ?? [];
  const unknown = [
    ...values.filter(name => !known.includes(name)),
    ...types.filter(
      name => !knownTypes.includes(name) && !known.includes(name)
    ),
  ];
  if (known.length > 0 && unknown.length > 0) {
    return { blocked: unknown, symbols, from: localPath, to: subpath };
  }

  const target = `${PACKAGE}/${subpath}`;
  const pattern = new RegExp(
    `(import\\s*(?:type\\s+)?\\{[^}]*\\}\\s*from\\s*)['"]${escapeRegExp(localPath)}['"]`,
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
      expectedTypes: EXPORTED_TYPES[subpath] ?? [],
      status: 'ready',
    });
  }
  return steps;
}
