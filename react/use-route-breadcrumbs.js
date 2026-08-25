import { useEffect, useRef } from 'react';
import { breadcrumb, setSessionContext } from './observability.js';

/**
 * Le chemin courant, dans le fil d'Ariane et dans le contexte de session.
 *
 * POURQUOI UN HOOK À PART. « Où était l'utilisateur ? » est la première
 * question qu'on se pose devant une trace, et la seule que le contexte ne peut
 * pas donner une fois pour toutes : elle change à chaque navigation. Aucune
 * des treize apps qui remontent des erreurs n'enregistre la route.
 *
 * VOLONTAIREMENT AGNOSTIQUE DU ROUTEUR. Le paquet n'a pas de dépendance à
 * `react-router`, et deux apps n'en utilisent pas. On passe le chemin, d'où
 * qu'il vienne :
 *
 *   useRouteBreadcrumbs(useLocation().pathname);   // react-router
 *   useRouteBreadcrumbs(path);                     // routeur maison
 *
 * @param {string} path Chemin courant.
 * @param {{ category?: string }} [options]
 */
export function useRouteBreadcrumbs(path, options = {}) {
  const { category = 'nav' } = options;
  const previous = useRef(null);

  useEffect(() => {
    if (typeof path !== 'string') return;
    const from = previous.current;
    // Le premier rendu n'est pas une navigation : il devient « entrée ».
    breadcrumb(category, from === null ? path : `${from} → ${path}`, undefined);
    previous.current = path;
    setSessionContext({ route: path });
  }, [path, category]);
}
