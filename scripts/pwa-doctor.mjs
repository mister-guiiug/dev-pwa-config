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
 *      socle, `.lighthouserc.json`, une spec a11y, un `bundleBudget`), et les
 *      TROIS LIENS DE LA FAMILLE — code source, soutien, signalement — sur
 *      l'accueil ET sur À propos / Réglages, et nulle part ailleurs ;
 *   2. LES WORKFLOWS — lighthouse, `cleanup-runs`, le keep-alive Supabase si
 *      l'app en dépend, les e2e en CI (et qu'aucune spec ne reste hors du
 *      filtre `e2e-grep`, donc jamais jouée), un déploiement Pages passé par
 *      le réutilisable, et les références au socle en `@v4` ;
 *   3. LE BUILD (`dist/`, s'il existe) — la langue, le lien du manifeste (qui
 *      doit rester sous le site), les icônes PNG 192/512 et maskable, `id`,
 *      la langue du manifeste égale à celle de la page, l'icône iOS, le
 *      `theme-color` par schéma, la CSP, Open Graph, la canonique,
 *      `version.json`, et le `404.html` quand l'app route par chemin sans
 *      passer par `pwa-deploy.yml`, qui le pose au déploiement.
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
  siteScope,
  sitePrefix,
} from './site-readers.mjs';
import { appById } from '../apps-catalog.js';

export const PRESET =
  'github>mister-guiiug/dev-pwa-config//renovate/default.json';

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
 * Le texte SANS ses commentaires — parce qu'un diagnostic qui lit du texte
 * plat punit celui qui documente.
 *
 * Le squelette `pwa-starter-kit` a fait sortir les deux cas le 05/09/2026, et
 * ils sont du même genre : son `ci.yml` porte le commentaire « Pas de
 * `secrets: inherit` : le réutilisable déclare ce qu'il consomme », et son
 * module i18n explique que le parc portait quatre-vingt-huit `'fr-FR'` codés
 * en dur. Les deux étaient comptés comme le défaut qu'ils mettent en garde de
 * commettre. Un contrôle qu'on ne peut pas expliquer sans le déclencher pousse
 * à ne rien expliquer.
 *
 * Le motif de bloc est TEMPÉRÉ. La forme paresseuse enjambe les fins de
 * commentaire et avalerait le fichier entier depuis son premier bloc de
 * documentation ; la forme tempérée refuse d'avancer au-delà de la première.
 */
const sansCommentaires = {
  yaml: text => text.replace(/^[ \t]*#.*$/gm, ''),
  source: text =>
    text
      .replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, ''),
};

/* ── Les trois liens de la famille ─────────────────────────────────────────
 *
 * RÈGLE (06/09/2026) : le CODE SOURCE, le SOUTIEN et le SIGNALEMENT sont
 * visibles sur DEUX écrans, et deux seulement — l'accueil, ET À propos /
 * Réglages. Une app gratuite et locale se finance par les deux premiers : qui
 * l'ouvre doit pouvoir vérifier ce qu'elle fait, et remercier — sans aller les
 * chercher dans un tiroir. Et nulle part ailleurs : trois liens sortants sous
 * un plateau de jeu ou un formulaire, ce n'est pas un pied de page, c'est du
 * bruit.
 *
 * LA COQUILLE N'EST PLUS UNE FAÇON DE LA TENIR. `<AppFooter>` rendu hors des
 * routes est sur TOUS les écrans : c'était la réponse du socle la veille (un
 * seul endroit, tous les écrans, y compris ceux à venir), c'est aujourd'hui un
 * écran de trop. Le pied de page se rend DANS l'écran d'accueil et DANS À
 * propos / Réglages — deux fichiers, le même composant.
 *
 * CE QUE LE CONTRÔLE VOIT, ET CE QU'IL NE VOIT PAS. Il lit du texte, pas un
 * graphe de rendu : il résout UNE indirection — `<Footer/>` défini ailleurs,
 * rendu par la coquille (la forme de `miss-carbook` et `miss-lookhouse`) ou par
 * deux écrans — et reconnaît l'accueil et les réglages AU NOM DE FICHIER. Deux
 * indirections, ou un écran nommé autrement, lui échappent : d'où une DETTE et
 * non un défaut, qui nomme ce qu'il a vu.
 *
 * LE DÉPOUILLEMENT DES ROUTES EST LE CŒUR. Sans lui, `<SettingsScreen/>` monté
 * par `element={…}` dans le fichier des routes se lit comme un rendu « partout »
 * — et douze apps sur dix-neuf passaient à tort. Mesuré le 05/09/2026, sous la
 * règle d'alors : quatre apps la tenaient par la coquille, trois par deux
 * écrans, douze ne la tenaient pas. Le relevé sous celle-ci est dans le README.
 */
const LIENS = {
  /* Un élément JSX, pas un import : le socle, ou la paire écrite à la main. */
  socle: /<(?:AppFooter|FamilyApps)\b/,
  soutien: /buymeacoffee\.com|SPONSOR_URL|useSponsorUrl|sponsorUrl/,
  depot: /github\.com\/[\w-]+\/[\w-]+|REPO_URL|repoUrl\(/,
  coquille: /<Outlet\b|<Routes\b|createBrowserRouter|createHashRouter/,
  exporte:
    /export\s+(?:default\s+)?function\s+([A-Z]\w*)|export\s+const\s+([A-Z]\w*)/g,
  accueil:
    /(?:^|\/)(?:home|accueil|index|dashboard|start)[\w-]*\.[cm]?[jt]sx?$/i,
  reglages:
    /setting|reglage|réglage|parametre|paramètre|about|propos|profil|account|compte|help|aide/i,
};

/** `a/b/../c` → `a/c`. Les chemins du relevé sont relatifs et en avant. */
const normalise = chemin => {
  const out = [];
  for (const part of chemin.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
};

/** Le texte d'une coquille, ses écrans montés retirés. */
const horsRoutes = text =>
  text
    .replace(/element=\{[^{}]*\}/g, '')
    .replace(/element:\s*[^,}]+/g, '')
    .replace(/<Route\b[^>]*>/g, '');

/**
 * @param {Array<{rel: string, text: string}>} source
 * @returns {{ verdict: 'partout'|'trop'|'deux'|'partiel'|'absent',
 *   ou?: string, ecrans?: string[] }}
 */
export function liensFamille(source) {
  const fichiers = source.filter(f => !/\.test\.|\.spec\./.test(f.rel));
  const porteurs = fichiers.filter(
    f =>
      LIENS.socle.test(f.text) ||
      (LIENS.soutien.test(f.text) && LIENS.depot.test(f.text))
  );
  if (!porteurs.length) return { verdict: 'absent' };

  const coquilles = fichiers.filter(f => LIENS.coquille.test(f.text));

  // TROIS APPS DU PARC N'ONT PAS DE ROUTEUR — `miss-dice`, `miss-ticket-pwa` et
  // `mister-puzzle` basculent d'écran sur un état. Leur coquille ne contient ni
  // `<Routes>` ni `<Outlet>` : cherchée à ces marqueurs seuls, elle n'existe
  // pas, et le contrôle leur reprochait éternellement une place qu'elles
  // tiennent. On prend donc aussi ce que l'ENTRÉE monte : `main.tsx` rend
  // `<App />`, et ce composant-là est la coquille, routeur ou pas.
  // ON SUIT L'IMPORT, PAS L'EXPORT : `export default App` ne porte pas de nom
  // exportable, et c'est la forme de deux des trois apps concernées. Le nom
  // vivant est celui que l'entrée s'est donné en important.
  //
  // ON PART DU `from '…'`, PAS DU MOT `import`. Un motif qui commence à
  // `import` doit traverser une clause de longueur libre avant de savoir s'il
  // a gagné, et rétro-suit sur `import {import {…` — CodeQL l'a signalé en
  // ReDoS polynomial (`js/polynomial-redos`) dès la première relecture. Ancré
  // sur le chemin, chaque position n'est examinée qu'une fois ; la clause se
  // lit ensuite dans une fenêtre BORNÉE avant le point d'ancrage.
  const entree = fichiers.find(f => /(?:^|\/)main\.[cm]?[jt]sx?$/.test(f.rel));
  if (entree) {
    const base = entree.rel.replace(/\/[^/]+$/, '');
    for (const trouve of entree.text.matchAll(
      /from\s*['"](\.[^'"\n]{0,200})['"]/g
    )) {
      const chemin = trouve[1];
      const clause = entree.text.slice(
        Math.max(0, trouve.index - 200),
        trouve.index
      );
      if (!clause.includes('import')) continue;
      const noms = clause.match(/[A-Z]\w*/g) ?? [];
      if (!noms.some(nom => new RegExp(`<${nom}\\b`).test(entree.text)))
        continue;
      const cible = normalise(`${base}/${chemin}`).replace(
        /\.[cm]?[jt]sx?$/,
        ''
      );
      for (const f of fichiers) {
        const sansExt = f.rel.replace(/\.[cm]?[jt]sx?$/, '');
        if (
          (sansExt === cible || sansExt === `${cible}/index`) &&
          !coquilles.includes(f)
        ) {
          coquilles.push(f);
        }
      }
    }
  }

  // LA COQUILLE PORTE LES LIENS ? Ils sont sur TOUS les écrans — la forme que
  // le contrôle acceptait jusqu'au 06/09/2026, devenue un écran de trop. On ne
  // conclut que sur ce qu'elle rend HORS de ses routes : un pied de page écrit
  // dans un `element={…}` appartient à cet écran-là, pas à la coquille.
  //
  // SANS ROUTEUR, LA CONDITION EST L'ÉCRAN. Une coquille qui bascule sur un
  // état écrit `{screen === 'x' && <X />}`, un ternaire, un `switch` : ce
  // qu'elle rend sous condition n'est pas « partout », c'est un écran.
  // `mister-puzzle` rend `<Home />` dans un ternaire, `miss-ticket-pwa`
  // `<Settings />` derrière un `&&` — le contrôle leur reprochait tous les
  // écrans quand ils n'en ont qu'un. Avec routeur, rien à lire : hors des
  // routes, tout est toujours rendu.
  const estCoquille = f => coquilles.includes(f) || LIENS.coquille.test(f.text);
  const routeur = f => LIENS.coquille.test(f.text);
  const sansCondition = (text, motif) => {
    for (const m of text.matchAll(motif)) {
      const avant = text
        .slice(Math.max(0, m.index - 120), m.index)
        .replace(/\s+/g, '');
      if (!/(&&|\?|:|\)return|:return)\(?$/.test(avant)) return true;
    }
    return false;
  };
  const porte = f => {
    const text = horsRoutes(f.text);
    if (LIENS.socle.test(text))
      return routeur(f) || sansCondition(text, /<(?:AppFooter|FamilyApps)\b/g);
    return LIENS.soutien.test(text) && LIENS.depot.test(text);
  };
  if (porteurs.some(f => estCoquille(f) && porte(f)))
    return { verdict: 'partout' };

  const nomsDe = p =>
    [...p.text.matchAll(LIENS.exporte)].map(m => m[1] ?? m[2]).filter(Boolean);
  const rend = (text, noms) =>
    noms.some(nom => new RegExp(`<${nom}\\b`).test(text));
  const rendSansCondition = (c, noms) =>
    noms.length > 0 &&
    (routeur(c)
      ? rend(horsRoutes(c.text), noms)
      : sansCondition(c.text, new RegExp(`<(?:${noms.join('|')})\\b`, 'g')));
  for (const p of porteurs) {
    if (coquilles.some(c => rendSansCondition(c, nomsDe(p))))
      return { verdict: 'partout' };
  }

  // LES ÉCRANS QUI PORTENT LES LIENS. Un porteur qui n'est pas un écran nommé
  // — un `Footer.tsx` défini à part — compte pour les écrans qui le rendent :
  // la même indirection que pour la coquille, résolue côté écrans. Une
  // coquille qui porte les liens DANS ses routes, ou un porteur que personne
  // ne rend, compte pour lui-même : le contrôle ne sait pas quel écran, et le
  // dit plutôt que de deviner.
  const estEcran = rel => LIENS.accueil.test(rel) || LIENS.reglages.test(rel);
  const ecrans = [];
  const retient = rel => {
    if (!ecrans.includes(rel)) ecrans.push(rel);
  };
  for (const p of porteurs) {
    if (estEcran(p.rel) || estCoquille(p)) {
      retient(p.rel);
      continue;
    }
    const noms = nomsDe(p);
    const rendus = fichiers.filter(
      f => f !== p && !estCoquille(f) && rend(f.text, noms)
    );
    if (rendus.length) rendus.forEach(f => retient(f.rel));
    else retient(p.rel);
  }

  // DEUX ÉCRANS, ET CES DEUX-LÀ. Un troisième — ou un écran étranger à la
  // règle — est un écran de trop, et le verdict le nomme.
  const accueils = ecrans.filter(rel => LIENS.accueil.test(rel));
  const reglages = ecrans.filter(
    rel => !LIENS.accueil.test(rel) && LIENS.reglages.test(rel)
  );
  const autres = ecrans.filter(
    rel => !accueils.includes(rel) && !reglages.includes(rel)
  );
  if (autres.length || ecrans.length > 2) return { verdict: 'trop', ecrans };
  if (accueils.length && reglages.length) return { verdict: 'deux' };
  return {
    verdict: 'partiel',
    ou: accueils.length ? "l'accueil" : 'À propos / Réglages',
  };
}

/* ── Le filtre e2e de la CI ────────────────────────────────────────────────
 *
 * `pwa-ci.yml` ne joue que les tests dont le titre correspond à `e2e-grep`.
 * Une spec dont aucun titre ne correspond n'est JAMAIS exécutée — et
 * Playwright rend « No tests found » avec un code 0. Le squelette et le
 * gabarit ont porté une spec `@a11y` dans ce cas pendant que le filtre valait
 * `@critical` (relevé du 05/09/2026).
 */
const FILTRE_E2E_DEFAUT = '@critical|@a11y';

/** Le filtre que la CI applique : celui de `ci.yml`, sinon celui du réutilisable. */
export function filtreE2e(wfText) {
  const m = /e2e-grep:\s*(['"]?)(.+?)\1\s*$/m.exec(
    sansCommentaires.yaml(wfText)
  );
  const source = m ? m[2].trim() : FILTRE_E2E_DEFAUT;
  try {
    return new RegExp(source);
  } catch {
    return new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }
}

/**
 * Vrai si au moins un titre de la spec — `describe` ou `test` — correspond au
 * filtre. Playwright compare le titre COMPLET (`describe › test`) : un tag
 * posé sur le `describe` couvre tous ses tests.
 */
export function specJouee(text, filtre) {
  const titres = [
    ...text.matchAll(
      /\b(?:test|it|describe)(?:\.(?:describe|only|skip|fixme|serial|parallel))*\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g
    ),
  ].map(m => m[2]);
  return titres.some(t => filtre.test(t));
}

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
  const specs = walk(
    root,
    ['e2e', 'tests', 'test', 'playwright'],
    /\.(spec|test)\.[jt]sx?$/
  );

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
  // Le port de développement est au catalogue, unique dans la famille. Une
  // app qui en déclare un autre — ou le 5173 de tout le monde — se disputera
  // le port avec sa voisine le jour où les deux tournent sur le même poste.
  const fiche = appById(pkg.name);
  if (fiche?.devPort) {
    const declares = [];
    const launch = readText(root, '.claude/launch.json');
    const dansLaunch =
      launch &&
      (/"port"\s*:\s*(\d+)/.exec(launch) ?? /--port",\s*"(\d+)"/.exec(launch));
    if (dansLaunch)
      declares.push(['.claude/launch.json', Number(dansLaunch[1])]);
    const dansVite = /server\s*:\s*\{[^}]*?\bport\s*:\s*(\d+)/s.exec(
      viteConfig
    );
    if (dansVite) declares.push(['vite.config', Number(dansVite[1])]);
    const ecarts = declares.filter(([, port]) => port !== fiche.devPort);
    if (ecarts.length) {
      info(
        'dev-port',
        `port de développement ${ecarts.map(([ou, port]) => `${port} (${ou})`).join(', ')} ; le catalogue lui donne ${fiche.devPort}`,
        `server: { port: devPortOf('${pkg.name}') } dans vite.config.ts (apps-catalog) — deux apps côte à côte sans collision`
      );
    }
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
        'lighthouse.yml → pwa-lighthouse.yml@v4'
      );
    }
    if (!/cleanup-runs/.test(wfText)) {
      dette(
        'wf-cleanup',
        'pas de nettoyage des runs',
        'cleanup-runs.yml → cleanup-runs.yml@v4'
      );
    }
    if (
      deps['@supabase/supabase-js'] &&
      !/pwa-supabase-keepalive/.test(wfText)
    ) {
      dette(
        'wf-keepalive',
        'Supabase sans keep-alive : le projet Free se met en pause après 7 jours',
        'keepalive.yml → pwa-supabase-keepalive.yml@v4 (miss-carbook en a payé le prix)'
      );
    }
    if (playwright && !/run-e2e:\s*true|playwright/i.test(wfText)) {
      dette(
        'wf-e2e',
        'les e2e ne tournent pas en CI',
        'run-e2e: true dans ci.yml'
      );
    }

    // Les e2e tournent, mais pas tous : une spec dont aucun titre ne
    // correspond au filtre est un test qui n'existe pas pour la CI.
    if (playwright && /run-e2e:\s*true/.test(wfText) && specs.length) {
      const filtre = filtreE2e(wfText);
      const horsFiltre = specs.filter(f => !specJouee(f.text, filtre));
      if (horsFiltre.length) {
        dette(
          'e2e-hors-filtre',
          `${horsFiltre.map(f => f.rel).join(', ')} : aucun titre ne correspond au filtre « ${filtre.source} » — jamais joué en CI`,
          `taguer les titres (@critical, @a11y), ou e2e-grep: '${FILTRE_E2E_DEFAUT}' dans ci.yml`
        );
      }
    }

    // Un déploiement Pages écrit à la main n'a ni le repli SPA `404.html`, ni
    // `required-env`, ni `VITE_BASE_PATH` posé : mister-puzzle et mister-doc
    // servaient la page 404 de GitHub sur un lien profond le 05/09/2026.
    if (
      /deploy-pages|upload-pages-artifact/.test(wfText) &&
      !/pwa-deploy\.yml@/.test(wfText)
    ) {
      dette(
        'wf-deploy-maison',
        'déploiement Pages écrit à la main : sans le réutilisable, ni repli SPA 404.html, ni required-env, ni base path',
        'deploy.yml → pwa-deploy.yml@v4 (use-base-path: true ; ce qui précède le build en pre-build)'
      );
    }
    const vieux = wfText.match(
      /mister-guiiug\/dev-pwa-config\/\S+@(?!v4\b)\S+/g
    );
    if (vieux) {
      dette(
        'wf-v3',
        `référence au socle hors @v4 : ${[...new Set(vieux)].join(', ')}`,
        'passer en @v4 (étiquette flottante déplacée à chaque release)'
      );
    }

    // `secrets: inherit` donne au workflow appelé TOUT le trousseau du dépôt,
    // alors qu'il déclare exactement ce dont il a besoin.
    const herites = workflows.filter(w =>
      /secrets:\s*inherit/.test(sansCommentaires.yaml(w.text))
    );
    if (herites.length) {
      dette(
        'secrets-inherit',
        `secrets: inherit dans ${herites.map(w => basename(w.rel)).join(', ')} — le workflow appelé reçoit tout le trousseau`,
        'nommer les secrets un par un (README § Secrets et variables)'
      );
    }

    // Une VITE_* rangée en secret n'est pas protégée : Vite la copie dans le
    // bundle. Le secret masque les journaux, pas la valeur.
    const publiques = [
      ...new Set(
        (wfText.match(/secrets\.(VITE_[A-Z0-9_]+)/g) ?? []).map(m =>
          m.replace('secrets.', '')
        )
      ),
    ];
    if (publiques.length) {
      dette(
        'vite-en-secret',
        `${publiques.join(', ')} en secret alors que Vite les copie dans le bundle`,
        'les passer en vars — un secret masque les journaux, pas la valeur'
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
  // Sans `version.json`, l'app ne sait ni dire ce qui est en ligne, ni qu'une
  // version l'attend : dix-sept sites sur dix-huit le 05/09/2026.
  if (viteConfig && !/versionPlugin/.test(viteConfig)) {
    dette(
      'version-manifest',
      'pas de version.json : l’app ne peut dire ni ce qui est en ligne, ni qu’une version l’attend',
      'versionPlugin({ manifest: true }) (vite-version) + <AppVersion updates /> (react/app-version)'
    );
  }
  // Toute VITE_* que le code lit doit figurer dans `.env.example` : c'est la
  // seule documentation qu'un nouveau venu lira.
  const lues = [
    ...new Set(
      (srcText.match(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g) ?? []).map(m =>
        m.replace('import.meta.env.', '')
      )
    ),
  ].sort();
  if (lues.length) {
    const exemple = readText(root, '.env.example');
    if (!exemple) {
      dette(
        'env-example',
        `${lues.length} VITE_* lues par le code, pas de .env.example`,
        `le créer avec : ${lues.slice(0, 4).join(', ')}${lues.length > 4 ? '…' : ''}`
      );
    } else {
      const absentes = lues.filter(
        name => !new RegExp(`^\\s*#?\\s*${name}\\b`, 'm').test(exemple)
      );
      if (absentes.length) {
        dette(
          'env-example-incomplet',
          `.env.example ne documente pas ${absentes.join(', ')}`,
          'une ligne par variable, avec ce à quoi elle sert'
        );
      }
    }
  }

  // Les trois liens de la famille : sur l'accueil ET sur À propos / Réglages,
  // nulle part ailleurs. Le geste est le même pour les quatre écarts.
  const liens = liensFamille(source);
  const gesteLiens =
    '<AppFooter repoUrl={REPO_URL} issues /> sur l’accueil ET À propos / Réglages — deux écrans, nulle part ailleurs, jamais dans la coquille';
  if (liens.verdict === 'absent') {
    dette(
      'liens-famille',
      'ni code source ni soutien : aucun écran ne les porte',
      gesteLiens
    );
  } else if (liens.verdict === 'partiel') {
    dette(
      'liens-famille',
      `code source + soutien seulement sur ${liens.ou}`,
      gesteLiens
    );
  } else if (liens.verdict === 'partout') {
    dette(
      'liens-famille',
      'code source + soutien sur tous les écrans, rendus par la coquille : deux écrans au plus',
      gesteLiens
    );
  } else if (liens.verdict === 'trop') {
    dette(
      'liens-famille',
      `code source + soutien sur ${liens.ecrans.length} écrans (${liens.ecrans.map(rel => basename(rel)).join(', ')}) : l’accueil et À propos / Réglages, nulle part ailleurs`,
      gesteLiens
    );
  }

  const figees = count(sansCommentaires.source(srcText), /['"]fr-FR['"]/g);
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
  // Un budget total fige un poids ; sans `mainChunkKb`, ce qui charge AVANT
  // le premier rendu n'est pas borné (puzzle : 271 kB de JS initial).
  if (pkg.bundleBudget && !pkg.bundleBudget.mainChunkKb) {
    info(
      'main-chunk-budget',
      'bundleBudget sans mainChunkKb : le poids initial n’est pas borné, seul le total l’est',
      'mesurer le chunk principal (pwa-bundle-budget l’affiche) et poser mainChunkKb à +10 %'
    );
  }
  // `localStorage` nu perd la donnée à la première version qui change de
  // forme ; le magasin versionné copie de côté avant toute perte.
  const directs = count(
    sansCommentaires.source(srcText),
    /localStorage\.(?:get|set|remove)Item\(/g
  );
  if (directs && !/versioned-store/.test(srcText)) {
    info(
      'local-storage-direct',
      `${directs} accès direct(s) à localStorage sans versioned-store : aucune copie de côté avant une perte`,
      'createVersionedStore (versioned-store) — migrations, validation, sauvegarde avant perte'
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

    // LES ASSETS RESTENT-ILS SOUS LE SITE ? Jugés à l'aune de la CANONIQUE, pas
    // du préfixe déduit des scripts : celui-ci se replie sur `/` quand les
    // scripts sont justement faux, et le contrôle se désarmerait au moment où
    // il servirait. `miss-ticket-pwa` a servi une page blanche du 03/06 au
    // 06/09/2026 — build vert, CI verte, docteur muet — parce que sa base
    // valait `/` alors que le site vit sous `/miss-ticket-pwa/`.
    const scope = siteScope(m.canonicalHref);
    const dehors = [...(m.scripts ?? []), ...(m.styles ?? [])].filter(href =>
      escapesSite(href, scope)
    );
    if (dehors.length) {
      defaut(
        'assets-hors-site',
        `${dehors.length} asset(s) liés hors du site : ${dehors.slice(0, 2).join(', ')} (le site vit sous ${scope}) — la page se charge sans JS ni CSS`,
        'base du build = le chemin du site (use-base-path: true, ou VITE_BASE_PATH)'
      );
    }

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
    if (!exists(root, 'dist/version.json')) {
      dette(
        'version-manifest',
        'pas de version.json dans le build : l’app ne peut dire ni ce qui est en ligne, ni qu’une version l’attend',
        'versionPlugin({ manifest: true }) (vite-version)'
      );
    }
    // `pwa-deploy.yml@v4` copie `index.html` en `404.html` AU DÉPLOIEMENT :
    // un build local sans lui n'est pas un défaut pour une app qui déploie
    // par le réutilisable — c'est le cas de badminton, contraction, footcoach.
    if (
      /BrowserRouter|createBrowserRouter/.test(srcText) &&
      !exists(root, 'dist/404.html') &&
      !/pwa-deploy\.yml@v[4-9]/.test(wfText)
    ) {
      defaut(
        'spa-404',
        'routage par chemin sans 404.html : un lien profond sert la page 404 de GitHub',
        'spaFallbackPlugin() (vite-pwa-base) ou pwa-deploy.yml@v4'
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
