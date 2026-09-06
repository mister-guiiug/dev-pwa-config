import { createContext, createElement, useContext, useMemo } from 'react';

/**
 * Libellés des composants du paquet, en sept langues : `fr`, `en`, `es`,
 * `de`, `it`, `pt`, `nl`.
 *
 * DEUX LANGUES NE SUFFISAIENT PAS, et le repli était SILENCIEUX. Jusqu'au
 * 02/09/2026 ce fichier ne portait que `fr` et `en`, et toute autre locale
 * retombait sur le français sans erreur ni avertissement. Or la famille en
 * parle sept : `miss-contraction` (7), `miss-dice` (6), `mister-qowa` (5),
 * `miss-badminton` (3). Huit fichiers-pont dans sept apps — `AppUpdatesProvider`
 * × 2, `AppLabelsProvider`, `SocleLabels`, `SocleProviders`,
 * `SocleLabelsBridge`, `useNetworkGuard` × 2 — n'existaient que pour surcharger
 * ce que le socle ne savait pas dire. Les cinq dictionnaires ci-dessous sont
 * rapatriés de ces apps : ce n'était pas un chantier de traduction.
 *
 * LE PROBLÈME D'ORIGINE. Onze libellés étaient codés en dur en français dans six
 * composants (`'Fermer'`, `'Réessayer'`, `'Plus tard'`…). Tous étaient
 * surchargeables par prop — mais aucun pont n'existait avec `createI18n`, que
 * huit apps utilisent : chacune recâblait donc les mêmes onze chaînes, à la
 * main, dans chaque écran qui monte un composant.
 *
 * POURQUOI UN CONTEXTE À PART, et pas celui de `createI18n`. `createI18n`
 * fabrique un contexte ISOLÉ par app, avec son propre dictionnaire métier : le
 * paquet ne peut pas le lire, et n'a pas à imposer ses clés dedans. Ce contexte
 * n'est donc chargé que des libellés des composants — une quinzaine de chaînes,
 * rien d'autre.
 *
 * TROIS NIVEAUX, dans cet ordre : la **prop** l'emporte toujours, puis le
 * **contexte**, puis le **français par défaut**. Une app qui ne fait rien
 * obtient exactement ce qu'elle avait avant — aucune rupture.
 *
 *   import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react/labels';
 *
 *   const { locale } = useI18n();          // le i18n de l'app
 *   <LabelsProvider locale={locale}>…</LabelsProvider>
 *
 * Pour changer un mot sans changer de langue :
 *
 *   <LabelsProvider locale="fr" overrides={{ sheet: { close: 'Retour' } }}>
 */

/** @type {Record<string, Record<string, Record<string, string>>>} */
export const LABELS = {
  fr: {
    sheet: { close: 'Fermer' },
    confirm: {
      confirm: 'Confirmer',
      cancel: 'Annuler',
      destructiveConfirm: 'Supprimer',
      // Mode mono-action : le bouton prend acte, il ne « confirme » rien.
      ok: 'OK',
    },
    toast: { close: 'Fermer la notification', region: 'Notifications' },
    error: { retry: 'Réessayer', close: 'Fermer' },
    install: {
      title: 'Installer l’application',
      description:
        'Ajoutez cette application à votre écran d’accueil : accès rapide, hors-ligne.',
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
  },
  en: {
    sheet: { close: 'Close' },
    confirm: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      destructiveConfirm: 'Delete',
      ok: 'OK',
    },
    toast: { close: 'Dismiss notification', region: 'Notifications' },
    error: { retry: 'Try again', close: 'Dismiss' },
    install: {
      title: 'Install the app',
      description:
        'Add this app to your home screen: quick access, works offline.',
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
  },
  es: {
    sheet: { close: 'Cerrar' },
    confirm: {
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      destructiveConfirm: 'Eliminar',
      ok: 'OK',
    },
    toast: { close: 'Cerrar la notificación', region: 'Notificaciones' },
    error: { retry: 'Reintentar', close: 'Cerrar' },
    install: {
      title: 'Instalar la aplicación',
      description:
        'Añade esta aplicación a tu pantalla de inicio: acceso rápido, sin conexión.',
      install: 'Instalar',
      dismiss: 'Más tarde',
    },
    update: {
      title: 'Actualización disponible',
      update: 'Recargar',
      updating: 'Actualizando…',
      snooze: 'Más tarde',
      dismiss: 'Más tarde',
      ignore: 'Ignorar',
      force: 'Forzar la actualización',
      forceHint:
        'Vacía la caché de la aplicación y recarga. Tus datos se conservan.',
      offlineReady: 'La aplicación ya funciona sin conexión.',
      offlineReadyOk: 'OK',
    },
    footer: {
      source: 'Código fuente',
      sponsor: 'Invítame a un café',
      issues: 'Informar de un problema',
    },
    share: {
      label: 'Compartir',
      copied: 'Enlace copiado',
      failed: 'No se pudo compartir',
    },
    version: {
      label: 'Versión',
      updated: 'Actualizado a la versión {version}',
      available: 'Versión {version} disponible',
      built: 'Compilada el {date}',
      release: 'Notas de la versión',
    },
    apps: {
      repo: 'Código fuente de {app}',
      source: 'Código fuente',
      sponsor: 'Invítame a un café',
      otherApps: 'Nuestras otras aplicaciones',
    },
    maturity: { alpha: 'Alfa', beta: 'Beta', stable: 'Estable' },
    sync: {
      synced: 'Sincronizado',
      pending: 'Pendiente',
      offline: 'Sin conexión',
      error: 'Error',
    },
    guard: {
      offline: 'No disponible sin conexión',
      readonly: 'Datos no sincronizados — acción no disponible',
    },
    theme: {
      label: 'Tema',
      light: 'claro',
      dark: 'oscuro',
      system: 'del sistema',
      next: 'Tema: {current}. Activar el tema {next}.',
    },
    auth: {
      title: 'Iniciar sesión',
      signUpTitle: 'Crear una cuenta',
      otpTitle: 'Iniciar sesión con un enlace',
      sendLink: 'Enviar un enlace',
      email: 'Correo electrónico',
      password: 'Contraseña',
      signIn: 'Iniciar sesión',
      signUp: 'Crear la cuenta',
      mfaTitle: 'Verificación en dos pasos',
      mfaHint: 'Introduce el código de tu aplicación de autenticación.',
      mfaCode: 'Código de 6 dígitos',
      mfaRecoveryCode: 'Código de recuperación',
      mfaVerify: 'Verificar',
      mfaRecovery: 'Usar un código de recuperación',
      mfaUseApp: 'Usar la aplicación de autenticación',
      signOut: 'Cerrar sesión',
    },
    nav: {
      back: 'Volver',
      label: 'Navegación principal',
      current: 'Página actual',
      more: 'Más',
    },
  },
  de: {
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
    },
    error: { retry: 'Erneut versuchen', close: 'Schließen' },
    install: {
      title: 'App installieren',
      description:
        'Füge diese App deinem Startbildschirm hinzu: schneller Zugriff, auch offline.',
      install: 'Installieren',
      dismiss: 'Später',
    },
    update: {
      title: 'Neue Version verfügbar',
      update: 'Neu laden',
      updating: 'Wird aktualisiert…',
      snooze: 'Später',
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
    },
  },
  it: {
    sheet: { close: 'Chiudi' },
    confirm: {
      confirm: 'Conferma',
      cancel: 'Annulla',
      destructiveConfirm: 'Elimina',
      ok: 'OK',
    },
    toast: { close: 'Chiudi la notifica', region: 'Notifiche' },
    error: { retry: 'Riprova', close: 'Chiudi' },
    install: {
      title: 'Installa l’app',
      description:
        'Aggiungi questa app alla schermata Home: accesso rapido, anche offline.',
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
  },
  // Portugais européen (« aplicação », « ecrã », « ligação ») : c'est la
  // variante que `miss-contraction` sert déjà.
  pt: {
    sheet: { close: 'Fechar' },
    confirm: {
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      destructiveConfirm: 'Eliminar',
      ok: 'OK',
    },
    toast: { close: 'Fechar a notificação', region: 'Notificações' },
    error: { retry: 'Tentar novamente', close: 'Fechar' },
    install: {
      title: 'Instalar a aplicação',
      description:
        'Adicione esta aplicação ao ecrã inicial: acesso rápido, mesmo sem ligação.',
      install: 'Instalar',
      dismiss: 'Mais tarde',
    },
    update: {
      title: 'Atualização disponível',
      update: 'Recarregar',
      updating: 'A atualizar…',
      snooze: 'Mais tarde',
      dismiss: 'Mais tarde',
      ignore: 'Ignorar',
      force: 'Forçar a atualização',
      forceHint:
        'Limpa a cache da aplicação e recarrega. Os seus dados são conservados.',
      offlineReady: 'A aplicação já funciona sem ligação.',
      offlineReadyOk: 'OK',
    },
    footer: {
      source: 'Código-fonte',
      sponsor: 'Pague-me um café',
      issues: 'Relatar um problema',
    },
    share: {
      label: 'Partilhar',
      copied: 'Ligação copiada',
      failed: 'Não foi possível partilhar',
    },
    version: {
      label: 'Versão',
      updated: 'Atualizado para a versão {version}',
      available: 'Versão {version} disponível',
      built: 'Compilada em {date}',
      release: 'Notas da versão',
    },
    apps: {
      repo: 'Código-fonte de {app}',
      source: 'Código-fonte',
      sponsor: 'Pague-me um café',
      otherApps: 'As nossas outras aplicações',
    },
    maturity: { alpha: 'Alfa', beta: 'Beta', stable: 'Estável' },
    sync: {
      synced: 'Sincronizado',
      pending: 'Pendente',
      offline: 'Sem ligação',
      error: 'Erro',
    },
    guard: {
      offline: 'Indisponível sem ligação',
      readonly: 'Dados não sincronizados — ação indisponível',
    },
    theme: {
      label: 'Tema',
      light: 'claro',
      dark: 'escuro',
      system: 'do sistema',
      next: 'Tema: {current}. Ativar o tema {next}.',
    },
    auth: {
      title: 'Iniciar sessão',
      signUpTitle: 'Criar uma conta',
      otpTitle: 'Iniciar sessão com uma ligação',
      sendLink: 'Enviar uma ligação',
      email: 'Endereço de e-mail',
      password: 'Palavra-passe',
      signIn: 'Iniciar sessão',
      signUp: 'Criar a conta',
      mfaTitle: 'Verificação em dois passos',
      mfaHint: 'Introduza o código da sua aplicação de autenticação.',
      mfaCode: 'Código de 6 dígitos',
      mfaRecoveryCode: 'Código de recuperação',
      mfaVerify: 'Verificar',
      mfaRecovery: 'Usar um código de recuperação',
      mfaUseApp: 'Usar a aplicação de autenticação',
      signOut: 'Terminar sessão',
    },
    nav: {
      back: 'Voltar',
      label: 'Navegação principal',
      current: 'Página atual',
      more: 'Mais',
    },
  },
  nl: {
    sheet: { close: 'Sluiten' },
    confirm: {
      confirm: 'Bevestigen',
      cancel: 'Annuleren',
      destructiveConfirm: 'Verwijderen',
      ok: 'OK',
    },
    toast: { close: 'Melding sluiten', region: 'Meldingen' },
    error: { retry: 'Opnieuw proberen', close: 'Sluiten' },
    install: {
      title: 'App installeren',
      description:
        'Zet deze app op je beginscherm: snel bij de hand, ook offline.',
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
  },
};

export const DEFAULT_LOCALE = 'fr';

/**
 * Le dictionnaire d'une locale, ou `null`.
 *
 * `pt-BR`, `de-CH`, `es-419` : une étiquette régionale retombe sur sa langue
 * avant de retomber sur le français — `createI18n` passe parfois l'étiquette
 * complète, et « pt-BR → français » serait le même repli silencieux que ce
 * fichier vient de fermer.
 */
export function labelsFor(locale) {
  if (typeof locale !== 'string' || !locale) return null;
  const exact = LABELS[locale] ?? LABELS[locale.toLowerCase()];
  if (exact) return exact;
  const language = locale.toLowerCase().split(/[-_]/)[0];
  return LABELS[language] ?? null;
}

const LabelsContext = createContext(null);

/** Fusionne un jeu de libellés avec des surcharges, groupe par groupe. */
export function mergeLabels(base, overrides = {}) {
  const out = {};
  for (const [group, entries] of Object.entries(base)) {
    out[group] = { ...entries, ...(overrides[group] ?? {}) };
  }
  for (const [group, entries] of Object.entries(overrides)) {
    if (!(group in out)) out[group] = { ...entries };
  }
  return out;
}

/**
 * Fournit les libellés aux composants du paquet.
 *
 * @param {{ locale?: string, overrides?: object, children?: unknown }} props
 */
export function LabelsProvider(props = {}) {
  const { locale = DEFAULT_LOCALE, overrides, children } = props;
  const value = useMemo(() => {
    // Une locale inconnue retombe sur le français plutôt que sur un objet vide :
    // un libellé manquant est un bouton sans nom accessible.
    const base = labelsFor(locale) ?? LABELS[DEFAULT_LOCALE];
    return overrides ? mergeLabels(base, overrides) : base;
  }, [locale, overrides]);
  return createElement(LabelsContext.Provider, { value }, children);
}

/**
 * Libellés d'un groupe. Utilisable HORS provider : renvoie alors le français,
 * ce que les composants faisaient déjà en dur.
 *
 * @param {string} group
 */
export function useLabels(group) {
  const ctx = useContext(LabelsContext);
  const source = ctx ?? LABELS[DEFAULT_LOCALE];
  return source[group] ?? LABELS[DEFAULT_LOCALE][group] ?? {};
}
