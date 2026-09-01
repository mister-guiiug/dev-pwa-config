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
 * Les portées inscrites sur l'origine, triées en « la nôtre » et « les autres ».
 *
 * UNE ORIGINE, SEIZE APPS. `getRegistrations()` et `caches.keys()` portent sur
 * l'ORIGINE, pas sur l'application. Les seize apps de la famille sont publiées
 * sous `https://mister-guiiug.github.io/<app>/` : depuis miss-dice, on voit les
 * workers et les caches des quinze autres, et on peut les détruire.
 *
 * POURQUOI LA NÔTRE EST NÉCESSAIRE. Une app monopage sur hébergement statique
 * n'a de fichier qu'à sa racine : `/mister-family-map/profil` n'existe pas côté
 * serveur. Cette route ne répond que parce que le service worker la rattrape
 * par son `navigateFallback`. Purger le worker DÉTRUIT donc ce qui rendait
 * l'URL courante joignable — et recharger cette même URL juste après renvoie un
 * 404. Reproduit sur un serveur statique sans repli : « Forcer la mise à jour »
 * depuis `/profil` menait à `/profil?_t=…` et à la page 404 de l'hébergeur.
 * Invisible en développement, où `vite preview` sert `index.html` partout.
 *
 * POURQUOI LES AUTRES SONT NÉCESSAIRES. Parce qu'il faut savoir ce qu'on ne
 * doit PAS toucher. Workbox nomme ses caches `workbox-precache-v2-<portée>` et
 * filtre lui-même sur `self.registration.scope` ; ce module ne le faisait pas.
 *
 * `couvrantes[0] ?? scopes[0]` : LE DÉFAUT SIGNALÉ EN USAGE le 01/09/2026.
 * Quand aucune portée ne couvre la page — l'app n'a pas encore installé son
 * worker, ou une voisine vient de le désinscrire — la seconde branche rendait
 * une registration ARBITRAIRE de l'origine. `applyUpdate` naviguait alors vers
 * `bustedUrl(portée d'une autre app)`, c'est-à-dire vers **la page d'accueil
 * d'une app voisine**. Mot pour mot le symptôme rapporté : « des fois on
 * bascule sur la page d'accueil d'une autre app que celle en cours ».
 *
 * Ne rien trouver rend maintenant `''`, et l'appelant reste chez lui.
 *
 * Les portées sont relevées AVANT la désinscription, faute de quoi il n'y a
 * plus rien à lire. À portées multiples, la plus SPÉCIFIQUE qui couvre la page
 * l'emporte — c'est celle qui la contrôle.
 */
async function readScopes(sw, timeoutMs) {
  try {
    const registrations = await withTimeout(
      Promise.resolve(sw.getRegistrations?.()).catch(() => undefined),
      timeoutMs
    );
    const scopes = (registrations ?? [])
      .map(registration => registration?.scope)
      .filter(scope => typeof scope === 'string' && scope !== '');
    if (scopes.length === 0) return { scope: '', foreign: [] };

    const here = globalThis.location?.href ?? '';
    const couvrantes = scopes
      .filter(scope => here.startsWith(scope))
      .sort((a, b) => b.length - a.length);
    const scope = couvrantes[0] ?? '';
    return { scope, foreign: scopes.filter(other => other !== scope) };
  } catch {
    return { scope: '', foreign: [] };
  }
}

/**
 * Cette registration est-elle la NÔTRE, c'est-à-dire pas celle d'une voisine ?
 *
 * LE DOUTE PROFITE À LA DÉSINSCRIPTION. Une portée illisible — absente, vide,
 * d'un type inattendu — ne prouve pas qu'on a affaire à une autre app ; elle
 * prouve seulement qu'on ne sait pas. Laisser en place un worker qu'on n'a pas
 * su lire, c'est reproduire le défaut que ce module existe pour corriger : un
 * bouton « Forcer » qui ne force rien.
 *
 * On n'épargne donc QUE ce qu'on peut prouver étranger : une portée bien
 * formée qui ne couvre pas la page courante. Une voisine en a toujours une.
 */
function estNotre(registration) {
  const scope = registration?.scope;
  if (typeof scope !== 'string' || scope === '') return true;
  return (globalThis.location?.href ?? '').startsWith(scope);
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

/**
 * Désinscrit tous les service workers, et dit combien sont tombés.
 *
 * PROMU DE CINQ APPS. `miss-badminton`, `miss-contraction`, `miss-dice`,
 * `miss-ticket-pwa` et `mister-molkky` portent toutes, dans leur
 * `src/register-sw.ts`, la même douzaine de lignes : en DÉVELOPPEMENT, un
 * worker resté d'une session précédente sert du cache périmé pendant qu'on
 * code, et le HMR se bat contre lui. Aucune ne l'écrit autrement, et le socle
 * n'avait rien : `applyUpdate` ne désinscrit que sur son chemin de purge, avec
 * un rechargement dont le développement ne veut pas.
 *
 * TROIS DÉFAUTS DES CINQ COPIES, corrigés ici :
 *
 * 1. **Un rejet non capté.** Les cinq écrivent
 *    `regs.forEach(r => r.unregister())` sous un `.catch()` qui ne couvre QUE
 *    `getRegistrations()` : chaque `unregister()` crée sa propre promesse, en
 *    dehors de la chaîne captée. Une seule qui échoue, et c'est un
 *    `unhandledrejection`. Ici, chaque désinscription porte son propre
 *    `catch`, comme le fait déjà `purge()`.
 * 2. **Aucun plafond.** C'est la même `getRegistrations()` qui peut bloquer
 *    plusieurs secondes sur iOS en mode autonome — le défaut que ce module
 *    documente déjà pour le bouton « Forcer ». Sur le chemin du démarrage,
 *    l'attente est simplement invisible.
 * 3. **Rien à observer.** `void` : ni l'appelant ni un test ne peut savoir si
 *    quelque chose a été désinscrit. On rend le compte.
 *
 * QUATRIÈME DÉFAUT, celui de ce module et pas des copies, signalé en usage le
 * 01/09/2026 : « tous les service workers » voulait dire **ceux de toute
 * l'origine**. Les seize apps de la famille partagent
 * `mister-guiiug.github.io` : réinitialiser miss-dice emportait la capacité
 * hors ligne des quinze autres, sans que rien ne le dise. Seules les
 * registrations qui COUVRENT LA PAGE COURANTE sont désinscrites.
 *
 * Le repli de développement n'y perd rien : un worker resté d'une session
 * précédente y a la même portée que la page (même origine, même base). Un
 * worker de portée différente ne contrôlait de toute façon pas cette page.
 *
 * LA CONDITION RESTE DANS L'APP. Ce paquet est aussi consommé par
 * `node --test` : il ne peut pas lire `import.meta.env`. Le motif à écrire
 * côté app est donc :
 *
 *   if (import.meta.env.DEV) {
 *     void unregisterServiceWorkers();
 *     return;
 *   }
 *   registerSW({ immediate: true });
 *
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<number>} Nombre de workers réellement désinscrits. Ne
 *   rejette jamais : l'absence d'API est un `0`, pas un incident.
 */
export async function unregisterServiceWorkers(options = {}) {
  const { timeoutMs = 600 } = options;
  const sw = globalThis.navigator?.serviceWorker;
  if (!sw?.getRegistrations) return 0;
  try {
    const registrations = await withTimeout(
      Promise.resolve(sw.getRegistrations()).catch(() => undefined),
      timeoutMs
    );
    if (!registrations?.length) return 0;
    // Les nôtres seulement : celles des apps voisines de la même origine ne
    // nous regardent pas, et les désinscrire les casse en silence.
    const miennes = registrations.filter(estNotre);
    if (!miennes.length) return 0;
    const results = await withTimeout(
      Promise.all(
        miennes.map(registration =>
          // Le `catch` est PAR désinscription : c'est ce qui manque aux cinq
          // copies, où un seul échec devient un rejet non capté.
          Promise.resolve(registration?.unregister?.()).catch(() => false)
        )
      ),
      timeoutMs
    );
    return (results ?? []).filter(Boolean).length;
  } catch {
    // Une API qui lève d'emblée (contexte non sécurisé, worker interdit) ne
    // doit pas empêcher le démarrage de l'app.
    return 0;
  }
}

/**
 * Désinscrit les service workers de CETTE app et vide SON Cache Storage.
 *
 * `caches.keys()` porte sur l'origine : depuis miss-dice, on voit les caches
 * des quinze autres apps de la famille. Workbox nomme les siens
 * `workbox-precache-v2-<portée>` — sa propre routine de nettoyage filtre
 * d'ailleurs sur `self.registration.scope`. On épargne donc tout cache dont le
 * nom porte la portée d'une voisine.
 *
 * Le filtre est négatif à dessein : un cache que l'app a créé elle-même sous un
 * nom quelconque (`donnees-app`) ne porte aucune portée, et reste purgé comme
 * avant. C'est `keepCache` qui existe pour l'épargner, pas ce filtre.
 */
async function purge(keepCache, timeoutMs, foreign = []) {
  await unregisterServiceWorkers({ timeoutMs });
  const store = globalThis.caches;
  if (store?.keys) {
    try {
      const keys = await store.keys();
      const estVoisin = key => foreign.some(scope => key.includes(scope));
      await Promise.all(
        keys
          .filter(key => !keepCache(key) && !estVoisin(key))
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

  // Les portées se lisent AVANT la désinscription : après, il n'y a plus rien
  // à lire. La nôtre décide où revenir ; celles des voisines, ce qu'il ne faut
  // pas effacer. `reloadTo` reste souverain quand l'app a imposé sa
  // destination — mais les voisines restent protégées dans tous les cas.
  const { scope, foreign } = await readScopes(sw, timeoutMs);
  if (!reloadTo && scope) target = bustedUrl(scope);

  await withTimeout(purge(keepCache, timeoutMs, foreign), timeoutMs);
  return finish('purged');
}
