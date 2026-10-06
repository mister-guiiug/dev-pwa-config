// Le showroom, rendu sans navigateur : un test de fumée.
//
// Jusqu'ici, aucun test n'exécutait la page. Ils lisaient son source comme du
// texte : c'est ainsi qu'un import hors du dossier publié (05/10/2026) a pu
// laisser la vitrine vide en production, tous les tests au vert. Celui-ci
// charge index.html dans jsdom, pose les données comme le feraient les
// `<script src>`, importe le module `showroom.js` avec les globaux du DOM, et
// regarde ce qui a été rendu.
//
// jsdom ne charge ni les feuilles de style ni la mise en page : les mesures
// (contraste calculé, tailles de cibles) n'ont pas de sens ici. Ce test
// vérifie que la page DÉMARRE et rend ce qu'elle doit : la vitrine, le
// catalogue, la grille des thèmes, les comptes, la bascule de langue.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

// `SHOWROOM_DIR` fait tourner le même test sur un autre dossier : le job de
// publication s'en sert pour éprouver la sortie MINIFIÉE avant de la
// téléverser (`scripts/minify-showroom.mjs`).
const DOSSIER = process.env.SHOWROOM_DIR
  ? pathToFileURL(`${resolve(process.env.SHOWROOM_DIR)}/`)
  : new URL('../showroom/', import.meta.url);
const ADRESSE =
  'https://mister-guiiug.github.io/dev-pwa-config/?app=generic&scheme=light&lang=fr';

const erreurs = [];
const consoleVirtuelle = new VirtualConsole();
consoleVirtuelle.on('error', message => erreurs.push(String(message)));
consoleVirtuelle.on('jsdomError', erreur => {
  // jsdom ne sait pas tout faire (canvas, mise en page) : ce n'est pas une
  // erreur de la page.
  if (!/Not implemented/.test(String(erreur?.message))) {
    erreurs.push(String(erreur?.message ?? erreur));
  }
});

const dom = new JSDOM(readFileSync(new URL('index.html', DOSSIER), 'utf8'), {
  url: ADRESSE,
  pretendToBeVisual: true,
  virtualConsole: consoleVirtuelle,
});
const { window } = dom;

/** Les globaux du DOM, posés comme dans un navigateur. */
function poserLesGlobaux() {
  const fenetre = window;
  fenetre.matchMedia = requete => ({
    matches: false,
    media: requete,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  class Observateur {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  fenetre.IntersectionObserver = Observateur;
  fenetre.ResizeObserver = Observateur;
  fenetre.scrollTo = () => {};
  fenetre.HTMLElement.prototype.scrollIntoView = function () {};
  fenetre.Element.prototype.scrollIntoView = function () {};

  const noms = [
    'window',
    'document',
    'navigator',
    'location',
    'history',
    'localStorage',
    'sessionStorage',
    'getComputedStyle',
    'matchMedia',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'IntersectionObserver',
    'ResizeObserver',
    'Node',
    'Element',
    'HTMLElement',
    'HTMLFormElement',
    'HTMLDetailsElement',
    'HTMLAnchorElement',
    'HTMLInputElement',
    'HTMLSelectElement',
    'SVGElement',
    'Event',
    'CustomEvent',
    'KeyboardEvent',
    'MouseEvent',
    'FocusEvent',
    'DOMParser',
    'NodeFilter',
    'getSelection',
  ];
  for (const nom of noms) {
    const valeur = nom === 'window' ? fenetre : fenetre[nom];
    if (valeur === undefined) continue;
    Object.defineProperty(globalThis, nom, {
      value:
        typeof valeur === 'function' && /^[a-z]/.test(nom)
          ? valeur.bind(fenetre)
          : valeur,
      configurable: true,
      writable: true,
    });
  }
}

poserLesGlobaux();

// Les données, comme les `<script defer src>` de la page, dans leur ordre.
for (const nom of [
  'themes.js',
  'apps.js',
  'metrics.js',
  'adoption.js',
  'snippets.js',
  'catalogue.js',
  'screenshots.js',
  'i18n.js',
]) {
  await import(new URL(nom, DOSSIER).href);
}
await import(new URL('showroom.js', DOSSIER).href);

const doc = window.document;
const compter = selecteur => doc.querySelectorAll(selecteur).length;

test('la page démarre sans erreur', () => {
  assert.deepEqual(erreurs, []);
});

test('la vitrine rend une carte par application du catalogue', () => {
  const attendu = globalThis.SHOWROOM_APPS.apps.length;
  assert.equal(compter('#apps-grid > li'), attendu);
  assert.equal(attendu, 21, 'le catalogue a changé : ajuster ce repère');
});

test('le catalogue rend ses fiches, et la grille ses thèmes', () => {
  assert.equal(compter('#cat-grid > li'), 62);
  assert.equal(compter('#theme-grid > *'), globalThis.SHOWROOM_THEMES.length);
  assert.equal(globalThis.SHOWROOM_THEMES.length, 22);
});

test('les comptes de la prose sont remplis depuis le catalogue', () => {
  const apps = globalThis.SHOWROOM_APPS.apps;
  for (const el of doc.querySelectorAll('[data-count="apps"]')) {
    assert.equal(el.textContent, String(apps.length));
  }
  const css = apps.filter(a => a.configs.includes('components.css')).length;
  assert.equal(
    doc.querySelector('[data-count="components-css"]').textContent,
    String(css)
  );
});

test('la bascule de langue traduit la page, et revient', () => {
  const titre = () => doc.getElementById('intro-title').textContent.trim();
  const francais = titre();
  const anglais = doc.getElementById('lang-en');
  anglais.checked = true;
  anglais.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(doc.documentElement.lang, 'en');
  assert.notEqual(titre(), francais, 'le titre est resté en français');
  // Les cartes sont toujours là, et les descriptions françaises sont dites.
  assert.equal(compter('#apps-grid > li'), 21);
  assert.ok(compter('.sr-app-desc[lang="fr"]') >= 21);

  const fr = doc.getElementById('lang-fr');
  fr.checked = true;
  fr.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(doc.documentElement.lang, 'fr');
  assert.equal(titre(), francais);
  assert.deepEqual(erreurs, []);
});
