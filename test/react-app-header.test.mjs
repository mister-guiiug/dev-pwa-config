// `react/app-header` et `react/page-container` — le troisième côté du cadre,
// et le conteneur de vue. Neuf en-têtes et deux conteneurs recopiaient cette
// mise en page ; ce qui est verrouillé ici est ce qu'ils rataient chacun à
// leur façon : un vrai titre, un retour nommé, la zone sûre à sa place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { setupDom, mount } from './helpers/dom.mjs';
import { AppHeader } from '../react/app-header.js';
import { PageContainer } from '../react/page-container.js';
import { LabelsProvider } from '../react/labels.js';
import { IconsProvider } from '../react/icons-context.js';

const render = (component, props, ...children) =>
  renderToStaticMarkup(h(component, props, ...children));

test('AppHeader : un <header> collant, le titre en h1, les emplacements dans l’ordre', () => {
  const html = render(AppHeader, {
    title: 'Trésorerie',
    leading: h('span', { id: 'logo' }, 'L'),
    actions: h('button', { type: 'button' }, 'Thème'),
  });
  assert.match(html, /^<header data-dwc="app-header" data-sticky="">/);
  assert.match(html, /<h1 data-dwc="app-header-title">Trésorerie<\/h1>/);
  // logo, puis titre, puis actions : l'ordre de lecture est celui de l'écran.
  const ordre = [
    'app-header-leading',
    'app-header-title',
    'app-header-actions',
  ].map(id => html.indexOf(id));
  assert.ok(ordre[0] < ordre[1] && ordre[1] < ordre[2]);
  assert.doesNotMatch(
    html,
    /app-header-back/,
    'sans destination, pas de retour'
  );
  assert.doesNotMatch(
    html,
    /app-header-extra/,
    'sans enfant, pas de bloc vide'
  );
});

test('AppHeader : `as` change le niveau, `sticky: false` retire l’attribut, children va sous la rangée', () => {
  const html = render(
    AppHeader,
    { title: 'T', as: 'h2', sticky: false },
    'Accroche'
  );
  assert.match(html, /^<header data-dwc="app-header">/);
  assert.match(html, /<h2 data-dwc="app-header-title">T<\/h2>/);
  assert.match(
    html,
    /<div data-dwc="app-header-extra">Accroche<\/div><\/header>$/
  );
  assert.match(
    html,
    /<\/h2><\/div><div data-dwc="app-header-extra">/,
    'sous la rangée, pas dedans'
  );
});

test('AppHeader : le retour est un LIEN avec destination, par le composant du routeur', () => {
  const Link = ({ to, children, ...rest }) =>
    h('a', { href: `/app${to}`, 'data-link': '', ...rest }, children);
  const html = render(AppHeader, {
    title: 'Détail',
    backHref: '/liste',
    linkComponent: Link,
    hrefProp: 'to',
  });
  assert.match(
    html,
    /<a href="\/app\/liste" data-link="" data-dwc="app-header-back" aria-label="Retour">/
  );
  // Avant le titre : c'est le premier élément de la rangée.
  assert.ok(html.indexOf('app-header-back') < html.indexOf('app-header-title'));
});

test('AppHeader : le retour est un BOUTON avec une action, nommé dans la langue du contexte', async () => {
  const dom = setupDom();
  try {
    let clics = 0;
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(AppHeader, { title: 'Detail', onBack: () => clics++ })
      )
    );
    const bouton = view.container.querySelector('[data-dwc="app-header-back"]');
    assert.equal(bouton.tagName, 'BUTTON');
    assert.equal(bouton.getAttribute('type'), 'button');
    assert.equal(bouton.getAttribute('aria-label'), 'Back');
    // L'icône du rôle `back` est décorative : le nom vient de aria-label.
    assert.ok(bouton.querySelector('svg[aria-hidden="true"]'));
    await view.act(() => bouton.click());
    assert.equal(clics, 1);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('AppHeader : `backLabel` l’emporte, et le rôle `back` d’IconsProvider remplace l’icône', () => {
  const Flèche = () => h('i', { 'data-mine': '' });
  const html = renderToStaticMarkup(
    h(
      IconsProvider,
      { icons: { back: Flèche } },
      h(AppHeader, { title: 'T', onBack() {}, backLabel: 'Précédent' })
    )
  );
  assert.match(html, /aria-label="Précédent"/);
  assert.match(html, /<i data-mine="">/);
});

test('PageContainer : palier de largeur, élément et marges lisibles dans le DOM', () => {
  assert.match(
    render(PageContainer, {}, 'x'),
    /^<div data-dwc="page-container" data-width="md">x<\/div>$/
  );
  const main = render(
    PageContainer,
    { as: 'main', width: 'lg', padding: false },
    'x'
  );
  assert.match(
    main,
    /^<main data-dwc="page-container" data-width="lg" data-padding="none">/
  );
});
