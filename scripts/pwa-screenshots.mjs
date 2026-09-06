#!/usr/bin/env node
/**
 * pwa-screenshots — les deux captures du MANIFESTE, celles qui décident de la
 * fiche d'installation.
 *
 *   npx pwa-screenshots                       # sert le build (vite preview), capture, s'arrête
 *   npx pwa-screenshots --url http://localhost:5236/   # une app déjà servie (dev, données réelles)
 *   npx pwa-screenshots --wide-path reglages --prepare scripts/captures-prepare.mjs
 *
 * POURQUOI UN BIN. Sans `screenshots`, Chrome propose une installation
 * minimale — une ligne et un bouton. Avec, il ouvre une fiche qui montre
 * l'application. Le 05/09/2026, quatre sites de la famille n'en avaient
 * aucune, et TROIS scripts faisaient la même chose : 98 lignes dans le
 * squelette, 50 dans mister-miss-koh, celui du showroom dans ce paquet. Les
 * voici en un seul, avec ce que chacun avait compris de son côté :
 *
 *   - deux cadres, et les deux comptent : `narrow` est exigé sur téléphone,
 *     `wide` sur ordinateur ; n'en fournir qu'un fait retomber l'autre
 *     plateforme sur l'interface minimale (squelette) ;
 *   - capturer l'application RÉELLE, pas une illustration : ce que le
 *     magasin montre doit être ce que l'utilisateur verra — d'où `--url`
 *     pour photographier un serveur qui lit la vraie base, et `--prepare`
 *     pour mettre l'écran dans l'état voulu PAR L'INTERFACE (miss-koh coche
 *     ses épisodes vus avant la photo) ;
 *   - langue, schéma et mouvement FIXÉS : deux passages rendent le même
 *     fichier, sinon chaque exécution produit un diff Git illisible
 *     (showroom) ;
 *   - l'aperçu est lancé PAR NODE, sur le script de Vite — jamais par `npx`,
 *     qui est un `.cmd` sous Windows et que Node refuse de lancer sans shell
 *     depuis CVE-2024-27980 (squelette).
 *
 * LES TAILLES SONT CELLES QUE CHROME ATTEND pour ne pas recadrer : 540×1170
 * (un 9/19.5 de téléphone) et 1280×720. Au-delà de 3 840 px, il refuse
 * l'entrée en silence ; et toutes les captures d'un même `form_factor`
 * doivent partager le même ratio.
 *
 * ENSUITE, RIEN À DÉCLARER : `pwaBaseOptions` lit `public/screenshots/` et
 * pose les deux entrées au manifeste, avec les tailles LUES dans les fichiers.
 * Le bin rappelle quand même les lignes, pour une app qui écrit son manifeste
 * à la main.
 *
 * PRÉREQUIS : `@playwright/test` (le paquet que les apps ont déjà pour leurs
 * e2e), `playwright` ou `playwright-core` — peers OPTIONNELLES : ce bin ne
 * pèse rien pour une app qui ne l'appelle pas. Le navigateur doit être
 * installé (`npx playwright install chromium`).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { manifestScreenshots } from '../vite-pwa.js';

/** Les deux cadres, tels que Chrome les attend. */
export const CADRES = {
  narrow: { width: 540, height: 1170 },
  wide: { width: 1280, height: 720 },
};

/** `540x1170` → `{ width, height }` ; sinon le repli. */
export function parseSize(text, fallback) {
  const m = /^(\d{3,4})x(\d{3,4})$/.exec(String(text ?? '').trim());
  return m ? { width: Number(m[1]), height: Number(m[2]) } : fallback;
}

/**
 * Les options, avec leurs défauts. Pure : rien n'est lu sur le disque.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv = []) {
  const at = flag => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const only = at('--only');
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    url: at('--url'),
    port: Number(at('--port') ?? 4319),
    base: at('--base') ?? '/',
    out: at('--out') ?? 'public/screenshots',
    locale: at('--locale') ?? 'fr-FR',
    scheme: at('--scheme') === 'dark' ? 'dark' : 'light',
    wait: Number(at('--wait') ?? 1500),
    prepare: at('--prepare'),
    only: only === 'narrow' || only === 'wide' ? only : undefined,
    shots: {
      narrow: {
        ...parseSize(at('--narrow'), CADRES.narrow),
        path: at('--narrow-path') ?? '',
      },
      wide: {
        ...parseSize(at('--wide'), CADRES.wide),
        path: at('--wide-path') ?? '',
      },
    },
  };
}

/** Les captures à prendre, dans l'ordre. */
export function plan(options) {
  return Object.entries(options.shots)
    .filter(([name]) => !options.only || options.only === name)
    .map(([name, shot]) => ({ name, ...shot }));
}

/** Les lignes `screenshots` du manifeste, à copier si l'app l'écrit à la main. */
export function snippet(entries) {
  if (!entries.length) return 'aucune capture trouvée';
  // Chaque valeur passe par JSON.stringify : un libellé n'est pas du code, et
  // un échappement à la main oublie toujours un caractère (CodeQL le rappelle).
  const s = JSON.stringify;
  return [
    'screenshots: [',
    ...entries.map(
      e =>
        `  { src: ${s(e.src)}, sizes: ${s(e.sizes)}, type: ${s(e.type)}, form_factor: ${s(e.form_factor)}, label: ${s(e.label)} },`
    ),
    ']',
  ].join('\n');
}

async function chromiumDe() {
  for (const paquet of ['@playwright/test', 'playwright', 'playwright-core']) {
    try {
      const mod = await import(paquet);
      if (mod.chromium) return mod.chromium;
    } catch {
      /* suivant */
    }
  }
  return null;
}

/** Attend qu'une URL réponde, jusqu'à `ms` millisecondes. */
async function attendre(url, ms = 30_000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* pas encore */
    }
    await sleep(250);
  }
  return false;
}

/**
 * Lance `vite preview` sur le build de l'app, par le script du paquet
 * installé — sans `npx`, sans shell, sans dépendre du PATH.
 */
function servir(cwd, port, base) {
  const require = createRequire(join(cwd, 'package.json'));
  const vite = require.resolve('vite/bin/vite.js');
  return spawn(
    process.execPath,
    [vite, 'preview', '--port', String(port), '--strictPort', '--base', base],
    { cwd, stdio: 'ignore' }
  );
}

export async function run(argv = [], cwd = process.cwd()) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(
      [
        'pwa-screenshots — les deux captures du manifeste (narrow 540×1170, wide 1280×720).',
        '',
        '  --url <http://…/>       photographier une app déjà servie (sinon : vite preview du build)',
        '  --port 4319 --base /    l’aperçu lancé par le bin',
        '  --out public/screenshots',
        '  --narrow 540x1170 --wide 1280x720',
        '  --narrow-path <chemin> --wide-path <chemin>   ajoutés à l’URL (ex. reglages, #/episodes)',
        '  --prepare <module.mjs>  export default async (page, { name }) => {} — joué avant chaque capture',
        '  --locale fr-FR --scheme light|dark --wait 1500 --only narrow|wide',
      ].join('\n')
    );
    return 0;
  }

  const chromium = await chromiumDe();
  if (!chromium) {
    console.error(
      'pwa-screenshots : aucun Playwright trouvé. `npm i -D @playwright/test && npx playwright install chromium`.'
    );
    return 2;
  }

  let apercu = null;
  let base = options.url;
  if (!base) {
    apercu = servir(cwd, options.port, options.base);
    base = `http://localhost:${options.port}${options.base}`;
    if (!(await attendre(base))) {
      apercu.kill();
      console.error(
        `pwa-screenshots : ${base} ne répond pas. Le build existe-t-il (\`vite build\`) ? Le port ${options.port} est-il libre ?`
      );
      return 2;
    }
  }
  const arreter = () => apercu?.kill();
  process.on('exit', arreter);

  let preparer = null;
  if (options.prepare) {
    const mod = await import(pathToFileURL(resolve(cwd, options.prepare)).href);
    preparer = mod.default ?? mod.prepare;
    if (typeof preparer !== 'function') {
      arreter();
      console.error(
        `pwa-screenshots : ${options.prepare} doit exporter une fonction par défaut (page, { name, url }) => Promise<void>.`
      );
      return 2;
    }
  }

  const out = resolve(cwd, options.out);
  mkdirSync(out, { recursive: true });
  const navigateur = await chromium.launch();
  try {
    for (const shot of plan(options)) {
      const contexte = await navigateur.newContext({
        viewport: { width: shot.width, height: shot.height },
        deviceScaleFactor: 1,
        locale: options.locale,
        colorScheme: options.scheme,
        reducedMotion: 'reduce',
      });
      const page = await contexte.newPage();
      const url = base + shot.path;
      await page.goto(url, { waitUntil: 'networkidle' });
      if (preparer) await preparer(page, { name: shot.name, url });
      // Le premier écran d'une PWA s'hydrate après le `load` : sans ce délai,
      // on capture un squelette de chargement.
      await sleep(options.wait);
      const fichier = join(out, `${shot.name}.png`);
      writeFileSync(fichier, await page.screenshot({ type: 'png' }));
      console.log(
        `✓ ${options.out}/${shot.name}.png (${shot.width}×${shot.height})`
      );
      await contexte.close();
    }
  } finally {
    await navigateur.close();
    arreter();
  }

  const entries = manifestScreenshots(out, {
    publicDir: resolve(cwd, 'public'),
  });
  console.log(
    `\nDéclarées par pwaBaseOptions() dès le prochain build. À la main, sinon :\n${snippet(entries)}`
  );
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await run(process.argv.slice(2));
}
