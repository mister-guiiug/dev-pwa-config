/**
 * Proposer l'installation de la PWA — trois questions, et une cadence.
 *
 * D'OÙ ÇA VIENT. Cinq apps ont écrit leur propre bandeau d'installation
 * (`miss-badminton`, `miss-dice`, `mister-doc`, `mister-molkky`, `mister-qowa`)
 * et trois y ont recopié le même `isStandalone()`. Le paquet exportait déjà
 * `useInstallPrompt` et `PwaInstallPrompt`, mais il leur manquait les deux
 * choses que ces copies avaient dû traiter à la main — ou pas du tout :
 *
 *   1. `beforeinstallprompt` N'EXISTE PAS sur iOS ni sur Safari. `miss-dice`
 *      l'a écrit dans son propre code : « sur les navigateurs sans cet
 *      événement (Firefox, iOS), `canInstall` reste faux et l'UI ne s'affiche
 *      pas ». Sur iPhone — l'appareil où « installer » veut le plus dire
 *      quelque chose — le bandeau du socle était donc du code mort. Seul
 *      `mister-doc` avait écrit le repli en instructions.
 *   2. UN REFUS ÉTAIT DÉFINITIF. Les cinq copies, et le socle, écrivaient un
 *      `'1'` dans `localStorage` et ne reproposaient plus jamais. Or le bouton
 *      dit « Plus tard », pas « Jamais ».
 *
 * CE MODULE NE TOUCHE À RIEN. Il lit l'environnement, lit un état, et rend une
 * décision. Aucun rendu, aucun React, aucun effet de bord hors de l'écriture
 * explicite dans le stockage — c'est ce qui le rend testable sans DOM et
 * réutilisable ailleurs que dans un bandeau (un écran de réglages, une
 * mesure).
 *
 * LA CADENCE, en une phrase : on propose au premier lancement, puis on se tait
 * un mois, trois fois en tout, et on n'en reparle plus. Elle est écrite ici
 * plutôt que dans le hook parce qu'une règle qui vit dans un `useEffect` ne se
 * teste qu'avec un DOM et une horloge — et celle-ci se teste avec ni l'un ni
 * l'autre.
 */

/** Clé de l'état de cadence. Un seul enregistrement JSON, versionné. */
export const INSTALL_STATE_KEY = 'dwc_pwa_install';

/**
 * L'ancienne clé booléenne du bandeau, écrite jusqu'à la 4.5.1 incluse.
 * Migrée puis effacée par {@link readInstallState} : voir {@link migrate}.
 */
export const LEGACY_DISMISS_KEY = 'dwc_pwa_install_dismissed';

/** @type {import('./install.js').InstallCadence} */
export const DEFAULT_CADENCE = Object.freeze({
  snoozeDays: 30,
  maxPrompts: 3,
  minVisits: 1,
});

/**
 * Les modes d'affichage qui signifient « lancée comme une application ».
 *
 * `standalone` SEUL NE SUFFIT PAS. Le manifeste engendré par `vite-pwa.js`
 * accepte `display` en option : une app en `fullscreen` (un jeu) ou en
 * `minimal-ui` était vue comme non installée, et se faisait proposer une
 * installation qu'elle avait déjà. `window-controls-overlay` est le cas
 * desktop, où la barre de titre est rendue par l'app elle-même.
 */
const INSTALLED_DISPLAY_MODES = [
  'standalone',
  'minimal-ui',
  'fullscreen',
  'window-controls-overlay',
];

/**
 * Navigateurs intégrés à une autre application (Facebook, Instagram, X…). Ils
 * n'installent rien, et leur montrer des instructions serait un mensonge : ce
 * qu'on veut leur dire, c'est « ouvrez dans votre navigateur », ce que le
 * paquet ne sait pas faire à leur place.
 *
 * La liste est volontairement COURTE, et le doute profite au navigateur : un
 * vrai navigateur pris pour une webview perd son invite, ce qui est moins
 * grave qu'une consigne inapplicable.
 */
const IN_APP_BROWSERS =
  /\b(FBAN|FBAV|FB_IAB|FBIOS|Instagram|Snapchat|Line|MicroMessenger|Twitter|LinkedInApp|Pinterest)\b|;\s*wv\)/i;

/** Ce qui expose `beforeinstallprompt` : on l'attend, on ne le devine pas. */
const CHROMIUM =
  /\b(Chrome|Chromium|CriOS|Edg|EdgA|EdgiOS|OPR|SamsungBrowser)\//;

/** Lit l'environnement une fois, pour que tout le reste soit pur. */
function readEnv(env = {}) {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return {
    userAgent: env.userAgent ?? nav?.userAgent ?? '',
    maxTouchPoints: env.maxTouchPoints ?? nav?.maxTouchPoints ?? 0,
    // Propriété non standard d'iOS : `true` quand la page tourne depuis
    // l'écran d'accueil. C'est le seul signal fiable là-bas sur les versions
    // qui ignorent `display-mode`.
    standalone: env.standalone ?? nav?.standalone,
    platformName: env.platformName ?? nav?.platform ?? '',
    matchMedia:
      env.matchMedia ??
      (typeof window === 'undefined'
        ? undefined
        : window.matchMedia?.bind(window)),
  };
}

/**
 * `true` si la page tourne DEPUIS l'application installée.
 *
 * Attention à ce que cette réponse ne dit PAS : un utilisateur qui a installé
 * l'app et qui revient sur le site dans un onglet répond `false` ici. C'est
 * `installedRelatedApps()` qui traite ce cas, et lui seul est asynchrone.
 *
 * @param {import('./install.js').InstallEnv} [env]
 */
export function isAppInstalled(env) {
  const { standalone, matchMedia } = readEnv(env);
  if (standalone === true) return true;
  if (!matchMedia) return false;
  return INSTALLED_DISPLAY_MODES.some(mode => {
    try {
      return matchMedia(`(display-mode: ${mode})`)?.matches === true;
    } catch {
      // Une valeur inconnue rend la requête invalide sur certains moteurs.
      return false;
    }
  });
}

/**
 * Demande au navigateur s'il connaît déjà cette app comme installée, même
 * lorsqu'on la consulte dans un onglet.
 *
 * NE RÉPOND QUE SUR CHROME ANDROID, et seulement si le manifeste se déclare
 * lui-même dans `related_applications` (`platform: 'webapp'`). Sans cette
 * déclaration la réponse est un tableau vide, ce qui est indiscernable de
 * « pas installée » : c'est pourquoi cette fonction ne sert qu'à CONFIRMER une
 * installation, jamais à en infirmer une.
 *
 * @returns {Promise<boolean>}
 */
export async function installedRelatedApps() {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  if (typeof nav?.getInstalledRelatedApps !== 'function') return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}

/**
 * Comment installer sur ce navigateur, SI `beforeinstallprompt` ne vient pas.
 *
 * L'événement reste la source de vérité quand il existe : on ne devine jamais
 * « Chromium donc installable », on attend. Cette fonction répond à l'autre
 * question — que faire de ceux à qui l'événement n'arrivera jamais.
 *
 * @param {import('./install.js').InstallEnv} [env]
 * @returns {import('./install.js').InstallFallback}
 */
export function installFallback(env) {
  const { userAgent, maxTouchPoints, platformName } = readEnv(env);
  if (!userAgent) return { method: 'unavailable', platform: 'unknown' };
  if (IN_APP_BROWSERS.test(userAgent))
    return { method: 'unavailable', platform: 'in-app' };

  // iPadOS 13+ SE FAIT PASSER POUR UN MAC, jusque dans son user-agent. Le
  // seul écart qui reste est l'écran tactile : un Mac rend 0.
  const iPadDéguisé =
    /Mac/.test(userAgent) &&
    (platformName === 'MacIntel' || /Macintosh/.test(userAgent)) &&
    maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(userAgent) || iPadDéguisé)
    return { method: 'instructions', platform: 'ios' };

  // Safari de bureau : « Fichier ▸ Ajouter au Dock » depuis macOS Sonoma.
  // Le test doit exclure Chrome et Edge, qui se présentent aussi en Safari.
  if (/Safari\//.test(userAgent) && !CHROMIUM.test(userAgent))
    return { method: 'instructions', platform: 'safari' };

  // Chromium : l'événement viendra, ou ne viendra pas (heuristiques
  // d'engagement, app déjà installée). Dans les deux cas on se tait.
  if (CHROMIUM.test(userAgent))
    return { method: 'unavailable', platform: 'chromium' };

  // Firefox sur Android installe depuis son menu ; celui de bureau n'installe
  // pas du tout. On ne distingue pas les deux au-delà du mobile.
  if (/Firefox\//.test(userAgent) && /Android/.test(userAgent))
    return { method: 'instructions', platform: 'generic' };

  return { method: 'unavailable', platform: 'unknown' };
}

/* ── L'état de cadence ──────────────────────────────────────────────────── */

/** @returns {import('./install.js').InstallState} */
function emptyState() {
  return { v: 1, visits: 0, shown: 0, until: 0, done: false };
}

function getStorage(options = {}) {
  if (options.storage) return options.storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Navigation privée, cookies tiers bloqués : pas de mémoire, donc la
    // cadence vaut pour la session — c'est mieux que de planter au rendu.
    return null;
  }
}

/**
 * Convertit l'ancienne clé booléenne en un report d'une période.
 *
 * POURQUOI PAS « JAMAIS ». Le bouton qui écrivait ce `'1'` disait « Plus
 * tard ». Le traduire en refus définitif trahirait ce que l'utilisateur a lu ;
 * le traduire en « tout de suite » lui reproposerait à la première visite après
 * la mise à jour, ce qui est grossier. Un report d'une période est la seule
 * lecture fidèle : il a dit plus tard, plus tard commence maintenant.
 */
function migrate(state, storage, legacyKey, cadence, now) {
  let legacy = null;
  try {
    legacy = storage?.getItem(legacyKey);
  } catch {
    return state;
  }
  if (legacy !== '1') return state;
  try {
    storage?.removeItem(legacyKey);
  } catch {
    /* le retrait échoue : la migration se rejouera, sans dommage */
  }
  return {
    ...state,
    shown: Math.max(state.shown, 1),
    until: Math.max(state.until, now + days(cadence.snoozeDays)),
  };
}

const days = n => Math.max(0, Number(n) || 0) * 86_400_000;

/**
 * Lit l'état, en tolérant tout ce qu'un `localStorage` peut contenir : rien,
 * du JSON invalide, une valeur d'une version antérieure, une clé posée par
 * autre chose. Le doute rend un état vierge — jamais une exception au rendu.
 *
 * @param {import('./install.js').InstallStateOptions} [options]
 * @returns {import('./install.js').InstallState}
 */
export function readInstallState(options = {}) {
  const {
    key = INSTALL_STATE_KEY,
    legacyKey = LEGACY_DISMISS_KEY,
    now = Date.now(),
  } = options;
  const cadence = { ...DEFAULT_CADENCE, ...options.cadence };
  const storage = getStorage(options);
  let state = emptyState();
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object')
        state = {
          v: 1,
          visits: Number(parsed.visits) || 0,
          shown: Number(parsed.shown) || 0,
          until: Number(parsed.until) || 0,
          done: parsed.done === true,
        };
    }
  } catch {
    /* illisible : on repart d'un état vierge plutôt que de planter */
  }
  return migrate(state, storage, legacyKey, cadence, now);
}

/**
 * @param {import('./install.js').InstallState} state
 * @param {import('./install.js').InstallStateOptions} [options]
 */
export function writeInstallState(state, options = {}) {
  const { key = INSTALL_STATE_KEY } = options;
  try {
    getStorage(options)?.setItem(key, JSON.stringify(state));
  } catch {
    /* stockage refusé : la cadence vaut pour la session */
  }
  return state;
}

/**
 * La transition, et rien d'autre : cette fonction n'écrit pas.
 *
 * - `visit` — un lancement de plus. Compté une fois par chargement de page.
 * - `shown` — l'invite est à l'écran. **Arme aussi le report** : voir plus bas.
 * - `snooze` — « Plus tard ». Même effet que `shown`, en plus explicite.
 * - `dismiss` — « Ne plus proposer ». Définitif.
 * - `installed` — c'est fait. Définitif aussi.
 *
 * `shown` ARME LE REPORT, et c'est le cœur de la cadence. Si seul un clic sur
 * « Plus tard » reportait, celui qui ferme l'onglet sans rien toucher — le cas
 * le plus fréquent — reverrait l'invite au chargement suivant, puis au
 * suivant. Compter l'affichage comme un report rend la règle honnête :
 * l'invite paraît au premier lancement, puis une fois par période, au plus
 * `maxPrompts` fois.
 *
 * @param {import('./install.js').InstallState} state
 * @param {import('./install.js').InstallEvent} event
 * @param {Partial<import('./install.js').InstallCadence>} [cadence]
 * @param {number} [now]
 * @returns {import('./install.js').InstallState}
 */
export function nextInstallState(state, event, cadence = {}, now = Date.now()) {
  const { snoozeDays } = { ...DEFAULT_CADENCE, ...cadence };
  switch (event) {
    case 'visit':
      return { ...state, visits: state.visits + 1 };
    case 'shown':
      return {
        ...state,
        shown: state.shown + 1,
        until: now + days(snoozeDays),
      };
    case 'snooze':
      return { ...state, until: now + days(snoozeDays) };
    case 'dismiss':
    case 'installed':
      return { ...state, done: true };
    default:
      return state;
  }
}

/**
 * Les stockages déjà comptés dans ce chargement de page.
 *
 * UN LANCEMENT, UNE VISITE. Sans ce garde, `StrictMode` compterait double en
 * développement (il monte les effets deux fois) et deux composants montant le
 * hook compteraient deux fois en production — la cadence dériverait d'autant.
 * La clé est l'objet de stockage lui-même, comme `use-update-prompt.js` clé
 * ses connexions sur la fonction injectée : une page a un `localStorage`, un
 * test a le sien.
 */
const COUNTED = new WeakSet();

/**
 * Compte ce lancement, une seule fois, et rend l'état à jour.
 *
 * @param {import('./install.js').InstallStateOptions} [options]
 * @returns {import('./install.js').InstallState}
 */
export function countInstallVisit(options = {}) {
  const storage = getStorage(options);
  const state = readInstallState(options);
  if (storage) {
    if (COUNTED.has(storage)) return state;
    COUNTED.add(storage);
  }
  return writeInstallState(
    nextInstallState(state, 'visit', options.cadence, options.now),
    options
  );
}

/**
 * Faut-il proposer l'installation maintenant ?
 *
 * @param {import('./install.js').InstallState} state
 * @param {Partial<import('./install.js').InstallCadence>} [cadence]
 * @param {number} [now]
 */
export function shouldOfferInstall(state, cadence = {}, now = Date.now()) {
  const { snoozeDays, maxPrompts, minVisits } = {
    ...DEFAULT_CADENCE,
    ...cadence,
  };
  if (!state || state.done) return false;
  if (state.visits < Math.max(1, minVisits)) return false;
  // `maxPrompts <= 0` : sans limite. C'est le choix d'une app qui préfère
  // insister — il est explicite, il n'est pas le défaut.
  if (maxPrompts > 0 && state.shown >= maxPrompts) return false;
  if (snoozeDays > 0 && now < state.until) return false;
  return true;
}
