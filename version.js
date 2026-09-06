/**
 * La version de l'application : la lire, la comparer, savoir qu'elle a changé.
 *
 * PROVENANCE — UN MANQUE MESURÉ DANS CE PAQUET, pas une idée. Contrairement aux
 * modules promus depuis les apps, celui-ci vient d'un trou que le socle
 * lui-même creusait, et que trois de ses parties exposaient chacune à sa façon :
 *
 *  1. `react/observability.js` écrit noir sur blanc que dix apps sur seize
 *     envoient « des exceptions nues : pas de version, pas de langue ». Son
 *     `setSessionContext` attend `{ app, version, environment }` — et le paquet
 *     n'offrait AUCUN moyen d'obtenir cette version côté client.
 *     `mister-family-map`, la seule app migrée à ce jour, écrit donc
 *     `context: { app, environment }` : la version manque parce qu'elle
 *     n'existe pas dans le bundle.
 *
 *  2. Les CINQ modules de mise à jour — `sw-update`, `react/use-update-prompt`,
 *     `react/update-prompt-banner`, `react/update-button`, `react/app-updates` —
 *     pilotent une bascule de service worker sans jamais nommer une version. Le
 *     bandeau dit « Mise à jour disponible » ; il ne peut dire ni laquelle, ni
 *     depuis laquelle, ni — une fois rechargé — que la bascule a réussi.
 *
 *  3. `pwaSeoPlugin` prend un `iconQuery`, dont le JSDoc donne l'exemple
 *     `'?v=1.0.1'` : une version recopiée à la main dans `vite.config.ts`, qui
 *     dérive du `package.json` dès la publication suivante.
 *
 * PAS DE MODULE VIRTUEL, la leçon de `use-update-prompt`. Ce hook importait
 * `virtual:pwa-register` en dur et n'était donc importable que dans un build
 * Vite. Ici, la version arrive par une SEULE porte : un objet posé sur
 * `globalThis.__DWC_BUILD__` par le plugin `./vite-version`. Le module reste
 * importable dans Node, dans un test, dans un worker — et `readBuildInfo()`
 * rend simplement des chaînes vides quand rien n'a été injecté.
 *
 * POURQUOI PAS `define: { __APP_VERSION__ }` SEUL, que les apps écrivent déjà.
 * `define` remplace un identifiant NU à la compilation. Il sert le code de
 * l'app — et le plugin le pose toujours, pour ne rien casser — mais il ne peut
 * pas servir un module de `node_modules` qui, lui, doit rester lisible sans
 * bundler. Le global est la forme qui marche aux deux endroits.
 *
 * SANS REACT. La couche React est `./react/version` ; le suivi d'une nouvelle
 * version publiée (`fetchAppVersion`) et la détection d'un changement au
 * démarrage (`rememberVersion`) vivent ici, utilisables depuis un
 * `register-sw.ts` ou un écran de réglages sans framework.
 */

/** Le fichier écrit à la racine du build, et interrogé pour savoir ce qui est en ligne. */
export const VERSION_MANIFEST = 'version.json';

/** Le global posé par `./vite-version` et lu par `readBuildInfo()`. */
export const BUILD_INFO_GLOBAL = '__DWC_BUILD__';

/** Clé de mémorisation de la version vue au démarrage précédent. */
export const VERSION_STORAGE_KEY = 'dwc_app_version';

/**
 * SemVer, avec le `v` initial toléré : les tags de la famille s'écrivent
 * `v3.13.0`, le `package.json` `3.13.0`, et comparer les deux est le cas
 * courant. Les zéros de tête ne sont pas rejetés — refuser `1.02.0` ferait
 * échouer une comparaison plutôt qu'un build, ce qui est le mauvais moment.
 */
const SEMVER =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?(?:\+([0-9A-Za-z][0-9A-Za-z.-]*))?$/;

/**
 * Décompose une version, ou rend `null` si elle est illisible.
 *
 * @param {unknown} input
 * @returns {{ major: number, minor: number, patch: number,
 *   prerelease: string[], build: string, raw: string } | null}
 */
export function parseVersion(input) {
  const raw = String(input ?? '').trim();
  const match = SEMVER.exec(raw);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
    build: match[5] ?? '',
    raw,
  };
}

/**
 * Ordre des préversions, tel que SemVer §11 le définit : une version FINALE est
 * postérieure à ses préversions (`1.0.0` > `1.0.0-rc.1`), un identifiant
 * numérique passe avant un identifiant alphanumérique, et la liste la plus
 * courte perd à préfixe égal.
 */
function comparePrerelease(a, b) {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
      if (Number(left) !== Number(right)) {
        return Number(left) < Number(right) ? -1 : 1;
      }
      continue;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

/**
 * `-1`, `0` ou `1`. Une version illisible est traitée comme la plus ancienne :
 * deux illisibles sont donc égales, et une seule perd toujours. Les métadonnées
 * de build (`+sha`) sont ignorées, comme le veut SemVer.
 *
 * @param {unknown} a
 * @param {unknown} b
 */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

/**
 * `candidate` est-il strictement postérieur à `current` ?
 *
 * LES DEUX DOIVENT ÊTRE LISIBLES. `compareVersions` classe l'illisible en
 * dernier ; ici, une comparaison dont un côté manque rend `false`. C'est ce qui
 * évite le faux positif qui compte : une app sans version injectée annoncerait
 * autrement une mise à jour à chaque sondage.
 *
 * @param {unknown} candidate
 * @param {unknown} current
 */
export function isNewerVersion(candidate, current) {
  if (!parseVersion(candidate) || !parseVersion(current)) return false;
  return compareVersions(candidate, current) > 0;
}

/**
 * Version affichable, ou `''` si elle est illisible — un écran ne doit jamais
 * montrer « undefined » là où l'utilisateur cherche un numéro.
 *
 * @param {unknown} input
 * @param {{ prefix?: string, build?: boolean }} [options]
 */
export function formatVersion(input, options = {}) {
  const { prefix = 'v', build = false } = options;
  const version = parseVersion(input);
  if (!version) return '';
  let out = `${prefix}${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease.length > 0) out += `-${version.prerelease.join('.')}`;
  if (build && version.build) out += `+${version.build}`;
  return out;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Ce que le build a injecté : version, date de compilation, commit.
 *
 * Sans argument, lit `globalThis.__DWC_BUILD__`. Avec un objet — la réponse
 * d'un `version.json`, un fixture de test — lit celui-là. Ne lève jamais et ne
 * rend jamais `undefined` : les champs absents valent `''`, ce qui rend
 * `if (info.version)` suffisant partout.
 *
 * @param {unknown} [source]
 */
export function readBuildInfo(source) {
  const raw = source ?? globalThis[BUILD_INFO_GLOBAL];
  const info = raw !== null && typeof raw === 'object' ? raw : {};
  const commit = text(info.commit);
  return {
    version: text(info.version),
    buildTime: text(info.buildTime),
    commit,
    // Sept caractères : la forme courte de git, celle que porte une release.
    shortCommit: commit.slice(0, 7),
    // La base sous laquelle le build a été fait (`/miss-genius/`), posée par
    // le plugin : c'est elle qui dit OÙ est `version.json`.
    base: text(info.base),
  };
}

/**
 * Le contexte de session que `installObservability` attendait sans pouvoir
 * l'obtenir. Les champs vides sont OMIS : un contexte `{ version: '' }` est
 * pire que pas de contexte du tout, il fait croire à une version connue.
 *
 * @param {unknown} [source]
 */
export function versionContext(source) {
  const info = readBuildInfo(source);
  const context = {};
  if (info.version) context.version = info.version;
  if (info.buildTime) context.buildTime = info.buildTime;
  if (info.commit) context.commit = info.commit;
  if (info.base) context.base = info.base;
  return context;
}

/**
 * L'URL de `version.json`, SOUS LA BASE DU BUILD.
 *
 * Un `fetch('version.json')` est relatif au document : depuis
 * `/miss-genius/eleves/3` — un lien profond d'une app qui route par chemin —
 * il part vers `/miss-genius/eleves/version.json`, reçoit 404, et le sondage
 * conclut en silence qu'aucune version n'attend. Le plugin injecte la base
 * du build ; avec elle, l'URL est absolue. Sans elle (build antérieur, page
 * sans injection), on retombe sur le relatif d'avant.
 *
 * @param {unknown} [source]
 */
export function versionManifestUrl(source) {
  const base = readBuildInfo(source).base;
  if (!base) return VERSION_MANIFEST;
  return base.endsWith('/')
    ? `${base}${VERSION_MANIFEST}`
    : `${base}/${VERSION_MANIFEST}`;
}

function safeStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Certains navigateurs LÈVENT à la simple lecture de `localStorage` quand
    // les cookies tiers sont bloqués : le try porte sur l'accès, pas sur l'appel.
    return null;
  }
}

/**
 * Compare la version courante à celle du démarrage précédent, et la mémorise.
 *
 * C'EST LA PIÈCE QUI MANQUAIT AU CYCLE DE MISE À JOUR. Les cinq modules de
 * `sw-update` savent proposer un rechargement ; aucun ne sait dire, APRÈS ce
 * rechargement, que la bascule a effectivement eu lieu. L'utilisateur qui
 * appuie sur « Recharger » n'a aujourd'hui aucune confirmation.
 *
 * `changed` est vrai pour tout changement, `upgraded` seulement pour une
 * montée : un retour arrière volontaire (rollback d'un déploiement) ne doit pas
 * s'annoncer comme une nouveauté.
 *
 * @param {unknown} version
 * @param {{ key?: string, storage?: Storage | null }} [options]
 * @returns {{ current: string, previous: string, firstRun: boolean,
 *   changed: boolean, upgraded: boolean }}
 */
export function rememberVersion(version, options = {}) {
  const { key = VERSION_STORAGE_KEY, storage } = options;
  const current = text(version);
  const store = safeStorage(storage);

  let previous = '';
  try {
    previous = text(store?.getItem(key));
  } catch {
    previous = '';
  }

  if (current && current !== previous) {
    try {
      store?.setItem(key, current);
    } catch {
      // Stockage refusé (navigation privée) : la détection vaut pour la
      // session, ce qui est déjà mieux que de lever au démarrage.
    }
  }

  return {
    current,
    previous,
    firstRun: current !== '' && previous === '',
    changed: current !== '' && previous !== '' && current !== previous,
    upgraded: previous !== '' && isNewerVersion(current, previous),
  };
}

/**
 * Lit le `version.json` du serveur — ce qui est EN LIGNE, par opposition à ce
 * qui tourne dans l'onglet.
 *
 * POURQUOI UN FICHIER, ET PAS SEULEMENT LE SERVICE WORKER. `needRefresh` ne se
 * lève qu'après que le navigateur a lui-même redécouvert le worker, ce qui
 * n'arrive pas dans un onglet ouvert depuis trois jours — le défaut que
 * `checkEvery` corrige déjà côté worker. Un fichier interrogeable donne la même
 * information aux apps SANS service worker, et donne surtout le NUMÉRO, que le
 * worker ne transporte pas.
 *
 * `cache: 'no-store'` : sans lui, la réponse mise en cache par le navigateur
 * rendrait le sondage muet, ce qui est exactement le défaut qu'il corrige.
 * Ne lève jamais — un sondage raté n'est pas un incident — et rend `null`.
 *
 * @param {string} [url]
 * @param {{ fetch?: typeof fetch, timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<{ version: string, buildTime: string, commit: string, shortCommit: string } | null>}
 */
export async function fetchAppVersion(url = VERSION_MANIFEST, options = {}) {
  const {
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = 5000,
    signal,
  } = options;
  if (typeof fetchImpl !== 'function') return null;

  const controller =
    typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  const relay = () => controller?.abort();
  signal?.addEventListener?.('abort', relay);

  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      credentials: 'omit',
      headers: { accept: 'application/json' },
      signal: controller?.signal ?? signal,
    });
    if (!response?.ok) return null;
    const data = await response.json();
    const info = readBuildInfo(data);
    return info.version ? info : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener?.('abort', relay);
  }
}

/**
 * La source du script inline qui pose `globalThis.__DWC_BUILD__`.
 *
 * Même forme que `themeBootSource` : le module rend la SOURCE, le plugin Vite
 * l'injecte. C'est ce qui la rend testable sans build, et hachable par
 * `cspPlugin` — un script inline non haché est un script bloqué en production.
 *
 * @param {unknown} [source]
 */
export function buildInfoSource(source) {
  // `<` échappé : la charge vient d'un `package.json` et d'une variable
  // d'environnement, pas d'une source de confiance, et un `</script>` glissé
  // dedans refermerait la balise.
  const payload = JSON.stringify(versionContext(source)).replaceAll(
    '<',
    '\\u003c'
  );
  return `globalThis.${BUILD_INFO_GLOBAL}=${payload};`;
}

/** Le même script, enveloppé dans sa balise, prêt à injecter dans le `<head>`. */
export function buildInfoScript(source) {
  return `<script>${buildInfoSource(source)}</script>`;
}
