/**
 * Module interne de `analytics.js` : les URL que PostHog joint de lui-même
 * à chaque événement, nettoyées avant de partir (voir `analytics-url.js`).
 */

/** Les marqueurs qui remplacent ce qui est retiré. */
export declare const MARQUES_URL: Readonly<{
  requete: '[requête]';
  fragment: '[fragment]';
  identifiants: '[identifiants]';
}>;

/** Une URL sans identifiants, requête ni fragment ; la route d'un `HashRouter` reste. */
export declare function nettoieUrl(url: string): string;

/** Le `before_send` de tous les événements : URL des propriétés, de `$set` et de `$set_once` nettoyées. */
export declare function nettoieUrlsEvenement<T>(evenement: T): T;
