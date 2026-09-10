/**
 * Libellés des composants du paquet en français (`fr`).
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
  sheet: { close: 'Fermer' },
  confirm: {
    confirm: 'Confirmer',
    cancel: 'Annuler',
    destructiveConfirm: 'Supprimer',
    // Mode mono-action : le bouton prend acte, il ne « confirme » rien.
    ok: 'OK',
  },
  // `undo` n'est PAS `confirm.cancel`, qui dit aussi « Annuler » en
  // français : l'un renonce à ce qu'on allait faire, l'autre défait ce qui
  // est fait. Six des sept langues les distinguent — « Cancel » / « Undo ».
  toast: {
    close: 'Fermer la notification',
    region: 'Notifications',
    undo: 'Annuler',
  },
  error: { retry: 'Réessayer', close: 'Fermer' },
  install: {
    title: 'Installer l’application',
    description:
      'Ajoutez cette application à votre écran d’accueil : accès rapide, hors-ligne.',
    // Là où le navigateur installe sans invite programmable, la marche à
    // suivre REMPLACE la description : sans elle, l'utilisateur d'iPhone lit
    // une promesse et ne trouve aucun bouton pour la tenir.
    howIos: 'Touchez le bouton Partager, puis « Sur l’écran d’accueil ».',
    howSafari:
      'Dans le menu Fichier de Safari, choisissez « Ajouter au Dock ».',
    howGeneric:
      'Ouvrez le menu de votre navigateur, puis « Installer l’application ».',
    install: 'Installer',
    dismiss: 'Plus tard',
  },
  update: {
    title: 'Mise à jour disponible',
    update: 'Recharger',
    updating: 'Mise à jour…',
    snooze: 'Plus tard',
    dismiss: 'Plus tard',
    // `snooze` et `dismiss` disent tous deux « Plus tard » : chacun est SEUL
    // à l'écran, et c'est bien ce qu'ils font. `ignore` n'existe que pour le
    // mode à deux sorties, où les deux boutons se côtoient — deux « Plus
    // tard » côte à côte ne diraient plus lequel persiste.
    ignore: 'Ignorer',
    force: 'Forcer la mise à jour',
    forceHint:
      'Vide le cache de l’application et recharge. Vos données sont conservées.',
    offlineReady: 'L’application fonctionne maintenant hors ligne.',
    offlineReadyOk: 'OK',
  },
  footer: {
    source: 'Code source',
    sponsor: 'M’offrir un café',
    issues: 'Signaler un problème',
  },
  share: {
    label: 'Partager',
    copied: 'Lien copié',
    failed: 'Partage impossible',
  },
  version: {
    label: 'Version',
    updated: 'Mis à jour vers {version}',
    available: 'Version {version} disponible',
    built: 'Compilée le {date}',
    release: 'Notes de version',
  },
  apps: {
    repo: 'Code source de {app}',
    source: 'Code source',
    sponsor: 'M’offrir un café',
    otherApps: 'Nos autres applications',
  },
  maturity: { alpha: 'Alpha', beta: 'Bêta', stable: 'Stable' },
  sync: {
    synced: 'Synchronisé',
    pending: 'En attente',
    offline: 'Hors ligne',
    error: 'Erreur',
  },
  guard: {
    offline: 'Indisponible hors ligne',
    readonly: 'Données non synchronisées — action indisponible',
  },
  theme: {
    label: 'Thème',
    light: 'clair',
    dark: 'sombre',
    system: 'système',
    next: 'Thème : {current}. Activer le thème {next}.',
  },
  // `LoginForm` et `MfaChallenge` : quatre écrans de connexion et deux
  // défis MFA d'apps portaient ces chaînes chacun dans son i18n.
  auth: {
    title: 'Connexion',
    signUpTitle: 'Créer un compte',
    otpTitle: 'Recevoir un lien de connexion',
    sendLink: 'Recevoir un lien',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    signUp: 'Créer le compte',
    mfaTitle: 'Vérification en deux étapes',
    mfaHint: 'Saisissez le code de votre application d’authentification.',
    mfaCode: 'Code à 6 chiffres',
    mfaRecoveryCode: 'Code de secours',
    mfaVerify: 'Vérifier',
    mfaRecovery: 'Utiliser un code de secours',
    mfaUseApp: 'Utiliser l’application d’authentification',
    signOut: 'Se déconnecter',
  },
  nav: {
    // Le retour d'`AppHeader` : un lien ou un bouton, qui porte un nom.
    back: 'Retour',
    label: 'Navigation principale',
    current: 'Page actuelle',
    more: 'Plus',
  },
};

export default labels;
