/**
 * `AppFooter` — les deux emplacements qu'une app a demandés en refusant de
 * migrer.
 *
 * miss-contraction porte encore son propre pied de page, et son en-tête dit
 * pourquoi, tableau à l'appui : sur ses quatre éléments, celui du socle n'en
 * couvrait qu'un. Deux manques étaient BLOQUANTS, pas des préférences :
 *
 *   L'AVERTISSEMENT MÉDICAL. « Cet outil ne remplace pas un avis médical »
 *   n'avait aucun emplacement. Le remplacer par le pied de page du socle
 *   l'aurait sorti du repère de pied de page — et l'imbriquer était interdit,
 *   la spécification HTML refusant un `<footer>` descendant d'un `<footer>`.
 *   Sur une app qu'on ouvre pendant un accouchement, la phrase n'est pas
 *   décorative.
 *
 *   LA DESTINATION INTERNE. Son lien « À propos et version » est un `Link` de
 *   routeur vers `/a-propos` ; `repoUrl` rend un `<a target=_blank>` vers
 *   GitHub, donc on QUITTE l'app. Ce composant ne dépend d'aucun routeur et ne
 *   peut pas en fabriquer un — mais il peut en accueillir.
 *
 * Les tests montent le pied de page tel que miss-contraction le rend.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { AppFooter } from '../react/app-footer.js';

test('`children` accueille un avertissement, en tête du pied de page', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        AppFooter,
        { repoUrl: 'https://github.com/mister-guiiug/miss-contraction' },
        h('p', { className: 'disclaimer' }, 'Ne remplace pas un avis médical.')
      )
    );
    const footer = view.container.querySelector('[data-dwc="app-footer"]');
    const avertissement = footer.querySelector('.disclaimer');

    assert.ok(avertissement, 'l’avertissement doit être rendu');
    assert.equal(
      footer.firstElementChild,
      avertissement,
      'il se lit AVANT les liens : c’est la position qu’aucune autre prop n’atteint'
    );
    // Et il reste DANS le repère de pied de page, ce que l'imbrication de deux
    // `<footer>` interdisait.
    assert.equal(footer.tagName, 'FOOTER');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('`links` accueille une destination INTERNE, que le socle ne sait pas faire', async () => {
  const dom = setupDom();
  try {
    // Un `Link` de routeur est, dans le DOM, un `<a href>` sans `target` : ce
    // qui compte est qu'on ne quitte pas l'app.
    const view = await mount(
      h(AppFooter, {
        links: h('a', { href: '/a-propos', className: 'about' }, 'À propos'),
      })
    );
    const interne = view.container.querySelector('.about');

    assert.ok(interne, 'le lien de l’app doit être rendu');
    assert.equal(
      interne.getAttribute('target'),
      null,
      'une destination interne ne s’ouvre pas dans un onglet'
    );
    // Le lien sponsor du socle reste là, après celui de l'app.
    const sponsor = view.container.querySelector('[data-dwc="footer-sponsor"]');
    assert.ok(sponsor);
    // `DOCUMENT_POSITION_FOLLOWING` : le sponsor vient APRÈS le lien de l'app.
    assert.ok(
      interne.compareDocumentPosition(sponsor) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      'les liens de l’app se lisent avant ceux du socle'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le pied de page de miss-contraction, en entier', async () => {
  // Les quatre éléments de son tableau, cette fois tous exprimables : un
  // avertissement, un lien interne, le sponsor, et pas de lien source — son
  // pied de page n'en a jamais eu.
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        AppFooter,
        {
          links: h('a', { href: '/a-propos' }, 'À propos et version'),
        },
        h('p', { className: 'disclaimer' }, 'Ne remplace pas un avis médical.')
      )
    );
    const footer = view.container.querySelector('[data-dwc="app-footer"]');

    assert.equal(
      footer.querySelector('.disclaimer').textContent.slice(0, 4),
      'Ne r'
    );
    assert.ok(footer.querySelector('a[href="/a-propos"]'));
    assert.ok(footer.querySelector('[data-dwc="footer-sponsor"]'));
    assert.equal(
      footer.querySelector('[data-dwc="footer-source"]'),
      null,
      'sans repoUrl, pas de lien source — le pied de page d’ici n’en a pas'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans `children` ni `links`, le pied de page ne change pas', async () => {
  // Six apps l'importent déjà : les deux ajouts sont additifs, et c'est ce
  // test qui l'exige.
  const dom = setupDom();
  try {
    const view = await mount(
      h(AppFooter, { repoUrl: 'https://github.com/mister-guiiug/miss-dice' })
    );
    const footer = view.container.querySelector('[data-dwc="app-footer"]');
    assert.equal(
      footer.children.length,
      2,
      'exactement le lien source et le lien sponsor'
    );
    assert.equal(
      footer.firstElementChild.getAttribute('data-dwc'),
      'footer-source'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});
