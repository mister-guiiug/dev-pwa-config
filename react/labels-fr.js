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
    // « Mettre à jour », pas « Recharger » : le titre annonce une mise à jour
    // et l'état transitoire en est une ; le bouton nommait le mécanisme là où
    // ses deux voisins nomment l'intention. Quatre apps l'avaient déjà choisi.
    update: 'Mettre à jour',
    updating: 'Mise à jour…',
    // Le report DIT SA DURÉE : le bandeau remplit `{hours}` avec `snoozeHours`.
    // Sous le même « Plus tard », quatre apps reportaient de 4 à 24 h et onze
    // écartaient pour la session ; rien à l'écran ne les distinguait, et seul
    // mister-puzzle annonçait la durée, en passant son propre libellé.
    snooze: 'Plus tard ({hours} h)',
    dismiss: 'Plus tard',
    // `ignore` n'existe que pour le mode à deux sorties, où le report et
    // l'écartement se côtoient : il faut bien dire lequel ne persiste pas.
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
  // Le bandeau de consentement. « Rien n’est envoyé tant que » n’est pas une
  // formule de style : `analytics.js` n’injecte pas le tag avant l’accord, et
  // le message doit dire ce que le code fait, pas ce qui rassure.
  consent: {
    title: 'Mesure d’audience',
    message:
      'Cette application peut mesurer sa fréquentation pour s’améliorer. Rien n’est envoyé tant que vous n’avez pas accepté.',
    accept: 'Accepter',
    refuse: 'Refuser',
    policy: 'En savoir plus',
    // `ConsentSettings` : l'état, puis ce que le clic fait. Deux chaînes
    // entières et pas une composition `{title} : {état}` — l'ordre des mots et
    // la ponctuation ne survivent pas à la traduction.
    stateGranted: 'Mesure d’audience : acceptée',
    stateDenied: 'Mesure d’audience : refusée',
    manage: 'Modifier mon choix',
  },
  /**
   * Le panneau qui dit ce que la mesure d'audience fait. `{months}` porte la
   * conservation réglée dans GA4, `{contact}` l'adresse où exercer ses droits
   * — deux valeurs que le code ne peut pas connaître, d'où l'interpolation.
   */
  privacy: {
    title: 'Vos données',
    what: 'Ce qui est mesuré',
    whatText:
      'Les pages que vous consultez et la façon dont vous y circulez, par PostHog. Jamais ce que vous saisissez dans l’application.',
    basis: 'À quel titre',
    basisText:
      'Votre consentement, et lui seul. Vous pouvez le retirer à tout moment, aussi facilement que vous l’avez donné.',
    recipient: 'Qui les reçoit',
    recipientText:
      'PostHog, sur ses serveurs de l’Union européenne, qui les traite pour le compte de l’éditeur de cette application.',
    retention: 'Combien de temps',
    retentionText:
      'Les données détaillées sont conservées {months} mois, puis supprimées.',
    stored: 'Ce qui est déposé sur votre appareil',
    storedText:
      'Un identifiant de visite déposé par PostHog (cookie et stockage local), et votre choix, gardé dans ce navigateur pour ne pas vous reposer la question à chaque visite.',
    errors: 'En cas d’erreur',
    errorsText:
      'Quand l’application rencontre une erreur, un rapport technique part chez Sentry, sur ses serveurs d’Allemagne : le message, l’endroit du code, l’adresse de la page, votre navigateur et votre adresse IP. Jamais ce que vous saisissez. Ce rapport ne dépend pas du choix ci-dessus — il sert à réparer, pas à mesurer.',
    errorsBasis: 'À quel titre, pour ces rapports',
    controller: 'Responsable du traitement',
    rights: 'Vos droits',
    rightsText:
      'Accès, rectification, effacement, opposition : écrivez à {contact}.',
    missing: '[À compléter]',
  },
};

export default labels;
