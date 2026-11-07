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

/**
 * `after` — LE TROISIÈME EMPLACEMENT, ET IL A FALLU UNE MIGRATION POUR LE
 * VOIR. La 3.31.0 ajoutait `children` et `links` en pensant couvrir le pied de
 * page de miss-contraction, tableau de besoins à l'appui. La migration a buté
 * sur son quatrième élément.
 *
 * Son numéro n'est pas `version` mais `deploymentVersion`, de la forme
 * `1.2.3+1756…`, et `AppVersion` passe par `formatVersion`, qui SUPPRIME le
 * `+buildId` — or c'est lui, et lui seul, qui permet de vérifier qu'un
 * déploiement a pris. Aucune combinaison de `children` et `links` ne place un
 * paragraphe en dernier, et un `order` CSS aurait menti à l'ordre de lecture.
 *
 * Deux emplacements conçus depuis un tableau de besoins en couvraient trois
 * sur quatre. C'est en migrant qu'on l'a su.
 */
test('`after` rend en dernier ce que `version` ne sait pas rendre', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        AppFooter,
        {
          links: h('a', { href: '/a-propos' }, 'À propos et version'),
          after: h('p', { className: 'deploiement' }, '1.2.3+1756abc'),
        },
        h('p', { className: 'disclaimer' }, 'Ne remplace pas un avis médical.')
      )
    );
    const footer = view.container.querySelector('[data-dwc="app-footer"]');
    const deploiement = footer.querySelector('.deploiement');

    assert.ok(deploiement, 'le paragraphe de l’app doit être rendu');
    assert.equal(
      footer.lastElementChild,
      deploiement,
      'en DERNIER : c’est toute la raison d’être de cet emplacement'
    );
    // Et le `+buildId` survit, là où `AppVersion` l'aurait mangé.
    assert.match(deploiement.textContent, /\+1756abc$/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le pied de page de miss-contraction, ses quatre éléments dans l’ordre', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        AppFooter,
        {
          links: h('a', { href: '/a-propos' }, 'À propos et version'),
          after: h('p', { className: 'version' }, '1.2.3+1756abc'),
        },
        h('p', { className: 'disclaimer' }, 'Ne remplace pas un avis médical.')
      )
    );
    const footer = view.container.querySelector('[data-dwc="app-footer"]');
    assert.deepEqual(
      [...footer.children].map(
        noeud =>
          noeud.className ||
          noeud.getAttribute('data-dwc') ||
          noeud.getAttribute('href')
      ),
      ['disclaimer', '/a-propos', 'footer-sponsor', 'version'],
      'avertissement, lien interne, sponsor, numéro de déploiement'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/**
 * `issues` — LE SIGNALEMENT AVEC SON CONTEXTE. Aucune app du parc n'avait de
 * lien de signalement structuré (05/09/2026) : les rapports arrivaient sans
 * version, et la première réponse était « quelle version ? ». Le lien vise
 * le gabarit `bug.yml` du compte, prérempli par `issue-report`.
 */
test('`issues` ajoute un troisième lien, vers le gabarit d’anomalie prérempli', async () => {
  const dom = setupDom();
  try {
    globalThis.__DWC_BUILD__ = { version: '2.1.0', commit: '0123456789' };
    const view = await mount(
      h(AppFooter, {
        repoUrl: 'https://github.com/mister-guiiug/miss-dice',
        issues: true,
        env: {},
      })
    );
    const lien = view.container.querySelector('[data-dwc="footer-issues"]');
    assert.ok(lien, 'le lien de signalement est rendu');
    const url = new URL(lien.getAttribute('href'));
    assert.equal(
      url.origin + url.pathname,
      'https://github.com/mister-guiiug/miss-dice/issues/new'
    );
    assert.equal(url.searchParams.get('template'), 'bug.yml');
    assert.equal(url.searchParams.get('version'), 'v2.1.0 (0123456)');
    // Un lien sortant, sécurisé comme les deux autres.
    assert.equal(lien.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(lien.textContent, 'Signaler un problème');
    // Après le sponsor, avant le numéro : l'ordre de lecture des liens. Sans
    // adresse de contact, le seul ajout du 07/11/2026 est l'idée.
    const footer = view.container.querySelector('[data-dwc="app-footer"]');
    assert.deepEqual(
      [...footer.children].map(el => el.getAttribute('data-dwc')),
      ['footer-source', 'footer-sponsor', 'footer-issues', 'footer-idea']
    );
    await view.unmount();
  } finally {
    delete globalThis.__DWC_BUILD__;
    dom.restore();
  }
});

test('`issues` sans `repoUrl` ne rend rien, et accepte gabarit et libellé', async () => {
  const dom = setupDom();
  try {
    const muet = await mount(h(AppFooter, { issues: true }));
    assert.equal(
      muet.container.querySelector('[data-dwc="footer-issues"]'),
      null
    );
    await muet.unmount();

    const view = await mount(
      h(AppFooter, {
        repoUrl: 'https://github.com/o/r',
        sponsorUrl: null,
        issues: { template: 'feature.yml', label: 'Une idée ?' },
      })
    );
    const lien = view.container.querySelector('[data-dwc="footer-issues"]');
    assert.equal(lien.textContent, 'Une idée ?');
    assert.match(lien.getAttribute('href'), /template=feature\.yml/);
    // Le signalement pointe déjà sur le gabarit d'évolution : pas de doublon.
    assert.equal(
      view.container.querySelector('[data-dwc="footer-idea"]'),
      null
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/**
 * LE SIGNALEMENT SANS COMPTE GITHUB (07/11/2026). Sur tout le compte, aucune
 * issue n'avait jamais été écrite par un utilisateur des apps : `issues/new`
 * exige un compte, et leurs publics — médecins, trésoriers, parents — n'en
 * ont pas. Deux voies s'ajoutent au lien GitHub, qui garde son libellé et sa
 * place (les e2e du parc le cherchent par son nom exact).
 */
const REPO = 'https://github.com/mister-guiiug/miss-genius';
const paramsDe = href => new URLSearchParams(href.slice(href.indexOf('?') + 1));
const marqueurs = footer =>
  [...footer.children].map(el => el.getAttribute('data-dwc'));

test('VITE_PRIVACY_CONTACT ouvre « Signaler par e-mail », juste après le lien GitHub', async () => {
  const dom = setupDom();
  try {
    globalThis.__DWC_BUILD__ = { version: '2.1.0', commit: '0123456789' };
    const view = await mount(
      h(AppFooter, {
        repoUrl: REPO,
        issues: true,
        env: { VITE_PRIVACY_CONTACT: 'contact@exemple.fr' },
      })
    );
    const footer = view.container.querySelector('[data-dwc="app-footer"]');
    assert.deepEqual(marqueurs(footer), [
      'footer-source',
      'footer-sponsor',
      'footer-issues',
      'footer-mail',
      'footer-idea',
    ]);
    // Le lien GitHub n'a pas bougé d'un mot.
    assert.equal(
      footer.querySelector('[data-dwc="footer-issues"]').textContent,
      'Signaler un problème'
    );
    const mail = footer.querySelector('[data-dwc="footer-mail"]');
    assert.equal(mail.textContent, 'Signaler par e-mail');
    // Un `mailto:` n'ouvre pas d'onglet : pas de `target`.
    assert.equal(mail.getAttribute('target'), null);
    const href = mail.getAttribute('href');
    assert.match(href, /^mailto:contact@exemple\.fr\?/);
    const params = paramsDe(href);
    // Le nom du dépôt sert de nom d'app, dans l'objet et le contexte.
    assert.equal(params.get('subject'), 'Signalement : miss-genius');
    assert.match(params.get('body'), /Application : miss-genius/);
    assert.match(params.get('body'), /Version : v2\.1\.0 \(0123456\)/);
    await view.unmount();
  } finally {
    delete globalThis.__DWC_BUILD__;
    dom.restore();
  }
});

test('le courrier suit la langue de l’app, et relit l’écran au clic', async () => {
  const dom = setupDom();
  try {
    const { LabelsProvider } = await import('../react/labels.js');
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(AppFooter, {
          repoUrl: REPO,
          issues: true,
          env: { VITE_PRIVACY_CONTACT: 'contact@exemple.fr' },
        })
      )
    );
    const mail = view.container.querySelector('[data-dwc="footer-mail"]');
    assert.equal(mail.textContent, 'Report by email');
    assert.equal(
      view.container.querySelector('[data-dwc="footer-idea"]').textContent,
      'Suggest an idea'
    );
    const params = paramsDe(mail.getAttribute('href'));
    assert.equal(params.get('subject'), 'Problem report: miss-genius');
    assert.match(params.get('body'), /^Describe what you expected/);

    // La route change sans que le pied de page se rende : l'écran est relu
    // au clic, comme pour le lien GitHub.
    window.history.pushState({}, '', '/miss-genius/reglages');
    mail.addEventListener('click', e => e.preventDefault());
    mail.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(
      paramsDe(mail.getAttribute('href')).get('body'),
      /Écran : \/miss-genius\/reglages/
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('la prop `contact` l’emporte sur la variable, `null` retire le lien', async () => {
  const dom = setupDom();
  try {
    const env = { VITE_PRIVACY_CONTACT: 'variable@exemple.fr' };
    const prop = await mount(
      h(AppFooter, { repoUrl: REPO, issues: true, env, contact: 'prop@x.fr' })
    );
    assert.match(
      prop.container
        .querySelector('[data-dwc="footer-mail"]')
        .getAttribute('href'),
      /^mailto:prop@x\.fr\?/
    );
    await prop.unmount();

    const retire = await mount(
      h(AppFooter, { repoUrl: REPO, issues: true, env, contact: null })
    );
    assert.equal(
      retire.container.querySelector('[data-dwc="footer-mail"]'),
      null
    );
    await retire.unmount();
  } finally {
    dom.restore();
  }
});

test('un contact qui n’est pas une adresse, ou une app sans `issues` : pas de courrier', async () => {
  const dom = setupDom();
  try {
    // Une URL de formulaire est légitime pour le panneau de confidentialité,
    // pas pour un `mailto:`.
    const url = await mount(
      h(AppFooter, {
        repoUrl: REPO,
        issues: true,
        env: { VITE_PRIVACY_CONTACT: 'https://exemple.fr/contact' },
      })
    );
    assert.equal(url.container.querySelector('[data-dwc="footer-mail"]'), null);
    await url.unmount();

    // Sans `issues`, l'app n'a pas demandé de canal de retour : rien ne
    // change, ni courrier ni idée.
    const sans = await mount(
      h(AppFooter, {
        repoUrl: REPO,
        env: { VITE_PRIVACY_CONTACT: 'contact@exemple.fr' },
      })
    );
    assert.deepEqual(
      marqueurs(sans.container.querySelector('[data-dwc="app-footer"]')),
      ['footer-source', 'footer-sponsor']
    );
    await sans.unmount();
  } finally {
    dom.restore();
  }
});

test('« Proposer une idée » ouvre feature.yml dans un onglet ; `idea: false` le retire', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(AppFooter, { repoUrl: REPO, issues: true, env: {} })
    );
    const idee = view.container.querySelector('[data-dwc="footer-idea"]');
    assert.equal(idee.textContent, 'Proposer une idée');
    assert.equal(
      idee.getAttribute('href'),
      `${REPO}/issues/new?template=feature.yml`
    );
    assert.equal(idee.getAttribute('rel'), 'noopener noreferrer');
    await view.unmount();

    const sansIdee = await mount(
      h(AppFooter, { repoUrl: REPO, issues: { idea: false }, env: {} })
    );
    assert.equal(
      sansIdee.container.querySelector('[data-dwc="footer-idea"]'),
      null
    );
    assert.ok(
      sansIdee.container.querySelector('[data-dwc="footer-issues"]'),
      'le signalement reste'
    );
    await sansIdee.unmount();
  } finally {
    dom.restore();
  }
});

test('un dictionnaire d’app sans les nouvelles clés retombe sur le français', async () => {
  const dom = setupDom();
  try {
    const { LabelsProvider } = await import('../react/labels-core.js');
    const ancien = {
      footer: { source: 'Source', sponsor: 'Café', issues: 'Bug ?' },
    };
    const view = await mount(
      h(
        LabelsProvider,
        { dictionary: ancien },
        h(AppFooter, {
          repoUrl: REPO,
          issues: true,
          env: { VITE_PRIVACY_CONTACT: 'contact@exemple.fr' },
        })
      )
    );
    assert.equal(
      view.container.querySelector('[data-dwc="footer-issues"]').textContent,
      'Bug ?'
    );
    // Un lien sans libellé n'aurait pas de nom accessible.
    assert.equal(
      view.container.querySelector('[data-dwc="footer-mail"]').textContent,
      'Signaler par e-mail'
    );
    assert.equal(
      view.container.querySelector('[data-dwc="footer-idea"]').textContent,
      'Proposer une idée'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});
