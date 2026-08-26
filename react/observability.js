/**
 * Observabilité partagée — découplée de React.
 *
 *  - installErrorReporter() : capture window.error + unhandledrejection dans un
 *    ring-buffer localStorage (50 dernières) + relais vers un forwarder.
 *  - recordError(error, context) : enregistre + forward (appelable à la main,
 *    p.ex. depuis ErrorBoundary.onError).
 *  - initSentry({ dsn, ... }) : NO-OP si pas de dsn (bundle prod intact) ; sinon
 *    lazy-import @sentry/react (peer optionnelle) et le câble comme forwarder.
 *  - setSessionContext / breadcrumb / captureConsole : LE CONTEXTE, c'est-à-dire
 *    ce qui manquait pour que les erreurs remontées soient exploitables.
 *
 * Usage app (main.tsx) :
 *   installErrorReporter();
 *   void initSentry({ dsn: import.meta.env.VITE_SENTRY_DSN, release, environment });
 *   <ErrorBoundary onError={(e, i) => recordError(e, { react: i.componentStack })}>
 */
import { redact } from '../security.js';
import { initWebVitals } from '../web-vitals.js';
import { versionContext } from '../version.js';

const RING_KEY = 'dwc_error_log';
const RING_MAX = 50;
/** Fil d'Ariane : ce que l'utilisateur venait de faire. Mémoire seule. */
const TRAIL_MAX = 20;
let forwarder = null;
let installed = false;
/** Clés supplémentaires à masquer, propres à l'app. */
let extraRedactKeys = [];
/** Contexte de session : app, version, langue, thème… Masqué comme le reste. */
let sessionContext = {};
/** Tampon circulaire des derniers gestes. En MÉMOIRE, jamais persisté. */
let trail = [];
/** Restauration de `console`, si `captureConsole` l'a enveloppée. */
let consoleRestore = null;

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

/* ── Le contexte ───────────────────────────────────────────────────────── */

/**
 * Ce qu'on savait de la session au moment de l'erreur.
 *
 * LE CONSTAT, MESURÉ. Treize apps sur seize initialisent Sentry — et
 * `setUser` / `setContext` / `setTag` n'apparaissent que dans SIX. Les dix
 * autres envoient donc des exceptions nues : pas de version, pas de langue,
 * pas de thème, pas d'état réseau. Une trace sans contexte se trie mal et se
 * reproduit encore plus mal.
 *
 * Fusionné, pas remplacé : un appel par information connue, au moment où elle
 * l'est (la version au démarrage, la langue au changement de locale).
 *
 * @param {Record<string, unknown>} context
 */
export function setSessionContext(context = {}) {
  sessionContext = { ...sessionContext, ...context };
  return sessionContext;
}

/** Le contexte de session courant. */
export function getSessionContext() {
  return { ...sessionContext };
}

/**
 * Un geste, daté, dans le fil d'Ariane.
 *
 * POURQUOI EN MÉMOIRE SEULEMENT. Le journal d'erreurs vit dans `localStorage`
 * et y reste ; un fil d'Ariane enregistre BEAUCOUP plus d'événements, souvent
 * porteurs de données saisies. Le persister multiplierait par vingt la surface
 * du problème que `redact` vient de refermer. Il est joint aux erreurs, et
 * disparaît avec l'onglet.
 *
 * `mister-qowa` en a écrit un — vingt et un points d'appel dans
 * `src/lib/report.ts` — mais n'a pas de Sentry : rien n'en sort jamais.
 *
 * @param {string} category `'nav'`, `'clic'`, `'réseau'`…
 * @param {string} message
 * @param {Record<string, unknown>} [data]
 */
export function breadcrumb(category, message, data) {
  const entry = {
    ts: new Date().toISOString(),
    category: String(category ?? 'app'),
    message: String(message ?? ''),
  };
  if (data) entry.data = redact(data, extraRedactKeys);
  trail.push(entry);
  if (trail.length > TRAIL_MAX) trail = trail.slice(-TRAIL_MAX);
  return entry;
}

/** Les derniers gestes enregistrés, du plus ancien au plus récent. */
export function getBreadcrumbs() {
  return [...trail];
}

/** Vide le fil d'Ariane (changement d'utilisateur, écran de debug). */
export function clearBreadcrumbs() {
  trail = [];
}

/**
 * Fait passer `console.error` / `console.warn` dans le fil d'Ariane.
 *
 * LE CONSTAT. **59 appels à `console.error` ou `console.warn`** dans quatorze
 * apps — un `catch` qui journalise et continue, presque à chaque fois. Aucun
 * ne quitte le navigateur : quand l'erreur suivante remonte, ce qui aurait
 * expliqué la panne a déjà disparu de la console de l'utilisateur.
 *
 * LA CONSOLE RESTE INTACTE : on l'enveloppe, on ne la remplace pas. La sortie
 * d'origine est appelée dans tous les cas, y compris si l'enregistrement
 * échoue — un outil d'observabilité qui avale les messages est pire que rien.
 *
 * @param {{ levels?: Array<'error'|'warn'|'log'|'info'> }} [options]
 * @returns {() => void} La restauration, idempotente.
 */
export function captureConsole(options = {}) {
  const { levels = ['error', 'warn'] } = options;
  if (typeof console === 'undefined') return () => {};
  if (consoleRestore) return consoleRestore;

  const originals = new Map();
  for (const level of levels) {
    const original = console[level];
    if (typeof original !== 'function') continue;
    originals.set(level, original);
    console[level] = (...args) => {
      try {
        breadcrumb(`console.${level}`, args.map(stringifyArg).join(' '));
      } catch {
        /* jamais au détriment du message */
      }
      original.apply(console, args);
    };
  }

  consoleRestore = () => {
    for (const [level, original] of originals) console[level] = original;
    consoleRestore = null;
  };
  return consoleRestore;
}

/**
 * Un argument de console en une ligne lisible, sans jeter sur un cycle.
 *
 * MASQUÉ AVANT D'ÊTRE MIS EN CHAÎNE. `console.warn('échec', { token })` est la
 * forme la plus courante dans les 59 appels mesurés : sérialiser l'objet tel
 * quel déposerait le jeton dans le fil d'Ariane, donc dans Sentry. `redact`
 * agit sur les clés, il doit donc voir l'objet — pas sa chaîne.
 */
function stringifyArg(value) {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(redact(value, extraRedactKeys));
  } catch {
    return String(value);
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
    // Le contexte de session d'abord : l'appelant reste prioritaire sur une
    // clé de même nom, parce qu'il en sait plus au moment de l'appel.
    context: redact({ ...sessionContext, ...context }, extraRedactKeys),
  };
  if (trail.length) entry.trail = [...trail];
  const ring = readRing();
  ring.push(entry);
  writeRing(ring);
  if (forwarder) {
    try {
      forwarder(err, entry.context, entry.trail);
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
    setForwarder((error, context, breadcrumbs) => {
      // Le fil d'Ariane part en `extra` plutôt que par `addBreadcrumb` : il est
      // déjà masqué, déjà ordonné, et joint à CETTE exception — alors que les
      // fils de Sentry sont globaux et se mélangent entre onglets.
      const extra = breadcrumbs?.length
        ? { ...context, trail: breadcrumbs }
        : context;
      Sentry.captureException(error, { extra });
    });
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
 * DEUX AJOUTS QUI VALENT SANS SENTRY. `context` renseigne le contexte de
 * session — absent de dix apps sur treize qui pourtant remontent des erreurs —
 * et `console` (actif par défaut) fait passer les 59 `console.error`/`warn`
 * mesurés dans le fil d'Ariane. Les deux enrichissent le journal local, donc
 * servent aussi aux trois apps sans transport (miss-lookhouse, mister-qowa,
 * mister-quota).
 *
 * @param {{
 *   dsn?: string, release?: string, environment?: string,
 *   tracesSampleRate?: number, loader?: () => Promise<unknown>,
 *   webVitals?: boolean | { loader?: () => Promise<Record<string, unknown>> },
 *   redactKeys?: string[],
 *   onMetric?: (metric: { name: string, value: number, rating: string }) => void,
 *   context?: Record<string, unknown>,
 *   console?: boolean | { levels?: Array<'error'|'warn'|'log'|'info'> },
 * }} [options]
 * @returns {Promise<{ sentry: unknown, vitals: string[] }>} De quoi vérifier ce
 *   qui a réellement été installé — une liste de métriques vide est un signal,
 *   pas un détail.
 */
export async function installObservability(options = {}) {
  const {
    redactKeys,
    webVitals,
    onMetric,
    context,
    console: consoleOption = true,
    ...sentryOptions
  } = options;

  if (redactKeys) setRedactKeys(redactKeys);
  // Le contexte AVANT les écouteurs : une erreur levée pendant l'installation
  // doit déjà porter la version et l'environnement.
  //
  // LA VERSION N'EST PLUS À FOURNIR. Le défaut mesuré en tête de ce module —
  // « pas de version, pas de langue » — tenait à ce que le paquet la réclamait
  // sans savoir la produire. `versionPlugin` la pose désormais sur
  // `globalThis.__DWC_BUILD__` ; elle arrive donc seule, et l'appelant garde le
  // dernier mot : son `context` est fusionné PAR-DESSUS.
  const build = versionContext();
  if (context || Object.keys(build).length > 0) {
    setSessionContext({ ...build, ...context });
  }
  if (consoleOption) {
    captureConsole(typeof consoleOption === 'object' ? consoleOption : {});
  }
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
