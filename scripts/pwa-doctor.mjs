#!/usr/bin/env node
/**
 * pwa-doctor — LA CHECKLIST DU PARC, LUE SUR UN DÉPÔT.
 *
 *   npx pwa-doctor                 # depuis la racine de l'app, après le build
 *   npx pwa-doctor --strict        # en CI : une dette suffit à échouer
 *   npx pwa-doctor --dir ../x --json
 *
 * À QUOI ÇA SERT. Le 02/09/2026, une app n'était pas installable (manifeste
 * lié à la racine de l'origine), treize étendaient un préréglage Renovate dans
 * un dépôt inexistant, quatre servaient la page 404 de GitHub sur un lien
 * profond, deux n'avaient pas de CSP. Aucun lint ne le voyait : ce sont des
 * défauts de CONFORMITÉ AU PARC, pas de code — ils vivent entre le dépôt, le
 * build et l'hébergeur. On les a trouvés à la main, avec des `curl` et des
 * `ls` écrits pour la journée. Ce bin les cherche à chaque fois, en trois
 * lectures :
 *
 *   1. LE DÉPÔT — les fichiers que le gabarit attend (`.editorconfig`,
 *      `.nvmrc`, `.gitattributes` en LF, `renovate.json` sur le préréglage du
 *      socle, `.lighthouserc.json`, une spec a11y, un `bundleBudget`) ;
 *   2. LES WORKFLOWS — lighthouse, `cleanup-runs`, le keep-alive Supabase si
 *      l'app en dépend, les e2e en CI, et les références au socle en `@v3` ;
 *   3. LE BUILD (`dist/`, s'il existe) — la langue, le lien du manifeste (qui
 *      doit rester sous le site), les icônes PNG 192/512 et maskable, `id`,
 *      la langue du manifeste égale à celle de la page, l'icône iOS, le
 *      `theme-color` par schéma, la CSP, Open Graph, la canonique, et le
 *      `404.html` quand l'app route par chemin.
 *
 * TROIS VERDICTS, parce qu'ils ne se traitent pas pareil :
 *
 *   ✖ DÉFAUT   quelqu'un en souffre aujourd'hui (pas installable, 404, …) ;
 *   • DETTE    le socle a la réponse, l'app ne l'a pas prise ;
 *   i INFO     une mesure à connaître (locales figées, `console.*`), pas un
 *              jugement.
 *
 * Chaque ligne dit le GESTE qui la fait disparaître — pas un score. Le code
 * de sortie : 1 sur un défaut ; avec `--strict`, aussi sur une dette.
 *
 * CE QU'IL NE FAIT PAS. Il ne mesure pas le poids (c'est `pwa-bundle-budget`)
 * ni ce que l'hébergeur sert vraiment (c'est `scripts/probe-sites.mjs`, sur
 * le site publié) : il lit le dépôt et son build, hors ligne, en une seconde.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  escapesSite,
  htmlMarkers,
  manifestSummary,
  sitePrefix,
} from './site-readers.mjs';

export const PRESET =
  'github>mister-guiiug/dev-wpa-config//renovate/default.json';

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const SKIP = new Set(['node_modules', 'dist', 'dev-dist', '.git', 'coverage']);

const readText = (dir, rel) => {
  try {
    return readFileSync(join(dir, rel), 'utf8');
  } catch {
    return null;
  }
};
const readJson = (dir, rel) => {
  try {
    return JSON.parse(readText(dir, rel) ?? '');
  } catch {
    return null;
  }
};
const exists = (dir, rel) => existsSync(join(dir, rel));

/** Les fichiers source sous `roots`, lus. */
function walk(dir, roots, keep = SOURCE) {
  const out = [];
  const visit = abs => {
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const path = join(abs, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (keep.test(entry.name)) {
        out.push({
          rel: relative(dir, path).split(sep).join('/'),
          text: readFileSync(path, 'utf8'),
        });
      }
    }
  };
  for (const root of roots) visit(join(dir, root));
  return out;
}

const count = (text, re) => (text.match(re) ?? []).length;

/**
 * Le diagnostic d'un dépôt. Pur au sens utile : il lit le disque, n'écrit
 * rien, ne touche pas au réseau.
 *
 * @param {string} dir Racine de l'app.
 * @returns {{ dir: string, findings: Array<{ level: 'défaut'|'dette'|'info',
 *   id: string, message: string, fix?: string }>, build: boolean }}
 */
export function diagnose(dir) {
  const root = resolve(dir);
  const findings = [];
  const seen = new Set();
  const add = (level, id, message, fix) => {
    if (seen.has(id)) return;
    seen.add(id);
    findings.push({ level, id, message, fix });
  };
  const defaut = (id, message, fix) => add('défaut', id, message, fix);
  const dette = (id, message, fix) => add('dette', id, message, fix);
  const info = (id, message, fix) => add('info', id, message, fix);

  const pkg = readJson(root, 'package.json') ?? {};
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const source = walk(root, ['src']);
  const srcText = source.map(f => f.text).join('\n');
  const viteConfig =
    ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs']
      .map(name => readText(root, name))
      .find(Boolean) ?? '';
  const indexHtml = readText(root, 'index.html') ?? '';
  const workflows = walk(root, ['.github/workflows'], /\.ya?ml$/);
  const wfText = workflows.map(w => w.text).join('\n');

  /* ── 1. Le dépôt ──────────────────────────────────────────────────────── */

  if (!exists(root, '.editorconfig')) {
    dette('editorconfig', 'pas de .editorconfig', 'copier celui du gabarit');
  }
  if (!exists(root, '.nvmrc')) {
    dette('nvmrc', 'pas de .nvmrc', 'écrire « 22 »');
  }
  const attributes = readText(root, '.gitattributes') ?? '';
  if (!/eol=lf/.test(attributes)) {
    dette(
      'gitattributes',
      'pas de .gitattributes en LF',
      '`* text=auto eol=lf` — sans lui, core.autocrlf fait refuser tout le dépôt par format:check'
    );
  }
  const ignore = readText(root, '.gitignore') ?? '';
  if (!ignore.includes('.claude/worktrees')) {
    dette(
      'gitignore-worktrees',
      '.gitignore ne masque pas .claude/worktrees/',
      'ajouter la ligne — ESLint et Prettier y lisent des copies de travail'
    );
  }
  const renovate = readJson(root, 'renovate.json');
  if (!renovate) {
    dette(
      'renovate',
      'pas de renovate.json : Renovate ignore ce dépôt',
      `{ "extends": ["${PRESET}"] }`
    );
  } else {
    const extend = Array.isArray(renovate.extends) ? renovate.extends : [];
    if (extend.some(e => /mister-guiiug\/\.github\/\//.test(e))) {
      defaut(
        'renovate-preset',
        'renovate.json étend un préréglage dans un dépôt inexistant (mister-guiiug/.github) : Renovate ne fait rien',
        `remplacer par ${PRESET}`
      );
    } else if (!extend.includes(PRESET)) {
      info(
        'renovate-local',
        'renovate.json autonome : il ne suit pas le préréglage famille',
        `étendre ${PRESET}`
      );
    }
  }
  if (!exists(root, '.lighthouserc.json')) {
    dette(
      'lighthouserc',
      'pas de .lighthouserc.json',
      'copier celui du gabarit (a11y ≥ 0,9 en erreur)'
    );
  }
  const playwright = Boolean(deps['@playwright/test']);
  if (playwright) {
    const specs = walk(
      root,
      ['e2e', 'tests', 'test', 'playwright'],
      /\.(spec|test)\.[jt]sx?$/
    );
    if (!specs.some(f => /a11y|accessib/i.test(basename(f.rel)))) {
      dette(
        'a11y-spec',
        'Playwright est là, la spec a11y (axe-core) non',
        'copier e2e/a11y.spec.ts du gabarit (playwright-a11y du socle)'
      );
    }
  }
  if (!pkg.bundleBudget) {
    dette(
      'bundle-budget',
      'pas de bundleBudget dans package.json',
      'mesurer avec pwa-bundle-budget, poser le budget à +10 %, l’ajouter au build'
    );
  }
  if (!pkg.engines?.node) {
    info('engines', 'pas de engines.node', '"engines": { "node": ">=22" }');
  }

  /* ── 2. Les workflows ─────────────────────────────────────────────────── */

  if (!workflows.length) {
    dette(
      'workflows',
      'aucun workflow GitHub',
      'pwa-ci.yml et pwa-deploy.yml du socle'
    );
  } else {
    if (!/lighthouse/i.test(wfText)) {
      dette(
        'wf-lighthouse',
        'pas de workflow Lighthouse',
        'lighthouse.yml → pwa-lighthouse.yml@v3'
      );
    }
    if (!/cleanup-runs/.test(wfText)) {
      dette(
        'wf-cleanup',
        'pas de nettoyage des runs',
        'cleanup-runs.yml → cleanup-runs.yml@v3'
      );
    }
    if (
      deps['@supabase/supabase-js'] &&
      !/pwa-supabase-keepalive/.test(wfText)
    ) {
      dette(
        'wf-keepalive',
        'Supabase sans keep-alive : le projet Free se met en pause après 7 jours',
        'keepalive.yml → pwa-supabase-keepalive.yml@v3 (miss-carbook en a payé le prix)'
      );
    }
    if (playwright && !/run-e2e:\s*true|playwright/i.test(wfText)) {
      dette(
        'wf-e2e',
        'les e2e ne tournent pas en CI',
        'run-e2e: true dans ci.yml'
      );
    }
    const vieux = wfText.match(
      /mister-guiiug\/dev-wpa-config\/\S+@(?!v3\b)\S+/g
    );
    if (vieux) {
      dette(
        'wf-v3',
        `référence au socle hors @v3 : ${[...new Set(vieux)].join(', ')}`,
        'passer en @v3 (étiquette flottante déplacée à chaque release)'
      );
    }
  }

  /* ── 3. La source ─────────────────────────────────────────────────────── */

  if (/registerType:\s*['"]autoUpdate['"]/.test(viteConfig)) {
    dette(
      'auto-update',
      "registerType: 'autoUpdate' recharge la page en pleine saisie",
      "'prompt' + UpdatePromptBanner (react/update-prompt-banner)"
    );
  }
  if (viteConfig && !/pwaSeoPlugin/.test(viteConfig)) {
    dette(
      'seo-plugin',
      'pas de pwaSeoPlugin',
      'sitemap, robots, canonique, Open Graph en un import (vite-pwa-base)'
    );
  }
  if (viteConfig && !/themeColor/.test(viteConfig)) {
    dette(
      'theme-color',
      'theme-color sans schéma : la barre du navigateur reste claire en mode sombre',
      'pwaSeoPlugin({ themeColor: { light, dark } })'
    );
  }
  if (
    viteConfig &&
    !/cspPlugin/.test(viteConfig) &&
    !/Content-Security-Policy/.test(indexHtml)
  ) {
    dette('csp', 'pas de Content-Security-Policy', 'cspPlugin() de vite-csp');
  }
  const figees = count(srcText, /['"]fr-FR['"]/g);
  if (figees) {
    info(
      'locale-figee',
      `${figees} locale(s) 'fr-FR' en dur`,
      'getDefaultLocale() / format* du socle'
    );
  }
  const consoles = count(srcText, /console\.(?:error|warn)\(/g);
  if (consoles) {
    info(
      'console',
      `${consoles} console.error/warn`,
      'createLogger (logger) — voir scripts/console-audit.mjs'
    );
  }

  /* ── 4. Le build ──────────────────────────────────────────────────────── */

  const html = readText(root, 'dist/index.html');
  const build = Boolean(html);
  if (!build) {
    info(
      'no-build',
      'pas de dist/ : les lectures du build sont sautées',
      'lancer le build, puis pwa-doctor'
    );
  } else {
    const m = htmlMarkers(html);
    if (!m.lang) defaut('html-lang', '<html> sans lang', 'lang="fr"');
    if (!m.viewport)
      defaut(
        'viewport',
        'pas de <meta name="viewport">',
        'width=device-width, initial-scale=1'
      );
    if (!m.description)
      dette(
        'description',
        'pas de <meta name="description">',
        'pwaSeoPlugin la pose'
      );
    if (!m.appleTouchIcon) {
      defaut(
        'ios-icon',
        'pas de rel="apple-touch-icon" : iOS prend une capture d’écran comme icône',
        '<link rel="apple-touch-icon" href="…/apple-touch-icon.png"> (pwa-icons la génère)'
      );
    }
    if (!m.themeColorMedia) {
      dette(
        'theme-color',
        'theme-color sans schéma',
        'pwaSeoPlugin({ themeColor: { light, dark } })'
      );
    }
    if (!m.csp)
      dette('csp', 'pas de Content-Security-Policy', 'cspPlugin() de vite-csp');
    if (!m.ogImage) dette('og-image', 'pas de og:image', 'pwaSeoPlugin');
    if (!m.canonical)
      dette('canonical', 'pas de rel="canonical"', 'pwaSeoPlugin');

    const prefix = sitePrefix(m);
    if (!m.manifest) {
      defaut(
        'manifest-link',
        'pas de <link rel="manifest">',
        'VitePWA le pose (manifest: {...})'
      );
    } else {
      if (escapesSite(m.manifest, prefix)) {
        defaut(
          'manifest-href',
          `le manifeste est lié hors du site : ${m.manifest} (le site vit sous ${prefix}) — l’app ne s’installe pas`,
          `href="${prefix}${basename(m.manifest)}" ou %BASE_URL%${basename(m.manifest)}`
        );
      }
      const name = basename(m.manifest.split('?')[0]);
      const manifestText =
        readText(root, join('dist', name)) ??
        readText(root, 'dist/manifest.webmanifest') ??
        readText(root, 'dist/manifest.json');
      const ms = manifestSummary(manifestText ?? '');
      if (!ms) {
        defaut(
          'manifest-illisible',
          `manifeste ${name} absent du build ou illisible`,
          'VitePWA manifest: {...}'
        );
      } else {
        if (!ms.has512 && !ms.hasAny) {
          defaut(
            'manifest-icons',
            'aucune icône de 512 px ni vectorielle : Chrome refuse l’installation',
            'pwa-icons --source public/favicon.svg --out public --maskable'
          );
        } else if (!ms.hasPng) {
          dette(
            'manifest-png',
            'aucune icône PNG : iOS et les lanceurs Android n’utilisent pas le SVG',
            'pwa-icons --source public/favicon.svg --out public --maskable'
          );
        }
        if (!ms.maskable)
          dette(
            'manifest-maskable',
            'pas d’icône maskable',
            'purpose: "maskable" (pwa-icons --maskable)'
          );
        if (!ms.hasId) {
          dette(
            'manifest-id',
            'manifeste sans id : changer start_url créerait une seconde app installée',
            'id: basePath (pwaManifest le pose)'
          );
        }
        if (
          ms.lang &&
          m.lang &&
          ms.lang.slice(0, 2).toLowerCase() !== m.lang.slice(0, 2).toLowerCase()
        ) {
          defaut(
            'manifest-lang',
            `manifeste en lang "${ms.lang}", page en "${m.lang}"`,
            'lang: "fr" dans le manifeste'
          );
        }
        if (!ms.screenshots)
          dette(
            'manifest-screenshots',
            'pas de captures : pas d’interface d’installation riche',
            'screenshots: [narrow, wide]'
          );
      }
    }
    if (
      /BrowserRouter|createBrowserRouter/.test(srcText) &&
      !exists(root, 'dist/404.html')
    ) {
      defaut(
        'spa-404',
        'routage par chemin sans 404.html : un lien profond sert la page 404 de GitHub',
        'spaFallbackPlugin() (vite-pwa-base) ou pwa-deploy.yml@v3'
      );
    }
  }

  return { dir: root, findings, build };
}

const MARK = { défaut: '✖', dette: '•', info: 'i' };

/** Le rapport, lisible. */
export function format(report) {
  const lines = [];
  for (const level of ['défaut', 'dette', 'info']) {
    for (const f of report.findings.filter(x => x.level === level)) {
      lines.push(`${MARK[level]} ${level.padEnd(6)} ${f.message}`);
      if (f.fix) lines.push(`         → ${f.fix}`);
    }
  }
  const n = level => report.findings.filter(f => f.level === level).length;
  lines.push(
    `\n${n('défaut')} défaut(s), ${n('dette')} dette(s), ${n('info')} info(s)${report.build ? '' : ' — build non lu'}`
  );
  return lines.join('\n');
}

export async function run(args = []) {
  const at = flag =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const dir = at('--dir') ?? process.cwd();
  const strict = args.includes('--strict');
  try {
    statSync(dir);
  } catch {
    console.error(`pwa-doctor : dossier introuvable : ${dir}`);
    return 2;
  }
  const report = diagnose(dir);
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else console.log(format(report));
  const defauts = report.findings.some(f => f.level === 'défaut');
  const dettes = report.findings.some(f => f.level === 'dette');
  return defauts || (strict && dettes) ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await run(process.argv.slice(2));
}
