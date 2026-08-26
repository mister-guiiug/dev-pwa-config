/**
 * Appliquer une mise à jour de service worker — pour de vrai.
 *
 * PROMU, PAS INVENTÉ. Six apps sur seize portent un bouton « Forcer la mise à
 * jour », et **six stratégies différentes** : `reg.update()` puis `reload()`
 * (miss-lookhouse) ; `reg.update()` puis `updateSW(true)` (miss-badminton) ;
 * `SKIP_WAITING` sinon purge (miss-genius et miss-uwh, à l'octet près) ;
 * purge de tous les caches (mister-doc) ; désinscription totale avec échelle de
 * navigation et minuterie de secours (mister-molkky). Aucune n'est complète.
 *
 * TROIS DÉFAUTS CONSTATÉS, que ce module corrige :
 *
 * 1. **Le bouton qui ne fait rien.** `updateSW(true)` de vite-plugin-pwa poste
 *    `SKIP_WAITING` au worker EN ATTENTE. S'il n'y en a pas — le cas courant
 *    quand l'utilisateur appuie de lui-même — il ne se passe strictement rien.
 *    `mister-molkky/src/register-sw.ts` le documente noir sur blanc : « leaving
 *    the user staring at a button that does nothing (the reported symptom on
 *    mobile) ». Ici, l'absence de worker en attente fait BASCULER sur la purge,
 *    au lieu de retourner en silence.
 *
 * 2. **Le rechargement trop tôt.** miss-genius et miss-uwh postent
 *    `SKIP_WAITING` puis rechargent dans un `finally` — c'est-à-dire dans la
 *    foulée. L'activation d'un worker est ASYNCHRONE : la page rechargée peut
 *    encore être servie par l'ancien. Ici on attend l'évènement
 *    `controllerchange`, avec un plafond de temps.
 *
 * 3. **Les API qui pendent.** Sur iOS en mode autonome, `getRegistrations()` et
 *    `caches.keys()` peuvent bloquer plusieurs secondes. Chaque appel est donc
 *    plafonné (`timeoutMs`), et une minuterie de secours (`safetyMs`) recharge
 *    quoi qu'il arrive : un bouton mort est pire qu'un rechargement brutal.
 *
 * CE QUI N'EST JAMAIS TOUCHÉ : `localStorage`, `sessionStorage`, IndexedDB.
 * Seuls le service worker et le Cache Storage sont réinitialisés — c'est la
 * ligne que les six apps tenaient déjà, et la seule qui garde les données de
 * l'utilisateur.
 *
 * SANS REACT, SANS MODULE VIRTUEL. Utilisable depuis un `register-sw.ts`, un
 * bouton de réglages, ou le hook `react/use-update-prompt`.
 */

/** Course entre une promesse et un délai. Rend `undefined` si le délai gagne. */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => {
      setTimeout(() => resolve(undefined), ms);
    }),
  ]);
}

/** URL anti-cache, celle de la page par défaut, ou celle qu'on lui donne. */
function bustedUrl(base) {
  try {
    const url = new URL(base || (globalThis.location?.href ?? '/'));
    url.searchParams.set('_t', Date.now().toString(36));
    return url.toString();
  } catch {
    return '/';
  }
}

/**
 * La portée du service worker qui contrôle cette page — c'est-à-dire la seule
 * URL dont on sait que le SERVEUR sait la servir.
 *
 * POURQUOI C'EST NÉCESSAIRE. Une app monopage déployée sur un hébergement
 * statique (GitHub Pages, pour les seize apps de la famille) n'a de fichier
 * qu'à sa racine : `/mister-family-map/profil` n'existe pas côté serveur. Cette
 * route ne répond que parce que le service worker la rattrape par son
 * `navigateFallback`. Purger le worker DÉTRUIT donc ce qui rendait l'URL
 * courante joignable — et recharger cette même URL juste après renvoie un 404.
 *
 * Le défaut a été reproduit sur un serveur statique sans repli : « Forcer la
 * mise à jour » depuis `/profil` menait à `/profil?_t=…` et à la page 404 de
 * l'hébergeur. Il ne se voit pas en développement, où `vite preview` sert
 * `index.html` pour n'importe quel chemin.
 *
 * La portée est relevée AVANT la désinscription, faute de quoi il n'y a plus
 * rien à lire. À portées multiples, la plus SPÉCIFIQUE qui couvre la page
 * l'emporte — c'est celle qui la contrôle.
 */
async function controllingScope(sw, timeoutMs) {
  try {
    const registrations = await withTimeout(
      Promise.resolve(sw.getRegistrations?.()).catch(() => undefined),
      timeoutMs
    );
    const scopes = (registrations ?? [])
      .map(registration => registration?.scope)
      .filter(scope => typeof scope === 'string' && scope !== '');
    if (scopes.length === 0) return '';
    const here = globalThis.location?.href ?? '';
    const couvrantes = scopes
      .filter(scope => here.startsWith(scope))
      .sort((a, b) => b.length - a.length);
    return couvrantes[0] ?? scopes[0];
  } catch {
    return '';
  }
}

/**
 * Échelle de navigation : `assign` → `href` → `replace` → `reload`.
 *
 * Certaines vues web Android ignorent `location.href` déclenché depuis une
 * continuation asynchrone (le jeton de geste utilisateur a expiré). On essaie
 * chaque forme jusqu'à ce que l'une passe.
 *
 * @param {string} target
 * @returns {boolean} `true` si un appel n'a pas levé.
 */
export function hardNavigate(target) {
  const loc = globalThis.location;
  if (!loc) return false;
  for (const attempt of [
    () => loc.assign(target),
    () => {
      loc.href = target;
    },
    () => loc.replace(target),
    () => loc.reload(),
  ]) {
    try {
      attempt();
      return true;
    } catch {
      /* forme suivante */
    }
  }
  return false;
}

/** Attend que le nouveau worker prenne la main, au plus `ms` millisecondes. */
function awaitControllerChange(ms) {
  const sw = globalThis.navigator?.serviceWorker;
  if (!sw?.addEventListener) return Promise.resolve(false);
  return new Promise(resolve => {
    let timer;
    const onChange = () => finish(true);
    const finish = ok => {
      clearTimeout(timer);
      sw.removeEventListener('controllerchange', onChange);
      resolve(ok);
    };
    timer = setTimeout(() => finish(false), ms);
    sw.addEventListener('controllerchange', onChange);
  });
}

/** Désinscrit les service workers et vide le Cache Storage. */
async function purge(keepCache) {
  const sw = globalThis.navigator?.serviceWorker;
  if (sw?.getRegistrations) {
    try {
      const registrations = await sw.getRegistrations();
      await Promise.all(
        registrations.map(registration =>
          registration.unregister().catch(() => false)
        )
      );
    } catch {
      /* on continue : la purge des caches compte davantage */
    }
  }
  const store = globalThis.caches;
  if (store?.keys) {
    try {
      const keys = await store.keys();
      await Promise.all(
        keys
          .filter(key => !keepCache(key))
          .map(key => store.delete(key).catch(() => false))
      );
    } catch {
      /* on recharge quand même */
    }
  }
}

/**
 * Applique la mise à jour disponible, puis recharge.
 *
 * Deux chemins, dans cet ordre :
 *   1. **propre** — un worker attend : `SKIP_WAITING`, puis on attend
 *      `controllerchange` avant de recharger. Le cache reste, l'app reste
 *      utilisable hors ligne pendant l'opération ;
 *   2. **purge** — aucun worker n'attend (ou `hard: true`) : désinscription et
 *      vidage du Cache Storage, puis navigation vers une URL anti-cache.
 *
 * @param {{
 *   hard?: boolean,
 *   timeoutMs?: number,
 *   activationTimeoutMs?: number,
 *   safetyMs?: number,
 *   keepCache?: (name: string) => boolean,
 *   reloadTo?: string,
 *   navigate?: (target: string) => boolean,
 * }} [options]
 * @returns {Promise<'activated'|'purged'|'none'>} Le chemin emprunté. La page
 *   se décharge normalement juste après : la valeur sert aux tests et aux
 *   journaux.
 */
export async function applyUpdate(options = {}) {
  const {
    hard = false,
    timeoutMs = 600,
    activationTimeoutMs = 3000,
    safetyMs = 1500,
    keepCache = () => false,
    reloadTo,
    navigate = hardNavigate,
  } = options;

  // `let` : sur le chemin de la purge, la cible devient la portée du worker —
  // la page courante peut être une route que le serveur ne connaît pas.
  let target = reloadTo ?? bustedUrl();

  // Filet inconditionnel : si TOUTES les stratégies ci-dessous sont ignorées
  // (vu sur des vues web verrouillées), la page recharge quand même. Il vise la
  // MÊME cible que la sortie normale : après une purge, recharger la route
  // courante rendrait le 404 que le worker rattrapait.
  const safety = setTimeout(() => {
    if (navigate(target)) return;
    try {
      globalThis.location?.reload();
    } catch {
      /* plus rien à tenter */
    }
  }, safetyMs);

  const finish = result => {
    clearTimeout(safety);
    navigate(target);
    return result;
  };

  const sw = globalThis.navigator?.serviceWorker;
  if (!sw) {
    // Pas de service worker du tout (développement, navigateur ancien) :
    // recharger reste la bonne réponse, il n'y a simplement rien à activer.
    return finish('none');
  }

  if (!hard) {
    try {
      const registration = await withTimeout(sw.getRegistration(), timeoutMs);
      if (registration) {
        // Une vérification explicite : le worker en attente n'existe parfois
        // qu'après elle.
        await withTimeout(
          Promise.resolve(registration.update?.()).catch(() => undefined),
          timeoutMs
        );
        if (registration.waiting) {
          // On écoute AVANT de poster : l'activation peut être immédiate.
          const activated = awaitControllerChange(activationTimeoutMs);
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          if (await activated) return finish('activated');
        }
      }
    } catch {
      /* on bascule sur la purge */
    }
  }

  // La portée se lit AVANT la désinscription : après, il n'y a plus rien à
  // lire. `reloadTo` reste souverain quand l'app a imposé sa destination.
  if (!reloadTo) {
    const scope = await controllingScope(sw, timeoutMs);
    if (scope) target = bustedUrl(scope);
  }

  await withTimeout(purge(keepCache), timeoutMs);
  return finish('purged');
}
