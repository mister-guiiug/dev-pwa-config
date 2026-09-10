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
};

export default labels;
