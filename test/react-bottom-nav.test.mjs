/**
 * `BottomNav` — sept barres maison, quatre défauts d'accessibilité.
 *
 * Chaque test nomme l'app où le défaut a été relevé. Une barre d'onglets est le
 * repère de navigation principal d'une PWA : ce qui s'y perd se perd partout.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { BottomNav } from '../react/bottom-nav.js';
import { LabelsProvider } from '../react/labels.js';

const ITEMS = [
  { href: '/', label: 'Accueil' },
  { href: '/historique', label: 'Historique' },
  { href: '/reglages', label: 'Réglages' },
];

test('le repère de navigation a toujours un nom', async () => {
  // miss-contraction, mister-doc et mister-footcoach n'en posent aucun : deux
  // `<nav>` anonymes sont indiscernables dans la liste des repères.
  const dom = setupDom();
  try {
    const view = await mount(h(BottomNav, { items: ITEMS, currentPath: '/' }));
    const nav = view.container.querySelector('nav');
    assert.equal(nav.getAttribute('aria-label'), 'Navigation principale');
    await view.unmount();

    const en = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(BottomNav, { items: ITEMS, currentPath: '/' })
      )
    );
    assert.equal(
      en.container.querySelector('nav').getAttribute('aria-label'),
      'Main navigation'
    );
    await en.unmount();
  } finally {
    dom.restore();
  }
});

test('l’onglet courant ne tient pas à la seule couleur', async () => {
  // mister-cim10, mister-doc, miss-lookhouse et miss-supaboss ne changent que
  // l'encre — WCAG 1.4.1, et invisible en contraste forcé.
  const dom = setupDom();
  try {
    const view = await mount(
      h(BottomNav, { items: ITEMS, currentPath: '/historique' })
    );
    const courant = view.container.querySelector('[aria-current="page"]');
    assert.ok(courant, 'aucun onglet ne se déclare courant');
    assert.match(courant.textContent, /Historique/);
    // Le crochet d'habillage…
    assert.ok(courant.hasAttribute('data-current'));
    // …et le texte lu, qui ne dépend d'aucune feuille de style.
    assert.match(courant.textContent, /Page actuelle/);

    const autres = [
      ...view.container.querySelectorAll('[data-dwc="bottom-nav-item"]'),
    ]
      .filter(node => node !== courant)
      .map(node => node.getAttribute('aria-current'));
    assert.deepEqual(autres, [null, null]);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('la racine ne préfixe pas tout le reste', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(BottomNav, { items: ITEMS, currentPath: '/reglages/theme' })
    );
    const courants = [
      ...view.container.querySelectorAll('[aria-current="page"]'),
    ].map(node => node.textContent);
    assert.equal(courants.length, 1, '« / » a capturé une sous-route');
    assert.match(courants[0], /Réglages/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('la pastille est lue, pas seulement dessinée', async () => {
  // miss-lookhouse pose `aria-label="3 non lues"` sur un `<span>` : un
  // `aria-label` sur un élément sans rôle n'est pas restitué.
  const dom = setupDom();
  try {
    const view = await mount(
      h(BottomNav, {
        items: [
          ...ITEMS,
          {
            href: '/alertes',
            label: 'Alertes',
            badge: 3,
            badgeLabel: '3 non lues',
          },
        ],
        currentPath: '/',
        maxVisible: 5,
      })
    );
    const badge = view.container.querySelector('[data-dwc="bottom-nav-badge"]');
    assert.equal(badge.getAttribute('aria-label'), null);
    assert.match(badge.textContent, /3 non lues/);
    // Le chiffre visible est masqué aux technologies d'assistance, sinon il
    // serait lu deux fois.
    assert.equal(badge.querySelector('[aria-hidden="true"]').textContent, '3');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('une pastille à zéro ne s’affiche pas', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(BottomNav, {
        items: [{ href: '/', label: 'Accueil', badge: 0 }],
        currentPath: '/',
      })
    );
    assert.equal(
      view.container.querySelector('[data-dwc="bottom-nav-badge"]'),
      null
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le bouton « Plus » se déclare ouvert et dit ce qu’il ouvre', async () => {
  // mister-footcoach ouvre son tiroir depuis un `<button>` sans `aria-expanded`
  // ni `aria-controls` ; miss-contraction, même motif, pose les deux.
  const dom = setupDom();
  try {
    const items = Array.from({ length: 7 }, (_, index) => ({
      href: `/p${index}`,
      label: `Page ${index}`,
    }));
    const view = await mount(
      h(BottomNav, { items, currentPath: '/p0', maxVisible: 4 })
    );

    // Trois onglets visibles + le bouton : la place du bouton est réservée.
    assert.equal(
      view.container.querySelectorAll('[data-dwc="bottom-nav-item"]').length,
      3
    );
    const plus = view.container.querySelector('[data-dwc="bottom-nav-more"]');
    assert.equal(plus.getAttribute('aria-expanded'), 'false');

    const tiroir = view.container.querySelector(
      '#' + plus.getAttribute('aria-controls')
    );
    assert.ok(tiroir, 'aria-controls ne pointe vers rien');
    assert.equal(tiroir.hidden, true);
    // Les quatre restantes sont bien dans le tiroir, aucune n'est perdue.
    assert.equal(
      tiroir.querySelectorAll('[data-dwc="bottom-nav-drawer-item"]').length,
      4
    );

    await view.act(() => plus.click());
    assert.equal(plus.getAttribute('aria-expanded'), 'true');
    assert.equal(tiroir.hidden, false);

    await view.act(() => {
      document.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    assert.equal(plus.getAttribute('aria-expanded'), 'false');
    assert.equal(
      document.activeElement,
      plus,
      'le focus est resté dans le vide'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans débordement, ni bouton ni tiroir', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(BottomNav, { items: ITEMS, currentPath: '/', maxVisible: 5 })
    );
    assert.equal(
      view.container.querySelector('[data-dwc="bottom-nav-more"]'),
      null
    );
    assert.equal(
      view.container.querySelector('[data-dwc="bottom-nav-drawer"]'),
      null
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le composant de lien est branchable, sans dépendre d’un routeur', async () => {
  const dom = setupDom();
  try {
    const vus = [];
    const FauxLien = props => {
      vus.push(props.to);
      return h(
        'a',
        { href: props.to, ...props, to: undefined },
        props.children
      );
    };
    const view = await mount(
      h(BottomNav, {
        items: ITEMS,
        currentPath: '/',
        linkComponent: FauxLien,
        hrefProp: 'to',
      })
    );
    assert.deepEqual(vus, ['/', '/historique', '/reglages']);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('onNavigate reçoit l’élément choisi et referme le tiroir', async () => {
  const dom = setupDom();
  try {
    const items = Array.from({ length: 6 }, (_, index) => ({
      href: `/p${index}`,
      label: `Page ${index}`,
    }));
    const choisis = [];
    const view = await mount(
      h(BottomNav, {
        items,
        currentPath: '/p0',
        maxVisible: 3,
        onNavigate: item => choisis.push(item.href),
      })
    );
    const plus = view.container.querySelector('[data-dwc="bottom-nav-more"]');
    await view.act(() => plus.click());
    const premier = view.container.querySelector(
      '[data-dwc="bottom-nav-drawer-item"]'
    );
    await view.act(() => premier.click());
    assert.deepEqual(choisis, ['/p2']);
    assert.equal(plus.getAttribute('aria-expanded'), 'false');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── Les deux manques qu'une app avait nommés ───────────────────────────── */

/**
 * miss-contraction a REFUSÉ de migrer, et a écrit pourquoi dans son propre
 * `BottomNav.tsx`. Sa dernière ligne est une demande : « À DEMANDER AU SOCLE
 * si la migration doit un jour aboutir : un emplacement libre en fin de barre
 * (`trailing`), et une accroche d'habillage par élément. »
 *
 * Les deux tests ci-dessous montent exactement sa barre : quatre destinations,
 * un appel maternité en bouton d'action, et une cinquième cellule qui n'est pas
 * une destination du tout.
 */

test('`trailing` accueille une cellule qui n’est PAS une destination', async () => {
  // La cinquième cellule de miss-contraction est un `<button>` qui ouvre le
  // tiroir de l'app, avec `aria-expanded` et `aria-controls`. Le bouton
  // « Plus » interne lui ressemble mais fait autre chose : il déplie SON
  // tiroir d'onglets en surnombre. Même balisage, autre mécanique.
  const dom = setupDom();
  try {
    const view = await mount(
      h(BottomNav, {
        items: ITEMS,
        currentPath: '/',
        trailing: h(
          'button',
          {
            type: 'button',
            'aria-expanded': false,
            'aria-controls': 'app-drawer',
            className: 'menu',
          },
          'Menu'
        ),
      })
    );
    const bouton = view.container.querySelector('button.menu');
    assert.ok(bouton, 'le bouton de l’app doit être rendu');
    assert.equal(bouton.getAttribute('aria-controls'), 'app-drawer');
    assert.equal(
      bouton.closest('nav')?.getAttribute('data-dwc'),
      'bottom-nav',
      'il doit être DANS le repère, sinon il sort de la barre'
    );
    // En dernier : une cellule d'action se lit après les destinations.
    assert.equal(
      view.container.querySelector('nav').lastElementChild,
      bouton,
      'la cellule libre se rend en fin de barre'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('un élément peut porter son propre habillage', async () => {
  // L'appel maternité de miss-contraction est un bouton d'action, pas un
  // onglet : gros disque en relief, libellé masqué visuellement. `key` ne
  // descend pas dans le DOM, et un sélecteur sur le `href` ne tiendrait pas —
  // les chemins sont traduits dans sept langues.
  const dom = setupDom();
  try {
    const view = await mount(
      h(BottomNav, {
        currentPath: '/',
        items: [
          { href: '/', label: 'Accueil' },
          { href: '/maternite', label: 'Appeler', className: 'cta' },
        ],
      })
    );
    const cta = view.container.querySelector('.cta');
    assert.ok(cta, 'la classe de l’élément doit atteindre le DOM');
    assert.equal(cta.getAttribute('href'), '/maternite');
    assert.equal(
      view.container.querySelectorAll('.cta').length,
      1,
      'elle ne doit habiller QUE cet élément'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans `trailing` ni `className`, la barre ne change pas', async () => {
  // Six apps importent déjà cette barre : les deux ajouts sont additifs, et
  // c'est ce test qui l'exige.
  const dom = setupDom();
  try {
    const view = await mount(h(BottomNav, { items: ITEMS, currentPath: '/' }));
    const nav = view.container.querySelector('nav');
    assert.equal(nav.children.length, ITEMS.length);
    for (const lien of nav.querySelectorAll('a')) {
      assert.equal(
        lien.getAttribute('class'),
        null,
        'aucune classe ne doit apparaître quand l’app n’en demande pas'
      );
    }
    await view.unmount();
  } finally {
    dom.restore();
  }
});
