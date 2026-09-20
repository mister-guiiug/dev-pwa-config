/**
 * Libellés des composants du paquet en allemand (`de`).
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
  sheet: { close: 'Schließen' },
  confirm: {
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
    destructiveConfirm: 'Löschen',
    ok: 'OK',
  },
  toast: {
    close: 'Benachrichtigung schließen',
    region: 'Benachrichtigungen',
    undo: 'Rückgängig',
  },
  error: { retry: 'Erneut versuchen', close: 'Schließen' },
  install: {
    title: 'App installieren',
    description:
      'Füge diese App deinem Startbildschirm hinzu: schneller Zugriff, auch offline.',
    howIos: 'Tippe auf „Teilen“ und dann auf „Zum Home-Bildschirm“.',
    howSafari: 'Wähle in Safari „Ablage“ und dann „Zum Dock hinzufügen“.',
    howGeneric: 'Öffne das Browsermenü und wähle „App installieren“.',
    install: 'Installieren',
    dismiss: 'Später',
  },
  update: {
    title: 'Neue Version verfügbar',
    update: 'Aktualisieren',
    updating: 'Wird aktualisiert…',
    snooze: 'Später ({hours} Std.)',
    dismiss: 'Später',
    ignore: 'Ignorieren',
    force: 'Aktualisierung erzwingen',
    forceHint:
      'Leert den Cache der App und lädt neu. Deine Daten bleiben erhalten.',
    offlineReady: 'Die App funktioniert jetzt auch offline.',
    offlineReadyOk: 'OK',
  },
  footer: {
    source: 'Quellcode',
    sponsor: 'Spendier mir einen Kaffee',
    issues: 'Ein Problem melden',
  },
  share: {
    label: 'Teilen',
    copied: 'Link kopiert',
    failed: 'Teilen nicht möglich',
  },
  version: {
    label: 'Version',
    updated: 'Aktualisiert auf Version {version}',
    available: 'Version {version} verfügbar',
    built: 'Erstellt am {date}',
    release: 'Versionshinweise',
  },
  apps: {
    repo: 'Quellcode von {app}',
    source: 'Quellcode',
    sponsor: 'Spendier mir einen Kaffee',
    otherApps: 'Unsere anderen Apps',
  },
  categories: {
    sante: 'Gesundheit',
    sport: 'Sport',
    jeux: 'Spiele',
    loisirs: 'Freizeit',
    education: 'Bildung',
    outils: 'Werkzeuge',
    dev: 'Dev',
  },
  maturity: { alpha: 'Alpha', beta: 'Beta', stable: 'Stabil' },
  sync: {
    synced: 'Synchronisiert',
    pending: 'Ausstehend',
    offline: 'Offline',
    error: 'Fehler',
  },
  guard: {
    offline: 'Offline nicht verfügbar',
    readonly: 'Daten nicht synchronisiert — Aktion nicht verfügbar',
  },
  // Les thèmes sont des noms, pas des adjectifs : l'allemand décline
  // l'adjectif selon l'article, et « {next} » ne peut pas se décliner.
  theme: {
    label: 'Design',
    light: 'Hell',
    dark: 'Dunkel',
    system: 'System',
    next: 'Design: {current}. Design {next} aktivieren.',
  },
  auth: {
    title: 'Anmelden',
    signUpTitle: 'Konto erstellen',
    otpTitle: 'Mit einem Link anmelden',
    sendLink: 'Link senden',
    email: 'E-Mail-Adresse',
    password: 'Passwort',
    signIn: 'Anmelden',
    signUp: 'Konto erstellen',
    mfaTitle: 'Bestätigung in zwei Schritten',
    mfaHint: 'Gib den Code aus deiner Authentifizierungs-App ein.',
    mfaCode: '6-stelliger Code',
    mfaRecoveryCode: 'Wiederherstellungscode',
    mfaVerify: 'Bestätigen',
    mfaRecovery: 'Wiederherstellungscode verwenden',
    mfaUseApp: 'Authentifizierungs-App verwenden',
    signOut: 'Abmelden',
  },
  nav: {
    back: 'Zurück',
    label: 'Hauptnavigation',
    current: 'Aktuelle Seite',
    more: 'Mehr',
    loading: 'Seite wird geladen…',
  },
  consent: {
    title: 'Reichweitenmessung',
    message:
      'Diese App kann ihre Nutzung messen, um besser zu werden. Es wird nichts gesendet, bevor Sie zustimmen.',
    accept: 'Zustimmen',
    refuse: 'Ablehnen',
    policy: 'Mehr erfahren',
    stateGranted: 'Reichweitenmessung: zugestimmt',
    stateDenied: 'Reichweitenmessung: abgelehnt',
    manage: 'Meine Auswahl ändern',
  },
  privacy: {
    title: 'Ihre Daten',
    what: 'Was gemessen wird',
    whatText:
      'Die Seiten, die Sie aufrufen, und wie Sie sich zwischen ihnen bewegen — über PostHog. Niemals das, was Sie in der Anwendung eingeben.',
    basis: 'Auf welcher Grundlage',
    basisText:
      'Ihre Einwilligung, und nur diese. Sie können sie jederzeit widerrufen, so einfach wie Sie sie erteilt haben.',
    recipient: 'Wer sie erhält',
    recipientText:
      'PostHog, auf dessen Servern in der Europäischen Union, das sie im Auftrag des Herausgebers dieser Anwendung verarbeitet.',
    retention: 'Wie lange',
    retentionText:
      'Detaillierte Daten werden {months} Monate gespeichert und danach gelöscht.',
    stored: 'Was auf Ihrem Gerät gespeichert wird',
    storedText:
      'Eine Besuchskennung von PostHog (Cookie und lokaler Speicher) und Ihre Wahl, in diesem Browser gespeichert, damit die Frage nicht bei jedem Besuch erneut gestellt wird.',
    errors: 'Im Fehlerfall',
    errorsText:
      'Wenn die Anwendung auf einen Fehler stößt, geht ein technischer Bericht an Sentry, auf dessen Server in Deutschland: die Meldung, die Stelle im Code, die Adresse der Seite, Ihr Browser und Ihre IP-Adresse. Niemals das, was Sie eingeben. Dieser Bericht hängt nicht von der obigen Wahl ab — er dient der Behebung, nicht der Messung.',
    errorsBasis: 'Auf welcher Grundlage, für diese Berichte',
    controller: 'Verantwortlicher',
    rights: 'Ihre Rechte',
    rightsText:
      'Auskunft, Berichtigung, Löschung, Widerspruch: schreiben Sie an {contact}.',
    missing: '[Zu ergänzen]',
  },
};

export default labels;
