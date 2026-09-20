/**
 * Libellés des composants du paquet en néerlandais (`nl`).
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
  sheet: { close: 'Sluiten' },
  confirm: {
    confirm: 'Bevestigen',
    cancel: 'Annuleren',
    destructiveConfirm: 'Verwijderen',
    ok: 'OK',
  },
  toast: {
    close: 'Melding sluiten',
    region: 'Meldingen',
    undo: 'Ongedaan maken',
  },
  error: { retry: 'Opnieuw proberen', close: 'Sluiten' },
  install: {
    title: 'App installeren',
    description:
      'Zet deze app op je beginscherm: snel bij de hand, ook offline.',
    howIos: 'Tik op de deelknop en daarna op ‘Zet op beginscherm’.',
    howSafari: 'Kies in het menu Archief van Safari ‘Voeg toe aan Dock’.',
    howGeneric: 'Open het menu van je browser en kies ‘App installeren’.',
    install: 'Installeren',
    dismiss: 'Later',
  },
  update: {
    title: 'Update beschikbaar',
    update: 'Bijwerken',
    updating: 'Bijwerken…',
    snooze: 'Later ({hours} u)',
    dismiss: 'Later',
    ignore: 'Negeren',
    force: 'Update forceren',
    forceHint:
      'Wist de cache van de app en laadt opnieuw. Je gegevens blijven bewaard.',
    offlineReady: 'De app werkt nu ook offline.',
    offlineReadyOk: 'OK',
  },
  footer: {
    source: 'Broncode',
    sponsor: 'Trakteer me op een koffie',
    issues: 'Een probleem melden',
  },
  share: {
    label: 'Delen',
    copied: 'Link gekopieerd',
    failed: 'Delen is mislukt',
  },
  version: {
    label: 'Versie',
    updated: 'Bijgewerkt naar versie {version}',
    available: 'Versie {version} beschikbaar',
    built: 'Gebouwd op {date}',
    release: 'Releaseopmerkingen',
  },
  apps: {
    repo: 'Broncode van {app}',
    source: 'Broncode',
    sponsor: 'Trakteer me op een koffie',
    otherApps: 'Onze andere apps',
  },
  categories: {
    sante: 'Gezondheid',
    sport: 'Sport',
    jeux: 'Spellen',
    loisirs: 'Vrije tijd',
    education: 'Onderwijs',
    outils: 'Gereedschap',
    dev: 'Dev',
  },
  maturity: { alpha: 'Alfa', beta: 'Bèta', stable: 'Stabiel' },
  sync: {
    synced: 'Gesynchroniseerd',
    pending: 'In afwachting',
    offline: 'Offline',
    error: 'Fout',
  },
  guard: {
    offline: 'Niet beschikbaar offline',
    readonly: 'Gegevens niet gesynchroniseerd — actie niet beschikbaar',
  },
  // « Overschakelen naar {next} » plutôt que « het {next}e thema » : le
  // néerlandais fléchit l'adjectif, et « {next} » ne se fléchit pas.
  theme: {
    label: 'Thema',
    light: 'licht',
    dark: 'donker',
    system: 'systeem',
    next: 'Thema: {current}. Overschakelen naar {next}.',
  },
  auth: {
    title: 'Inloggen',
    signUpTitle: 'Account aanmaken',
    otpTitle: 'Inloggen met een link',
    sendLink: 'Stuur me een link',
    email: 'E-mailadres',
    password: 'Wachtwoord',
    signIn: 'Inloggen',
    signUp: 'Account aanmaken',
    mfaTitle: 'Verificatie in twee stappen',
    mfaHint: 'Voer de code uit je authenticator-app in.',
    mfaCode: '6-cijferige code',
    mfaRecoveryCode: 'Herstelcode',
    mfaVerify: 'Verifiëren',
    mfaRecovery: 'Een herstelcode gebruiken',
    mfaUseApp: 'De authenticator-app gebruiken',
    signOut: 'Uitloggen',
  },
  nav: {
    back: 'Terug',
    label: 'Hoofdnavigatie',
    current: 'Huidige pagina',
    more: 'Meer',
    loading: 'Pagina wordt geladen…',
  },
  consent: {
    title: 'Publieksmeting',
    message:
      'Deze app kan het gebruik meten om te verbeteren. Er wordt niets verzonden totdat u akkoord gaat.',
    accept: 'Accepteren',
    refuse: 'Weigeren',
    policy: 'Meer informatie',
    stateGranted: 'Publieksmeting: geaccepteerd',
    stateDenied: 'Publieksmeting: geweigerd',
    manage: 'Mijn keuze wijzigen',
  },
  privacy: {
    title: 'Uw gegevens',
    what: 'Wat wordt gemeten',
    whatText:
      'De pagina’s die u bekijkt en hoe u ertussen navigeert, via PostHog. Nooit wat u in de applicatie typt.',
    basis: 'Op welke grond',
    basisText:
      'Uw toestemming, en niets anders. U kunt die op elk moment intrekken, net zo eenvoudig als u haar gaf.',
    recipient: 'Wie ze ontvangt',
    recipientText:
      'PostHog, op zijn servers in de Europese Unie, dat ze verwerkt namens de uitgever van deze applicatie.',
    retention: 'Hoe lang',
    retentionText:
      'Gedetailleerde gegevens worden {months} maanden bewaard en daarna verwijderd.',
    stored: 'Wat op uw apparaat wordt opgeslagen',
    storedText:
      'Een bezoekidentificatie van PostHog (cookie en lokale opslag), en uw keuze, bewaard in deze browser zodat de vraag niet bij elk bezoek terugkomt.',
    errors: 'Bij een fout',
    errorsText:
      'Wanneer de applicatie op een fout stuit, gaat een technisch rapport naar Sentry, op zijn servers in Duitsland: de melding, de plek in de code, het adres van de pagina, uw browser en uw IP-adres. Nooit wat u typt. Dit rapport hangt niet af van de keuze hierboven — het dient om te herstellen, niet om te meten.',
    errorsBasis: 'Op welke grond, voor die rapporten',
    controller: 'Verwerkingsverantwoordelijke',
    rights: 'Uw rechten',
    rightsText:
      'Inzage, rectificatie, wissing, bezwaar: schrijf naar {contact}.',
    missing: '[Aan te vullen]',
  },
};

export default labels;
