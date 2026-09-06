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
 *     depuis CVE-2024-27980 (squelette) ;
 *   - l'aperçu sert le build SOUS SA BASE, lue dans `dist/index.html` : un
 *     build fait pour `/mister-x/` servi sous `/` demande ses actifs à
 *     `/mister-x/assets/…`, reçoit des 404, et la page est blanche. Les
 *     captures du squelette, prises ainsi le 05/09/2026, étaient deux
 *     rectangles blancs que personne n'avait ouverts. Le bin refuse désormais
 *     d'écrire une page vide, et dit combien d'actifs ont répondu 404.
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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { manifestScreenshots } from '../vite-pwa.js';
import { estPointDEntree } from './entree.mjs';

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
    // Pas de défaut : la base se lit dans le build (`baseDuBuild`).
    base: at('--base'),
    dist: at('--dist') ?? 'dist',
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

/**
 * La base sous laquelle le build a été fait, lue dans le premier actif que
 * `index.html` référence : `/mister-x/assets/…` → `/mister-x/`. Sans actif,
 * ou pour `./assets/…` et `/assets/…`, c'est la racine. Sans regex : CodeQL
 * lit `[^"]*` suivi d'un littéral comme un parcours polynomial.
 *
 * @param {string} html
 */
export function baseDuBuild(html) {
  const marque = 'assets/';
  let i = String(html ?? '').indexOf(marque);
  while (i !== -1) {
    const ouverture = html.lastIndexOf('"', i);
    const avant = ouverture === -1 ? '' : html.slice(ouverture + 1, i);
    if (ouverture !== -1 && !avant.includes('<') && !avant.includes('>')) {
      if (avant.startsWith('http')) {
        try {
          return new URL(avant).pathname || '/';
        } catch {
          return '/';
        }
      }
      if (avant.startsWith('/')) return avant;
      return '/';
    }
    i = html.indexOf(marque, i + marque.length);
  }
  return '/';
}

/**
 * L'adresse à photographier — TOUJOURS sur la boucle locale, ou rien.
 *
 * LA BASE VIENT D'AILLEURS. Elle est lue dans `dist/index.html` (donc dans un
 * fichier que ce script n'écrit pas) ou passée en `--base`. Coller
 * `http://localhost:PORT` devant cette valeur fait reposer toute la garantie
 * sur sa FORME : tant qu'elle commence par une barre, l'hôte ne bouge pas —
 * mais rien dans le code ne l'exige, et une référence PROTOCOL-RELATIVE
 * (`//ailleurs/`) change d'hôte dès qu'on la résout.
 *
 * On construit donc l'URL contre une origine fixe, puis on VÉRIFIE l'origine
 * obtenue. C'est le seul contrôle qui tienne quelle que soit la valeur reçue,
 * et il rend visible un invariant qui n'était jusqu'ici que supposé. CodeQL
 * l'avait relevé : `js/file-access-to-http`, « le contenu d'un fichier atteint
 * une requête sortante ».
 *
 * `--url`, lui, n'est pas concerné : c'est une adresse que l'appelant DONNE,
 * pas une valeur qu'on déduit d'un fichier.
 *
 * @param {number|string} port
 * @param {string} base chemin de base servi (`/`, `/mon-app/`…)
 * @returns {URL|null} `null` si l'adresse quitterait la boucle locale.
 */
export function adresseLocale(port, base) {
  const origine = `http://localhost:${port}`;
  try {
    const url = new URL(String(base ?? '/'), origine);
    return url.origin === origine ? url : null;
  } catch {
    return null;
  }
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
/**
 * Le script de Vite, tel que le paquet installé le déclare dans `bin`.
 *
 * `require.resolve('vite/bin/vite.js')` sort en ERR_PACKAGE_PATH_NOT_EXPORTED :
 * le paquet ferme ses `exports` et n'ouvre que `./package.json`. C'est donc
 * lui qu'on résout, et son champ `bin` qui dit où est le script. Première
 * exécution réelle du bin, sur le squelette, le 06/09/2026.
 */
export function cheminVite(cwd) {
  const require = createRequire(join(cwd, 'package.json'));
  const pkgPath = require.resolve('vite/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.vite;
  if (!bin) throw new Error(`vite : aucun champ bin dans ${pkgPath}`);
  return join(dirname(pkgPath), bin);
}

function servir(cwd, port, base) {
  const vite = cheminVite(cwd);
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
        '  --port 4319 --dist dist l’aperçu lancé par le bin',
        '  --base /mister-x/       sinon lue dans dist/index.html (le chemin des actifs)',
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
    let baseServie = options.base;
    if (!baseServie) {
      const index = join(cwd, options.dist, 'index.html');
      let html = '';
      try {
        html = readFileSync(index, 'utf8');
      } catch {
        console.error(
          `pwa-screenshots : ${options.dist}/index.html introuvable. Construire d'abord (\`vite build\`), ou passer --url.`
        );
        return 2;
      }
      baseServie = baseDuBuild(html);
      console.log(`base lue dans ${options.dist}/index.html : ${baseServie}`);
    }
    // L'origine est vérifiée AVANT de servir quoi que ce soit : mieux vaut ne
    // pas démarrer que démarrer et frapper ailleurs.
    const adresse = adresseLocale(options.port, baseServie);
    if (!adresse) {
      console.error(
        `pwa-screenshots : base « ${baseServie} » refusée — elle sortirait de http://localhost:${options.port}.`
      );
      return 2;
    }
    apercu = servir(cwd, options.port, baseServie);
    base = adresse.href;
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
  let vides = 0;
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
      const introuvables = [];
      page.on('response', r => {
        if (r.status() === 404) introuvables.push(r.url());
      });
      const url = base + shot.path;
      await page.goto(url, { waitUntil: 'networkidle' });
      if (preparer) await preparer(page, { name: shot.name, url });
      // Le premier écran d'une PWA s'hydrate après le `load` : sans ce délai,
      // on capture un squelette de chargement.
      await sleep(options.wait);
      // Une page sans un mot n'est pas une capture, c'est une page blanche
      // dans la fiche d'installation. Ne rien écrire, et dire pourquoi.
      const texte = await page.evaluate(
        () => document.body?.innerText?.trim() ?? ''
      );
      if (!texte) {
        vides += 1;
        const detail = introuvables.length
          ? ` ${introuvables.length} réponse(s) 404, la première : ${introuvables[0]}`
          : '';
        console.error(
          `✗ ${shot.name} : la page ${url} est vide, rien n'est écrit.${detail}`
        );
      } else {
        const fichier = join(out, `${shot.name}.png`);
        writeFileSync(fichier, await page.screenshot({ type: 'png' }));
        console.log(
          `✓ ${options.out}/${shot.name}.png (${shot.width}×${shot.height})`
        );
      }
      await contexte.close();
    }
  } finally {
    await navigateur.close();
    arreter();
  }
  if (vides) {
    console.error(
      `pwa-screenshots : ${vides} capture(s) refusée(s). Le build est-il servi sous sa base (--base) ? Ses actifs répondent-ils ?`
    );
    return 2;
  }

  const entries = manifestScreenshots(out, {
    publicDir: resolve(cwd, 'public'),
  });
  console.log(
    `\nDéclarées par pwaBaseOptions() dès le prochain build. À la main, sinon :\n${snippet(entries)}`
  );
  return 0;
}

if (estPointDEntree(import.meta.url)) {
  process.exitCode = await run(process.argv.slice(2));
}
