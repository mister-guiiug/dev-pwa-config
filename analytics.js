/**
 * PostHog, en Europe — le consentement d'abord.
 *
 * POURQUOI PAS GA4, ET CE N'EST PAS UNE QUESTION DE MESURE. Décision du
 * 18/09/2026, `pwa-starter-kit/docs/adr/0012-posthog-en-europe.md`. Au volume
 * du parc — ~180 événements par jour pour dix-huit applications — GA4 faisait
 * très bien le travail. Ce qui a tranché, c'est que **aucune application ne
 * porte de mention légale** alors que `mister-cim10` reçoit du texte clinique,
 * et que GA4 rend cette dette incompressible : un cookie nécessaire donc un
 * bandeau obligatoire, un transfert hors UE à assumer, une durée à publier.
 *
 * CE QUE CE MODULE TIENT, ET QUE L'APPLICATION N'A PAS À SAVOIR :
 *
 *  1. **Rien ne part avant l'accord.** Le script n'est même pas chargé tant que
 *     `analytics_storage` n'est pas accordé — c'est le `loader` qui n'est pas
 *     appelé, pas une option qu'on coche.
 *  2. **Les vues de page d'une PWA à routeur.** `capture_pageview: false` (cf.
 *     `OPTIONS_VIE_PRIVEE`), et `trackPageView` s'en charge — sinon la page
 *     d'entrée serait comptée deux fois.
 *  3. **La maille application.** `app_name`, déduit du chemin de base, est
 *     enregistré en SUPER-PROPRIÉTÉ : il accompagne chaque événement sans que
 *     personne y pense.
 *
 * L'API PUBLIQUE N'A PAS CHANGÉ en passant de GA4 à PostHog — `initAnalytics`,
 * `trackEvent`, `trackPageView`, `setAnalyticsConsent`, `usePageViews`,
 * `ConsentBanner` gardent leurs noms et leurs contrats. C'est tout l'intérêt
 * d'avoir mis la mesure dans le socle plutôt que dans vingt `index.html` : le
 * changement d'outil coûte un nom de propriété aux applications.
 *
 * SANS DÉPENDANCE OBLIGATOIRE. `posthog-js` est une pair OPTIONNELLE, chargée
 * par `loader` comme `@sentry/react` : une application qui ne mesure pas n'en
 * paie pas le poids.
 */

/** Le nuage EUROPÉEN. Jamais `us.i.posthog.com` — cf. `OPTIONS_VIE_PRIVEE`. */
export const HOTE_PAR_DEFAUT = 'https://eu.i.posthog.com';

/**
 * LES RÉGLAGES QUI NE SONT PAS DES PRÉFÉRENCES.
 *
 * Ils sont ici, en code et tenus par des tests, et non dans une case à cocher
 * d'une console web. C'est la leçon que le parc a tirée de Tag Manager le jour
 * même où il l'a retiré : une configuration que ni la CI ni la revue de PR ne
 * voient finit par diverger de ce qu'on croit avoir réglé.
 *
 *  - `autocapture: false` — ACTIVE PAR DÉFAUT chez PostHog, elle enregistre les
 *    clics AVEC le texte des éléments. Sur un outil de cotation, elle capterait
 *    des libellés de diagnostic. C'est le réglage le plus important du fichier.
 *  - `disable_session_recording: true` — le replay filmerait le compte-rendu
 *    pendant sa saisie.
 *  - `capture_pageview: false` — sinon PostHog envoie une vue au chargement ET
 *    à chaque changement d'historique. Les applications du parc sont en
 *    `HashRouter` : chaque navigation en déclenche un, et chaque vue serait
 *    comptée deux fois — celle de PostHog et celle de `usePageViews`. Exactement
 *    le défaut que GA4 écartait par `send_page_view: false`.
 *  - `capture_pageleave: false` — même famille, sur la sortie.
 *  - `cross_subdomain_cookie: false` — LE PARC EST SOUS UN SUFFIXE PUBLIC.
 *    `github.io` est à la Public Suffix List : un cookie posé plus haut que
 *    l'hôte exact est REFUSÉ par le navigateur, et Firefox l'annonce dans la
 *    console de chaque visiteur. C'est ce que `domaineDeCookie` a mesuré pour
 *    gtag ; ici on empêche simplement PostHog de tenter.
 *  - `person_profiles: 'identified_only'` — aucun profil de personne n'est créé
 *    pour un visiteur anonyme, et ce parc n'identifie personne.
 */
export const OPTIONS_VIE_PRIVEE = Object.freeze({
  autocapture: false,
  disable_session_recording: true,
  capture_pageview: false,
  capture_pageleave: false,
  cross_subdomain_cookie: false,
  person_profiles: 'identified_only',
});

/** @type {{ id: string|null, hote: string, loaded: boolean, granted: boolean, appName: string|null, client: any }} */
const state = {
  id: null,
  hote: HOTE_PAR_DEFAUT,
  loaded: false,
  granted: false,
  appName: null,
  client: null,
};

/** Le `loader` fourni à `initAnalytics`, rappelé au moment de l'accord. */
let chargeur = null;

/**
 * La vue d'arrivée mise de côté faute de consentement, rejouée par
 * `setAnalyticsConsent` dès l'accord. Une seule : c'est l'écran sur lequel
 * l'utilisateur répond à la question, et les suivants passent par le hook.
 * @type {{ path: string, title: string }|null}
 */
let attente = null;

/** Clé de projet PostHog valide (`phc_…`) ou `null`. */
export function parsePosthogKey(raw) {
  if (!raw) return null;
  const id = String(raw).trim();
  return /^phc_[A-Za-z0-9]{20,}$/.test(id) ? id : null;
}

/**
 * Le nom de l'application, déduit du chemin de base — sans configuration.
 *
 * POURQUOI CETTE PROPRIÉTÉ EXISTE. Les sites du parc partagent UN projet
 * PostHog (ADR 0012, qui reprend la forme de l'ADR 0011) : sans rien pour les
 * distinguer, le total est lisible et la maille application ne l'est plus.
 *
 * LE CHEMIN DE BASE LE PORTE DÉJÀ. Chaque application est construite avec
 * `base: '/<dépôt>/'` — `envoieVue` s'en sert plus bas pour reconstruire l'URL,
 * et la portée du consentement s'en sert aussi. Une application de plus arrive
 * donc instrumentée sans que personne y pense.
 *
 * Rend `null` à la racine (`/`) : là, le chemin ne nomme rien, et inventer un
 * nom vaudrait moins que l'absence, qui dit la vérité. Une application servie à
 * la racine passe `appName` explicitement.
 *
 * @param {string} [base] Chemin de base ; par défaut celui du build.
 * @returns {string|null}
 */
export function nomDApp(base) {
  const brut =
    base ??
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ??
    '/';
  const segment = String(brut).split('/').filter(Boolean)[0];
  return segment ?? null;
}

/**
 * Le domaine le plus large où CE navigateur accepte réellement un cookie.
 *
 * GARDÉE APRÈS LE PASSAGE À POSTHOG, parce que le problème n'était pas Google.
 * Le parc est servi sous `*.github.io`, et `github.io` est un SUFFIXE PUBLIC :
 * aucun site ne peut y poser de cookie. C'est la règle qui empêche un
 * `mechant.github.io` d'écrire un cookie que tous les autres liraient.
 *
 * PostHog est réglé avec `cross_subdomain_cookie: false`, ce qui lui évite de
 * tenter. Cette sonde reste exportée parce qu'elle MESURE au lieu de deviner —
 * la liste des suffixes publics ne se calcule pas (`github.io` en est un,
 * `exemple.com` non, `co.uk` aussi) — et parce qu'elle restera juste le jour où
 * le parc passera sur un domaine à lui.
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

/** Le tag est-il réellement chargé ? Une mesure qui ne part pas est un signal. */
export function isAnalyticsLoaded() {
  return state.loaded;
}

/** La clé de projet réellement en service (`phc_…`) ou `null`. */
export function getAnalyticsId() {
  return state.id;
}

/** Le client PostHog, une fois chargé — `null` avant l'accord. */
export function getAnalyticsClient() {
  return state.client;
}

/**
 * Charge et initialise PostHog, une seule fois — appelé au premier accord.
 *
 * RIEN N'EST CHARGÉ AVANT. C'est la différence qui compte avec une option
 * `opt_out_capturing_by_default` : là, le script serait téléchargé, évalué, et
 * n'attendrait qu'un appel pour parler. Ici il n'est pas là.
 */
async function chargeTag() {
  if (state.loaded || !state.id || typeof window === 'undefined') return;
  let mod;
  try {
    // AVEC `loader`, l'import est ANALYSABLE par Vite : le morceau est émis et
    // rangé où le `manualChunks` de l'app le décide. Sans lui, on retombe sur
    // un spécificateur volontairement non analysable — nécessaire tant que la
    // pair optionnelle n'est pas installée, sans quoi le build échouerait à
    // résoudre un paquet absent. Même motif que `react/observability`.
    const specificateur = ['posthog', 'js'].join('-');
    mod = chargeur
      ? await chargeur()
      : await import(/* @vite-ignore */ specificateur);
  } catch {
    // `posthog-js` absent ou réseau coupé : la mesure se tait, l'app continue.
    return;
  }
  const posthog = mod?.default ?? mod?.posthog ?? mod;
  if (!posthog || typeof posthog.init !== 'function') return;

  posthog.init(state.id, {
    ...OPTIONS_VIE_PRIVEE,
    api_host: state.hote,
  });
  state.client = posthog;
  state.loaded = true;

  // SUPER-PROPRIÉTÉ, et non un paramètre recopié à chaque appel : PostHog la
  // joint alors à tout ce qui part, y compris à ce que la bibliothèque envoie
  // d'elle-même.
  if (state.appName && typeof posthog.register === 'function') {
    posthog.register({ app_name: state.appName });
  }
}

/**
 * Prépare la mesure. NE CHARGE RIEN tant que le consentement n'est pas donné.
 *
 * @param {{
 *   posthogKey?: string, posthogHost?: string,
 *   appName?: string,
 *   consent?: 'granted'|'denied'|Record<string, boolean|'granted'|'denied'>,
 *   requireConsent?: boolean,
 *   loader?: () => Promise<unknown>,
 * }} [options]
 * @returns {{ id: string|null, loaded: boolean }}
 */
export function initAnalytics(options = {}) {
  const {
    posthogKey,
    posthogHost,
    appName,
    consent,
    requireConsent = true,
    loader,
  } = options;

  // Explicite d'abord, chemin de base ensuite : une application servie à la
  // racine n'a rien à déduire, elle se nomme.
  state.appName = appName ?? nomDApp();
  state.id = parsePosthogKey(posthogKey);
  state.hote = posthogHost || HOTE_PAR_DEFAUT;
  chargeur = loader ?? null;

  if (!state.id || typeof window === 'undefined') {
    return { id: state.id, loaded: false };
  }

  if (consent !== undefined) setAnalyticsConsent(consent);
  else if (!requireConsent) {
    state.granted = true;
    void chargeTag();
  }

  return { id: state.id, loaded: state.loaded };
}

/**
 * Normalise `{ analytics: true }`, `'granted'` ou `true` en un booléen.
 *
 * Le parc ne mesure QUE l'audience : il n'y a pas de publicité, pas de
 * personnalisation, donc pas de matrice de finalités à tenir. Les formes
 * héritées du mode consentement de Google restent acceptées pour que les
 * applications n'aient rien à réécrire.
 */
function estAccorde(consent) {
  if (consent === 'granted' || consent === true) return true;
  if (consent === 'denied' || consent === false) return false;
  if (consent && typeof consent === 'object') {
    const v = consent.analytics ?? consent.analytics_storage;
    return v === true || v === 'granted';
  }
  return false;
}

/**
 * Met à jour le consentement, et charge le tag au premier accord.
 *
 *   setAnalyticsConsent({ analytics: true });   // mesure d'audience
 *   setAnalyticsConsent('denied');              // tout refuser
 *
 * Le refus après un accord ne décharge pas le script — c'est impossible une
 * fois évalué. Il coupe la collecte (`opt_out_capturing`), ce qui est le seul
 * comportement honnête : autant le dire ici plutôt que de laisser croire à un
 * retrait complet.
 *
 * @param {'granted'|'denied'|Record<string, boolean|'granted'|'denied'>|boolean} consent
 */
export function setAnalyticsConsent(consent) {
  const accorde = estAccorde(consent);
  state.granted = accorde;

  if (!accorde) {
    // La vue mise de côté est JETÉE : l'utilisateur a refusé, elle ne doit pas
    // ressurgir à un accord ultérieur — il aura quitté cet écran depuis
    // longtemps.
    attente = null;
    if (state.client?.opt_out_capturing) state.client.opt_out_capturing();
    return false;
  }

  if (state.client?.opt_in_capturing) state.client.opt_in_capturing();
  void chargeTag().then(() => {
    if (!attente) return;
    const { path, title } = attente;
    attente = null;
    envoieVue(path, title);
  });
  return true;
}

/**
 * Un événement de mesure.
 *
 * @param {string} name Nom d'événement (`snake_case`).
 * @param {Record<string, unknown>} [params]
 */
export function trackEvent(name, params = {}) {
  const event = String(name ?? '').trim();
  if (!event) return false;
  if (!state.granted) return false;
  if (!state.client?.capture) return false;
  // `app_name` est déjà une super-propriété ; on ne le recopie que si
  // l'appelant le nomme lui-même — auquel cas c'est LUI qui a raison.
  avertitSiValeurLibre(event, params);
  state.client.capture(event, params);
  trace(event, params);
  return true;
}

/**
 * LE VOCABULAIRE DES GESTES — trois noms pour tout le parc, et c'est voulu.
 *
 * POURQUOI SI PEU DE NOMS. Dix-neuf applications partagent UN projet PostHog.
 * Si chacune invente les siens, la liste d'événements devient la première chose
 * qu'un nouveau venu voit et la dernière qu'il comprend. Le détail vit donc
 * dans les PROPRIÉTÉS (`etape`, `resultat`), pas dans le nom : PostHog ventile
 * par propriété aussi bien que par événement, et une étape d'entonnoir accepte
 * un filtre de propriété. On garde la lisibilité sans rien perdre.
 *
 * POURQUOI DANS LE SOCLE, ET NON DANS CHAQUE APP. Ces trois gestes sont
 * COMMUNS : installer, mettre à jour, partager. Les instrumenter ici les donne
 * aux dix-neuf d'un coup, du même nom et au même endroit — là où dix-neuf
 * instrumentations à la main auraient donné dix-neuf vocabulaires.
 *
 * LA RÈGLE QUI NE SE NÉGOCIE PAS : **aucune valeur libre**. Les propriétés ne
 * portent que des constantes énumérées ici. Jamais le texte d'un élément,
 * jamais une saisie, jamais un identifiant que l'utilisateur se partage — c'est
 * la raison même pour laquelle `autocapture` est coupée (ADR 0012) : elle
 * enregistrerait des libellés de diagnostic sur `mister-cim10`. Instrumenter à
 * la main ne sert à rien si c'est pour reconstituer le même risque.
 */
export const GESTES = Object.freeze({
  /** Invite d'installation : `etape`, `methode`, `plateforme`. */
  INSTALLATION: 'installation',
  /** Bandeau de mise à jour : `etape`. */
  MAJ: 'maj',
  /** Bouton de partage : `resultat`. */
  PARTAGE: 'partage',

  // ── Les gestes MÉTIER, que les applications posent elles-mêmes ───────────
  //
  // CINQ NOMS POUR DIX-HUIT APPLICATIONS, et le nom de l'app est déjà porté
  // par `app_name`. Le détail va dans `objet`, `format` ou `nom` — jamais dans
  // le nom de l'événement. Quarante noms rendraient la liste d'événements
  // illisible dès la première semaine, et c'est la première chose qu'on voit
  // en ouvrant le projet.

  /** Quelque chose a été produit : `objet` (`depense`, `lieu`, `scenario`…). */
  CREATION: 'creation',
  /** Des données sont sorties de l'app : `format` (`pdf`, `csv`, `png`…). */
  EXPORT: 'export',
  /** Une session de jeu ou de match : `etape`. */
  PARTIE: 'partie',
  /** Un traitement que l'app exécute : `nom`, `etape`. */
  OPERATION: 'operation',
  /** Une lecture, là où consulter EST l'usage : `objet`. */
  CONSULTATION: 'consultation',
});

/** Les étapes admises, par geste. Une valeur hors de ces listes est un bogue. */
export const ETAPES = Object.freeze({
  /**
   * `proposee` est une IMPRESSION, pas un geste — et elle est indispensable :
   * sans elle, `acceptee` n'a pas de dénominateur et un taux d'acceptation ne
   * se calcule pas.
   */
  INSTALLATION: Object.freeze(['proposee', 'acceptee', 'refusee', 'reportee']),
  MAJ: Object.freeze(['proposee', 'appliquee', 'reportee']),
  /** Les quatre issues de `shareOrCopy`, sans invention. */
  PARTAGE: Object.freeze(['shared', 'copied', 'cancelled', 'failed']),
  /**
   * `terminee` sans `demarree` ne veut rien dire, et l'inverse non plus :
   * c'est leur RAPPORT qui répond — combien de parties vont au bout.
   */
  PARTIE: Object.freeze(['demarree', 'terminee']),
  /** Une opération qui échoue est au moins aussi instructive qu'une réussie. */
  OPERATION: Object.freeze(['lancee', 'reussie', 'echouee']),
});

/**
 * L'ALARME QUI EMPÊCHE DE RECONSTITUER `autocapture` À LA MAIN.
 *
 * Toute la privauté de ce dispositif tient à une règle qu'aucun type ne peut
 * exprimer : les propriétés ne portent que des valeurs ÉNUMÉRÉES. Le jour où
 * quelqu'un écrit `trackEvent('creation', { titre: saisie })`, rien ne casse,
 * rien ne prévient, et du texte d'utilisateur part chez le sous-traitant — soit
 * exactement ce pour quoi `autocapture` a été coupée (ADR 0012).
 *
 * ON NE VALIDE PAS UNE LISTE FERMÉE, et c'est délibéré : le socle ne peut pas
 * connaître les `objet` de dix-huit applications. On détecte ce qui NE PEUT PAS
 * être un jeton : une ESPACE, ou plus de quarante caractères. Un libellé saisi
 * en a presque toujours ; `pdf`, `depense`, `mister-cim10` n'en ont jamais.
 * Viser plus large ferait crier sur `fr-FR` ou `6.1.0`, et une alarme qui crie
 * à tort finit ignorée.
 *
 * MUETTE EN PRODUCTION : c'est un garde-fou d'auteur, pas un journal de
 * visiteur. Et muette après le premier cri par clé, pour ne pas noyer la
 * console d'une boucle de rendu.
 */
const criees = new Set();
function avertitSiValeurLibre(event, params) {
  // Les événements de PostHog (`$pageview`…) portent LÉGITIMEMENT du texte
  // libre : `$current_url`, `page_title`. Ils ne sont pas de notre ressort.
  if (event.startsWith('$')) return;
  const enProd =
    typeof import.meta !== 'undefined' && import.meta.env?.PROD === true;
  if (enProd) return;

  for (const [cle, valeur] of Object.entries(params ?? {})) {
    if (typeof valeur !== 'string') continue;
    if (!valeur.includes(' ') && valeur.length <= 40) continue;
    const marque = `${event}.${cle}`;
    if (criees.has(marque)) continue;
    criees.add(marque);
    console.warn(
      `[dev-pwa-config] \`${event}\` porte une valeur qui ressemble à du TEXTE ` +
        `LIBRE en « ${cle} ». Les propriétés de mesure ne prennent que des ` +
        `valeurs énumérées : un libellé saisi, un titre ou un identifiant ` +
        `partagé partiraient chez le sous-traitant. C'est précisément ce que ` +
        `\`autocapture: false\` évite (ADR 0012).`
    );
  }
}

/** Ce que la trace retient au plus — bornée, c'est une sonde, pas un journal. */
const TRACE_MAX = 50;

/**
 * LA COUTURE D'OBSERVATION DES TESTS DE BOUT EN BOUT.
 *
 * GA4 en offrait une gratuitement : `window.dataLayer`, rempli AVANT que le
 * script distant soit chargé, donc lisible sans réseau et sans deviner le
 * format d'un corps de requête. La garde partagée `playwright-entree` s'en
 * servait, et NEUF applications en dépendent.
 *
 * PostHog n'a pas d'équivalent : son client vit dans l'état de ce module, hors
 * de portée d'une page Playwright, et ses envois partent en corps compressé.
 * Vérifier par le réseau rendrait la garde dépendante d'un format interne.
 *
 * On pose donc la couture nous-mêmes : ce que l'application a DEMANDÉ d'envoyer,
 * dans l'ordre, borné à cinquante entrées. Ce n'est pas un journal et ça ne
 * remplace pas la preuve réseau — c'est le pendant exact de ce que `dataLayer`
 * donnait.
 */
function trace(event, params) {
  if (typeof window === 'undefined') return;
  const liste = (window.__DWC_MESURE ??= []);
  liste.push({ event, ...params });
  if (liste.length > TRACE_MAX) liste.splice(0, liste.length - TRACE_MAX);
}

/**
 * Une vue de page — le geste qui manque à toute PWA à routeur.
 *
 * PostHog est initialisé avec `capture_pageview: false` : sans cet appel, la
 * navigation interne serait invisible ; avec la sienne EN PLUS, chaque
 * navigation serait comptée deux fois.
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
  // en production le 16/09/2026 sur mister-molkky et miss-uwh : zéro vue au
  // chargement, et des vues normales dès qu'on navigue. Une visite d'un seul
  // écran — la majorité — ne remontait donc RIEN.
  //
  // On la met de côté, et `setAnalyticsConsent` la rejoue au moment de l'accord.
  if (!state.granted || !state.client) {
    attente = { path: location, title: name };
    return false;
  }

  return envoieVue(location, name);
}

/**
 * L'envoi proprement dit, partagé par l'appel direct et par le rejeu.
 *
 * `$current_url` PORTE LE CHEMIN DE BASE. Sans lui, une app servie sous
 * `/mister-molkky/` enregistrerait `https://<compte>.github.io/history` — une
 * URL qui n'existe pas. Les vingt sites partagent l'origine : c'est la même
 * famille de défaut que les clés `localStorage` nues.
 *
 * `$pathname` reste le chemin INTERNE à l'application, celui qui distingue ses
 * écrans ; `app_name`, en super-propriété, dit de quelle application il s'agit.
 */
function envoieVue(path, title) {
  const base =
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const racine = base.endsWith('/') ? base.slice(0, -1) : base;
  const chemin = path.startsWith('/') ? path : `/${path}`;
  return trackEvent('$pageview', {
    $current_url: `${window.location?.origin ?? ''}${racine}${chemin}`,
    $pathname: path,
    page_title: title,
  });
}

/**
 * Propriétés d'utilisateur (langue, thème, version…).
 *
 * JAMAIS D'IDENTIFIANT PERSONNEL ici : ces valeurs partent chez le
 * sous-traitant et y restent. Ce n'est pas une recommandation de style, c'est
 * la condition pour que la mesure reste licite sans base légale supplémentaire.
 *
 * @param {Record<string, unknown>} properties
 */
export function setUserProperties(properties = {}) {
  if (!state.granted) return false;
  if (!state.client?.register) return false;
  state.client.register(properties);
  return true;
}

/** Remet le module à zéro. Réservé aux tests. */
export function resetAnalytics() {
  state.id = null;
  state.hote = HOTE_PAR_DEFAUT;
  state.loaded = false;
  state.granted = false;
  state.appName = null;
  state.client = null;
  chargeur = null;
  // Sans cette ligne, la vue mise de côté par un test fuiterait dans le
  // suivant — et y partirait au premier accord.
  attente = null;
  // L'alarme « valeur libre » ne crie qu'une fois par clé : sans remise à
  // zéro, le deuxième test qui l'attend ne verrait rien et passerait au vert
  // pour une raison fausse.
  criees.clear();
}
