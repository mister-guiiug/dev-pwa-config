/**
 * Libellés des composants du paquet en anglais (`en`).
 *
 * UN MODULE PAR LANGUE, ET C'EST TOUT L'INTÉRÊT. Les sept dictionnaires
 * vivaient dans un unique objet littéral, et un objet est UNE liaison : aucun
 * bundler ne pouvait en retirer six. Toute application montant un seul
 * composant du paquet — `ErrorBanner`, `Sheet`, `ConfirmDialog`… — embarquait
 * donc les sept langues, 6,2 kB gzip là où le français seul en pèse 1,8.
 *
 * `test/labels.test.mjs` refuse toute clé qui manquerait ici et qu'une autre
 * langue porterait : les sept fichiers ne peuvent pas diverger en silence.
 */

/** @type {import('./labels-core.js').LabelGroups} */
const labels = {
  sheet: { close: 'Close' },
  confirm: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    destructiveConfirm: 'Delete',
    ok: 'OK',
  },
  toast: {
    close: 'Dismiss notification',
    region: 'Notifications',
    undo: 'Undo',
  },
  error: { retry: 'Try again', close: 'Dismiss' },
  install: {
    title: 'Install the app',
    description:
      'Add this app to your home screen: quick access, works offline.',
    howIos: 'Tap the Share button, then “Add to Home Screen”.',
    howSafari: 'In Safari’s File menu, choose “Add to Dock”.',
    howGeneric: 'Open your browser’s menu, then “Install app”.',
    install: 'Install',
    dismiss: 'Not now',
  },
  update: {
    title: 'Update available',
    update: 'Reload',
    updating: 'Updating…',
    snooze: 'Later',
    dismiss: 'Later',
    ignore: 'Dismiss',
    force: 'Force update',
    forceHint: 'Clears the app cache and reloads. Your data is kept.',
    offlineReady: 'The app now works offline.',
    offlineReadyOk: 'OK',
  },
  footer: {
    source: 'Source code',
    sponsor: 'Buy me a coffee',
    issues: 'Report a problem',
  },
  share: {
    label: 'Share',
    copied: 'Link copied',
    failed: 'Sharing failed',
  },
  version: {
    label: 'Version',
    updated: 'Updated to {version}',
    available: 'Version {version} available',
    built: 'Built on {date}',
    release: 'Release notes',
  },
  apps: {
    repo: 'Source code for {app}',
    source: 'Source code',
    sponsor: 'Buy me a coffee',
    otherApps: 'Our other apps',
  },
  maturity: { alpha: 'Alpha', beta: 'Beta', stable: 'Stable' },
  sync: {
    synced: 'Synced',
    pending: 'Pending',
    offline: 'Offline',
    error: 'Error',
  },
  guard: {
    offline: 'Unavailable while offline',
    readonly: 'Data not synced — action unavailable',
  },
  theme: {
    label: 'Theme',
    light: 'light',
    dark: 'dark',
    system: 'system',
    next: 'Theme: {current}. Switch to the {next} theme.',
  },
  auth: {
    title: 'Sign in',
    signUpTitle: 'Create an account',
    otpTitle: 'Sign in with a link',
    sendLink: 'Send me a link',
    email: 'Email address',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    mfaTitle: 'Two-step verification',
    mfaHint: 'Enter the code from your authenticator app.',
    mfaCode: '6-digit code',
    mfaRecoveryCode: 'Recovery code',
    mfaVerify: 'Verify',
    mfaRecovery: 'Use a recovery code',
    mfaUseApp: 'Use the authenticator app',
    signOut: 'Sign out',
  },
  nav: {
    back: 'Back',
    label: 'Main navigation',
    current: 'Current page',
    more: 'More',
  },
};

export default labels;
