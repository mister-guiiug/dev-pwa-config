/**
 * « Est-ce que ça existe déjà ? » — similarité de noms et verdict EXPLIQUÉ.
 *
 * PROMU, PAS INVENTÉ. Deux apps, deux domaines sans rapport, le même problème.
 * `mister-family-map/src/shared/lib/dedupe.ts` compare des lieux proposés par
 * les familles sur le nom et la proximité (Sørensen–Dice sur bigrammes) ;
 * miss-lookhouse fait de l'anti-doublons sur des annonces immobilières
 * multi-sources, avec — dit son catalogue — un « scoring explicable ».
 *
 * CE QUE LA PROMOTION AJOUTE : L'EXPLICATION. La version de family-map rend
 * une distance et une similarité ; c'est à l'écran de deviner quoi en dire. La
 * version promue rend en plus un `reason` — `same-name`, `very-close`,
 * `similar-name-nearby` — parce qu'une suggestion de doublon qui ne dit pas
 * POURQUOI n'est pas actionnable. « Ces deux lieux sont peut-être les mêmes »
 * fait hausser les épaules ; « à 40 m, et le nom est presque identique » fait
 * cliquer. Les deux apps l'ont compris séparément, l'une l'a codé.
 *
 * LA DISTANCE EST INJECTÉE. `dedupe.ts` importait `distanceKm` de son module
 * `geo` : ce module-ci ne connaît pas la géographie. `distance` est une
 * fonction que l'appelant fournit — kilomètres entre deux points pour une
 * carte, écart de prix pour une annonce, différence de dates pour un
 * évènement. Le rapprochement n'est pas réservé aux cartes.
 *
 * UNE DES DEUX PROVENANCES NE POURRA JAMAIS L'IMPORTER — constaté le
 * 31/08/2026, et c'est une leçon plus large que ce module. Le cœur métier de
 * `miss-lookhouse` (`src/domain/`, dont son anti-doublons) est **recopié vers
 * des Supabase Edge Functions** par un script de build : ce code tourne donc
 * aussi sous Deno, qui ne peut pas résoudre un paquet publié sur un registre
 * privé. Toute la couche, pas seulement l'anti-doublons.
 *
 * Ce qu'il faut en retenir avant de promouvoir : un module tiré d'un code qui
 * franchit la frontière Deno est un module que son donneur ne récupérera pas.
 * Ça ne l'invalide pas — l'autre provenance, elle, l'importe — mais ça se sait
 * d'avance, et ça évite d'inscrire l'app dans un lot d'adoption qu'elle ne peut
 * pas tenir.
 *
 * SANS DÉPENDANCE, SANS DOM.
 */

/**
 * Réduit une chaîne à ce qui compte pour la comparer : minuscules, accents
 * retirés, ponctuation remplacée par des espaces.
 *
 * « Parc de la Tête d'Or » et « parc de la tete dor » deviennent la même
 * chose — ce qui est le but, puisque personne ne saisit deux fois un nom de la
 * même façon.
 */
export function normalizeName(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bigrams(text) {
  const grams = new Map();
  for (let i = 0; i < text.length - 1; i += 1) {
    const gram = text.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

/**
 * Similarité entre 0 (rien de commun) et 1 (identiques après normalisation).
 *
 * Coefficient de Sørensen–Dice sur bigrammes : robuste aux inversions de mots
 * et aux petites fautes de frappe, là où une distance d'édition punit un mot
 * déplacé autant qu'un mot faux.
 */
export function nameSimilarity(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);

  // Une chaîne d'un seul caractère n'a aucun bigramme : la comparer par
  // bigrammes rendrait 0 pour deux chaînes identiques.
  if (left.length < 2 || right.length < 2) {
    return left === right && left.length > 0 ? 1 : 0;
  }

  const gramsA = bigrams(left);
  const gramsB = bigrams(right);
  let shared = 0;
  for (const [gram, count] of gramsA) {
    shared += Math.min(count, gramsB.get(gram) ?? 0);
  }
  return (2 * shared) / (left.length - 1 + (right.length - 1));
}

/** Motifs de rapprochement, du plus fort au plus faible. */
export const REASONS = {
  /** Le nom est le même une fois normalisé. */
  sameName: 'same-name',
  /** Assez proche pour que le nom n'ait plus d'importance. */
  veryClose: 'very-close',
  /** Nom voisin ET dans le rayon. */
  similarNameNearby: 'similar-name-nearby',
};

/**
 * Les candidats qui ressemblent à `candidate`, du plus probable au moins.
 *
 * @param {{ name: string, at?: unknown }} candidate
 * @param {readonly object[]} existing
 * @param {{
 *   distance?: (a: unknown, b: unknown) => number,
 *   maxDistance?: number,
 *   closeEnough?: number,
 *   minSimilarity?: number,
 *   nameOf?: (item: object) => string,
 *   atOf?: (item: object) => unknown,
 * }} [options]
 * @returns {Array<{ item: object, similarity: number, distance: number|null,
 *   reason: string }>}
 */
export function findSimilar(candidate, existing, options = {}) {
  const {
    distance,
    maxDistance = Infinity,
    closeEnough = 0,
    minSimilarity = 0.55,
    nameOf = item => item?.name,
    atOf = item => item?.at,
  } = options;

  const matches = [];
  const candidateName = normalizeName(candidate?.name);

  for (const item of existing ?? []) {
    let gap = null;
    if (distance) {
      gap = distance(candidate?.at, atOf(item));
      // Hors du rayon : ni comparé, ni proposé. C'est ce qui évite de
      // suggérer un homonyme à quatre cents kilomètres.
      if (!Number.isFinite(gap) || gap > maxDistance) continue;
    }

    const similarity = nameSimilarity(candidate?.name, nameOf(item));

    // L'ordre des tests EST l'ordre des explications : le motif rendu est le
    // plus fort qui s'applique, pas le premier trouvé au hasard.
    let reason = null;
    if (similarity === 1 && candidateName.length > 0) {
      reason = REASONS.sameName;
    } else if (gap !== null && gap <= closeEnough) {
      // Le même toboggan est souvent saisi « Aire de jeux » puis « Square des
      // enfants » : à quelques dizaines de mètres, le nom ne prouve rien.
      reason = REASONS.veryClose;
    } else if (similarity >= minSimilarity) {
      reason = REASONS.similarNameNearby;
    }

    if (reason) matches.push({ item, similarity, distance: gap, reason });
  }

  return matches.sort(
    (a, b) =>
      b.similarity - a.similarity || (a.distance ?? 0) - (b.distance ?? 0)
  );
}
