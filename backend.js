/**
 * Choisir un backend, et y migrer PORT PAR PORT.
 *
 * PROMU DE mister-family-map — mais pas ce qu'on croit. Ses ports
 * (`PlaceRepository`, `EventRepository`, `ModerationService`…) parlent de
 * lieux, d'évènements et de modération : ils ne se généralisent PAS, et
 * prétendre le contraire produirait une interface que personne n'implémente.
 * Ce qui se promeut, c'est la MÉCANIQUE autour d'eux, et elle est la même
 * pour les dix-sept apps :
 *
 *   1. lire l'environnement de build pour savoir à quoi se brancher ;
 *   2. retomber sur un backend local quand la configuration manque ;
 *   3. remplacer les ports UN PAR UN quand l'adaptateur distant existe.
 *
 * LE POINT 3 EST LE PLUS UTILE, et c'est celui qu'on écrit le moins souvent.
 * `app/config/backend.ts` de family-map le fait en une expression :
 *
 *     return { ...local, places: createSupabasePlaceRepository(client) };
 *
 * Autrement dit : Supabase pour les lieux, local pour tout le reste, tant que
 * les autres adaptateurs ne sont pas écrits. C'est ce qui permet de migrer une
 * app en production sans big bang — et c'est exactement ce qui manque aux
 * seize autres, réparties sur quatre backends.
 *
 * POURQUOI LE REPLI LOCAL N'EST PAS UN DÉTAIL. Une app qui exige sa
 * configuration pour démarrer ne tourne ni hors ligne, ni en test, ni dans une
 * CI sans secrets. Les cinq apps local-first de la famille n'ont pas de
 * backend du tout ; les douze autres doivent pouvoir se comporter comme elles
 * quand le réseau ou la configuration manque.
 *
 * AUCUN SECRET ICI, ET AUCUNE VALIDATION DE SCHÉMA : ce module lit des
 * variables déjà publiques (une URL, une clé « anon » dont la sécurité vient
 * des politiques RLS) et laisse à l'app le soin de les valider avec l'outil
 * qu'elle utilise déjà.
 */

/**
 * Le backend à utiliser, d'après l'environnement.
 *
 * Trois règles, dans cet ordre : un choix EXPLICITE gagne toujours ; sinon la
 * présence de toutes les variables requises décide ; sinon on retombe sur le
 * repli.
 *
 * @param {Record<string, unknown>} env
 * @param {{ kinds: Record<string, readonly string[]>, fallback?: string,
 *   override?: string }} options
 */
export function resolveBackendKind(env = {}, options) {
  const {
    kinds = {},
    fallback = 'local',
    override = 'VITE_BACKEND',
  } = options ?? {};

  const explicit = env[override];
  // Un choix explicite mais inconnu est ignoré plutôt qu'appliqué : mieux vaut
  // démarrer en local qu'échouer sur une faute de frappe dans un `.env`.
  if (typeof explicit === 'string' && explicit in kinds) return explicit;
  if (typeof explicit === 'string' && explicit === fallback) return fallback;

  for (const [kind, required] of Object.entries(kinds)) {
    if (required.every(key => hasValue(env[key]))) return kind;
  }
  return fallback;
}

function hasValue(value) {
  return typeof value === 'string' ? value.trim() !== '' : value != null;
}

/** Les variables requises par ce backend qui manquent à l'appel. */
export function missingConfig(env = {}, required = []) {
  return required.filter(key => !hasValue(env[key]));
}

/**
 * Compose un backend : une base complète, et des ports remplacés un par un.
 *
 * Les surcharges dont la valeur est `undefined` ou `null` sont IGNORÉES. C'est
 * ce qui rend l'appel lisible quand un adaptateur n'existe pas encore :
 *
 *     composeBackend(local, {
 *       places: supabasePlaces(client),
 *       events: undefined,          // pas encore écrit — reste local
 *     })
 *
 * @template T
 * @param {T} base
 * @param {Partial<T>} [overrides]
 * @returns {T}
 */
export function composeBackend(base, overrides = {}) {
  const composed = { ...base };
  for (const [port, adapter] of Object.entries(overrides ?? {})) {
    if (adapter !== undefined && adapter !== null) composed[port] = adapter;
  }
  return composed;
}

/**
 * Quels ports sont distants, et lesquels sont restés locaux.
 *
 * Sert à l'écran de réglages et au journal de démarrage : une app à moitié
 * migrée doit pouvoir DIRE où elle en est, sinon personne ne sait si la
 * donnée qu'il regarde vient du serveur ou de son navigateur. C'est aussi ce
 * qui alimente la « feuille de route backend » que family-map tient dans son
 * README, à la main.
 *
 * @template T
 * @param {T} base
 * @param {Partial<T>} overrides
 * @returns {{ kind: string|null, remote: string[], local: string[] }}
 */
export function backendCoverage(base, overrides = {}, kind = null) {
  const remote = [];
  const local = [];
  for (const port of Object.keys(base ?? {})) {
    const adapter = overrides?.[port];
    if (adapter !== undefined && adapter !== null) remote.push(port);
    else local.push(port);
  }
  return { kind, remote: remote.sort(), local: local.sort() };
}

/**
 * Fabrique le sélecteur de backend d'une app, en une déclaration.
 *
 * L'app décrit ses backends — ce que chacun exige, et comment on le construit
 * — et reçoit une fonction qui rend le backend composé plus le relevé de ce
 * qui est distant. Le repli est appelé quand aucun backend n'est configuré,
 * ou quand la construction du backend distant LÈVE : un SDK qui refuse une URL
 * malformée ne doit pas empêcher l'app de démarrer en local.
 *
 * @param {{ fallback: () => object,
 *   backends: Record<string, { requires?: readonly string[],
 *     create: (env: object, base: object) => object|undefined }>,
 *   override?: string,
 *   onFallback?: (info: { kind: string, missing: string[], error?: unknown }) => void }} config
 */
export function createBackendSelector(config) {
  const { fallback, backends = {}, override, onFallback } = config ?? {};
  if (typeof fallback !== 'function') {
    throw new Error(
      'backend: `fallback` est requis — une app doit pouvoir démarrer sans configuration'
    );
  }

  const kinds = Object.fromEntries(
    Object.entries(backends).map(([kind, spec]) => [kind, spec.requires ?? []])
  );

  return function selectBackend(env = {}) {
    const base = fallback();
    const kind = resolveBackendKind(env, { kinds, override });
    const spec = backends[kind];
    if (!spec) return { backend: base, ...backendCoverage(base, {}, null) };

    const missing = missingConfig(env, spec.requires ?? []);
    if (missing.length > 0) {
      onFallback?.({ kind, missing });
      return { backend: base, ...backendCoverage(base, {}, null) };
    }

    let overrides;
    try {
      overrides = spec.create(env, base) ?? {};
    } catch (error) {
      onFallback?.({ kind, missing: [], error });
      return { backend: base, ...backendCoverage(base, {}, null) };
    }

    return {
      backend: composeBackend(base, overrides),
      ...backendCoverage(base, overrides, kind),
    };
  };
}

/**
 * Catégorise un message d'erreur backend/navigateur pour choisir le libellé
 * à afficher : « vous n'avez pas le droit » ne se répare pas comme « le
 * réseau est tombé ».
 *
 * PROMU depuis `mister-puzzle` (`classifyFirebaseError`) — les motifs
 * couvrent Firebase, Supabase et les erreurs `fetch` du navigateur. Une
 * classification par MESSAGE reste un filet : quand le SDK expose un code
 * structuré, le lire d'abord.
 *
 * @param {string | null | undefined} message
 * @returns {'permission' | 'network' | 'unknown'}
 */
export function classifyBackendError(message) {
  if (!message) return 'unknown';
  const m = String(message).toLowerCase();
  if (
    m.includes('permission_denied') ||
    m.includes('permission denied') ||
    m.includes('row-level security') ||
    m.includes('unauthorized') ||
    m.includes('403')
  ) {
    return 'permission';
  }
  if (
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('internet') ||
    m.includes('offline') ||
    m.includes('timeout') ||
    m.includes('err_internet_disconnected')
  ) {
    return 'network';
  }
  return 'unknown';
}
