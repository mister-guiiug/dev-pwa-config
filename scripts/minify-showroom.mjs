/**
 * Le showroom MINIFIÉ, tel qu'il part à la publication.
 *
 * POURQUOI. Le showroom est publié tel quel, sans build. Mesuré le
 * 06/10/2026 : 179 Ko de JavaScript et de CSS gzippés pour la première
 * visite, dont un tiers d'espaces et de commentaires. Minifiés, 110 Ko
 * (−38 %), sur la page la plus lourde du parc.
 *
 * CE QUI EST MINIFIÉ, ET COMMENT.
 * - Les scripts CLASSIQUES (les `<script defer src>` de la page : données,
 *   traductions) déclarent des globales que les modules lisent. Ils sont
 *   minifiés en mode script, qui ne renomme rien au premier niveau.
 * - Les MODULES ES (`showroom.js`, ses imports, `command.js`) le sont en mode
 *   module : seuls les noms internes changent, ni les exports ni les
 *   spécificateurs (avec leur `?v=`).
 * - Le CSS passe par lightningcss : blancs, commentaires et règles
 *   redondantes partent, et la syntaxe peut prendre sa forme courte
 *   (`(width<=40rem)`, `:before`).
 * - LA CIBLE EST CELLE DES APPS. Sans cible, les deux outils visent les
 *   navigateurs les plus récents et peuvent RÉÉCRIRE vers une syntaxe plus
 *   neuve que la source. On leur donne celle de Vite 8, qui construit toutes
 *   les apps du parc (`baseline-widely-available` : Chrome et Edge 111,
 *   Firefox 114, Safari et iOS 16.4) : le showroom ne demande rien de plus
 *   qu'elles à un navigateur.
 * - `index.html` n'est PAS touché : la CSP porte l'empreinte de son script en
 *   ligne, et les démos engendrées y sont comparées à un rendu frais.
 *
 * Les sources de `showroom/` ne changent pas : la parité avec
 * `components.css` et le catalogue se vérifie sur elles, avant ce passage.
 * Les empreintes `?v=` restent celles des sources : elles changent quand le
 * contenu change, ce qui est leur seul office.
 *
 * Usage : `node scripts/minify-showroom.mjs <sortie>` (le job de publication
 * écrit dans `_site/`). Toute erreur du minifieur arrête la commande.
 *
 * Dépendances : rolldown (le minifieur oxc, `rolldown/experimental`) et
 * lightningcss, en devDependencies. Non publié (absent de `files`).
 */
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { minifySync } from 'rolldown/experimental';
import { transform } from 'lightningcss';
import { estPointDEntree } from './entree.mjs';

const SOURCE = fileURLToPath(new URL('../showroom/', import.meta.url));

/**
 * La cible de Vite 8 (`ESBUILD_BASELINE_WIDELY_AVAILABLE_TARGET`), celle des
 * apps du parc. À relever si Vite la change à un majeur.
 */
export const CIBLES = [
  'chrome111',
  'edge111',
  'firefox114',
  'safari16.4',
  'ios16.4',
];
const version = (majeure, mineure = 0) => (majeure << 16) | (mineure << 8);
const CIBLES_CSS = {
  chrome: version(111),
  edge: version(111),
  firefox: version(114),
  safari: version(16, 4),
  ios_saf: version(16, 4),
};

/** Les scripts classiques : ceux que la page charge sans `type="module"`. */
export function scriptsClassiques(html) {
  return new Set(
    [...html.matchAll(/<script\b([^>]*)>/gi)]
      .map(([, attributs]) => attributs)
      .filter(attributs => !/\btype="module"/i.test(attributs))
      .map(attributs => /\bsrc="([^"?#]+)/i.exec(attributs)?.[1])
      .filter(Boolean)
  );
}

/** Un fichier JavaScript minifié ; lève à la moindre erreur. */
export function minifierJs(nom, code, { module }) {
  const sortie = minifySync(nom, code, {
    module,
    compress: { target: CIBLES },
  });
  if (sortie.errors?.length) {
    throw new Error(
      `${nom} : ${sortie.errors.map(e => e.message ?? String(e)).join(' ; ')}`
    );
  }
  return sortie.code;
}

/** Une feuille minifiée pour la cible des apps ; lève à la moindre erreur. */
export function minifierCss(nom, code) {
  const { code: sortie, warnings } = transform({
    filename: nom,
    code: Buffer.from(code),
    minify: true,
    targets: CIBLES_CSS,
    errorRecovery: false,
  });
  if (warnings.length) {
    throw new Error(`${nom} : ${warnings.map(w => w.message).join(' ; ')}`);
  }
  return sortie.toString();
}

/**
 * Copie `showroom/` dans `sortie` et y minifie le JS et le CSS.
 *
 * @returns {{ fichiers: number, avant: number, apres: number }} octets gzip
 *   du JS et du CSS, avant et après
 */
export function minifierShowroom(sortie) {
  const cible = resolve(sortie);
  rmSync(cible, { recursive: true, force: true });
  const classiques = scriptsClassiques(
    readFileSync(join(SOURCE, 'index.html'), 'utf8')
  );
  let fichiers = 0;
  let avant = 0;
  let apres = 0;
  // Chaque fichier est LU dans `showroom/` et ÉCRIT dans la sortie : jamais
  // de copie réécrite sur place, ni de contrôle séparé du type d'une entrée
  // (le `Dirent` le donne), donc rien qui puisse changer entre deux appels.
  const parcourir = dossier => {
    mkdirSync(join(cible, dossier), { recursive: true });
    for (const entree of readdirSync(join(SOURCE, dossier), {
      withFileTypes: true,
    })) {
      const relatif = dossier ? `${dossier}/${entree.name}` : entree.name;
      if (entree.isDirectory()) {
        parcourir(relatif);
        continue;
      }
      const contenu = readFileSync(join(SOURCE, relatif));
      let produit = contenu;
      if (/\.(js|css)$/.test(entree.name)) {
        const code = contenu.toString('utf8');
        produit = entree.name.endsWith('.js')
          ? minifierJs(relatif, code, { module: !classiques.has(relatif) })
          : minifierCss(relatif, code);
        avant += gzipSync(code).length;
        apres += gzipSync(produit).length;
        fichiers += 1;
      }
      writeFileSync(join(cible, relatif), produit);
    }
  };
  parcourir('');
  return { fichiers, avant, apres };
}

if (estPointDEntree(import.meta.url)) {
  const sortie = process.argv[2];
  if (!sortie) {
    console.error('usage : node scripts/minify-showroom.mjs <sortie>');
    process.exit(2);
  }
  const { fichiers, avant, apres } = minifierShowroom(sortie);
  const ko = n => `${(n / 1024).toFixed(1)} Ko`;
  console.log(
    `${fichiers} fichiers minifiés dans ${sortie} : JS et CSS gzip ${ko(avant)} → ${ko(apres)} (−${Math.round((1 - apres / avant) * 100)} %).`
  );
}
