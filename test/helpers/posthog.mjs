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
 * LA MÉMOIRE DU RETRAIT, COMME LA VRAIE. posthog-js inscrit `opt_out_capturing`
 * dans `localStorage`, et `init` relit cette inscription à la visite suivante :
 * `retire: true` simule un visiteur qui a retiré son accord lors d'une visite
 * précédente. Sans ce réglage, le double ne pouvait pas montrer qu'un accord
 * redonné plus tard restait lettre morte.
 *
 * @param {{ retire?: boolean }} [reglages]
 * @returns {{ init: Function, capture: Function, register: Function,
 *   opt_in_capturing: Function, opt_out_capturing: Function,
 *   has_opted_out_capturing: Function,
 *   appels: { init: any[], capture: any[], register: any[], optIn: number,
 *     optOut: number, gestes: string[] } }}
 */
export function fauxPosthog(reglages = {}) {
  const appels = {
    init: [],
    capture: [],
    register: [],
    optIn: 0,
    optOut: 0,
    /** Les gestes de consentement, DANS L'ORDRE — un compteur ne le dit pas. */
    gestes: [],
  };
  let retire = reglages.retire === true;
  return {
    appels,
    init(cle, options) {
      appels.init.push({ cle, options });
    },
    capture(event, params) {
      // Comme la vraie : une bibliothèque qui se croit retirée n'envoie rien.
      if (retire) return;
      appels.capture.push({ event, params });
    },
    register(props) {
      appels.register.push(props);
    },
    opt_in_capturing() {
      retire = false;
      appels.optIn++;
      appels.gestes.push('granted');
    },
    opt_out_capturing() {
      retire = true;
      appels.optOut++;
      appels.gestes.push('denied');
    },
    has_opted_out_capturing() {
      return retire;
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
