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
  // `CardHeader` est déclaré dans le même fichier que `Card` chez footcoach :
  // un `Card.tsx` local acquitte les deux, et n'importer que l'un des deux
  // n'est pas une adoption finie.
  Card: { files: ['Card.tsx'], symbols: ['Card', 'CardHeader'] },
  // `genId` de footcoach (compteur + horodatage) promet autre chose que
  // l'aléa et n'est PAS un doublon : il n'est pas dans `exports`.
  id: {
    files: ['id.ts'],
    exports: ['createId', 'createUuid', 'newId'],
    symbols: ['createId', 'createUuid'],
  },
  Skeleton: { files: ['Skeleton.tsx'] },
  EmptyState: { files: ['EmptyState.tsx'] },
  ErrorBoundary: { files: ['ErrorBoundary.tsx'] },
  ErrorBanner: { files: ['ErrorBanner.tsx'] },
  AppFooter: { files: ['AppFooter.tsx'] },
  // `Header.tsx` n'y est PAS : chez ticket-pwa c'est une barre de navigation
  // complète avec menu utilisateur, chez doc un en-tête — deux choses sous
  // un nom. Une ressemblance de nom de fichier n'est pas une équivalence.
  AppHeader: { files: ['AppHeader.tsx', 'TopBar.tsx'] },
  PageContainer: { files: ['PageContainer.tsx'] },
  // `LoginScreen.tsx` de miss-supaboss est une saisie de jeton d'API, pas un
  // formulaire e-mail + mot de passe : un homonyme, à écarter à la lecture.
  AuthProvider: {
    files: ['AuthContext.tsx'],
    symbols: ['AuthProvider', 'useAuthContext'],
  },
  LoginForm: { files: ['LoginPage.tsx', 'LoginScreen.tsx'] },
  MfaChallenge: { files: ['MfaChallenge.tsx'] },
  // Le paquet promeut le HOOK ; un `FullscreenToggle.tsx` local qui ne
  // l'importe pas recopie encore l'écoute de `fullscreenchange`.
  useFullscreen: {
    files: ['FullscreenToggle.tsx'],
    symbols: ['useFullscreen'],
  },
  // `cn` n'y est PAS : deux lettres, c'est un symbole trop court pour acquitter
  // sans ambiguïté (le relevé refuse sous quatre), et cinq lignes ne sont pas
  // une dette à mesurer.
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
  // `AppUpdates` acquitte : il ENREGISTRE le service worker et rend le bandeau
  // lui-même. Un `UpdatePrompt.tsx` qui l'importe est une façade — c'est même
  // l'adoption la plus complète, celle de mister-qowa, qui a donné `checkEvery`
  // au socle. Sans cette ligne, le relevé la comptait en dette.
  UpdatePromptBanner: {
    files: ['UpdatePrompt.tsx', 'UpdateBanner.tsx'],
    symbols: ['UpdatePromptBanner', 'AppUpdates'],
  },
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
  // `storage.ts` A ÉTÉ RETIRÉ LE 31/08/2026, et c'est la première entrée de la
  // table qui se détecte PAR LE CODE au lieu du nom de fichier.
  //
  // La ligne était déjà signalée le 30/08 comme la correspondance la plus
  // faible : sur les sept `storage.ts` du parc, un seul doublait vraiment
  // `./backup`. Elle était « conservée pour le vrai positif ». Ce vrai positif
  // était mister-cim10 — et il a migré : son `src/lib/storage.ts` importe
  // aujourd'hui `@mister-guiiug/dev-pwa-config/backup`.
  //
  // Il ne restait donc que le bruit, vérifié fichier par fichier :
  //   · `mister-molkky/src/storage.ts` — un adaptateur `Storage` à repli
  //     mémoire pour `zustand/persist`. Ni export, ni restauration, ni format.
  //   · `miss-contraction/src/storage.ts` — de la persistance métier
  //     (`loadRecords`, `saveSettings`, `loadActiveStart`). Aucune sauvegarde.
  //
  // Cent pour cent de faux positifs, exactement comme `Navbar.tsx` avant elle.
  //
  // MAIS SUPPRIMER LA LIGNE AURAIT PERDU LE RAPPEL. `exports` la remplace sans
  // ce coût : une app double `backup` quand elle écrit son propre
  // `createBackup`, où qu'il soit. Zéro détection sur le parc au 31/08 — donc
  // le même chiffre que la suppression, en gardant ce que la suppression
  // jetait. C'est la leçon des trois homonymes, appliquée au lieu d'être
  // seulement écrite.
  //
  // `backup.ts` N'EST PAS UN MEILLEUR NOM DE FICHIER : le seul du parc est
  // `mister-doc/src/backend/backup.ts`, un client d'API d'administration qui
  // appelle un serveur. Le guetter n'aurait fait que déplacer le faux positif.
  backup: {
    exports: [
      'createBackup',
      'restoreBackup',
      'downloadBackup',
      'restoreBackupFile',
    ],
    symbols: [
      'createBackup',
      'restoreBackup',
      'downloadBackup',
      'restoreBackupFile',
    ],
  },
  // LE PLUS GROS DOUBLON DU PARC — et la table ne le comptait pas.
  //
  // L'en-tête de `testing/pwa-register.js` le dit noir sur blanc depuis sa
  // promotion : DOUZE dépôts portaient ce double écrit à la main, sous trois
  // noms de fichier différents. Aucune ligne ne le mesurait ici, si bien que la
  // plus grosse duplication connue du parc n'a jamais figuré dans le chiffre
  // qu'on publie.
  //
  // Il n'a pas été trouvé à la main : `scripts/adoption-candidates.mjs` compare
  // ce que les apps DÉCLARENT à ce que le paquet EXPORTE, et l'a sorti en tête
  // avec neuf apps. La table est écrite à la main ; ce qu'elle ignore ne l'est
  // pas, et une table de vingt-six entrées ne couvre pas cent trente-huit
  // sous-chemins.
  //
  // ACQUITTEMENT PAR `swStub` ET `pwaRegisterAlias`, pas par `registerSW` : une
  // app qui migre n'importe jamais `registerSW` du paquet — elle pose l'alias
  // dans `vitest.config.ts` et pilote le double par `swStub`. C'est le défaut
  // n°1 du 30/08 qu'on éviterait de justesse en y pensant.
  'testing/pwa-register': {
    files: [
      'pwa-register-stub.ts',
      'stub-pwa-register.ts',
      'pwa-mock.ts',
      'pwa-register-stub.js',
    ],
    exports: ['registerSW'],
    symbols: ['swStub', 'pwaRegisterAlias', 'PWA_REGISTER_STUB'],
  },
  geo: {
    files: ['geo.ts'],
    symbols: ['distanceKm', 'isValidCoordinates', 'formatDistance'],
  },
  webVitals: { files: ['web-vitals.ts'], symbols: ['initWebVitals', 'rate'] },
};

/**
 * CE QU'UNE APP GARDE À ELLE, ET POURQUOI.
 *
 * Le relevé compte un doublon dès qu'un fichier porte le nom guetté. C'est la
 * bonne règle par défaut — mais elle ne sait pas lire un RÔLE. Le
 * `AppHeader.tsx` de mister-cim10 compose un slogan à partir de la route, du
 * store de réglages et de l'i18n ; celui du socle rend un titre et des
 * actions. Même nom, autre métier : l'adopter casserait l'app.
 *
 * Sans cette table, chaque campagne d'adoption refait le même tri, retrouve
 * les mêmes faux positifs, et le chiffre de dette ne descend jamais — il
 * mesure alors le travail impossible autant que le travail restant.
 *
 * LA RÈGLE D'ENTRÉE EST STRICTE : on n'inscrit ici que ce qu'on a LU et
 * décidé, avec la raison. Une garde sans raison est un oubli déguisé, et le
 * test `adoption-equivalents.test.mjs` la refuse. Une garde se relit : le jour
 * où le socle apprend ce que l'app fait en plus, on la retire.
 *
 * @type {Record<string, string>} clé `app:Besoin` → raison, en une phrase.
 */
export const GARDES = {
  'mister-cim10:AppHeader':
    "compose un slogan depuis la route, le store de réglages et l'i18n, et porte l'avertissement médical dismissible — le socle rend un titre et des actions",
  'miss-supaboss:AppHeader':
    "porte l'état de synchronisation de la flotte, le mode démo et sa confirmation de sortie — de l'interface métier, pas une mise en page",
  'miss-carbook:AppHeader':
    'TopBar tient la recherche de dossier, le menu de compte et la bascule de thème',
  'mister-footcoach:AppHeader':
    'TopBar tient la navigation par équipe et le sélecteur de saison',
  'miss-badminton:PageContainer':
    "réserve en haut la hauteur du bouton menu (72 px) et ajoute un palier « 2xl » que le socle n'a pas",
  'mister-molkky:PageContainer':
    "porte l'animation d'entrée de vue (`mm-view-enter`), que le socle ne connaît pas",
  'miss-badminton:useFullscreen':
    'FullscreenToggle est le bouton, pas le hook — il reste à l’app',
  'mister-molkky:useFullscreen':
    'FullscreenToggle est le bouton, pas le hook — il reste à l’app',
  'miss-uwh:ErrorBoundary':
    "deux niveaux de repli (`app` et `route`) et l'export de la sauvegarde locale depuis l'écran de crash",
  'mister-doc:Badge':
    'décline un ton CHROMATIQUE métier (teal/indigo pour jour et nuit, sky pour les HNC) là où le socle décline six intentions sémantiques — décision écrite dans le fichier',
  'miss-uwh:AuthProvider': 'tient les rôles du club et leurs politiques RLS',
  'mister-doc:AuthProvider':
    'tient les passkeys et le rattachement au service hospitalier',
  'mister-footcoach:AuthProvider':
    "expose `useAuth` avec le rattachement à l'équipe",
  'miss-uwh:MfaChallenge':
    "élévation AAL2 pour les rôles sensibles du club, sur l'i18n de l'app",
  'mister-doc:MfaChallenge':
    "parcours de récupération propre à l'app (codes de secours, passkey)",
  'miss-lookhouse:LoginForm':
    "LoginScreen porte le choix du backend (local ou Supabase) avant même l'identification",
  'miss-supaboss:LoginForm':
    'LoginScreen porte le mode démo, qui se choisit sans compte',
  'miss-uwh:LoginForm':
    "LoginPage enchaîne sur l'onboarding du club quand le compte est neuf",
  'mister-doc:LoginForm': 'LoginPage propose la passkey avant le mot de passe',
  'mister-footcoach:LoginForm':
    "LoginPage porte l'invitation par lien d'équipe",
  'miss-uwh:AppHeader':
    "porte le retour contextuel (lanceur ou lentille), le chip de saison, la recherche et le compteur d'alertes — c'est l'exemple qui a montré qu'importer `Button` du socle n'acquitte pas un en-tête",
  'miss-dice:ErrorBoundary':
    "l'app a son design maison et n'importe pas components.css : le repli du socle y serait nu",
  'mister-doc:ErrorBoundary':
    "écran de repli propre à l'app (pictogramme, recharge) ; seule la remontée d'erreur vient du socle, et elle est déjà importée",
  'mister-footcoach:id':
    'genId est un compteur horodaté, pas un aléa — il promet un ordre que createId ne donne pas',
};

/** La garde d'une app pour un besoin, ou `undefined`. */
export function garde(appId, exported) {
  return GARDES[`${appId}:${exported}`];
}
