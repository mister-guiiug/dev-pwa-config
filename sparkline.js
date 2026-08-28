/**
 * Séries : la géométrie, sans React et sans librairie.
 *
 * BESOIN CONSTATÉ, CODE ABSENT. Cinq apps ont des séries à montrer —
 * miss-lookhouse (historique des prix), mister-quota (consommation des
 * services IA), miss-genius (scénarios de moyennes), mister-doc (compteurs de
 * week-ends et d'heures), miss-uwh (bilan de saison). Aucune ligne partagée
 * pour le faire.
 *
 * POURQUOI PAS UNE LIBRAIRIE. Le socle tient déjà à ne rien embarquer
 * d'inutile : MapLibre pèse 989 ko et n'est chargé qu'à l'usage. Une librairie
 * de graphiques complète pèserait le même ordre de grandeur pour tracer douze
 * points dans une carte de réglages. Ce module rend des COORDONNÉES ; le rendu
 * tient en un `<polyline>`.
 *
 * CE QUI EST ICI ET PAS DANS LE COMPOSANT : tout ce qui se calcule faux quand
 * on l'écrit vite —
 *
 *   - une série CONSTANTE : l'amplitude vaut zéro, et la mise à l'échelle
 *     divise par zéro. Le trait doit être plat au milieu, pas absent ;
 *   - un seul point : il n'y a pas de ligne, mais il y a quelque chose à
 *     montrer ;
 *   - des TROUS (`null`, `NaN`) : une mesure manquante n'est pas un zéro. Les
 *     confondre fait plonger la courbe et raconte une panne qui n'a pas eu
 *     lieu ;
 *   - l'axe Y qui ne part PAS de zéro : légitime pour un prix immobilier,
 *     mensonger pour un décompte. Le choix est explicite.
 *
 * L'ALTERNATIVE TEXTUELLE est calculée ici aussi, parce qu'un graphique sans
 * elle est un trou dans l'interface pour qui ne le voit pas — et parce que
 * personne ne l'écrit après coup.
 */

/** Une valeur exploitable ? (`null`, `undefined`, `NaN`, `±Infinity` : non.) */
function usable(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Normalise une entrée en points `{ x, y }`, les trous conservés comme `null`.
 *
 * Accepte trois écritures — `[1, 2, 3]`, `[{y}]`, `[{x, y}]` — parce que les
 * cinq apps n'ont pas la même forme de données et qu'exiger la conversion
 * ferait écrire cinq fois la même boucle.
 */
export function toPoints(series, options = {}) {
  const { xOf, yOf } = options;
  return [...(series ?? [])].map((entry, index) => {
    if (typeof entry === 'number' || entry === null || entry === undefined) {
      return { x: index, y: usable(entry) ? entry : null };
    }
    const y = yOf ? yOf(entry, index) : entry.y;
    const x = xOf ? xOf(entry, index) : (entry.x ?? index);
    return { x: usable(x) ? x : index, y: usable(y) ? y : null };
  });
}

/**
 * Les bornes d'une série, prêtes à mettre à l'échelle.
 *
 * Une série constante reçoit une amplitude ARTIFICIELLE de 1 : sans elle,
 * `(y - min) / (max - min)` divise par zéro et rend `NaN` pour tous les
 * points — un graphique vide au lieu d'un trait plat.
 */
export function extent(points, options = {}) {
  const values = points.filter(p => p.y !== null).map(p => p.y);
  if (values.length === 0) return null;

  let min = options.min ?? Math.min(...values);
  let max = options.max ?? Math.max(...values);
  // `baseline: 'zero'` est le bon défaut pour un décompte, et un mensonge pour
  // un prix : le choix reste à l'appelant, mais il est nommé.
  if (options.baseline === 'zero') {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  return { min, max };
}

/**
 * Projette une série dans une boîte de `width` × `height`.
 *
 * Rend des SEGMENTS : une série trouée donne plusieurs traits, jamais une
 * ligne qui traverse le trou comme si la mesure existait.
 *
 * @returns {{ segments: Array<Array<{x:number,y:number}>>, points: Array<{x:number,y:number,value:number}>,
 *   last: object|null, extent: {min:number,max:number}|null, width:number, height:number }}
 */
export function project(series, options = {}) {
  const {
    width = 120,
    height = 32,
    padding = 1,
    xOf,
    yOf,
    ...bounds
  } = options;

  const points = toPoints(series, { xOf, yOf });
  const span = extent(points, bounds);
  if (!span) {
    return {
      segments: [],
      points: [],
      last: null,
      extent: null,
      width,
      height,
    };
  }

  const xs = points.map(p => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xRange = xMax - xMin || 1;
  const yRange = span.max - span.min;
  const usableHeight = Math.max(0, height - padding * 2);

  const placed = points.map(point => ({
    x: padding + ((point.x - xMin) / xRange) * Math.max(0, width - padding * 2),
    // L'axe SVG descend : la valeur haute est en haut de l'écran.
    y:
      point.y === null
        ? null
        : padding +
          usableHeight -
          ((point.y - span.min) / yRange) * usableHeight,
    value: point.y,
  }));

  const segments = [];
  let current = [];
  for (const point of placed) {
    if (point.y === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else current.push({ x: point.x, y: point.y });
  }
  if (current.length > 0) segments.push(current);

  const drawn = placed.filter(p => p.y !== null);
  return {
    segments,
    points: drawn,
    // Le dernier point vaut d'être marqué : c'est la valeur d'aujourd'hui.
    last: drawn.length > 0 ? drawn[drawn.length - 1] : null,
    extent: span,
    width,
    height,
  };
}

/** Un segment en attribut `points` de `<polyline>`. */
export function toPolyline(segment) {
  return segment.map(p => `${round(p.x)},${round(p.y)}`).join(' ');
}

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Barres proportionnelles, la plus haute à 100 %.
 *
 * Les valeurs négatives sont ramenées à zéro plutôt que dessinées à l'envers :
 * une barre qui descend sous sa ligne de base demande un axe, donc un autre
 * composant que celui-ci.
 */
export function bars(values, options = {}) {
  const points = toPoints(values, options);
  const span = extent(points, { baseline: 'zero', ...options });
  if (!span) return [];
  const top = Math.max(span.max, 0) || 1;
  return points.map((point, index) => ({
    index,
    value: point.y,
    ratio: point.y === null ? 0 : Math.max(0, Math.min(1, point.y / top)),
    missing: point.y === null,
  }));
}

/**
 * L'alternative textuelle d'une série.
 *
 * Un graphique sans elle est un trou dans l'interface pour qui ne le voit pas.
 * Elle est calculée ici parce que, laissée au composant, elle n'est jamais
 * écrite — le relevé du socle montre déjà ce qui arrive à ce qu'on remet à
 * plus tard.
 */
export function describeSeries(series, options = {}) {
  const {
    label = 'série',
    format = value => String(value),
    unit = '',
  } = options;
  const points = toPoints(series, options);
  const values = points.filter(p => p.y !== null).map(p => p.y);

  if (values.length === 0) return `${label} : aucune donnée`;

  const first = values[0];
  const last = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const suffix = unit ? ` ${unit}` : '';
  const missing = points.length - values.length;

  const parts = [
    `${label} : ${values.length} point${values.length > 1 ? 's' : ''}`,
    `de ${format(first)}${suffix} à ${format(last)}${suffix}`,
    `minimum ${format(min)}${suffix}, maximum ${format(max)}${suffix}`,
  ];
  if (last !== first) {
    parts.push(last > first ? 'en hausse' : 'en baisse');
  }
  if (missing > 0) {
    // Dire les trous : une courbe à trous n'a pas la même valeur qu'une
    // courbe complète, et l'alternative textuelle est le seul endroit où ça
    // peut se lire.
    parts.push(
      `${missing} mesure${missing > 1 ? 's' : ''} manquante${missing > 1 ? 's' : ''}`
    );
  }
  return `${parts.join(', ')}.`;
}
