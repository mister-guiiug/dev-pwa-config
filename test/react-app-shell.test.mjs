// `AppShell`, `FamilyAbout`, `ChromePrefs` — la coquille et le chrome famille
// promus du squelette. Ce qui est verrouillé ici : le lien d'évitement avant
// tout, le pied de page HORS de la coquille, et `showSource={false}` dès que
// `AppFooter` suit la grille.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppShell } from '../react/app-shell.js';
import { FamilyAbout } from '../react/family-about.js';
import { ChromePrefs } from '../react/chrome-prefs.js';
import { LabelsProvider } from '../react/labels.js';

const render = (component, props, ...children) =>
  renderToStaticMarkup(h(component, props, ...children));

test('AppShell : lien d’évitement en tête, puis en-tête, main, barre', () => {
  const html = render(
    AppShell,
    {
      title: 'Notes',
      navItems: [{ href: '/', label: 'Accueil', end: true }],
    },
    'vue'
  );
  assert.match(html, /^<a href="#contenu" [^>]*data-dwc="app-shell-skip"/);
  assert.match(html, /Aller au contenu/);
  assert.ok(
    html.indexOf('app-shell-skip') < html.indexOf('data-dwc="app-header"')
  );
  assert.match(html, /<main [^>]*id="contenu"[^>]*data-dwc="page-container"/);
  assert.match(html, /data-reserve="bottom-nav"/);
  assert.match(html, /data-dwc="bottom-nav"/);
  assert.doesNotMatch(
    html,
    /data-dwc="app-footer"/,
    'le pied de page n’appartient pas à la coquille'
  );
});

test('AppShell : `actions={null}` retire le ThemeToggle, `beforeMain` hors du main', () => {
  const html = render(
    AppShell,
    {
      title: 'T',
      actions: null,
      beforeMain: h('div', { 'data-before': '' }, 'b'),
      afterMain: h('div', { 'data-after': '' }, 'a'),
    },
    'c'
  );
  assert.doesNotMatch(html, /data-dwc="theme-toggle"/);
  assert.ok(html.indexOf('data-before') < html.indexOf('id="contenu"'));
  assert.ok(html.indexOf('data-after') > html.indexOf('id="contenu"'));
});

/*
 * L'ONGLET COURANT VIENT DU ROUTEUR, PAS DU NAVIGATEUR. `BottomNav` exige
 * `currentPath` dès que le routeur a un `basename` : sans lui il lit
 * `location.pathname`, qui vaut `/miss-devises/` une fois déployé là où
 * l'entrée vaut `/`. La coquille ne le transmettait pas, et n'avait aucune prop
 * pour le recevoir : aucun onglet actif en ligne sur le squelette et sur
 * miss-devises (relevé le 03/10/2026). Rendu serveur : sans `location`, seul
 * le chemin transmis peut désigner l'onglet.
 */
test('AppShell : `navCurrentPath` désigne l’onglet courant', () => {
  const html = render(
    AppShell,
    {
      title: 'T',
      navItems: [
        { href: '/', label: 'Accueil', end: true },
        { href: '/historique', label: 'Historique' },
      ],
      navCurrentPath: '/historique',
    },
    'x'
  );
  const lien = href => html.match(new RegExp(`<a href="${href}"[^>]*>`))?.[0];
  assert.ok(lien('/historique'), 'onglet « Historique » rendu');
  assert.match(lien('/historique'), /aria-current="page"/);
  assert.doesNotMatch(lien('/'), /aria-current/);
});

test('AppShell : skipLabel et locale anglaise', () => {
  const html = renderToStaticMarkup(
    h(LabelsProvider, { locale: 'en' }, h(AppShell, { title: 'T' }, 'x'))
  );
  assert.match(html, />Skip to content</);
});

test('FamilyAbout : install + grille sans source + pied', () => {
  const html = render(FamilyAbout, {
    currentAppId: 'pwa-starter-kit',
    repoUrl: 'https://github.com/mister-guiiug/pwa-starter-kit',
  });
  assert.match(html, /data-dwc="family-about"/);
  assert.match(html, /data-dwc="family-apps"/);
  assert.match(html, /data-dwc="app-footer"/);
  // showSource={false} : la grille ne double pas les liens du pied.
  assert.doesNotMatch(html, /data-dwc="family-source"/);
});

test('FamilyAbout : currentAppId requis', () => {
  assert.throws(
    () => render(FamilyAbout, {}),
    err => /currentAppId[\s\S]*est requis/.test(String(err))
  );
});

test('ChromePrefs : groupe nommé, ThemeToggle par défaut, children à côté', () => {
  const html = render(
    ChromePrefs,
    { label: 'Apparence' },
    h('button', { type: 'button', 'data-lang': '' }, 'FR')
  );
  assert.match(
    html,
    /role="group"[^>]*aria-label="Apparence"[^>]*data-dwc="chrome-prefs"/
  );
  assert.match(html, /data-dwc="theme-toggle"/);
  assert.match(html, /data-lang=""/);
});

test('ChromePrefs : themeToggle={false} ne laisse que les enfants', () => {
  const html = render(
    ChromePrefs,
    { themeToggle: false },
    h('span', { 'data-only': '' }, 'x')
  );
  assert.doesNotMatch(html, /data-dwc="theme-toggle"/);
  assert.match(html, /data-only=""/);
});
