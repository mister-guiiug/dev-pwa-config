/**
 * Fabrique de client Supabase — paresseuse jusqu'au code du SDK.
 *
 * PROMU DE CINQ APPS. miss-uwh (`src/lib/supabase.ts`), miss-lookhouse
 * (`src/backend/supabaseClient.ts`), mister-molkky (`src/supabase.ts`),
 * mister-doc (`src/lib/supabase.ts`) et le bac-sable de mister-family-map
 * (`src/shared/api/supabase/client.ts`) réécrivent la même fabrique : lire
 * `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, créer le client UNE fois, le
 * garder. Cinq copies, et déjà des divergences — l'une jette quand la
 * configuration manque, l'autre rend `null`, une troisième a le `flowType`
 * robuste que les deux premières n'ont pas, une seule tient le SDK hors du
 * bundle initial. Ce module reprend le meilleur de chacune.
 *
 * LA DOCTRINE ANTI-ÉCRAN-BLANC, d'abord. « L'init au chargement du module
 * tuait l'app avant `createRoot()` » quand une variable manquait : supabase-js
 * lève sur une URL vide, l'exception remonte pendant l'évaluation du chunk
 * d'entrée, donc écran blanc sans le moindre diagnostic (et Lighthouse mort en
 * NO_FCP). Ce commentaire existe MOT POUR MOT dans deux apps, sur DEUX
 * backends — miss-carbook (`src/lib/supabase.ts`) et mister-puzzle
 * (`src/firebase.ts`) : le même incident, vécu deux fois, corrigé deux fois.
 * Ici, rien ne s'exécute à l'import ni à la construction de la fabrique : tout
 * attend le premier `getClient()`. React monte, l'ErrorBoundary peut afficher
 * l'erreur, et les écrans qui ne touchent pas à Supabase restent utilisables.
 *
 * PARESSEUX JUSQU'AU CODE : `@supabase/supabase-js` (~120 Ko, peer OPTIONNELLE
 * déjà déclarée) est chargé par import dynamique au premier `getClient()` — le
 * motif de mister-molkky, où la plupart des utilisateurs ne touchent jamais à
 * la synchronisation multi-appareils et n'ont donc pas à payer le SDK au
 * démarrage.
 *
 * LA CLÉ ANON N'EST PAS UN SECRET : elle est faite pour un bundle public, et
 * toute la sécurité vient des politiques RLS côté serveur. Aucun secret
 * (`service_role`, PAT) ne doit jamais transiter par ce module.
 *
 * Le client créé se passe ensuite tel quel à `realtime/supabase` (descente) et
 * au `process` d'une file `sync-queue` (montée) : une app n'a besoin que d'UN
 * client — un second ouvrirait une seconde connexion temps réel, qui compte
 * dans le quota du projet.
 */
import { missingConfig } from './backend.js';
import { withCorrelation } from './correlation.js';

/**
 * Les variables lues par défaut — celles des cinq apps. Le tableau se passe
 * tel quel au `requires` d'un backend déclaré avec `createBackendSelector`.
 */
export const SUPABASE_ENV_KEYS = Object.freeze([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
]);

/**
 * Lit la configuration Supabase d'un environnement.
 *
 * LA DÉTECTION EST CELLE DE `missingConfig` (./backend.js), pas une seconde
 * opinion : une valeur vide ou blanche est absente. Deux modules qui jugeraient
 * différemment la même variable donneraient un backend « configuré » ici et
 * « manquant » là — exactement le genre d'incohérence que les cinq copies
 * commençaient à accumuler.
 *
 * @param {Record<string, unknown>} [env] `import.meta.env` de l'app.
 * @param {{ urlKey?: string, anonKeyKey?: string }} [options]
 */
export function supabaseConfig(env = {}, options = {}) {
  const {
    urlKey = 'VITE_SUPABASE_URL',
    anonKeyKey = 'VITE_SUPABASE_ANON_KEY',
  } = options ?? {};
  const missing = missingConfig(env, [urlKey, anonKeyKey]);
  return {
    url: missing.includes(urlKey) ? null : String(env[urlKey]),
    anonKey: missing.includes(anonKeyKey) ? null : String(env[anonKeyKey]),
    missing,
  };
}

/**
 * La fabrique : configuration lue tout de suite, client créé au premier appel.
 *
 *   // src/lib/supabase.ts — l'intégralité du fichier qu'une app garde
 *   export const supabase = createSupabaseClientFactory({
 *     env: import.meta.env,
 *     auth: { flowType: 'pkce' },
 *     correlated: true,
 *   });
 *   // …puis : const client = await supabase.getClient();
 *
 * `getClient()` REJETTE quand la configuration manque, avec les variables en
 * clair dans le message — mais tard, dans un contexte qu'une ErrorBoundary
 * sait afficher. L'app qui préfère retomber en local interroge `isConfigured()`
 * avant, ou passe `SUPABASE_ENV_KEYS` au `requires` de son sélecteur de
 * backend : c'est lui qui sait retomber proprement.
 *
 * DEUX APPELS CONCURRENTS NE CRÉENT QU'UN CLIENT : c'est la promesse qui est
 * gardée, pas sa valeur. Les copies qui gardaient la valeur laissaient deux
 * `await` simultanés — un composant et un service worker de synchro, typiquement
 * — importer et construire chacun le leur. Un import en ÉCHEC n'est en revanche
 * pas gardé : un réseau qui a toussé au chargement du SDK ne condamne pas
 * l'onglet entier.
 *
 * @param {{
 *   env?: Record<string, unknown>,
 *   urlKey?: string, anonKeyKey?: string,
 *   auth?: Record<string, unknown>,
 *   clientOptions?: { auth?: Record<string, unknown>,
 *     global?: Record<string, unknown> } & Record<string, unknown>,
 *   fetch?: typeof fetch,
 *   correlated?: boolean | import('./correlation.js').WithCorrelationOptions,
 *   loader?: () => Promise<Record<string, unknown>>,
 * }} [options] `auth` est fusionné sur `{ persistSession: true,
 *   autoRefreshToken: true }` — l'union des cinq apps ; `persistSession: false`
 *   (mister-molkky) ou `flowType: 'pkce'` (mister-doc) se passent ici.
 *   `clientOptions` porte le reste des options `createClient` (realtime, db…).
 *   `correlated` enveloppe le `fetch` du client via ./correlation.js : chaque
 *   requête part avec `X-Correlation-Id` et `X-Session-Id`, si bien que le
 *   journal du serveur et l'erreur côté client désignent le même incident (le
 *   motif du bac-sable). `loader` sert aux tests et aux bundlers qui exigent un
 *   import statique ; par défaut, `@supabase/supabase-js` est importé à la
 *   demande.
 */
export function createSupabaseClientFactory(options = {}) {
  const {
    env = {},
    urlKey,
    anonKeyKey,
    auth = {},
    clientOptions = {},
    fetch: fetchImpl,
    correlated = false,
    loader,
  } = options ?? {};

  const config = supabaseConfig(env, { urlKey, anonKeyKey });

  /** @type {Promise<unknown> | null} */
  let pending = null;

  async function create() {
    if (config.missing.length > 0) {
      throw new Error(
        `supabase-client : configuration manquante — définissez ${config.missing.join(
          ' et '
        )}.`
      );
    }

    const sdk = await (loader ? loader() : import('@supabase/supabase-js'));
    const createClient = sdk?.createClient;
    if (typeof createClient !== 'function') {
      throw new Error(
        'supabase-client : le module chargé n’expose pas `createClient` — la peer @supabase/supabase-js est-elle installée ?'
      );
    }

    // Le fetch corrélé est composé ICI, pas à la construction de la fabrique :
    // `withCorrelation` sans implémentation lève dans un environnement sans
    // `fetch`, et la doctrine ci-dessus interdit de lever avant `createRoot`.
    const finalFetch = correlated
      ? withCorrelation(fetchImpl, correlated === true ? {} : correlated)
      : fetchImpl;

    return createClient(config.url, config.anonKey, {
      ...clientOptions,
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        ...clientOptions.auth,
        ...auth,
      },
      ...(finalFetch
        ? { global: { ...clientOptions.global, fetch: finalFetch } }
        : {}),
    });
  }

  return {
    /** `true` quand les deux variables sont présentes et non blanches. */
    isConfigured: () => config.missing.length === 0,
    /** Les variables manquantes — vide quand tout est là. */
    missing: () => [...config.missing],
    /** Le client, créé au premier appel puis partagé. */
    getClient() {
      if (!pending) {
        pending = create();
        // Une promesse rejetée n'est pas gardée : le prochain appel retente
        // l'import au lieu de resservir l'échec.
        pending.catch(() => {
          pending = null;
        });
      }
      return pending;
    },
    /** Oublie le client (tests, changement de configuration d'essai). */
    reset() {
      pending = null;
    },
  };
}
