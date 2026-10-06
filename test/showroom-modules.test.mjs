// Le script du showroom, découpé en modules ES, et les cliquets qui
// l'empêchent de redevenir un bloc.
//
// Jusqu'au 06/10/2026, `showroom/showroom.js` tenait en une seule fonction de
// 6 669 lignes : vingt-trois sections qui se partageaient quinze variables
// d'état, sans frontière lisible. Il est découpé en vingt-six modules autour
// d'un amorçage ; l'état partagé vit dans `etat.js`. Ces gardes tiennent le
// découpage. Sans dépendance, comme les autres tests du showroom.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { importsDe } from '../scripts/showroom-imports.mjs';
import { modulesDuShowroom } from '../scripts/showroom-modules.mjs';

const DOSSIER = new URL('../showroom/', import.meta.url);
const MODULES = modulesDuShowroom();
const lignes = source => source.split('\n').length;

/** Les modules locaux qu'importe un source, sans leur `?v=`. */
const dependances = source =>
  importsDe(source)
    .map(i => /^\.\/([\w.-]+\.js)(?:\?.*)?$/.exec(i.specificateur)?.[1])
    .filter(Boolean);

test('showroom.js n’est plus que l’amorçage', () => {
  // Le cliquet, chiffré : 6 669 lignes avant le découpage, 229 après.
  const n = lignes(MODULES.get('showroom.js'));
  assert.ok(n <= 240, `showroom.js : ${n} lignes, l’amorçage regrossit`);
});

test('aucun module ne redevient un bloc', () => {
  // Relevé du 06/10/2026 : vitrine.js, le plus gros, 1 029 lignes.
  // command.js est la copie du module du paquet, hors de ce découpage.
  const gros = [...MODULES]
    .filter(([nom]) => nom !== 'command.js')
    .filter(([, source]) => lignes(source) > 1050)
    .map(([nom, source]) => `${nom} : ${lignes(source)} lignes`);
  assert.deepEqual(gros, []);
});

test('le graphe des modules est sans cycle', () => {
  // Les empreintes de cache (`?v=`) se calculent des feuilles vers la
  // racine : un cycle les rendrait incalculables. Un module d'en bas qui doit
  // appeler une action d'en haut passe par `rappels`, dans etat.js.
  const etat = new Map();
  const cycles = [];
  const visiter = (nom, chemin) => {
    if (etat.get(nom) === 'fait') return;
    if (etat.get(nom) === 'en cours') {
      cycles.push([...chemin.slice(chemin.indexOf(nom)), nom].join(' → '));
      return;
    }
    etat.set(nom, 'en cours');
    for (const cible of dependances(MODULES.get(nom))) {
      visiter(cible, [...chemin, nom]);
    }
    etat.set(nom, 'fait');
  };
  visiter('showroom.js', []);
  assert.deepEqual(cycles, []);
});

test('chaque script du dossier est chargé : par la page, ou par un module', () => {
  // Un module que rien n'importe serait du code mort, servi quand même.
  const html = readFileSync(new URL('index.html', DOSSIER), 'utf8');
  const parLaPage = new Set(
    [...html.matchAll(/<script\b[^>]*\ssrc="([\w.-]+\.js)(?:\?[^"]*)?"/g)].map(
      m => m[1]
    )
  );
  const orphelins = readdirSync(DOSSIER)
    .filter(nom => nom.endsWith('.js'))
    .filter(nom => !parLaPage.has(nom) && !MODULES.has(nom));
  assert.deepEqual(orphelins, []);
  assert.ok(MODULES.size >= 20, `${MODULES.size} modules : lecteur cassé ?`);
});
