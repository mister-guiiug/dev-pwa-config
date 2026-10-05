// Le showroom publié, c'est `showroom/` et rien d'autre.
//
// `showroom-pages.yml` téléverse ce seul dossier. Le 05/10/2026, `showroom.js`
// importait `../command.js` : sur Pages, ce chemin visait la racine de
// l'origine, c'est-à-dire la copie que publie le HUB. La page ne marchait que
// grâce à elle ; servie seule (`npm run showroom`), elle n'affichait ni app, ni
// fiche, ni thème, parce qu'un import statique en échec arrête tout le module.
// Aucun test ne pouvait le voir : ils tournent depuis la racine du dépôt, où
// `../command.js` existe bel et bien.
//
// Ces gardes regardent donc la page comme Pages la sert : un dossier, et rien
// au-dessus. Elles tournent aussi dans le job de publication, qui n'installe
// aucune dépendance : d'où un lecteur d'imports écrit à la main.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importsDe } from '../scripts/showroom-imports.mjs';

const DOSSIER = new URL('../showroom/', import.meta.url);
const lire = nom => readFileSync(new URL(nom, DOSSIER), 'utf8');
const SCRIPTS = readdirSync(DOSSIER).filter(nom => nom.endsWith('.js'));

/** Les spécificateurs d'un source, tels qu'écrits. */
const specificateurs = source => importsDe(source).map(i => i.specificateur);

/**
 * Pourquoi un spécificateur ne tient pas dans `showroom/`, ou `null`.
 *
 * @param {string} specificateur tel qu'écrit dans le source
 * @param {URL} depuis l'URL du fichier qui l'importe
 */
export function horsDuDossier(specificateur, depuis) {
  if (!/^\.{1,2}\//.test(specificateur)) {
    return `« ${specificateur} » n'est pas relatif : sans bundler, la page ne résout ni paquet ni URL`;
  }
  const cible = new URL(specificateur, depuis);
  cible.search = '';
  cible.hash = '';
  if (!cible.href.startsWith(DOSSIER.href)) {
    return `« ${specificateur} » sort de showroom/, que Pages ne publie pas`;
  }
  if (!existsSync(fileURLToPath(cible))) {
    return `« ${specificateur} » ne désigne aucun fichier`;
  }
  return null;
}

test('la garde reconnaît le défaut du 05/10 : `../command.js` sort du dossier', () => {
  const depuis = new URL('showroom.js', DOSSIER);
  const [spec] = specificateurs(
    "import { attachCommandCombobox } from '../command.js';"
  );
  assert.equal(spec, '../command.js');
  assert.match(horsDuDossier(spec, depuis), /sort de showroom\//);
  assert.equal(
    horsDuDossier('./command.js', depuis),
    null,
    'la copie engendrée doit suffire'
  );
});

test('le lecteur voit chaque forme d’import et ignore commentaires, chaînes et regex', () => {
  const source = [
    "import a, { b as c } from './a.js';",
    "import './effet-de-bord.js';",
    '/* import x from "../dans-un-commentaire.js"; */',
    "// import x from '../dans-un-commentaire.js';",
    'const nom = \'import y from "../dans-une-chaine.js"\';',
    "const gabarit = `import z from '../dans-un-gabarit.js' ${nom.at(0)}`;",
    "const motif = /from '..\\/dans-une-regex.js'/g;",
    "export * from './tout.js';",
    "export { z } from './z.js';",
    "const objet = { from: './pas-un-import.js' };",
    "const lu = magasin.import('{ pas un chemin');",
    "const m = await import('./dynamique.js');",
    'const meta = import.meta.url;',
  ].join('\n');
  assert.deepEqual(specificateurs(source), [
    './a.js',
    './effet-de-bord.js',
    './tout.js',
    './z.js',
    './dynamique.js',
  ]);
});

test('le lecteur rend la position exacte du spécificateur', () => {
  const source = "import { a } from './a.js?v=0123abcd';";
  const [lu] = importsDe(source);
  assert.equal(source.slice(lu.start, lu.end), './a.js?v=0123abcd');
});

test('tout import des scripts du showroom se résout DANS showroom/', () => {
  const ecarts = [];
  for (const nom of SCRIPTS) {
    const depuis = new URL(nom, DOSSIER);
    for (const spec of specificateurs(lire(nom))) {
      const raison = horsDuDossier(spec, depuis);
      if (raison) ecarts.push(`${nom} : ${raison}`);
    }
  }
  assert.deepEqual(ecarts, []);
});

test('index.html ne charge que des fichiers de showroom/', () => {
  const html = lire('index.html');
  const ressources = [
    ...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g),
    ...html.matchAll(/<link\b[^>]*\shref="([^"]+)"/g),
  ].map(m => m[1]);
  assert.ok(
    ressources.length >= 5,
    'aucune ressource relevée : motif changé ?'
  );

  const depuis = new URL('index.html', DOSSIER);
  const ecarts = ressources
    // Une ressource `data:` ne quitte pas la page : aucune requête.
    .filter(href => !href.startsWith('data:'))
    .map(href =>
      /^([a-z][a-z\d+.-]*:|\/)/i.test(href)
        ? `« ${href} » est absolu : il vise autre chose que showroom/`
        : horsDuDossier(href.startsWith('.') ? href : `./${href}`, depuis)
    )
    .filter(Boolean);
  assert.deepEqual(ecarts, []);
});

test('showroom/command.js est la copie exacte du module du paquet', () => {
  assert.equal(
    lire('command.js'),
    readFileSync(new URL('../command.js', import.meta.url), 'utf8'),
    'showroom/command.js a dérivé : relancer `npm run sync`'
  );
});
