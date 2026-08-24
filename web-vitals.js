/**
 * Web Vitals — relevé des métriques de performance perçue.
 *
 * PROMU, PAS INVENTÉ. Quatre apps portent un `monitoring/web-vitals.ts`
 * (miss-carbook, miss-contraction, mister-cim10, mister-puzzle), 58 à 244
 * lignes, toutes exportant `initWebVitals`. Deux d'entre elles partagent en
 * plus trois fonctions à l'identique.
 *
 * ET LES QUATRE SONT CASSÉES. Elles déclarent `web-vitals: ^4.2.0` — résolu en
 * 4.2.4 dans les quatre verrous — et appellent `onFID`, qui a été RETIRÉ en
 * v4.0 (FID est remplacé par INP). Le code lit donc :
 *
 *   const { onCLS, onFID, onFCP, onLCP, onTTFB } = await import('web-vitals');
 *   onCLS(logMetric);
 *   onFID(logMetric);        // ← TypeError: onFID is not a function
 *   onFCP(logMetric);        // ← jamais atteint
 *   onLCP(logMetric);        // ← jamais atteint
 *   onTTFB(logMetric);       // ← jamais atteint
 *
 * Le tout est enveloppé dans un `try/catch` qui journalise un avertissement.
 * Résultat : ces apps croient mesurer cinq métriques, en mesurent UNE, et le
 * disent dans une console que personne ne lit. C'est exactement le genre de
 * panne qu'un contrôle vert rend invisible.
 *
 * DEUX CORRECTIONS À LA PROMOTION :
 *
 * 1. `onINP` remplace `onFID`, qui n'existe plus. INP est d'ailleurs la
 *    métrique de réactivité retenue par les Core Web Vitals depuis mars 2024.
 * 2. **Chaque métrique est enregistrée séparément.** Une seule enveloppe
 *    `try` autour des cinq appels fait tomber les suivants au premier
 *    problème — c'est précisément ce qui s'est passé. Ici, l'échec d'une
 *    métrique n'emporte pas les autres, et il est signalé à l'appelant.
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
      // Le cas exact d'`onFID` : la fonction a disparu d'une version majeure.
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
