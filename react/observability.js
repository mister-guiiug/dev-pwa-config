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
import { redact } from '../security.js';
import { initWebVitals } from '../web-vitals.js';

const RING_KEY = 'dwc_error_log';
const RING_MAX = 50;
let forwarder = null;
let installed = false;
/** Clés supplémentaires à masquer, propres à l'app. */
let extraRedactKeys = [];

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

/** Ajoute des clés à masquer dans le contexte des erreurs (`matricule`…). */
export function setRedactKeys(keys) {
  extraRedactKeys = Array.isArray(keys) ? keys : [];
}

/** Définit (ou retire avec null) la fonction de relais (ex. Sentry). */
export function setForwarder(fn) {
  forwarder = typeof fn === 'function' ? fn : null;
}

/**
 * Enregistre une erreur (ring-buffer) puis la relaie au forwarder.
 *
 * LE CONTEXTE EST MASQUÉ AVANT D'ÊTRE ÉCRIT. Ce journal vit dans
 * `localStorage`, lisible par tout script de la page et par quiconque exporte
 * une sauvegarde. Un `context` arbitraire — c'est ce que la signature invite à
 * passer — y déposait jusqu'ici des valeurs de formulaire, des jetons, une
 * adresse. `redact` a été écrit POUR ce cas, et n'y était pas branché.
 * `setRedactKeys` ajoute les clés propres à une app.
 */
export function recordError(error, context = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry = {
    ts: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    context: redact(context, extraRedactKeys),
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

/**
 * L'observabilité en un appel — erreurs, relais Sentry, et performance.
 *
 * POURQUOI CETTE FAÇADE. Treize apps sur seize importent ce module, et les
 * treize ouvrent leur `main.tsx` par les deux mêmes lignes :
 *
 *   installErrorReporter();
 *   void initSentry({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
 *
 * Neuf y ajoutent le même troisième geste — `recordError` recâblé à la main
 * dans le `onError` de la frontière d'erreur (voir `ObservabilityBoundary`).
 * Deux appels et un branchement, répétés à l'identique treize fois : la
 * définition même de ce qu'un socle doit absorber.
 *
 * ET LE TROISIÈME MEMBRE. `initWebVitals` a été promu séparément, alors que
 * mesurer ce qui casse et mesurer ce qui rame sont le même sujet, relayés au
 * même endroit. `webVitals: true` les enregistre et les fait passer par le
 * forwarder, donc par Sentry quand il est là.
 *
 * TOUT EST OPTIONNEL. Sans `dsn`, Sentry n'est jamais importé — le bundle de
 * production est inchangé. Sans `webVitals`, la bibliothèque n'est pas chargée.
 * Un appel nu installe juste les écouteurs globaux, comme avant.
 *
 * @param {{
 *   dsn?: string, release?: string, environment?: string,
 *   tracesSampleRate?: number, loader?: () => Promise<unknown>,
 *   webVitals?: boolean | { loader?: () => Promise<Record<string, unknown>> },
 *   redactKeys?: string[],
 *   onMetric?: (metric: { name: string, value: number, rating: string }) => void,
 * }} [options]
 * @returns {Promise<{ sentry: unknown, vitals: string[] }>} De quoi vérifier ce
 *   qui a réellement été installé — une liste de métriques vide est un signal,
 *   pas un détail.
 */
export async function installObservability(options = {}) {
  const { redactKeys, webVitals, onMetric, ...sentryOptions } = options;

  if (redactKeys) setRedactKeys(redactKeys);
  installErrorReporter();

  const sentry = await initSentry(sentryOptions);

  let vitals = [];
  if (webVitals) {
    vitals = await initWebVitals({
      loader: typeof webVitals === 'object' ? webVitals.loader : undefined,
      onMetric,
      // Une métrique qui ne s'enregistre pas est une information : elle passe
      // par le même canal que les erreurs, au lieu d'un avertissement console
      // que personne ne lit — le défaut mesuré dans les quatre copies.
      onError: (name, error) =>
        recordError(error, { type: 'web-vitals', metric: name }),
    });
  }

  return { sentry, vitals };
}
