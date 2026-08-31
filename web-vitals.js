/**
 * Web Vitals — relevé des métriques de performance perçue.
 *
 * PROMU, PAS INVENTÉ. Quatre apps portent un `monitoring/web-vitals.ts`
 * (miss-carbook, miss-contraction, mister-cim10, mister-puzzle), 58 à 244
 * lignes, toutes exportant `initWebVitals`. Deux d'entre elles partagent en
 * plus trois fonctions à l'identique.
 *
 * ⚠️ CET EN-TÊTE A AFFIRMÉ UNE PANNE QUI N'EXISTAIT PAS, et l'affirmation a
 * servi de justification d'adoption dans plusieurs PR du parc. Il écrivait
 * qu'`onFID` avait été « RETIRÉ en v4.0 », que l'appel levait un
 * `TypeError: onFID is not a function`, et que ces apps « croient mesurer cinq
 * métriques, en mesurent UNE ».
 *
 * **C'est faux.** `onFID` a été DÉPRÉCIÉ en v4 et retiré en **v5.0.0** ; les
 * quatre verrous résolvent `web-vitals@4.2.4`, qui l'exporte toujours. Vérifié
 * deux fois en migrant `mister-cim10` (#29) : `typeof onFID === 'function'`
 * sous Node, et en rejouant la séquence exacte dans un navigateur,
 * `registered: ['CLS','FID','FCP','LCP','TTFB']`, `threw: null`. Les cinq
 * métriques étaient bien relevées.
 *
 * LE VRAI DÉFAUT ÉTAIT AILLEURS, et il ne se voyait pas en lisant les imports.
 * Le `getRating` de ces copies porte un `case 'CLS'` puis un
 * `default: return 'good'` : **quatre métriques sur cinq étaient notées
 * « bonnes » quelle que soit leur valeur**, un LCP à dix secondes compris. Une
 * mesure fausse est plus coûteuse qu'une mesure absente, parce qu'on s'y fie.
 *
 * TROIS CORRECTIONS À LA PROMOTION :
 *
 * 1. **Les seuils sont appliqués à CHAQUE métrique** (`THRESHOLDS` + `rate`),
 *    et non à une seule avec un défaut optimiste pour les autres. C'est le
 *    défaut réel que la promotion corrige.
 * 2. `onINP` remplace `onFID` — non parce que ce dernier a disparu, mais parce
 *    que **FID est sortie des Core Web Vitals en mars 2024** au profit d'INP,
 *    que ces copies ne relevaient jamais. Le remplacement reste juste ; c'est
 *    son motif qui était faux.
 * 3. **Chaque métrique est enregistrée séparément.** Une seule enveloppe `try`
 *    autour des cinq appels ferait tomber les suivantes au premier problème.
 *    Ce n'est pas ce qui s'est passé ici — mais le motif reste mauvais, et
 *    l'échec d'une métrique ne doit pas emporter les autres.
 *
 * DÉPENDANCE OPTIONNELLE. `web-vitals` (^4) est une peer optionnelle, importée
 * PARESSEUSEMENT : une app qui n'appelle pas `initWebVitals` n'embarque rien.
 */

/** Métriques relevées, dans l'ordre où elles deviennent disponibles. */
export const WEB_VITALS = ['TTFB', 'FCP', 'LCP', 'CLS', 'INP'];

/**
 * Seuils « bon / à améliorer / mauvais », en millisecondes sauf CLS (sans
 * unité). Valeurs publiées par web.dev ; répétées ici pour que le verdict ne
 * dépende pas d'une table recopiée dans chaque app.
 */
export const THRESHOLDS = {
  TTFB: [800, 1800],
  FCP: [1800, 3000],
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
};

/** `good` | `needs-improvement` | `poor`, ou `unknown` si la métrique est inconnue. */
export function rate(name, value) {
  const bounds = THRESHOLDS[name];
  if (!bounds || !Number.isFinite(value)) return 'unknown';
  if (value <= bounds[0]) return 'good';
  return value <= bounds[1] ? 'needs-improvement' : 'poor';
}

/**
 * Enregistre les cinq métriques et appelle `onMetric` à chaque relevé.
 *
 * @param {{
 *   onMetric?: (metric: { name: string, value: number, rating: string, id: string }) => void,
 *   onError?: (name: string, error: unknown) => void,
 *   loader?: () => Promise<Record<string, unknown>>,
 * }} [options] `loader` sert aux tests et aux bundlers qui exigent un import
 *   statique ; par défaut, `web-vitals` est importé à la demande.
 * @returns {Promise<string[]>} Les métriques réellement enregistrées. Une liste
 *   plus courte que `WEB_VITALS` dit qu'il manque quelque chose — c'est ce que
 *   les copies taisaient.
 */
export async function initWebVitals(options = {}) {
  const { onMetric, onError, loader } = options;
  if (typeof globalThis.window === 'undefined') return [];

  let lib;
  try {
    lib = await (loader ? loader() : import('web-vitals'));
  } catch (error) {
    onError?.('import', error);
    return [];
  }

  const report = metric => {
    onMetric?.({
      name: metric.name,
      value: metric.value,
      rating: metric.rating ?? rate(metric.name, metric.value),
      id: metric.id,
    });
  };

  const registered = [];
  for (const name of WEB_VITALS) {
    const register = lib[`on${name}`];
    if (typeof register !== 'function') {
      // Le cas d'une fonction disparue d'une version majeure — ce qui
      // ARRIVERA à `onFID` en v5, sans être arrivé en v4 (voir l'en-tête).
      onError?.(name, new Error(`web-vitals n'expose pas on${name}`));
      continue;
    }
    try {
      register(report);
      registered.push(name);
    } catch (error) {
      // Une métrique indisponible sur ce navigateur ne doit pas emporter les
      // quatre autres — le défaut constaté dans les quatre copies.
      onError?.(name, error);
    }
  }
  return registered;
}
