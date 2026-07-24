/**
 * Observabilité partagée — découplée de React.
 *
 *  - installErrorReporter() : capture window.error + unhandledrejection dans un
 *    ring-buffer localStorage (50 dernières) + relais vers un forwarder.
 *  - recordError(error, context) : enregistre + forward (appelable à la main,
 *    p.ex. depuis ErrorBoundary.onError).
 *  - initSentry({ dsn, ... }) : NO-OP si pas de dsn (bundle prod intact) ; sinon
 *    lazy-import @sentry/react (peer optionnelle) et le câble comme forwarder.
 *
 * Usage app (main.tsx) :
 *   installErrorReporter();
 *   void initSentry({ dsn: import.meta.env.VITE_SENTRY_DSN, release, environment });
 *   <ErrorBoundary onError={(e, i) => recordError(e, { react: i.componentStack })}>
 */
const RING_KEY = 'dwc_error_log';
const RING_MAX = 50;
let forwarder = null;
let installed = false;

function readRing() {
  try {
    const raw = localStorage.getItem(RING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRing(entries) {
  try {
    localStorage.setItem(RING_KEY, JSON.stringify(entries.slice(-RING_MAX)));
  } catch {
    /* quota / pas de localStorage : on garde en mémoire le temps de la session */
  }
}

/** Lit le journal d'erreurs (pour un écran debug ou une sauvegarde). */
export function getErrorLog() {
  return readRing();
}

/** Vide le journal d'erreurs. */
export function clearErrorLog() {
  try {
    localStorage.removeItem(RING_KEY);
  } catch {
    /* ignore */
  }
}

/** Définit (ou retire avec null) la fonction de relais (ex. Sentry). */
export function setForwarder(fn) {
  forwarder = typeof fn === 'function' ? fn : null;
}

/** Enregistre une erreur (ring-buffer) puis la relaie au forwarder. */
export function recordError(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry = {
    ts: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    context,
  };
  const ring = readRing();
  ring.push(entry);
  writeRing(ring);
  if (forwarder) {
    try {
      forwarder(err, context);
    } catch {
      /* un forwarder cassé ne doit jamais casser l'app */
    }
  }
  return entry;
}

/** Installe les listeners globaux (idempotent). */
export function installErrorReporter(options = {}) {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  if (options.forwarder) setForwarder(options.forwarder);
  window.addEventListener('error', e =>
    recordError(e.error ?? e.message, { type: 'window.error' })
  );
  window.addEventListener('unhandledrejection', e =>
    recordError(e.reason ?? 'unhandledrejection', {
      type: 'unhandledrejection',
    })
  );
}

/**
 * Initialise Sentry SI un dsn est fourni (sinon no-op → @sentry/react jamais
 * importé, bundle prod inchangé). Câble Sentry comme forwarder.
 *
 * Apps AVEC @sentry/react : passer `loader: () => import('@sentry/react')`
 * (import statiquement analysable côté app, donc bundlé normalement).
 * Sans `loader`, l'import dynamique est volontairement NON analysable
 * (spécificateur non littéral + @vite-ignore) : Rolldown/Vite 8 échouait
 * au build de tout consommateur sans la peer optionnelle installée.
 */
export async function initSentry(options = {}) {
  const { dsn, release, environment, tracesSampleRate, loader } = options;
  if (!dsn) return null;
  try {
    const specifier = '@sentry' + '/react';
    const Sentry = loader
      ? await loader()
      : await import(/* @vite-ignore */ specifier);
    Sentry.init({ dsn, release, environment, tracesSampleRate });
    setForwarder((error, context) =>
      Sentry.captureException(error, { extra: context })
    );
    return Sentry;
  } catch {
    return null;
  }
}
