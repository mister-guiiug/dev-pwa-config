/**
 * `posthog-js`, avec un corps — et une mémoire.
 *
 * POURQUOI DANS LE SOCLE. Toute app qui teste son écran de réglages avec
 * `ConsentSection` doit remplacer `posthog-js` : un accord mémorisé fait
 * charger la bibliothèque au montage, et la vraie, initialisée dans jsdom,
 * partirait interroger le nuage de PostHog. Dix-huit apps mesurent : sans ce
 * double, dix-huit copies écrites à la main — la leçon de `testing/pwa-register`,
 * qui en avait trouvé douze.
 *
 * CE QU'UNE COPIE MUETTE RATERAIT. Le double ENREGISTRE ce qu'on lui demande
 * au lieu de l'envoyer, et il se souvient d'un retrait comme la vraie :
 * `opt_out_capturing` le rend « retiré », `has_opted_out_capturing` le dit, et
 * une bibliothèque retirée n'envoie plus rien. C'est ce qui permet à un test
 * d'app de prouver que le clic sur « Retirer mon consentement » est bien
 * PARVENU à la bibliothèque — pas seulement qu'un bouton a changé de libellé.
 *
 * Pose, côté app :
 *
 *   vi.mock('posthog-js/dist/module.slim.js', async () => {
 *     const { fauxPosthog } = await import(
 *       '@mister-guiiug/dev-pwa-config/testing/posthog'
 *     );
 *     return { default: fauxPosthog() };
 *   });
 *
 *   beforeEach(() => {
 *     vi.stubEnv('VITE_POSTHOG_KEY', CLE_DE_TEST);
 *     resetAnalytics(); // l'état de la mesure est celui d'un module
 *   });
 *
 *   const posthog = (await import('posthog-js/dist/module.slim.js')).default;
 *   expect(posthog.has_opted_out_capturing()).toBe(true);
 */

/**
 * Une clé au format de PostHog (`phc_` et vingt caractères au moins) : sans
 * elle, `ConsentBanner` et `ConsentSection` ne rendent rien — il n'y aurait
 * rien à mesurer. Elle ne désigne aucun projet.
 */
export const CLE_DE_TEST = 'phc_test00000000000000000000000000';

/**
 * Le double. `retire: true` simule un visiteur qui a retiré son accord lors
 * d'une visite précédente : posthog-js inscrit ce retrait dans `localStorage`
 * et le relit à `init`.
 *
 * @param {{ retire?: boolean }} [reglages]
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
