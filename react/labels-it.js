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
    update: 'Aggiorna',
    updating: 'Aggiornamento…',
    snooze: 'Più tardi ({hours} h)',
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
    loading: 'Caricamento della pagina…',
  },
  consent: {
    title: 'Misurazione del pubblico',
    message:
      'Questa applicazione può misurare il proprio utilizzo per migliorare. Non viene inviato nulla finché non accetti.',
    accept: 'Accetta',
    refuse: 'Rifiuta',
    policy: 'Scopri di più',
    stateGranted: 'Misurazione del pubblico: accettata',
    stateDenied: 'Misurazione del pubblico: rifiutata',
    manage: 'Modifica la mia scelta',
  },
  privacy: {
    title: 'I suoi dati',
    what: 'Che cosa viene misurato',
    whatText:
      'Le pagine che consulta e come si sposta tra di esse, tramite PostHog. Mai ciò che digita nell’applicazione.',
    basis: 'A quale titolo',
    basisText:
      'Il suo consenso, e null’altro. Può revocarlo in qualsiasi momento, con la stessa facilità con cui l’ha dato.',
    recipient: 'Chi li riceve',
    recipientText:
      'PostHog, sui suoi server dell’Unione europea, che li tratta per conto dell’editore di questa applicazione.',
    retention: 'Per quanto tempo',
    retentionText:
      'I dati dettagliati sono conservati {months} mesi, poi cancellati.',
    stored: 'Che cosa viene salvato sul suo dispositivo',
    storedText:
      'Un identificativo di visita depositato da PostHog (cookie e memoria locale) e la sua scelta, conservata in questo browser per non riproporre la domanda a ogni visita.',
    errors: 'In caso di errore',
    errorsText:
      'Quando l’applicazione incontra un errore, un rapporto tecnico viene inviato a Sentry, sui suoi server in Germania: il messaggio, il punto del codice, l’indirizzo della pagina, il suo browser e il suo indirizzo IP. Mai ciò che digita. Questo rapporto non dipende dalla scelta qui sopra: serve a riparare, non a misurare.',
    errorsBasis: 'A quale titolo, per questi rapporti',
    controller: 'Titolare del trattamento',
    rights: 'I suoi diritti',
    rightsText:
      'Accesso, rettifica, cancellazione, opposizione: scriva a {contact}.',
    missing: '[Da completare]',
  },
};

export default labels;
