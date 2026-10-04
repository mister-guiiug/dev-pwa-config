/**
 * Sous-chemins sans adoptant mesuré — candidats au retrait (STRATEGIE §8).
 *
 * Règle CONTRIBUTING : un module entre s'il est utilisé par le squelette ou
 * par au moins deux apps. Ce registre date le jour où un export sans adoptant
 * est passé en « experimental » ; au-delà de `retireAfter`, une majeure peut
 * le retirer. Les chemins restent importables jusqu'au retrait.
 *
 * Mis à jour à la main quand `scripts/dead-exports` / le relevé README
 * montrent un zéro durable. Ne PAS y mettre un module encore importé par
 * ≥ 2 apps (ou le squelette) — voir docs/V7.md.
 *
 * Relevé parc 04/10/2026 : `speech` retiré du registre (dice, cim10, molkky).
 */
export const EXPERIMENTAL_MODULES = [
  {
    subpath: 'haptics',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: '1 adoptant (miss-contraction) ; hors squelette',
  },
  {
    subpath: 'vcard',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'zéro importateur',
  },
  {
    subpath: 'markdown',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: '1 adoptant (mister-miss-koh)',
  },
  {
    subpath: 'audio',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: '1 adoptant (mister-molkky)',
  },
  {
    subpath: 'similarity',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'family-map + bac-sable ; arbitrer si bac-sable compte',
  },
  {
    subpath: 'geocode-ban',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'zéro importateur',
  },
  {
    subpath: 'columns',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'zéro importateur',
  },
  {
    subpath: 'map/leaflet',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'maplibre porté ; leaflet orphelin',
  },
  {
    subpath: 'realtime/firebase',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'zéro importateur',
  },
  {
    subpath: 'vitest-browser-base',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'aucun consommateur',
  },
  {
    subpath: 'react/use-shake',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'hook sans adoptant',
  },
  {
    subpath: 'react/use-long-press',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: '1 adoptant (miss-badminton)',
  },
  {
    subpath: 'react/use-fullscreen',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'hook sans adoptant',
  },
  {
    subpath: 'react/use-undoable-state',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'promu, jamais migré',
  },
  {
    subpath: 'react/sponsor',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'zéro importateur ; AppFooter porte le soutien',
  },
  {
    subpath: 'react/net',
    since: '2026-10-04',
    retireAfter: '2027-01-04',
    note: 'zéro importateur',
  },
];

/** Sous-chemins expérimentaux, pour un test d'appartenance rapide. */
export const EXPERIMENTAL_SUBPATHS = new Set(
  EXPERIMENTAL_MODULES.map(m => m.subpath)
);

/**
 * Imports du paquet qui touchent un module expérimental.
 * @param {string} sourceTexte
 * @returns {string[]}
 */
export function experimentalImports(sourceTexte) {
  const found = new Set();
  const re = /@mister-guiiug\/dev-pwa-config\/([a-z0-9][a-z0-9_/-]*)/g;
  for (const m of String(sourceTexte).matchAll(re)) {
    const sub = m[1].replace(/\/$/, '');
    if (EXPERIMENTAL_SUBPATHS.has(sub)) found.add(sub);
  }
  return [...found].sort();
}
