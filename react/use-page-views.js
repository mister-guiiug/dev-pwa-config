import { useEffect, useRef } from 'react';
import { trackPageView } from '../analytics.js';

/**
 * Une vue de page par navigation — le geste qu'aucune app ne fait.
 *
 * GA4 n'envoie `page_view` qu'au chargement du document. Dans une PWA à
 * routeur, c'est-à-dire les seize, tout ce qui se passe après l'entrée est
 * invisible : une seule page vue par session, une durée de session fausse, et
 * aucun parcours. `initAnalytics` configure GA4 avec `send_page_view: false`
 * pour que la première vue passe par ici comme les suivantes — sans quoi la
 * page d'entrée serait comptée deux fois.
 *
 * AGNOSTIQUE DU ROUTEUR, comme `useRouteBreadcrumbs` : on lui passe le chemin.
 *
 *   usePageViews(useLocation().pathname);
 *
 * Sans consentement accordé, `trackPageView` ne fait rien : le hook peut être
 * monté sans condition.
 *
 * @param {string} path Chemin courant.
 * @param {{ title?: string }} [options]
 */
export function usePageViews(path, options = {}) {
  const { title } = options;
  const previous = useRef(null);

  useEffect(() => {
    if (typeof path !== 'string') return;
    // Le même chemin deux fois de suite n'est pas une vue de plus : un rendu
    // provoqué par autre chose (un état, un thème) doublerait sinon le compte.
    if (previous.current === path) return;
    previous.current = path;
    trackPageView(path, title);
  }, [path, title]);
}
