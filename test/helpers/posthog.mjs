/**
 * Un double de `posthog-js`, PILOTABLE.
 *
 * POURQUOI UN DOUBLE ET PAS LE VRAI. `posthog-js` est une pair OPTIONNELLE : le
 * socle ne l'installe pas, et un test qui en dépendrait ne tournerait pas en
 * CI. Surtout, ce qu'on veut éprouver n'est pas la bibliothèque — c'est le
 * contrat du socle autour d'elle : rien avant l'accord, les options de vie
 * privée réellement passées, `app_name` en super-propriété, la vue d'arrivée
 * rejouée.
 *
 * Il enregistre ce qu'on lui demande au lieu de l'envoyer. C'est le même parti
 * que `testing/pwa-register` : un double MUET prouve qu'un composant se monte,
 * jamais qu'une mesure part.
 */

/**
 * @returns {{ init: Function, capture: Function, register: Function,
 *   opt_in_capturing: Function, opt_out_capturing: Function,
 *   appels: { init: any[], capture: any[], register: any[], optIn: number,
 *     optOut: number } }}
 */
export function fauxPosthog() {
  const appels = {
    init: [],
    capture: [],
    register: [],
    optIn: 0,
    optOut: 0,
    /** Les gestes de consentement, DANS L'ORDRE — un compteur ne le dit pas. */
    gestes: [],
  };
  return {
    appels,
    init(cle, options) {
      appels.init.push({ cle, options });
    },
    capture(event, params) {
      appels.capture.push({ event, params });
    },
    register(props) {
      appels.register.push(props);
    },
    opt_in_capturing() {
      appels.optIn++;
      appels.gestes.push('granted');
    },
    opt_out_capturing() {
      appels.optOut++;
      appels.gestes.push('denied');
    },
  };
}

/**
 * Le `loader` à passer à `initAnalytics` ou à `ConsentBanner`.
 *
 * `default` comme le vrai paquet : le socle déballe `mod.default ?? mod.posthog
 * ?? mod`, et un double qui ne reproduirait pas cette forme laisserait passer
 * une erreur de déballage.
 */
export function chargeurFactice(faux) {
  return async () => ({ default: faux });
}

/**
 * Laisse le chargement asynchrone se terminer.
 *
 * `chargeTag` est une promesse : à la différence de `gtag`, qui écrivait dans
 * `dataLayer` de façon synchrone, rien n'est observable au retour immédiat de
 * `setAnalyticsConsent`. Un test qui l'oublie constate un « rien n'est parti »
 * qui n'est qu'un tour de boucle d'avance.
 */
export const laisseCharger = () => new Promise(r => setTimeout(r, 0));
