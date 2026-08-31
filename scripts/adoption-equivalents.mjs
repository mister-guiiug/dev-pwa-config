/**
 * LA TABLE DES ÉQUIVALENCES — la donnée que lit le relevé d'adoption.
 *
 * Elle vit dans son propre module, comme `SUBPATHS` dans `adopt-plan.mjs`, et
 * pour une raison précise : `measure-adoption.mjs` est un OUTIL dont le point
 * d'entrée balaie dix-sept dépôts **dès qu'on le charge**. Importer la table
 * depuis un test déclencherait ce balayage à chaque exécution — lent, et faux
 * en CI, où les dépôts des apps ne sont pas là.
 *
 * La donnée se lit ; l'outil s'exécute. Les séparer est ce qui rend la première
 * testable.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */

/**
 * « Cet export du paquet est déjà fait, à la main, dans un fichier qui
 * s'appelle… ». Constaté au relevé, pas supposé.
 */
export const EQUIVALENTS = {
  Button: { files: ['Button.tsx'] },
  'TextField / SelectField / TextAreaField': {
    files: ['Field.tsx', 'TextField.tsx'],
    symbols: ['TextField', 'SelectField', 'TextAreaField'],
  },
  Sheet: { files: ['Sheet.tsx', 'Modal.tsx'] },
  Stat: { files: ['Stat.tsx', 'StatCard.tsx'] },
  Badge: { files: ['Badge.tsx'] },
  Skeleton: { files: ['Skeleton.tsx'] },
  EmptyState: { files: ['EmptyState.tsx'] },
  ErrorBoundary: { files: ['ErrorBoundary.tsx'] },
  ErrorBanner: { files: ['ErrorBanner.tsx'] },
  AppFooter: { files: ['AppFooter.tsx'] },
  ConfirmDialog: { files: ['ConfirmDialog.tsx'] },
  Toast: {
    files: [
      'Toast.tsx',
      'Toaster.tsx',
      'ToastViewport.tsx',
      'ToastContext.tsx',
    ],
    symbols: ['ToastProvider', 'ToastViewport', 'useToast'],
  },
  // `Navbar.tsx` a été retiré le 30/08/2026 : il n'existe QUE dans
  // mister-puzzle, et son fichier est un en-tête HAUT collant sans aucune
  // destination — l'app n'a même pas de routeur. La règle produisait donc
  // 100 % de faux positifs, et l'en-tête de `react/bottom-nav.js` propageait
  // l'erreur en affirmant « mister-puzzle a la même chose sous le nom
  // Navbar ». Une ressemblance de nom de fichier n'est pas une équivalence.
  BottomNav: { files: ['BottomNav.tsx'] },
  ThemeToggle: { files: ['ThemeToggle.tsx'] },
  UpdatePromptBanner: { files: ['UpdatePrompt.tsx', 'UpdateBanner.tsx'] },
  applyUpdate: {
    // `forceUpdate.ts` figurait ici et n'existe dans AUCUN dépôt du parc :
    // une ligne morte, qui donnait l'illusion que la table couvrait deux
    // conventions de nommage là où elle n'en couvrait qu'une.
    files: ['register-sw.ts'],
    symbols: ['applyUpdate', 'hardNavigate', 'AppUpdates'],
  },
  // `theme.ts` EST UN HOMONYME — le troisième de la même famille, après
  // `Navbar.tsx` (retiré ci-dessus) et `storage.ts` (documenté ci-dessous).
  //
  // MESURE DU 31/08/2026, sur les copies de travail : la règle comptait DEUX
  // doublons, et l'un des deux n'en était pas un. Le `src/theme.ts` de
  // miss-lookhouse ne réimplémente rien — ce sont TROIS CONSTANTES
  // (`THEME_STORAGE_KEY`, `THEME_LEGACY_KEYS`, `THEME_COLOR`) lues par trois
  // endroits qui doivent rester d'accord et dont deux ne se voient pas l'un
  // l'autre : `ThemeProvider` dans `App.tsx`, le script anti-FOUC
  // d'`index.html`, et le test qui vérifie que les deux lisent les mêmes clés.
  // Cette app a MIGRÉ son thème ; le fichier est ce que la migration a laissé.
  //
  // MAIS LA LIGNE DE FICHIERS RESTE, contrairement à `Navbar.tsx` : le second
  // compte est un VRAI doublon — miss-contraction, 89 lignes de
  // `getStoredThemePreference` / `getResolvedTheme` / `applyTheme` /
  // `persistTheme`, sans un seul import du paquet. Retirer `theme.ts` de la
  // liste éteindrait une dette réelle.
  //
  // CE QUI MANQUAIT EST L'ACQUITTEMENT. `useTheme` est bien un export du
  // paquet — la règle échappait donc au défaut n°1 du 30/08 — mais une app qui
  // adopte le thème monte `ThemeProvider` et lit `useThemeContext` : elle
  // n'appelle JAMAIS `useTheme`, qui monterait une SECONDE instance à côté du
  // fournisseur. Le seul symbole libérateur implicite était donc exactement
  // celui que la bonne migration n'utilise pas.
  //
  // La règle de la FAÇADE (30/08) ne pouvait pas rattraper ce cas : elle
  // acquitte le fichier qui importe lui-même le paquet — c'est ce qui sauve
  // déjà `src/react/hooks/useTheme.ts` de miss-dice — alors qu'ici le fichier
  // guetté ne contient que des constantes, et que l'adoption se lit AILLEURS,
  // dans `App.tsx`. La leçon des trois cas est la même : un nom de fichier ne
  // dit pas ce qu'un fichier fait ; seul l'import dit ce qu'une app a adopté.
  useTheme: {
    files: ['useTheme.ts', 'theme.ts'],
    symbols: ['useTheme', 'ThemeProvider', 'useThemeContext'],
  },
  useOnline: { files: ['useOnline.ts'] },
  // `useI18n` n'est pas exporté : il naît de la fabrique `createI18n`.
  useI18n: { files: ['useI18n.ts'], symbols: ['createI18n'] },
  format: {
    files: ['format.ts'],
    symbols: ['formatDateTime', 'formatNumber', 'formatCurrency', 'formatDate'],
  },
  security: {
    files: ['security.ts'],
    symbols: ['escapeHtml', 'sanitizeInput', 'redact', 'maskEmail'],
  },
  links: {
    files: ['links.ts'],
    symbols: ['SPONSOR_URL', 'repoUrl', 'pagesUrl'],
  },
  share: {
    files: ['share.ts'],
    symbols: ['shareOrCopy', 'copyToClipboard', 'currentAppUrl'],
  },
  // LA CORRESPONDANCE LA PLUS FAIBLE DE LA TABLE, mesurée le 30/08/2026 :
  // `storage.ts` est un nom trop générique. Sur les sept dépôts qu'il touchait,
  // UN SEUL dupliquait vraiment `./backup` (mister-cim10) ; trois étaient des
  // façades important déjà le socle — désormais acquittées par la règle
  // ci-dessous — et deux nommaient de la persistance métier sans aucune
  // sauvegarde. La ligne est conservée pour le vrai positif, mais son bruit
  // est connu : ne pas lire son compte comme une dette de sauvegarde.
  backup: {
    files: ['storage.ts'],
    symbols: [
      'createBackup',
      'restoreBackup',
      'downloadBackup',
      'restoreBackupFile',
    ],
  },
  geo: {
    files: ['geo.ts'],
    symbols: ['distanceKm', 'isValidCoordinates', 'formatDistance'],
  },
  webVitals: { files: ['web-vitals.ts'], symbols: ['initWebVitals', 'rate'] },
};
