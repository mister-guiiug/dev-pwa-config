// Cohérence du cache du showroom : chaque URL porte l'empreinte de ce
// qu'elle sert.
//
// Pages sert chaque fichier dix minutes en cache, sous un nom fixe. Sans
// empreinte, un `index.html` neuf pouvait tourner avec un `showroom.js`
// ancien. `npm run sync` écrit donc `?v=<empreinte du contenu>` sur chaque
// ressource de la page et sur chaque import local des modules ; ce test
// vérifie que toutes correspondent au contenu actuel. Il tourne aussi dans le
// job de publication, sans dépendance installée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  LONGUEUR,
  avecVersionsDImports,
  avecVersionsHtml,
  empreinte,
  nomLocal,
  ressourcesHtml,
} from '../scripts/showroom-cache.mjs';
import { importsDe } from '../scripts/showroom-imports.mjs';

const DOSSIER = new URL('../showroom/', import.meta.url);
const lire = nom => readFileSync(new URL(nom, DOSSIER), 'utf8');
const HTML = lire('index.html');

test('chaque ressource de la page porte l’empreinte de son contenu', () => {
  const vues = [
    ...HTML.matchAll(
      /<(?:script|link)\b[^>]*?\s(?:src|href)="([^"#?:/]+\.(?:js|css))(\?v=([0-9a-f]*))?"/g
    ),
  ];
  assert.ok(
    vues.length >= 12,
    'trop peu de ressources relevées : motif changé ?'
  );
  const ecarts = vues
    .filter(([, nom, , v]) => v !== empreinte(lire(nom)))
    .map(([, nom, , v]) => `${nom} : ?v=${v ?? '(absent)'}`);
  assert.deepEqual(
    ecarts,
    [],
    'empreintes de cache périmées : relancer `npm run sync`'
  );
});

test('chaque import local d’un module porte l’empreinte du module visé', () => {
  const ecarts = [];
  for (const nom of readdirSync(DOSSIER).filter(n => n.endsWith('.js'))) {
    for (const { specificateur } of importsDe(lire(nom))) {
      const cible = nomLocal(specificateur);
      if (!cible) continue;
      const v = /\?v=([0-9a-f]+)$/.exec(specificateur)?.[1];
      if (v !== empreinte(lire(cible))) {
        ecarts.push(`${nom} → ${specificateur}`);
      }
    }
  }
  assert.deepEqual(
    ecarts,
    [],
    'imports sans empreinte à jour : `npm run sync`'
  );
});

test('les empreintes ont une longueur fixe : les réécrire ne change pas la mise en page', () => {
  assert.equal(empreinte('a').length, LONGUEUR);
  assert.equal(
    empreinte('a\r\nb'),
    empreinte('a\nb'),
    'fins de ligne normalisées'
  );
});

test('la réécriture vise les seuls fichiers du dossier', () => {
  const html = [
    '<link rel="icon" href="data:image/svg+xml,x" />',
    '<link rel="stylesheet" href="a.css?v=0000000000" />',
    '<script src="https://exemple.org/b.js"></script>',
    '<script defer src="c.js"></script>',
  ].join('\n');
  const neuf = avecVersionsHtml(html, nom =>
    nom === 'a.css' ? 'aaaaa' : 'ccccc'
  );
  assert.match(neuf, /href="data:image\/svg\+xml,x"/);
  assert.match(neuf, /href="a\.css\?v=aaaaa"/);
  assert.match(neuf, /src="https:\/\/exemple\.org\/b\.js"/);
  assert.match(neuf, /src="c\.js\?v=ccccc"/);
  assert.deepEqual(ressourcesHtml(neuf), ['a.css', 'c.js']);

  const module = "import { x } from './x.js';\nimport y from '../y.js';";
  assert.equal(
    avecVersionsDImports(module, () => 'abc'),
    "import { x } from './x.js?v=abc';\nimport y from '../y.js';"
  );
});
