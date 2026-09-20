/**
 * `BottomNav` — sept barres maison, quatre défauts d'accessibilité.
 *
 * Chaque test nomme l'app où le défaut a été relevé. Une barre d'onglets est le
 * repère de navigation principal d'une PWA : ce qui s'y perd se perd partout.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, Suspense, use, useState } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { BottomNav } from '../react/bottom-nav.js';
import { LabelsProvider } from '../react/labels.js';

const ITEMS = [
  { href: '/', label: 'Accueil' },
  { href: '/historique', label: 'Historique' },
  { href: '/reglages', label: 'Réglages' },
];

test('placement="fixed" colle la barre ; par défaut elle reste dans le flux', async () => {
  // Huit dépôts recopiaient `position: fixed; inset-inline: 0; bottom: 0` :
  // la règle vit désormais dans components.css, derrière cet attribut.
  const dom = setupDom();
  try {
    const flux = await mount(h(BottomNav, { items: ITEMS, currentPath: '/' }));
    assert.equal(
      flux.container.querySelector('nav').hasAttribute('data-placement'),
      false,
      'rien ne change pour qui ne le demande pas'
    );
    await flux.unmount();

    const collee = await mount(
      h(BottomNav, { items: ITEMS, currentPath: '/', placement: 'fixed' })
    );
    assert.equal(
      collee.container.querySelector('nav').getAttribute('data-placement'),
      'fixed'
    );
    await collee.unmount();
  } finally {
    dom.restore();
  }
});

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

/* ── Le clic qui répond, le morceau qui arrive avant ───────────────────── */

/**
 * Le 20/09/2026, dix apps ont appris la même chose : react-router navigue dans
 * `startTransition`, React 19 garde l'écran courant, et le `<Suspense
 * fallback>` d'une route ne paraît JAMAIS sur un clic. Quatre d'entre elles,
 * sur cette barre, ont dû écrire un `linkComponent` maison parce que
 * `onNavigate(item)` ne recevait pas l'évènement.
 *
 * Le harnais ci-dessous est celui de leurs tests : une coquille, une barre, et
 * un écran dont le TEST décide de l'arrivée.
 */
function ecranDiffere() {
  let livrer;
  const promesse = new Promise(resolve => {
    livrer = resolve;
  });
  function Ecran({ path }) {
    // `use` sur une promesse stable : l'écran suspend tant qu'elle n'est pas
    // tenue — exactement ce que fait un `lazy()` dont le morceau n'est pas là.
    if (path === '/historique') use(promesse);
    return h('h1', null, path === '/historique' ? 'Historique' : 'Accueil');
  }
  return { Ecran, livrer: () => livrer() };
}

function Coquille({ Ecran, items, espion }) {
  const [path, setPath] = useState('/');
  const navigate = to => {
    espion?.(to);
    setPath(to);
  };
  return h(
    'div',
    null,
    h(BottomNav, { items, currentPath: path, navigate }),
    h(
      Suspense,
      { fallback: h('p', { 'data-repli': '' }, 'repli') },
      h(Ecran, { path })
    )
  );
}

const ICONES = [
  { href: '/', label: 'Accueil', icon: h('i', { 'data-icone': 'accueil' }) },
  {
    href: '/historique',
    label: 'Historique',
    icon: h('i', { 'data-icone': 'historique' }),
  },
];

test('`navigate` : l’entrée cliquée se dit occupée tant que le morceau n’est pas là — et elle seule', async () => {
  const dom = setupDom();
  try {
    const { Ecran, livrer } = ecranDiffere();
    const allers = [];
    const view = await mount(
      h(Coquille, { Ecran, items: ICONES, espion: to => allers.push(to) })
    );
    const lien = view.container.querySelector('a[href="/historique"]');
    const accueil = view.container.querySelector('a[href="/"]');
    const vive = view.container.querySelector('nav [role="status"]');
    assert.ok(vive, 'la zone vive existe dès le montage, hors des liens');
    assert.equal(vive.textContent, '');
    assert.equal(vive.closest('a'), null);

    await view.act(() => lien.click());

    assert.deepEqual(allers, ['/historique'], 'la barre a navigué elle-même');
    assert.equal(
      view.container.querySelector('h1').textContent,
      'Accueil',
      'l’écran précédent reste à l’écran pendant l’attente'
    );
    assert.equal(
      view.container.querySelector('[data-repli]'),
      null,
      'le repli de route ne paraît pas : c’est la ligne qui dit pourquoi la barre doit parler'
    );
    assert.equal(lien.getAttribute('aria-busy'), 'true');
    assert.ok(lien.hasAttribute('data-pending'));
    assert.equal(accueil.getAttribute('aria-busy'), null, 'elle seule');
    assert.equal(
      accueil.getAttribute('aria-current'),
      'page',
      'l’onglet courant ne change pas avant la route'
    );
    assert.ok(
      lien.querySelector('[data-dwc="bottom-nav-icon"] svg'),
      'la pastille qui tourne remplace l’icône de l’entrée'
    );
    assert.equal(lien.querySelector('[data-icone="historique"]'), null);
    assert.equal(vive.textContent, 'Chargement de la page…');
    assert.equal(
      lien.textContent,
      'Historique',
      'le nom accessible du lien ne bouge pas'
    );

    await view.act(async () => {
      livrer();
    });

    assert.equal(view.container.querySelector('h1').textContent, 'Historique');
    assert.equal(lien.getAttribute('aria-busy'), null);
    assert.equal(lien.hasAttribute('data-pending'), false);
    assert.ok(
      lien.querySelector('[data-icone="historique"]'),
      'l’icône revient'
    );
    assert.equal(lien.getAttribute('aria-current'), 'page');
    assert.equal(vive.textContent, '');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('un clic à modificateur reste au navigateur : rien ne se met en attente', async () => {
  const dom = setupDom();
  try {
    const { Ecran } = ecranDiffere();
    const allers = [];
    const view = await mount(
      h(Coquille, { Ecran, items: ICONES, espion: to => allers.push(to) })
    );
    const lien = view.container.querySelector('a[href="/historique"]');
    const clic = new dom.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      button: 0,
    });
    await view.act(() => lien.dispatchEvent(clic));
    assert.equal(clic.defaultPrevented, false, 'le navigateur garde le clic');
    assert.deepEqual(allers, []);
    assert.equal(lien.getAttribute('aria-busy'), null);
    assert.equal(view.container.querySelector('h1').textContent, 'Accueil');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('`onNavigate` reçoit l’évènement, et peut laisser le clic au navigateur', async () => {
  const dom = setupDom();
  try {
    const recus = [];
    function Garde() {
      const [path, setPath] = useState('/');
      return h(BottomNav, {
        items: ICONES,
        currentPath: path,
        navigate: setPath,
        onNavigate: (item, event) => {
          recus.push([item.href, typeof event?.preventDefault]);
          // L'app a tranché : ce clic-là n'est pas une navigation.
          if (item.href === '/historique') event.preventDefault();
        },
      });
    }
    const view = await mount(h(Garde));
    const lien = view.container.querySelector('a[href="/historique"]');
    await view.act(() => lien.click());
    assert.deepEqual(recus, [['/historique', 'function']]);
    assert.equal(
      lien.getAttribute('aria-busy'),
      null,
      'un clic déjà tranché par l’app n’ouvre pas de transition'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('`load` : le morceau part à l’approche, une seule fois, et pas au clic', async () => {
  const dom = setupDom();
  try {
    let appels = 0;
    const chargeHistorique = () => {
      appels += 1;
      return Promise.resolve();
    };
    const view = await mount(
      h(BottomNav, {
        items: [
          { href: '/', label: 'Accueil' },
          { href: '/historique', label: 'Historique', load: chargeHistorique },
        ],
        currentPath: '/',
      })
    );
    const lien = view.container.querySelector('a[href="/historique"]');
    assert.equal(appels, 0, 'rien ne part au montage');

    // Le focus, pour la navigation au clavier ; React l'écoute en `focusin`.
    await view.act(() =>
      lien.dispatchEvent(
        new dom.window.FocusEvent('focusin', { bubbles: true })
      )
    );
    assert.equal(appels, 1);
    // Le doigt ensuite : `prefetch` dédoublonne, le morceau est déjà demandé.
    await view.act(() =>
      lien.dispatchEvent(new dom.window.Event('touchstart', { bubbles: true }))
    );
    assert.equal(appels, 1);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans `navigate` ni `load`, la barre ne change pas d’un attribut', async () => {
  const dom = setupDom();
  try {
    const view = await mount(h(BottomNav, { items: ITEMS, currentPath: '/' }));
    const nav = view.container.querySelector('nav');
    assert.equal(nav.querySelector('[role="status"]'), null);
    assert.equal(nav.querySelector('[aria-busy]'), null);
    assert.equal(nav.querySelector('[data-pending]'), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('un `linkComponent` maison garde SES props : la barre muette ne les écrase pas', async () => {
  // LA RÉGRESSION DE LA 6.3.1, EN UN TEST. Passer `'aria-busy': undefined` ne
  // coûte rien sur le `<a>` par défaut — React n'écrit pas un attribut
  // `undefined` — mais un composant de lien MAISON reçoit les props en objet
  // et les étale :
  //
  //   <Link to={to} aria-busy={…} {...reste} />
  //
  // L'étalement vient après, la clé existe, et `undefined` écrase la valeur de
  // l'app. Quatre dépôts du parc écrivent cette ligne, et la 6.3.1 leur a
  // éteint leur propre `aria-busy`. Le test d'alors ne montait que le lien par
  // défaut : il ne pouvait pas le voir.
  const dom = setupDom();
  try {
    // Le lien de l'app décide lui-même qui est occupé, et le socle n'a pas
    // d'avis : aucun `navigate` n'est passé.
    const LienMaison = ({ href, ...reste }) =>
      h('a', {
        href,
        'aria-busy': href === '/historique' ? 'true' : undefined,
        ...reste,
      });

    const view = await mount(
      h(BottomNav, {
        items: ITEMS,
        currentPath: '/',
        linkComponent: LienMaison,
      })
    );
    const lien = view.container.querySelector('a[href="/historique"]');
    assert.equal(
      lien.getAttribute('aria-busy'),
      'true',
      'la barre a écrasé l’aria-busy que l’app posait elle-même'
    );
    // Et elle ne pose aucun gestionnaire d'intention sans `load`.
    assert.equal(view.container.querySelector('[data-pending]'), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('avec `navigate`, la barre reprend la main sur l’attente — même sur un lien maison', async () => {
  // L'autre bord : le silence ne doit pas devenir de l'impuissance. Dès que
  // l'app délègue la navigation, c'est la barre qui sait qui attend.
  const dom = setupDom();
  try {
    const { Ecran, livrer } = ecranDiffere();
    const LienMaison = ({ href, ...reste }) => h('a', { href, ...reste });
    function Coque() {
      const [path, setPath] = useState('/');
      return h(
        'div',
        null,
        h(BottomNav, {
          items: ICONES,
          currentPath: path,
          navigate: setPath,
          linkComponent: LienMaison,
        }),
        h(Suspense, { fallback: null }, h(Ecran, { path }))
      );
    }
    const view = await mount(h(Coque));
    const lien = view.container.querySelector('a[href="/historique"]');
    await view.act(() => lien.click());
    assert.equal(lien.getAttribute('aria-busy'), 'true');
    await view.act(async () => {
      livrer();
    });
    assert.equal(lien.getAttribute('aria-busy'), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});
