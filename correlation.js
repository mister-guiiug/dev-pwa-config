/**
 * Identifiant de corrélation — le fil qui relie ce qui existe déjà.
 *
 * PROVENANCE. Contrairement aux autres promotions, celle-ci ne vient pas d'une
 * convergence : aucune app n'avait d'identifiant de corrélation. Ce qu'elle
 * fait, en revanche, n'est pas nouveau — le socle porte DÉJÀ une frontière
 * d'erreur branchée (`ObservabilityBoundary`), un journal local, un fil
 * d'Ariane, un relais Sentry et une télémétrie (`analytics`, `web-vitals`).
 * Quatre canaux qui décrivent le même incident sans jamais pouvoir être
 * rapprochés : le ticket dit « ça a planté », Sentry montre une trace, GA
 * montre une session, le serveur montre une requête en erreur — et rien ne
 * dit que c'est le même événement.
 *
 * Ce module n'ajoute donc qu'une chose : un identifiant, posé une fois et
 * présent PARTOUT — en-tête de la requête sortante, contexte de session des
 * erreurs (donc Sentry), fil d'Ariane, propriétés de télémétrie, et à l'écran
 * pour que l'utilisateur puisse le citer.
 *
 * PAS DE CONTEXTE ASYNCHRONE IMPLICITE. Le navigateur n'a pas d'équivalent
 * d'`AsyncLocalStorage` : une « corrélation courante » posée dans une variable
 * de module serait fausse dès deux requêtes concurrentes — le pire des cas,
 * celui qui rend un identifiant trompeur plutôt qu'absent. L'identifiant de
 * session est donc implicite (il ne change pas), et celui de requête est
 * explicite : `withCorrelation` en produit un par appel et le rend.
 */
import { generateSecureId } from './security.js';
import { setSessionContext } from './react/observability.js';

/** Clé de l'identifiant de session — `sessionStorage` : un id par onglet. */
const SESSION_KEY = 'dwc_correlation_session';

/** En-têtes par défaut. `X-Correlation-Id` est le nom le plus répandu. */
export const DEFAULT_CORRELATION_HEADER = 'X-Correlation-Id';
export const DEFAULT_SESSION_HEADER = 'X-Session-Id';

let memorySessionId = null;

/**
 * L'identifiant de session : stable pour tout l'onglet, y compris après un
 * rechargement (`sessionStorage`), distinct d'un onglet à l'autre.
 *
 * Repli mémoire si le stockage est indisponible (navigation privée stricte,
 * `Storage` bloqué) : mieux vaut un id qui ne survit pas au rechargement
 * qu'une exception dans le chemin d'observabilité.
 */
export function getSessionId() {
  if (memorySessionId) return memorySessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      memorySessionId = stored;
      return stored;
    }
  } catch {
    /* stockage indisponible : on retombe sur la mémoire */
  }
  memorySessionId = generateSecureId();
  try {
    sessionStorage.setItem(SESSION_KEY, memorySessionId);
  } catch {
    /* ignore */
  }
  return memorySessionId;
}

/** Repart d'un identifiant de session neuf (changement de compte, déconnexion). */
export function resetSessionId() {
  memorySessionId = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  return getSessionId();
}

/** Un identifiant neuf, pour une requête ou une opération. */
export function newRequestId() {
  return generateSecureId();
}

/**
 * Les en-têtes à joindre à une requête sortante.
 *
 * @param {{ requestId?: string, correlationHeader?: string,
 *   sessionHeader?: string }} [options]
 */
export function correlationHeaders(options = {}) {
  const {
    requestId = newRequestId(),
    correlationHeader = DEFAULT_CORRELATION_HEADER,
    sessionHeader = DEFAULT_SESSION_HEADER,
  } = options;
  return {
    [correlationHeader]: requestId,
    [sessionHeader]: getSessionId(),
  };
}

/**
 * Ce que les autres canaux doivent porter pour être rapprochables.
 * À passer à `setSessionContext` (erreurs, Sentry) et `setUserProperties`
 * (télémétrie) — ce que fait `installCorrelation`.
 */
export function correlationContext() {
  // `correlationId`, PAS `correlationSessionId` : le motif de `redact` couvre
  // `session`, si bien que la clé était masquée dans le contexte des erreurs —
  // l'identifiant arrivait donc dans Sentry sous la forme « [masqué] », ce qui
  // annulait exactement ce que ce module apporte. Vérifié par un test.
  return { correlationId: getSessionId() };
}

/**
 * Enveloppe `fetch` : un identifiant de requête par appel, posé en en-tête,
 * puis rendu à l'appelant pour qu'il apparaisse aussi dans SES journaux.
 *
 * N'AVALE RIEN. L'erreur d'origine est relancée telle quelle ; `onError` et
 * `onResponse` sont des observateurs, pas des filtres. Une exception levée
 * dans l'un d'eux ne doit pas transformer une requête réussie en échec.
 *
 * @param {typeof fetch} [fetchImpl]
 * @param {{ correlationHeader?: string, sessionHeader?: string,
 *   onRequest?: (info: { requestId: string, url: string, method: string }) => void,
 *   onResponse?: (info: { requestId: string, url: string, method: string,
 *     status: number, durationMs: number }) => void,
 *   onError?: (error: unknown, info: { requestId: string, url: string,
 *     method: string, durationMs: number }) => void }} [options]
 * @returns {typeof fetch}
 */
export function withCorrelation(fetchImpl, options = {}) {
  const base =
    fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (!base) {
    throw new Error('withCorrelation : aucune implémentation de fetch.');
  }
  const {
    correlationHeader = DEFAULT_CORRELATION_HEADER,
    sessionHeader = DEFAULT_SESSION_HEADER,
    onRequest,
    onResponse,
    onError,
  } = options;

  return async function correlatedFetch(input, init = {}) {
    const requestId = newRequestId();
    const headers = new Headers(init.headers ?? undefined);
    // Un en-tête déjà posé par l'appelant fait foi : il sait peut-être
    // rattacher la requête à une corrélation venue d'ailleurs.
    if (!headers.has(correlationHeader))
      headers.set(correlationHeader, requestId);
    if (!headers.has(sessionHeader)) headers.set(sessionHeader, getSessionId());

    const url =
      typeof input === 'string' ? input : (input?.url ?? String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    const startedAt = Date.now();
    safely(onRequest, { requestId, url, method });

    try {
      const response = await base(input, { ...init, headers });
      safely(onResponse, {
        requestId,
        url,
        method,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return response;
    } catch (error) {
      safely(onError, error, {
        requestId,
        url,
        method,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  };
}

/** Un observateur qui jette ne doit jamais casser la requête qu'il observe. */
function safely(fn, ...args) {
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch {
    /* ignore */
  }
}

/**
 * L'identifiant, posé une fois, dans les quatre canaux.
 *
 * Sans cet appel, chaque canal reste correct mais isolé. Avec lui :
 *
 * | Canal                    | Ce qu'il porte désormais                   |
 * | ------------------------ | ------------------------------------------ |
 * | Erreurs / Sentry         | `correlationSessionId` en contexte session |
 * | Requêtes sortantes       | `X-Correlation-Id` + `X-Session-Id`        |
 * | Télémétrie (GA4)         | propriété `correlation_session_id`         |
 * | Écran de crash           | la référence à citer au support            |
 *
 * La télémétrie est OPT-IN (`analytics: true`) : associer un identifiant
 * stable à un profil analytique est un choix de traçabilité, pas un défaut
 * qu'on subit. Sans ce drapeau, `analytics.js` n'est même pas importé.
 *
 * @param {{ analytics?: boolean, fetch?: typeof fetch | false,
 *   correlationHeader?: string, sessionHeader?: string }} [options]
 * @returns {Promise<{ sessionId: string, fetch: typeof fetch | null }>}
 */
export async function installCorrelation(options = {}) {
  const { analytics = false, fetch: fetchOption, ...headerOptions } = options;
  const sessionId = getSessionId();

  // Les erreurs d'abord : une panne pendant l'installation doit déjà être
  // rattachable.
  setSessionContext(correlationContext());

  if (analytics) {
    const { setUserProperties } = await import('./analytics.js');
    setUserProperties({ correlation_id: sessionId });
  }

  const correlated =
    fetchOption === false
      ? null
      : withCorrelation(
          typeof fetchOption === 'function' ? fetchOption : undefined,
          headerOptions
        );

  return { sessionId, fetch: correlated };
}
