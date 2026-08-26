/**
 * Fusion des relevés d'adoption — la partie du relevé qui se raisonne sans
 * disque et sans dépôts clonés à côté.
 *
 * POURQUOI CE MODULE EXISTE. `scripts/measure-adoption.mjs` lancé sans les
 * dépôts des apps écrivait `measured: 1` et EFFAÇAIT le relevé des seize
 * autres — 1187 lignes perdues en une commande, sans un mot. La règle qui
 * manquait tient en une phrase : un relevé partiel n'est pas un relevé plus
 * récent, c'est une vue partielle du même objet. Elle est ici, à part du
 * parcours de fichiers, pour être éprouvée par des tests.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */

/**
 * Rassemble le relevé précédent et celui qu'on vient de faire.
 *
 * Les apps mesurées maintenant écrasent leur propre entrée et sont horodatées ;
 * les autres sont conservées telles quelles, en héritant de l'horodatage global
 * du relevé précédent quand elles n'en portaient pas — c'est la seule date
 * qu'on connaisse d'elles.
 *
 * @param {{ generatedAt?: string|null, measured?: number, apps?: object }|null} previous
 * @param {Record<string, object>} measuredNow
 * @param {{ replace?: boolean, stampedAt: string }} options
 * @returns {{ apps: Record<string, object>, measured: number, measuredNow: number, kept: number }}
 */
export function mergeAdoption(previous, measuredNow, options) {
  const { replace = false, stampedAt } = options;

  const freshly = {};
  for (const [id, data] of Object.entries(measuredNow)) {
    freshly[id] = { ...data, measuredAt: stampedAt };
  }

  const kept = {};
  if (!replace && previous?.apps) {
    for (const [id, data] of Object.entries(previous.apps)) {
      if (freshly[id]) continue;
      kept[id] = data.measuredAt
        ? data
        : { ...data, measuredAt: previous.generatedAt ?? null };
    }
  }

  const apps = Object.fromEntries(
    Object.entries({ ...kept, ...freshly }).sort(([a], [b]) =>
      a.localeCompare(b)
    )
  );

  return {
    apps,
    measured: Object.keys(apps).length,
    measuredNow: Object.keys(freshly).length,
    kept: Object.keys(kept).length,
  };
}

/**
 * Faut-il refuser d'écrire ?
 *
 * Une campagne complète peut légitimement retirer une app du relevé ; réduire
 * la couverture PAR ACCIDENT, non. Seul `--replace` peut perdre quelque chose,
 * et seul `--force` l'autorise.
 *
 * @param {{ measured?: number }|null} previous
 * @param {number} measured
 * @param {{ replace?: boolean, force?: boolean }} options
 * @returns {{ refuse: boolean, warn: boolean, before: number, after: number }}
 */
export function coverageVerdict(previous, measured, options = {}) {
  const before = previous?.measured ?? 0;
  const shrinks = Boolean(options.replace) && measured < before;
  return {
    refuse: shrinks && !options.force,
    warn: shrinks && Boolean(options.force),
    before,
    after: measured,
  };
}

/** Index `symbole → apps`, et `doublon → apps`, tirés du relevé fusionné. */
export function indexAdoption(apps) {
  const bySymbol = {};
  const byDuplicate = {};
  for (const [id, data] of Object.entries(apps)) {
    for (const symbol of data.symbols ?? []) (bySymbol[symbol] ??= []).push(id);
    for (const dup of data.duplicates ?? [])
      (byDuplicate[dup.exported] ??= []).push(id);
  }
  for (const index of [bySymbol, byDuplicate]) {
    for (const list of Object.values(index)) list.sort();
  }
  return { bySymbol, byDuplicate };
}
