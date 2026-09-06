/**
 * D'où vient la version affichée par le frontend.
 *
 * LE CONSTAT. Rien, dans le paquet, ne portait la version jusqu'au navigateur.
 * `react/observability` la réclamait dans son contexte de session, les cinq
 * modules de mise à jour pilotaient une bascule sans jamais la nommer, et
 * `pwaSeoPlugin` proposait un `iconQuery: '?v=1.0.1'` recopié à la main. Une
 * app qui voulait afficher son numéro devait écrire elle-même son `define`,
 * lire son `package.json` dans `vite.config.ts`, et déclarer le global en
 * TypeScript — trois lignes par app, seize fois, jamais les mêmes.
 *
 * TROIS SORTIES, UNE SEULE SOURCE :
 *
 *   1. `define` — `__APP_VERSION__`, `__APP_BUILD_TIME__`, `__APP_COMMIT__`,
 *      la forme que les apps écrivent déjà. Elle sert le code de l'app, et
 *      elle seule : `define` remplace un identifiant nu à la compilation, ce
 *      qui ne peut pas atteindre un module de `node_modules` censé rester
 *      lisible sans bundler.
 *
 *   2. Un script inline dans `<head>` qui pose `globalThis.__DWC_BUILD__` —
 *      la porte que lit `./version`, donc le seul chemin par lequel
 *      `readBuildInfo()` fonctionne. Même mécanique que `themeBootSource`, et
 *      même contrainte : le plugin doit passer AVANT `cspPlugin`, qui hache
 *      les scripts inline du HTML final.
 *
 *   3. `version.json` à la racine du build — ce qui est EN LIGNE. C'est lui
 *      que `fetchAppVersion()` interroge pour découvrir un déploiement sans
 *      attendre que le navigateur redécouvre le service worker.
 *
 * NI SECRET, NI JETON. Les seules variables lues sont `VITE_APP_VERSION`,
 * `VITE_COMMIT_SHA` et `GITHUB_SHA` — un numéro de version et un SHA de commit,
 * tous deux publics par construction. Le SHA n'est écrit que s'il existe.
 *
 * N'importe PAS `vite` : le plugin est un objet valide structurellement, comme
 * `pwaSeoPlugin` et `cspPlugin`.
 *
 * Usage (vite.config.ts) :
 *   import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';
 *   export default defineConfig({
 *     plugins: [react(), versionPlugin(), cspPlugin()],
 *   });
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  buildInfoScript,
  VERSION_MANIFEST,
  versionContext,
} from './version.js';

/** La version du `package.json` de l'app, ou `''` s'il est illisible. */
export function readPackageVersion(root = process.cwd()) {
  try {
    const raw = readFileSync(resolve(root, 'package.json'), 'utf8');
    const version = JSON.parse(raw).version;
    return typeof version === 'string' ? version : '';
  } catch {
    // Pas de `package.json` (monorepo, racine déplacée) : ce n'est pas une
    // raison de faire échouer un build. L'app passera `version` elle-même.
    return '';
  }
}

/**
 * La version, la date et le commit de CE build.
 *
 * ORDRE DÉLIBÉRÉ : l'option explicite, puis l'environnement, puis le
 * `package.json`. La CI qui construit un aperçu doit pouvoir imposer un numéro
 * sans toucher au fichier ; le développeur en local ne doit rien avoir à poser.
 *
 * @param {{ version?: string, commit?: string, buildTime?: string,
 *   root?: string, env?: Record<string, string | undefined> }} [options]
 */
export function resolveBuildInfo(options = {}) {
  const {
    version,
    commit,
    buildTime,
    root = process.cwd(),
    env = process.env,
  } = options;
  return {
    version: version ?? env.VITE_APP_VERSION ?? readPackageVersion(root),
    commit: commit ?? env.VITE_COMMIT_SHA ?? env.GITHUB_SHA ?? '',
    buildTime: buildTime ?? new Date().toISOString(),
  };
}

/**
 * Plugin Vite : injecte la version dans le bundle, dans le HTML, et écrit
 * `version.json`.
 *
 * À PLACER AVANT `cspPlugin`, qui calcule ses hachages sur le HTML final —
 * même contrainte d'ordre que `pwaSeoPlugin`, et pour la même raison.
 *
 * @param {object} [options]
 * @param {string}  [options.version]   Force la version (sinon env, sinon package.json).
 * @param {string}  [options.commit]    Force le SHA (sinon VITE_COMMIT_SHA / GITHUB_SHA).
 * @param {string}  [options.buildTime] Force la date ISO (utile pour un build reproductible).
 * @param {boolean} [options.define=true]   Poser `__APP_VERSION__` & co.
 * @param {boolean} [options.inject=true]   Poser `globalThis.__DWC_BUILD__` dans le HTML.
 * @param {boolean} [options.manifest=true] Écrire `version.json` dans le build.
 * @param {string}  [options.outDir='dist']
 * @param {string}  [options.root]      Racine où chercher le `package.json`.
 */
export function versionPlugin(options = {}) {
  const {
    define = true,
    inject = true,
    manifest = true,
    outDir = 'dist',
  } = options;

  const info = resolveBuildInfo(options);

  let resolvedOutDir = outDir;
  let command = 'build';
  // La base du build (`/miss-genius/`), connue seulement une fois la
  // configuration résolue : injectée avec la version, elle dit au navigateur
  // OÙ chercher `version.json` — un lien profond d'une app qui route par
  // chemin le cherchait à côté de la page, et recevait 404.
  let base = '';
  const complet = () => (base ? { ...info, base } : info);
  const payload = () => versionContext(complet());

  return {
    name: 'dwc-version',

    config() {
      if (!define) return {};
      return {
        define: {
          __APP_VERSION__: JSON.stringify(info.version),
          __APP_BUILD_TIME__: JSON.stringify(info.buildTime),
          __APP_COMMIT__: JSON.stringify(info.commit),
        },
      };
    },

    configResolved(config = {}) {
      resolvedOutDir = config.build?.outDir ?? outDir;
      command = config.command ?? 'build';
      base = typeof config.base === 'string' ? config.base : '';
    },

    /**
     * En DEV, `version.json` n'existe sur aucun disque : sans cette réponse, un
     * sondage marcherait en production et nulle part ailleurs — c'est-à-dire
     * qu'il ne serait jamais essayé avant d'être en ligne.
     */
    configureServer(server) {
      if (!manifest) return;
      server?.middlewares?.use?.((req, res, next) => {
        if (
          !req?.url ||
          !req.url.split('?')[0].endsWith(`/${VERSION_MANIFEST}`)
        ) {
          next();
          return;
        }
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        res.end(JSON.stringify(payload()));
      });
    },

    transformIndexHtml(html) {
      if (!inject) return html;
      const script = buildInfoScript(complet());
      // Avant `</head>` — la version n'a pas à bloquer le rendu, contrairement
      // au script anti-FOUC qui, lui, doit passer en tête.
      return html.includes('</head>')
        ? html.replace('</head>', `${script}</head>`)
        : `${script}${html}`;
    },

    async closeBundle() {
      if (!manifest || command !== 'build') return;
      const target = join(resolvedOutDir, VERSION_MANIFEST);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, `${JSON.stringify(payload(), null, 2)}\n`, 'utf8');
    },
  };
}
