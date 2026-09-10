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
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import { SUBPATHS } from './adopt-plan.mjs';
import { EQUIVALENTS } from './adoption-equivalents.mjs';
import { estPointDEntree } from './entree.mjs';

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

/* ── Tableau « Adoption réelle » du README ──────────────────────────────── */

export const ADOPTION_START =
  '<!-- ADOPTION:DÉBUT — engendré par `npm run sync` depuis showroom/adoption.js -->';
export const ADOPTION_END = '<!-- ADOPTION:FIN -->';

/**
 * La DETTE d'adoption, en tête de section : un chiffre unique qui doit baisser.
 *
 * POURQUOI CE CHIFFRE ET PAS LE TABLEAU. Le tableau dit, ligne par ligne, ce
 * qui est importé et ce qui est recopié — il faut le lire en entier pour
 * comprendre. Le relevé, lui, tient en une phrase : 130 fichiers recopiés dans
 * dix-sept apps, et AUCUN de ces doublons ne manque au socle. Un paquet qui
 * promeut plus vite qu'il n'est adopté fabrique une étagère, pas un socle ;
 * c'est le seul chiffre qui le prouve, et il doit être lisible sans effort.
 *
 * La partition compte autant que le total : ce qui a un sous-chemin relève de
 * la MIGRATION (un codemod, `npm run adopt`), ce qui n'en a pas relève de la
 * PROMOTION. Confondre les deux fait promouvoir ce qui existe déjà.
 */
export function adoptionDebt(adoption, subpaths = {}) {
  if (!adoption?.measured) return null;

  const rows = Object.entries(adoption.byDuplicate ?? {}).map(
    ([name, apps]) => ({
      name,
      apps: apps.length,
      publie: Boolean(subpaths[name]),
    })
  );
  const total = rows.reduce((sum, row) => sum + row.apps, 0);
  const migrables = rows.filter(r => r.publie);
  const aPromouvoir = rows.filter(r => !r.publie);

  return {
    total,
    kinds: rows.length,
    migrables: migrables.reduce((sum, row) => sum + row.apps, 0),
    aPromouvoir: aPromouvoir.reduce((sum, row) => sum + row.apps, 0),
    aPromouvoirNoms: aPromouvoir.map(r => r.name).sort(),
    pires: [...rows]
      .sort((a, b) => b.apps - a.apps || a.name.localeCompare(b.name))
      .slice(0, 3),
  };
}

/** La dette en Markdown, ou une chaîne vide s'il n'y a rien à dire. */
export function adoptionDebtMarkdown(debt, measured) {
  if (!debt || debt.total === 0) return '';
  const pires = debt.pires
    .map(row => `\`${row.name}\` (${row.apps})`)
    .join(', ');
  const lignes = [
    `> **Dette d'adoption : ${debt.total} fichiers recopiés** dans ${measured} apps, ` +
      `sur ${debt.kinds} besoins distincts. Les pires : ${pires}.`,
    '>',
  ];
  if (debt.aPromouvoir === 0) {
    lignes.push(
      '> **Aucun de ces doublons ne manque au socle** : tout est déjà publié. ' +
        "Ce n'est pas un problème de modules, c'en est un de migration — " +
        '`node scripts/adopt.mjs` en fait l’essai à blanc, app par app.'
    );
  } else {
    lignes.push(
      `> ${debt.migrables} relèvent de la MIGRATION (\`node scripts/adopt.mjs\`), ` +
        `${debt.aPromouvoir} de la PROMOTION — aucun sous-chemin ne les publie : ` +
        debt.aPromouvoirNoms.map(n => `\`${n}\``).join(', ') +
        '.'
    );
  }
  return lignes.join('\n');
}

/**
 * Les apps qui ont ADOPTÉ un besoin — par la même règle que l'acquittement.
 *
 * LE DÉFAUT N°1 DU 30/08, QUI SURVIVAIT ICI. Le tableau cherchait un symbole
 * portant le NOM DU BESOIN. Or dix des vingt-sept clés ne sont le nom d'aucun
 * export : `testing/pwa-register`, `backup`, `format`, `Toast`, `links`,
 * `useI18n`, `share`, `geo`, `webVitals`, `security`. Leur colonne « Importé
 * par » affichait donc **zéro par construction**, quel que soit le nombre
 * d'apps ayant migré.
 *
 * Le cas qui l'a révélé : `testing/pwa-register`, annoncé `0 / 17` alors que
 * CINQ apps importent `swStub` — c'est-à-dire cinq migrations réussies,
 * affichées comme n'existant pas, dans le document qui sert à convaincre.
 *
 * Le relevé avait été corrigé le 30/08 ; le document qu'il alimente, non. Une
 * règle d'acquittement ne vaut que si tout ce qui la lit l'applique.
 */
function adopters(adoption, name) {
  const liberateurs = EQUIVALENTS[name]?.symbols;
  if (!liberateurs?.length) return adoption.bySymbol?.[name] ?? [];
  // Une app compte une fois, même si elle importe deux symboles libérateurs.
  return [
    ...new Set(liberateurs.flatMap(nom => adoption.bySymbol?.[nom] ?? [])),
  ];
}

/**
 * Ce que les apps importent vraiment, et ce qu'elles recopient encore.
 *
 * Le README présentait chaque export comme la manière de faire, sans jamais
 * dire combien d'apps s'en servaient. Le relevé du 24/08/2026 a montré l'écart :
 * la couche outillage est adoptée par huit à quatorze apps, la couche interface
 * par zéro ou une — pendant que quatre à neuf apps en gardent une copie. Un
 * document qui tait ce chiffre laisse croire à une adoption qui n'existe pas.
 */
export function adoptionTable(adoption) {
  if (!adoption || !adoption.measured) {
    return '_Relevé non disponible : lancer `npm run adoption` avec les dépôts des apps à côté._';
  }
  const names = new Set([
    ...Object.keys(adoption.bySymbol ?? {}),
    ...Object.keys(adoption.byDuplicate ?? {}),
  ]);
  const rows = [...names]
    .map(name => ({
      name,
      used: adopters(adoption, name).length,
      copied: (adoption.byDuplicate?.[name] ?? []).length,
    }))
    .sort(
      (a, b) =>
        b.used - a.used || b.copied - a.copied || a.name.localeCompare(b.name)
    )
    .map(
      r =>
        `| \`${r.name}\` | ${r.used} / ${adoption.measured} | ${r.copied ? `${r.copied} / ${adoption.measured}` : '—'} |`
    );
  const debt = adoptionDebtMarkdown(
    adoptionDebt(adoption, SUBPATHS),
    adoption.measured
  );

  return [
    `_Relevé du ${adoption.generatedAt.slice(0, 10)} sur ${adoption.measured} dépôts, par \`npm run adoption\`._`,
    ...(debt ? ['', debt] : []),
    '',
    '| Export ou module | Importé par | Encore recopié dans |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Remplace le bloc entre marqueurs ; échoue plutôt que d'écrire à côté. */
export function withAdoptionTable(markdown, table) {
  const start = markdown.indexOf(ADOPTION_START);
  const end = markdown.indexOf(ADOPTION_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Marqueurs ${ADOPTION_START} / ${ADOPTION_END} introuvables dans le README`
    );
  }
  return (
    markdown.slice(0, start + ADOPTION_START.length) +
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

/* ── Le CSS des composants, en morceaux ─────────────────────────────────── */

/**
 * `components.css` est écrit d'un seul tenant, et c'est bien ainsi : une seule
 * source, un seul endroit où chercher. Mais Tailwind 4 émet TEL QUEL ce qui est
 * écrit à la main dans `@layer components` — mesuré le 10/09/2026 : 141 des 143
 * sélecteurs `[data-dwc]` se retrouvent dans la feuille construite d'une app
 * qui n'en utilise aucun. Une app qui monte huit composants sur vingt-trois
 * paie donc les quinze autres : 5,3 kB gzip (42,6 kB bruts) au lieu de 2,6.
 *
 * Les morceaux sont donc ENGENDRÉS depuis le fichier entier, jamais tenus à la
 * main : les bornes existent déjà dans la source, sous forme de titres de
 * section. Rien à maintenir en double, et `test/components-css.test.mjs`
 * recompose le tout pour vérifier qu'aucune règle ne s'est perdue en route.
 */

/**
 * Le nom de fichier de chaque section, décidé ici et non deviné.
 *
 * Un titre de section est une phrase (« AppFooter & FamilyApps ») ; un
 * sous-chemin public est un nom stable. Les lier à la main est ce qui permet
 * de renommer une section sans casser l'import d'une app — et une section
 * ajoutée sans nom de fichier fait échouer `npm test`, ce qui est le but.
 */
export const MORCEAUX_CSS = {
  'Bases partagées': 'base',
  Animations: 'base',
  'Contraste forcé': 'base',
  Impression: 'base',
  EmptyState: 'empty-state',
  ErrorBanner: 'error-banner',
  'ErrorBoundary (UI de repli)': 'error-boundary',
  SyncStatusBadge: 'sync-status-badge',
  'PwaInstallPrompt & UpdatePromptBanner': 'install-prompt',
  'AppFooter & FamilyApps': 'app-footer',
  Button: 'button',
  Field: 'field',
  Skeleton: 'skeleton',
  Sheet: 'sheet',
  Stat: 'stat',
  Card: 'card',
  'Sparkline, BarChart & Gauge': 'sparkline',
  Badge: 'badge',
  ConfirmDialog: 'confirm-dialog',
  Toast: 'toast',
  AppHeader: 'app-header',
  PageContainer: 'page-container',
  'LoginForm & MfaChallenge': 'login-form',
  BottomNav: 'bottom-nav',
  ThemeToggle: 'theme-toggle',
  SegmentedControl: 'segmented-control',
  ConnectionBanner: 'connection-banner',
};

const sansCommentaires = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Découpe `components.css` en morceaux, un par nom de fichier.
 *
 * @param {string} source Le fichier entier.
 * @returns {{ nom: string, sections: string[], css: string }[]}
 */
export function morceauxCss(source) {
  const lignes = source.split('\n');
  const ouverture = lignes.findIndex(l => l.startsWith('@layer components'));
  if (ouverture < 0)
    throw new Error('components.css : `@layer components` introuvable');

  // `[^─]+?` ET NON `.+?` : un titre ne contient jamais de tiret de
  // séparation, et le lui interdire retire au moteur toute possibilité de
  // revenir en arrière sur la frontière titre/tirets. Avec `.+?`, un
  // appariement raté coûte un temps quadratique en la longueur de la ligne —
  // sur un fichier lu depuis le disque, c'est ce que CodeQL relève comme
  // « expression polynomiale sur une entrée non contrôlée », et il a raison :
  // ce script tourne aussi sur des dépôts qu'il n'a pas écrits.
  const titres = [];
  for (const [i, ligne] of lignes.entries()) {
    const m = ligne.match(/^\s*\/\* ── ([^─]+?) ─+ \*?\/?\s*$/);
    if (m) titres.push([i, m[1].trim()]);
  }
  if (!titres.length) throw new Error('components.css : aucune section titrée');

  /** @type {Map<string, { sections: string[], corps: string[] }>} */
  const parNom = new Map();
  for (const [rang, [i, titre]] of titres.entries()) {
    const nom = MORCEAUX_CSS[titre];
    if (!nom)
      throw new Error(
        `components.css : section « ${titre} » sans nom de fichier (voir MORCEAUX_CSS)`
      );
    const finBrute =
      rang + 1 < titres.length ? titres[rang + 1][0] : lignes.length;
    let corps = lignes.slice(i, finBrute);
    // La dernière section porte le `}` qui referme `@layer` : il appartient à
    // l'enveloppe, pas à la section.
    const solde = () => {
      const t = sansCommentaires(corps.join('\n'));
      return (t.match(/\{/g) ?? []).length - (t.match(/\}/g) ?? []).length;
    };
    while (solde() < 0) {
      const dernier = corps.map(l => l.trim()).lastIndexOf('}');
      corps = [...corps.slice(0, dernier), ...corps.slice(dernier + 1)];
    }
    const entree = parNom.get(nom) ?? { sections: [], corps: [] };
    entree.sections.push(titre);
    entree.corps.push(corps.join('\n').replace(/\s+$/, ''));
    parNom.set(nom, entree);
  }

  return [...parNom].map(([nom, { sections, corps }]) => ({
    nom,
    sections,
    css:
      `/*\n * ENGENDRÉ par \`npm run sync\` depuis \`components.css\` — ne pas éditer.\n` +
      ` * Section${sections.length > 1 ? 's' : ''} : ${sections.join(', ')}.\n` +
      ` *\n` +
      ` * Importer \`components/base.css\` d'abord : il porte ce que toutes les\n` +
      ` * sections supposent (variables de repli, focus, animations, contraste\n` +
      ` * forcé, impression).\n */\n@layer components {\n${corps.join('\n\n')}\n}\n`,
  }));
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

  const entier = readFileSync(at('components.css'), 'utf8');
  mkdirSync(at('components'), { recursive: true });
  const morceaux = morceauxCss(entier);
  for (const { nom, css } of morceaux) {
    const chemin = at(`components/${nom}.css`);
    writeFileSync(chemin, await format(css, chemin));
  }

  const mirror = at('showroom/apps.js');
  const body = `${HEADER}${JSON.stringify(showroomAppsData(), null, 2)};\n`;
  writeFileSync(mirror, await format(body, mirror));

  const themes = at('showroom/themes.js');
  writeFileSync(themes, await format(showroomThemesFile(), themes));

  // Le relevé d'adoption est un fichier COMMITÉ (il exige les dépôts des apps,
  // que la CI n'a pas) : on le lit, on ne le refait pas.
  await import('../showroom/adoption.js');
  const adoption = globalThis.SHOWROOM_ADOPTION;

  const readme = at('README.md');
  const updated = withAdoptionTable(
    withConsumersTable(readFileSync(readme, 'utf8'), consumersTable()),
    adoptionTable(adoption)
  );
  writeFileSync(readme, await format(updated, readme));

  const index = at('showroom/index.html');
  writeFileSync(
    index,
    await format(withJsonLd(readFileSync(index, 'utf8'), appsJsonLd()), index)
  );

  console.log(
    `showroom/components.css, components/*.css (${morceaux.length}), ` +
      `showroom/apps.js, showroom/themes.js, le JSON-LD et le tableau du ` +
      `README régénérés (${FAMILY_APPS.length} apps, ` +
      `${FAMILY_THEMES.length} thèmes, ${CONFIG_SUBPATHS.length} sous-chemins).`
  );
}

// Importable par les tests sans rien réécrire sur le disque.
if (estPointDEntree(import.meta.url)) await main();
