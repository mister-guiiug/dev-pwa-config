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
 * Le double lui-même vit dans `testing/posthog` depuis qu'il est publié : les
 * apps en ont besoin pour éprouver leur écran de réglages, et deux copies
 * finiraient par diverger. Il se souvient d'un retrait comme la vraie.
 */
export { fauxPosthog } from '../../testing/posthog.js';

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
