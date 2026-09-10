/**
 * Libellés des composants du paquet en italien (`it`).
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
  sheet: { close: 'Chiudi' },
  confirm: {
    confirm: 'Conferma',
    cancel: 'Annulla',
    destructiveConfirm: 'Elimina',
    ok: 'OK',
  },
  toast: {
    close: 'Chiudi la notifica',
    region: 'Notifiche',
    undo: 'Annulla',
  },
  error: { retry: 'Riprova', close: 'Chiudi' },
  install: {
    title: 'Installa l’app',
    description:
      'Aggiungi questa app alla schermata Home: accesso rapido, anche offline.',
    howIos: 'Tocca il pulsante Condividi, poi «Aggiungi a Home».',
    howSafari: 'Nel menu Archivio di Safari, scegli «Aggiungi al Dock».',
    howGeneric: 'Apri il menu del browser, poi «Installa applicazione».',
    install: 'Installa',
    dismiss: 'Più tardi',
  },
  update: {
    title: 'Aggiornamento disponibile',
    update: 'Ricarica',
    updating: 'Aggiornamento…',
    snooze: 'Più tardi',
    dismiss: 'Più tardi',
    ignore: 'Ignora',
    force: 'Forza l’aggiornamento',
    forceHint:
      'Svuota la cache dell’app e ricarica. I tuoi dati vengono conservati.',
    offlineReady: 'L’app ora funziona anche offline.',
    offlineReadyOk: 'OK',
  },
  footer: {
    source: 'Codice sorgente',
    sponsor: 'Offrimi un caffè',
    issues: 'Segnala un problema',
  },
  share: {
    label: 'Condividi',
    copied: 'Link copiato',
    failed: 'Condivisione non riuscita',
  },
  version: {
    label: 'Versione',
    updated: 'Aggiornato alla versione {version}',
    available: 'Versione {version} disponibile',
    built: 'Compilata il {date}',
    release: 'Note di rilascio',
  },
  apps: {
    repo: 'Codice sorgente di {app}',
    source: 'Codice sorgente',
    sponsor: 'Offrimi un caffè',
    otherApps: 'Le nostre altre app',
  },
  maturity: { alpha: 'Alfa', beta: 'Beta', stable: 'Stabile' },
  sync: {
    synced: 'Sincronizzato',
    pending: 'In attesa',
    offline: 'Offline',
    error: 'Errore',
  },
  guard: {
    offline: 'Non disponibile offline',
    readonly: 'Dati non sincronizzati — azione non disponibile',
  },
  theme: {
    label: 'Tema',
    light: 'chiaro',
    dark: 'scuro',
    system: 'di sistema',
    next: 'Tema: {current}. Attiva il tema {next}.',
  },
  auth: {
    title: 'Accedi',
    signUpTitle: 'Crea un account',
    otpTitle: 'Accedi con un link',
    sendLink: 'Invia un link',
    email: 'Indirizzo e-mail',
    password: 'Password',
    signIn: 'Accedi',
    signUp: 'Crea l’account',
    mfaTitle: 'Verifica in due passaggi',
    mfaHint: 'Inserisci il codice della tua app di autenticazione.',
    mfaCode: 'Codice a 6 cifre',
    mfaRecoveryCode: 'Codice di recupero',
    mfaVerify: 'Verifica',
    mfaRecovery: 'Usa un codice di recupero',
    mfaUseApp: 'Usa l’app di autenticazione',
    signOut: 'Esci',
  },
  nav: {
    back: 'Indietro',
    label: 'Navigazione principale',
    current: 'Pagina corrente',
    more: 'Altro',
  },
};

export default labels;
