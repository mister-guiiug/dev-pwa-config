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
    gtag('config', state.id, { send_page_view: false });
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
  return trackEvent('page_view', {
    page_path: location,
    page_title: name,
    page_location: `${window.location?.origin ?? ''}${location}`,
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
}
