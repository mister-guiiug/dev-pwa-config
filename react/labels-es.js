/**
 * Libellés des composants du paquet en espagnol (`es`).
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
  sheet: { close: 'Cerrar' },
  confirm: {
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    destructiveConfirm: 'Eliminar',
    ok: 'OK',
  },
  toast: {
    close: 'Cerrar la notificación',
    region: 'Notificaciones',
    undo: 'Deshacer',
  },
  error: { retry: 'Reintentar', close: 'Cerrar' },
  install: {
    title: 'Instalar la aplicación',
    description:
      'Añade esta aplicación a tu pantalla de inicio: acceso rápido, sin conexión.',
    howIos: 'Toca el botón Compartir y luego «Añadir a inicio».',
    howSafari: 'En el menú Archivo de Safari, elige «Añadir al Dock».',
    howGeneric: 'Abre el menú de tu navegador y elige «Instalar aplicación».',
    install: 'Instalar',
    dismiss: 'Más tarde',
  },
  update: {
    title: 'Actualización disponible',
    update: 'Actualizar',
    updating: 'Actualizando…',
    snooze: 'Más tarde ({hours} h)',
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
    loading: 'Cargando la página…',
  },
  consent: {
    title: 'Medición de audiencia',
    message:
      'Esta aplicación puede medir su uso para mejorar. No se envía nada hasta que lo aceptes.',
    accept: 'Aceptar',
    refuse: 'Rechazar',
    policy: 'Más información',
    stateGranted: 'Medición de audiencia: aceptada',
    stateDenied: 'Medición de audiencia: rechazada',
    manage: 'Cambiar mi elección',
  },
  privacy: {
    title: 'Sus datos',
    what: 'Qué se mide',
    whatText:
      'Las páginas que consulta y cómo se desplaza entre ellas, mediante PostHog. Nunca lo que escribe en la aplicación.',
    basis: 'Con qué fundamento',
    basisText:
      'Su consentimiento, y solo él. Puede retirarlo en cualquier momento, con la misma facilidad con que lo dio.',
    recipient: 'Quién los recibe',
    recipientText:
      'PostHog, en sus servidores de la Unión Europea, que los trata por cuenta del editor de esta aplicación.',
    retention: 'Durante cuánto tiempo',
    retentionText:
      'Los datos detallados se conservan {months} meses y luego se eliminan.',
    stored: 'Qué se guarda en su dispositivo',
    storedText:
      'Un identificador de visita depositado por PostHog (cookie y almacenamiento local) y su elección, guardada en este navegador para no repetir la pregunta en cada visita.',
    errors: 'En caso de error',
    errorsText:
      'Cuando la aplicación encuentra un error, se envía un informe técnico a Sentry, en sus servidores de Alemania: el mensaje, el lugar del código, la dirección de la página, su navegador y su dirección IP. Nunca lo que usted escribe. Este informe no depende de la elección anterior: sirve para reparar, no para medir.',
    errorsBasis: 'Con qué fundamento, para estos informes',
    controller: 'Responsable del tratamiento',
    rights: 'Sus derechos',
    rightsText:
      'Acceso, rectificación, supresión, oposición: escriba a {contact}.',
    missing: '[Por completar]',
  },
};

export default labels;
