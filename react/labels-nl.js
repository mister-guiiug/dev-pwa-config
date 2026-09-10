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
    update: 'Herladen',
    updating: 'Bijwerken…',
    snooze: 'Later',
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
  },
};

export default labels;
