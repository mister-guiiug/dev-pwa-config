/**
 * Google Analytics 4 / Tag Manager — le consentement d'abord.
 *
 * CE QUI EXISTAIT DÉJÀ, et ce qui manquait. `pwaSeoPlugin` injecte depuis
 * longtemps les fragments GTM/GA4 dans `index.html`, à la place des
 * marqueurs `__ANALYTICS_HEAD__` / `__ANALYTICS_BODY__`. Mesure sur les seize
 * apps : **neuf** portent ces marqueurs, **trois** ont recopié un extrait
 * `gtag` en dur dans leur `index.html` (miss-carbook, miss-contraction,
 * mister-cim10), **sept** n'ont rien. Et surtout, **aucune** ne mesure quoi que
 * ce soit ensuite : zéro `trackEvent`, zéro vue de page sur changement de
 * route, zéro gestion du consentement. Le tag était posé, la mesure n'existait
 * pas.
 *
 * TROIS TROUS, QUE CE MODULE REFERME :
 *
 *  1. **Le consentement.** Ce sont des applications françaises. Le mode
 *     consentement de Google exige que l'état par défaut soit déclaré AVANT
 *     que le tag charge — sinon la valeur par défaut de Google s'applique, et
 *     le refus arrive trop tard. Ici, l'état par défaut est `denied` et le
 *     script n'est même pas injecté tant que rien n'est accordé.
 *  2. **Les vues de page d'une SPA.** GA4 n'envoie `page_view` qu'au
 *     chargement initial : sur une PWA à routeur, toute la navigation est
 *     invisible. `trackPageView` (et le hook `usePageViews`) la rend visible.
 *  3. **Les événements.** `trackEvent` écrit au bon endroit selon ce qui est
 *     installé — `dataLayer.push({ event })` pour GTM, `gtag('event', …)` pour
 *     GA4 seul — au lieu de laisser chaque app deviner.
 *
 * SANS DÉPENDANCE, SANS REACT. Le pont React est `react/use-page-views.js`.
 *
 * NOTE CSP. `cspPlugin({ analytics: true })` autorise déjà les hôtes
 * `googletagmanager.com` / `google-analytics.com`. L'injection faite ici crée
 * un `<script src>` vers ces mêmes hôtes : aucun réglage supplémentaire, et
 * aucun script en ligne à hacher.
 */

const GTM_HOST = 'https://www.googletagmanager.com';

/** Les signaux du mode consentement (v2), tous refusés par défaut. */
export const CONSENT_SIGNALS = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
];

/** Noms courts → signaux Google, pour ne pas les faire écrire à l'appelant. */
const CONSENT_ALIASES = {
  analytics: ['analytics_storage'],
  ads: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  functionality: ['functionality_storage'],
  personalization: ['personalization_storage'],
};

/** @type {{ mode: 'gtm'|'ga4'|null, id: string|null, loaded: boolean, granted: boolean }} */
const state = { mode: null, id: null, loaded: false, granted: false };

/**
 * La vue d'arrivée mise de côté faute de consentement, rejouée par
 * `setAnalyticsConsent` dès l'accord. Une seule : c'est l'écran sur lequel
 * l'utilisateur répond à la question, et les suivants passent par le hook.
 * @type {{ path: string, title: string }|null}
 */
let attente = null;

/** Conteneur GTM valide (GTM-XXXX) ou null. */
export function parseGtmContainerId(raw) {
  if (!raw) return null;
  const id = String(raw).trim().toUpperCase();
  return /^GTM-[A-Z0-9]+$/.test(id) ? id : null;
}

/** ID de mesure GA4 valide (G-XXXX) ou null. */
export function parseGaMeasurementId(raw) {
  if (!raw) return null;
  const id = String(raw).trim().toUpperCase();
  return /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

/**
 * Écrit dans `dataLayer`.
 *
 * `gtag` DOIT pousser son objet `arguments`, pas un tableau : c'est cette
 * forme exacte que GTM et gtag.js reconnaissent pour les commandes
 * (`consent`, `config`, `event`). Un `push(['consent', …])` est ignoré en
 * silence — l'erreur classique quand on réécrit l'extrait à la main.
 */
function gtag() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push(arguments);
}

/**
 * Pousse un objet dans `dataLayer` (forme GTM).
 * @param {Record<string, unknown>} payload
 */
export function dataLayerPush(payload) {
  if (typeof window === 'undefined' || !payload) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

/** Normalise `{ analytics: true }` ou `'granted'` en signaux Google. */
function toConsentState(consent) {
  /** @type {Record<string, 'granted'|'denied'>} */
  const out = {};
  if (consent === 'granted' || consent === true) {
    for (const signal of CONSENT_SIGNALS) out[signal] = 'granted';
    return out;
  }
  if (consent === 'denied' || consent == null || consent === false) {
    for (const signal of CONSENT_SIGNALS) out[signal] = 'denied';
    return out;
  }
  for (const [name, value] of Object.entries(consent)) {
    const targets = CONSENT_ALIASES[name] ?? [name];
    for (const signal of targets) {
      out[signal] =
        value === true || value === 'granted' ? 'granted' : 'denied';
    }
  }
  return out;
}

/** Le tag est-il réellement chargé ? Une mesure qui ne part pas est un signal. */
export function isAnalyticsLoaded() {
  return state.loaded;
}

/** L'identifiant réellement en service (`GTM-…`, `G-…`) ou `null`. */
export function getAnalyticsId() {
  return state.id;
}

/**
 * Le domaine le plus large où CE navigateur accepte réellement un cookie.
 *
 * LE PARC EST SERVI SOUS `*.github.io`, ET `github.io` EST UN SUFFIXE PUBLIC.
 * Aucun site ne peut y poser de cookie : c'est la règle qui empêche un
 * `mechant.github.io` d'écrire un cookie que tous les autres liraient. Or le
 * défaut de gtag est `cookie_domain: 'auto'`, qui commence par viser le domaine
 * enregistrable — donc `github.io` — et se fait refuser. Firefox l'annonce à
 * chaque chargement, en clair dans la console du visiteur :
 *
 *   Le cookie « _ga_XXXXXXXX » a été rejeté car le domaine est invalide.
 *   Le cookie « _ga » a été rejeté car le domaine est invalide.
 *
 * On ne devine PAS ce domaine en lisant le nom d'hôte : la liste des suffixes
 * publics ne se calcule pas (`github.io` en est un, `exemple.com` non, et
 * `co.uk` aussi). On le MESURE — un cookie jetable par candidat, du plus large
 * au plus étroit, et le premier qui tient gagne. La sonde reste juste le jour
 * où le parc passera sur un domaine à lui : elle rendra ce domaine-là, et les
 * sous-domaines continueront de partager l'identifiant de client.
 *
 * @param {Document} [doc]
 * @param {string} [hote]
 * @returns {string} un domaine, ou `'none'` (cookie posé sur l'hôte exact)
 */
export function domaineDeCookie(
  doc = globalThis.document,
  hote = globalThis.location?.hostname
) {
  // Pas de DOM, pas d'hôte, une IP ou un nom sans point (`localhost`) : rien à
  // élargir, et `domain=` y est de toute façon refusé.
  if (!doc || !hote || !hote.includes('.') || /^[\d.]+$/.test(hote))
    return 'none';

  const parties = hote.split('.');
  for (let n = 2; n <= parties.length; n++) {
    const candidat = parties.slice(parties.length - n).join('.');
    const nom = `dwc_sonde_${n}`;
    try {
      doc.cookie = `${nom}=1; domain=${candidat}; path=/; SameSite=Lax`;
      if (String(doc.cookie).includes(`${nom}=1`)) {
        doc.cookie = `${nom}=; domain=${candidat}; path=/; max-age=0`;
        return candidat;
      }
    } catch {
      // Un document sans cookies accessibles (sandbox) : on n'insiste pas.
      return 'none';
    }
  }
  return 'none';
}

/** Injecte le tag, une seule fois. */
function loadTag() {
  if (state.loaded || !state.id || typeof document === 'undefined') return;
  const script = document.createElement('script');
  script.async = true;
  script.src =
    state.mode === 'gtm'
      ? `${GTM_HOST}/gtm.js?id=${encodeURIComponent(state.id)}`
      : `${GTM_HOST}/gtag/js?id=${encodeURIComponent(state.id)}`;
  document.head.append(script);

  if (state.mode === 'gtm') {
    // L'événement `gtm.js` est ce que GTM attend pour démarrer ses balises ;
    // l'horodatage sert à ses déclencheurs de temporisation.
    dataLayerPush({ 'gtm.start': Date.now(), event: 'gtm.js' });
  } else {
    gtag('js', new Date());
    // `cookie_domain` est POSÉ, jamais laissé à `'auto'` : voir
    // `domaineDeCookie`. Sans lui, gtag vise `github.io` et se fait refuser.
    gtag('config', state.id, {
      send_page_view: false,
      cookie_domain: domaineDeCookie(),
    });
  }
  state.loaded = true;
}

/**
 * Prépare la mesure. N'injecte RIEN tant que le consentement n'est pas donné.
 *
 * @param {{
 *   gtmContainerId?: string, gaMeasurementId?: string,
 *   consent?: 'granted'|'denied'|Record<string, boolean|'granted'|'denied'>,
 *   requireConsent?: boolean,
 *   consentDefaults?: Record<string, 'granted'|'denied'>,
 * }} [options]
 * @returns {{ mode: 'gtm'|'ga4'|null, id: string|null, loaded: boolean }}
 */
export function initAnalytics(options = {}) {
  const {
    gtmContainerId,
    gaMeasurementId,
    consent,
    requireConsent = true,
    consentDefaults,
  } = options;

  const gtm = parseGtmContainerId(gtmContainerId);
  const ga = parseGaMeasurementId(gaMeasurementId);
  // Même arbitrage que `buildAnalyticsHtmlFragments` : si les deux sont
  // fournis, GTM seul est chargé (GA4 se configure DANS GTM), sans quoi les
  // événements sont comptés deux fois.
  state.mode = gtm ? 'gtm' : ga ? 'ga4' : null;
  state.id = gtm ?? ga;

  if (!state.id || typeof window === 'undefined') {
    return { mode: state.mode, id: state.id, loaded: false };
  }

  // L'état par défaut AVANT tout : une commande `consent default` postérieure
  // au chargement du tag n'a plus d'effet rétroactif.
  gtag('consent', 'default', {
    ...toConsentState('denied'),
    ...(consentDefaults ?? {}),
    wait_for_update: 500,
  });

  if (consent !== undefined) setAnalyticsConsent(consent);
  else if (!requireConsent) {
    state.granted = true;
    loadTag();
  }

  return { mode: state.mode, id: state.id, loaded: state.loaded };
}

/**
 * Met à jour le consentement, et charge le tag au premier accord.
 *
 *   setAnalyticsConsent({ analytics: true });        // mesure d'audience seule
 *   setAnalyticsConsent('denied');                   // tout refuser
 *
 * Le refus après un accord ne décharge pas le script — c'est impossible une
 * fois évalué. Il coupe la collecte côté Google, ce qui est le comportement
 * documenté du mode consentement : autant le dire ici plutôt que de laisser
 * croire à un retrait complet.
 *
 * @param {'granted'|'denied'|Record<string, boolean|'granted'|'denied'>} consent
 */
export function setAnalyticsConsent(consent) {
  const next = toConsentState(consent);
  gtag('consent', 'update', next);
  if (next.analytics_storage === 'granted') {
    state.granted = true;
    loadTag();
    // LE REJEU DE LA VUE D'ARRIVÉE. C'est le seul endroit qui sait que l'accord
    // vient d'arriver ; le hook, lui, ne se réveille qu'au changement de
    // chemin. Sans ces trois lignes, une visite d'un seul écran ne produit
    // aucune donnée, quoi que fasse l'application.
    if (attente) {
      const { path, title } = attente;
      attente = null;
      envoieVue(path, title);
    }
  } else {
    // Un refus ne garde pas une vue en réserve : elle partirait à un accord
    // ultérieur pour un écran que l'utilisateur a quitté depuis longtemps.
    attente = null;
  }
  return next;
}

/**
 * Un événement de mesure.
 *
 * @param {string} name Nom d'événement GA4 (`snake_case`, 40 caractères max).
 * @param {Record<string, unknown>} [params]
 */
export function trackEvent(name, params = {}) {
  const event = String(name ?? '').trim();
  if (!event) return false;
  if (!state.granted) return false;
  if (state.mode === 'ga4') gtag('event', event, params);
  else dataLayerPush({ event, ...params });
  return true;
}

/**
 * Une vue de page — le geste qui manque à toute PWA à routeur.
 *
 * GA4 n'envoie `page_view` qu'au chargement du document : sans cet appel,
 * toute la navigation interne est invisible, et la durée de session est
 * fausse. `initAnalytics` configure d'ailleurs GA4 avec
 * `send_page_view: false`, pour que la première vue passe par ici comme les
 * autres — sinon la page d'entrée est comptée deux fois.
 *
 * @param {string} [path] Défaut : le chemin courant.
 * @param {string} [title] Défaut : le titre du document.
 */
export function trackPageView(path, title) {
  if (typeof window === 'undefined') return false;
  const location = path ?? window.location?.pathname ?? '/';
  const name = title ?? document?.title ?? '';

  // LA VUE D'ARRIVÉE EST TOUJOURS TENTÉE TROP TÔT. Un premier visiteur n'a pas
  // encore cliqué « Accepter » quand le hook se monte : l'appel sort sans rien
  // envoyer, et plus rien ne le redéclenche — le chemin n'a pas changé. Mesuré
  // en production le 16/09/2026 sur mister-molkky et miss-uwh : zéro `page_view`
  // au chargement, et des `page_view` normaux dès qu'on navigue. Une visite d'un
  // seul écran — la majorité — ne remontait donc RIEN.
  //
  // On la met de côté, et `setAnalyticsConsent` la rejoue au moment de l'accord.
  if (!state.granted) {
    attente = { path: location, title: name };
    return false;
  }

  return envoieVue(location, name);
}

/**
 * L'envoi proprement dit, partagé par l'appel direct et par le rejeu.
 *
 * `page_location` PORTE LE CHEMIN DE BASE. Sans lui, une app servie sous
 * `/mister-molkky/` enregistrait `https://<compte>.github.io/history` — une URL
 * qui n'existe pas. Les vingt sites partagent l'origine : c'est la même famille
 * de défaut que les clés `localStorage` nues, corrigées en 4.17.1 puis 4.19.0,
 * sur une troisième valeur.
 */
function envoieVue(path, title) {
  const base =
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const racine = base.endsWith('/') ? base.slice(0, -1) : base;
  const chemin = path.startsWith('/') ? path : `/${path}`;
  return trackEvent('page_view', {
    page_path: path,
    page_title: title,
    page_location: `${window.location?.origin ?? ''}${racine}${chemin}`,
  });
}

/**
 * Propriétés d'utilisateur (langue, thème, version…).
 *
 * JAMAIS D'IDENTIFIANT PERSONNEL ici : ces valeurs partent chez Google et y
 * restent. Ce n'est pas une recommandation de style, c'est la condition pour
 * que la mesure reste licite sans base légale supplémentaire.
 *
 * @param {Record<string, unknown>} properties
 */
export function setUserProperties(properties = {}) {
  if (!state.granted) return false;
  if (state.mode === 'ga4') gtag('set', 'user_properties', properties);
  else dataLayerPush({ event: 'user_properties', ...properties });
  return true;
}

/** Remet le module à zéro. Réservé aux tests. */
export function resetAnalytics() {
  state.mode = null;
  state.id = null;
  state.loaded = false;
  state.granted = false;
  // Sans cette ligne, la vue mise de côté par un test fuiterait dans le
  // suivant — et y partirait au premier accord.
  attente = null;
}
