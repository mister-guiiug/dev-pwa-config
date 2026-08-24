#!/usr/bin/env node
/**
 * Régénère tout ce que ce dépôt tient en DOUBLE.
 *
 *   npm run sync
 *
 * Quatre dérivés du catalogue, chacun pour une raison technique — et une copie
 * n'est acceptable que si elle est ENGENDRÉE et VÉRIFIÉE :
 *
 *   showroom/components.css   le showroom montre littéralement ce que reçoit
 *                             une app consommatrice → copie octet pour octet ;
 *   showroom/apps.js          la page est statique et chargeable en `file://`,
 *                             donc incapable d'`import` un module ES → le
 *                             catalogue lui est projeté sur `globalThis` ;
 *   showroom/index.html       le bloc JSON-LD des seize apps, en dur dans le
 *                             `<head>` : un moteur doit le lire sans exécuter
 *                             le script ;
 *   showroom/themes.js        même raison que `apps.js` : les seize palettes
 *                             sont désormais un module publié (`themes.js`),
 *                             la page en lit un miroir sur `globalThis` ;
 *   README.md                 le tableau « Projets consommateurs » redisait à
 *                             la main ce que le catalogue sait déjà. Il avait
 *                             divergé sur la persistance de `miss-uwh` : deux
 *                             listes, l'une fausse, personne pour le voir.
 *
 * `test/apps-catalog.test.mjs` les compare tous au catalogue : oublier ce
 * script casse `npm test`, pas la page en production.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_APPS,
  GITHUB_OWNER,
  SPONSOR_URL,
  MATURITIES,
  CATEGORIES,
  BACKENDS,
  PLATFORMS,
  CONFIG_SUBPATHS,
  countByConfig,
} from '../apps-catalog.js';
import { FAMILY_THEMES } from '../themes.js';

const root = new URL('../', import.meta.url);
const at = path => fileURLToPath(new URL(path, root));

/** Projection sérialisable du catalogue, telle que la lit `showroom.js`. */
export function showroomAppsData() {
  return {
    owner: GITHUB_OWNER,
    sponsorUrl: SPONSOR_URL,
    maturities: MATURITIES,
    categories: CATEGORIES,
    backends: BACKENDS,
    platforms: PLATFORMS,
    configSubpaths: CONFIG_SUBPATHS,
    configUsage: countByConfig(),
    // `JSON.parse(JSON.stringify(…))` laisse tomber les champs `undefined`
    // exactement comme le fera le fichier généré : le miroir et la source
    // comparés par le test décrivent alors la même chose.
    apps: JSON.parse(JSON.stringify(FAMILY_APPS)),
  };
}

const HEADER = `/*
 * FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 * Source : \`apps-catalog.js\` à la racine du paquet.
 * Régénérer : \`npm run sync\`.
 *
 * Le showroom ne peut pas \`import\` le catalogue (page statique, \`file://\`) :
 * il en lit ce miroir, posé sur \`globalThis\` comme \`themes.js\` et
 * \`screenshots.js\`. \`test/apps-catalog.test.mjs\` vérifie qu'il ne dérive pas.
 */
globalThis.SHOWROOM_APPS = `;

const THEMES_HEADER = `/*
 * FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 * Source : \`themes.js\` à la racine du paquet (avec ses commentaires de relevé).
 * Régénérer : \`npm run sync\`.
 *
 * Le showroom ne peut pas \`import\` le module (page statique, \`file://\`) : il en
 * lit ce miroir. \`test/themes.test.mjs\` vérifie qu'il ne dérive pas.
 */
globalThis.SHOWROOM_THEMES = `;

/** Miroir sérialisable des palettes, tel que le lit `showroom.js`. */
export function showroomThemesFile() {
  const data = JSON.parse(JSON.stringify(FAMILY_THEMES));
  return `${THEMES_HEADER}${JSON.stringify(data, null, 2)};\n`;
}

/* ── Tableau « Projets consommateurs » du README ────────────────────────── */

export const README_START =
  '<!-- CONSOMMATEURS:DÉBUT — engendré par `npm run sync` depuis apps-catalog.js -->';
export const README_END = '<!-- CONSOMMATEURS:FIN -->';

// Libellés FR des persistances, pour le README seul : le showroom a les siens,
// traduits, et le catalogue ne porte que des identifiants.
const BACKEND_FR = {
  supabase: 'Supabase',
  firebase: 'Firebase',
  local: 'Local-first',
  api: 'API tierce',
};

/** Le tableau Markdown, engendré depuis le catalogue. */
export function consumersTable(apps = FAMILY_APPS) {
  const rows = apps.map(a => {
    const persistance = a.backend ? BACKEND_FR[a.backend] : '— (non relevé)';
    const plateforme = a.platform === 'desktop' ? ' · desktop' : '';
    const configs = a.configs.length
      ? `${a.configs.map(c => `\`${c}\``).join(', ')} — **${a.configs.length}**`
      : '**aucun** — ce dépôt ne consomme pas le paquet';
    return `| [\`${a.id}\`](${a.repoUrl}) | ${persistance}${plateforme} | ${configs} |`;
  });
  return [
    '| Projet | Persistance | Sous-chemins consommés |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Remplace le bloc entre marqueurs ; échoue plutôt que d'écrire à côté. */
export function withConsumersTable(markdown, table) {
  const start = markdown.indexOf(README_START);
  const end = markdown.indexOf(README_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Marqueurs ${README_START} / ${README_END} introuvables dans le README`
    );
  }
  return (
    markdown.slice(0, start + README_START.length) +
    '\n\n' +
    table +
    '\n\n' +
    markdown.slice(end)
  );
}

/* ── Données structurées de la vitrine ──────────────────────────────────── */

export const JSONLD_START =
  '<!-- APPS-JSONLD:DÉBUT — engendré par `npm run sync` -->';
export const JSONLD_END = '<!-- APPS-JSONLD:FIN -->';

/**
 * `ItemList` schema.org des seize dépôts, posée en dur dans le `<head>`.
 *
 * ENGENDRÉE plutôt qu'injectée en JS : le showroom est une page unique qui
 * n'exposait qu'un seul titre aux moteurs. Seize applications décrites, c'est
 * seize chances d'être trouvé — mais seulement si le balisage est là avant
 * l'exécution du script.
 */
export function appsJsonLd(apps = FAMILY_APPS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Applications miss-* / mister-*',
    numberOfItems: apps.length,
    itemListElement: apps.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: a.name,
        description: a.description,
        url: a.appUrl,
        applicationCategory:
          a.platform === 'desktop' ? 'DesktopApplication' : 'WebApplication',
        codeRepository: a.repoUrl,
        author: { '@type': 'Person', name: GITHUB_OWNER },
      },
    })),
  };
}

/** Remplace le bloc entre marqueurs ; échoue plutôt que d'écrire à côté. */
export function withJsonLd(html, json) {
  const start = html.indexOf(JSONLD_START);
  const end = html.indexOf(JSONLD_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Marqueurs ${JSONLD_START} / ${JSONLD_END} introuvables dans index.html`
    );
  }
  const script =
    '\n    <script type="application/ld+json">\n' +
    JSON.stringify(json, null, 2)
      .split('\n')
      .map(line => '      ' + line)
      .join('\n') +
    '\n    </script>\n    ';
  return html.slice(0, start + JSONLD_START.length) + script + html.slice(end);
}

async function format(source, filepath) {
  try {
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(filepath)) ?? {};
    return await prettier.format(source, { ...config, filepath });
  } catch {
    // Prettier absent (installation sans devDependencies) : le fichier reste
    // valide, `npm run format` le remettra d'aplomb.
    return source;
  }
}

async function main() {
  copyFileSync(at('components.css'), at('showroom/components.css'));

  const mirror = at('showroom/apps.js');
  const body = `${HEADER}${JSON.stringify(showroomAppsData(), null, 2)};\n`;
  writeFileSync(mirror, await format(body, mirror));

  const themes = at('showroom/themes.js');
  writeFileSync(themes, await format(showroomThemesFile(), themes));

  const readme = at('README.md');
  const updated = withConsumersTable(
    readFileSync(readme, 'utf8'),
    consumersTable()
  );
  writeFileSync(readme, await format(updated, readme));

  const index = at('showroom/index.html');
  writeFileSync(
    index,
    await format(withJsonLd(readFileSync(index, 'utf8'), appsJsonLd()), index)
  );

  console.log(
    `showroom/components.css, showroom/apps.js, showroom/themes.js, le JSON-LD ` +
      `et le tableau du README régénérés (${FAMILY_APPS.length} apps, ` +
      `${FAMILY_THEMES.length} thèmes, ${CONFIG_SUBPATHS.length} sous-chemins).`
  );
}

// Importable par les tests sans rien réécrire sur le disque.
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
