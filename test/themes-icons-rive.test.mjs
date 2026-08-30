/**
 * Trois domaines, trois défauts mesurés.
 *
 *  - THÈMES : six clés de stockage distinctes dans la famille, contre
 *    `dwc_theme` côté paquet. Sans migration, adopter le socle PERD la
 *    préférence de l'utilisateur — une fois, en silence.
 *  - ICÔNES : dix apps sur seize sur `lucide-react`, 149 symboles distincts,
 *    et zéro adoption d'`IconsProvider`.
 *  - RIVE : `find -name '*.riv'` renvoie ZÉRO fichier sur les seize dépôts.
 *    Le repli n'est pas l'exception, c'est le cas nominal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';

import {
  DEFAULT_STORAGE_KEY,
  stripThemeColorMeta,
  themeBootSource,
  themeColorMetaTags,
} from '../theme-boot.js';
import { ThemeProvider } from '../react/theme-provider.js';
import { useTheme } from '../react/use-theme.js';
import { DEFAULT_ICONS, IconsProvider, Icon } from '../react/icons-context.js';
import { LUCIDE_NAMES, lucideIconSet } from '../react/icons-lucide.js';
import { RiveAnimation } from '../react/rive.js';
import { mount, renderHook, setupDom } from './helpers/dom.mjs';

/* ── Thèmes ────────────────────────────────────────────────────────────── */

/** Exécute le script de boot dans un faux environnement, et rend le stockage. */
function runBoot(source, stored, prefersDark = false) {
  const store = { ...stored };
  const root = {
    setAttribute: () => {},
    classList: { toggle: () => {} },
    style: {},
  };
  new Function('document', 'localStorage', 'window', source)(
    { documentElement: root },
    {
      getItem: key => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
    },
    { matchMedia: () => ({ matches: prefersDark }) }
  );
  return { store, root };
}

test('le script de boot migre une ancienne clé, une seule fois', () => {
  const source = themeBootSource({ legacyKeys: ['lh_theme', 'theme'] });
  const { store } = runBoot(source, { theme: 'dark' });
  // La préférence est retrouvée ET réécrite sous la clé du paquet.
  assert.equal(store[DEFAULT_STORAGE_KEY], 'dark');
  assert.equal(store.theme, 'dark', 'l’ancienne valeur n’est pas effacée');

  // La clé neuve l'emporte toujours sur l'ancienne.
  const { store: deux } = runBoot(source, {
    [DEFAULT_STORAGE_KEY]: 'light',
    theme: 'dark',
  });
  assert.equal(deux[DEFAULT_STORAGE_KEY], 'light');
});

test('sans legacyKeys, le script ne grossit pas d’un octet', () => {
  assert.doesNotMatch(themeBootSource(), /localStorage\.setItem/u);
  assert.match(themeBootSource({ legacyKeys: ['theme'] }), /setItem/u);
});

/**
 * LE SCRIPT ANTI-FOUC CAUSAIT LE FOUC. Rien de stocké, il résolvait TOUJOURS
 * contre `prefers-color-scheme` — en ignorant le `defaultTheme` qu'on lui
 * passait. Or `useTheme` le respecte : une app déclarant `defaultTheme:
 * 'light'` obtenait un premier rendu SOMBRE (système), puis un basculement en
 * clair (React). Exactement le scintillement que ce script existe pour
 * supprimer, causé par lui, et seulement chez les utilisateurs dont le système
 * contredit le défaut de l'app — donc jamais chez celui qui l'a écrit.
 *
 * Constaté en migrant `miss-carbook` (#18).
 */
test('sans valeur stockée, c’est defaultTheme qui tranche — pas le système', () => {
  const peint = source => {
    let vu = null;
    const root = {
      setAttribute: (nom, valeur) => {
        if (nom === 'data-theme') vu = valeur;
      },
      classList: { toggle: () => {} },
      style: {},
    };
    new Function('document', 'localStorage', 'window', source)(
      { documentElement: root },
      { getItem: () => null, setItem: () => {} },
      { matchMedia: () => ({ matches: true }) } // le système dit SOMBRE
    );
    return vu;
  };

  assert.equal(
    peint(themeBootSource({ defaultTheme: 'light' })),
    'light',
    'le défaut de l’app doit l’emporter, sinon React le contredira au rendu suivant'
  );
  assert.equal(peint(themeBootSource({ defaultTheme: 'dark' })), 'dark');
  assert.equal(
    peint(themeBootSource({ defaultTheme: 'system' })),
    'dark',
    '`system` veut dire système : le comportement historique est conservé'
  );
  assert.equal(peint(themeBootSource()), 'dark', 'le défaut reste `system`');
});

test('une valeur stockée l’emporte toujours sur defaultTheme', () => {
  const { store } = runBoot(
    themeBootSource({ defaultTheme: 'light' }),
    { [DEFAULT_STORAGE_KEY]: 'dark' },
    false
  );
  assert.equal(store[DEFAULT_STORAGE_KEY], 'dark');
});

test('useTheme migre aussi, pour une app sans script de boot', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('mister-doc:theme', 'dark');
    const { result, unmount } = await renderHook(() =>
      useTheme({ storageKey: 'dwc_theme', legacyKeys: ['mister-doc:theme'] })
    );
    assert.equal(result.current.theme, 'dark');
    assert.equal(localStorage.getItem('dwc_theme'), 'dark');
    await unmount();
  } finally {
    dom.restore();
  }
});

test('themeColorMetaTags refuse une couleur non crédible', () => {
  const tags = themeColorMetaTags({ light: '#0f766e', dark: '#0b1220' });
  assert.match(tags, /media="\(prefers-color-scheme: light\)"/u);
  assert.match(tags, /media="\(prefers-color-scheme: dark\)"/u);
  // C'est un attribut HTML engendré : un guillemet le refermerait.
  assert.equal(themeColorMetaTags({ light: '" onload=x' }), '');
  assert.equal(themeColorMetaTags({}), '');
});

test('stripThemeColorMeta ne rétrograde pas sur une entrée adverse', () => {
  // CodeQL a signalé le préfixe `[ \t]*` de la première version, et la mesure
  // lui donnait raison : 5 ms pour 2 000 tabulations, 379 ms pour 16 000 —
  // quadratique. L'entrée est le HTML que Vite passe au plugin.
  const evil = '\t'.repeat(200_000) + 'x';
  const start = process.hrtime.bigint();
  assert.equal(stripThemeColorMeta(evil), evil);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  // Budget large à dessein : il ne mesure pas la vitesse, il attrape un retour
  // au comportement quadratique, qui coûterait ici des dizaines de secondes.
  assert.ok(ms < 500, `${ms.toFixed(1)} ms pour 200 000 tabulations`);
});

test('stripThemeColorMeta retire les balises existantes', () => {
  const html = `<head>
    <meta name="theme-color" content="#0f766e" />
    <title>x</title>
  </head>`;
  const out = stripThemeColorMeta(html);
  assert.doesNotMatch(out, /theme-color/u);
  assert.match(out, /<title>x<\/title>/u);
  // La ligne qui ne portait que la balise disparaît avec son indentation…
  assert.doesNotMatch(out, /\n\s*\n\s*<title>/u);
  // …mais une balise au milieu d'une ligne n'emporte pas ses voisines.
  assert.equal(
    stripThemeColorMeta(
      '<p>a</p><meta name="theme-color" content="#fff"><p>b</p>'
    ),
    '<p>a</p><p>b</p>'
  );
});

test('ThemeProvider pose une balise theme-color, et la retire au démontage', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(ThemeProvider, {
        defaultTheme: 'dark',
        storageKey: 'test_theme_color',
        themeColor: { light: '#ffffff', dark: '#000000' },
      })
    );
    const meta = document.head.querySelector('meta[data-dwc="theme-color"]');
    assert.equal(meta.getAttribute('content'), '#000000');
    assert.equal(meta.getAttribute('name'), 'theme-color');
    // En dernier dans le <head> : c'est la balise applicable la plus tardive
    // qui l'emporte, et celle-ci doit battre les balises `media`.
    assert.equal(document.head.lastElementChild, meta);

    await view.unmount();
    assert.equal(
      document.head.querySelector('meta[data-dwc="theme-color"]'),
      null
    );
  } finally {
    dom.restore();
  }
});

/**
 * LE CATALOGUE NE DOIT PLUS VENIR AVEC LE FOURNISSEUR. `themes.js` pèse 22 ko
 * pour dix-sept palettes ; il était importé STATIQUEMENT par
 * `theme-provider.js`, donc embarqué par toute app qui monte le fournisseur —
 * et les quatre du parc le montent **sans passer aucun `appId`**, pour lequel
 * la résolution rendait `null`. +15,6 ko bruts mesurés sur `miss-carbook`, pour
 * zéro variable peinte.
 *
 * Le test porte sur la SOURCE, parce que c'est la seule façon d'observer un
 * import : une fois le module chargé, plus rien ne distingue un import
 * statique d'un import paresseux déjà résolu.
 */
test('ThemeProvider n’importe pas le catalogue statiquement', () => {
  const source = readFileSync(
    new URL('../react/theme-provider.js', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(
    source,
    /^import[^\n]*from\s+'\.\.\/themes\.js'/m,
    'un import statique de themes.js réembarque 22 ko chez toute app qui monte le fournisseur'
  );
  assert.match(
    source,
    /import\(\s*'\.\.\/themes\.js'\s*\)/,
    'la résolution par appId doit rester possible, mais paresseuse'
  );
});

test('une palette passée directement peint sans toucher au catalogue', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(ThemeProvider, {
        defaultTheme: 'dark',
        storageKey: 'test_palette_directe',
        palette: { dark: { primary: '#123456', bg: '#000000' } },
      })
    );
    assert.equal(
      document.documentElement.style.getPropertyValue('--dwc-primary'),
      '#123456'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans appId ni palette, rien n’est peint', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(ThemeProvider, {
        defaultTheme: 'dark',
        storageKey: 'test_sans_palette',
      })
    );
    assert.equal(
      document.documentElement.style.getPropertyValue('--dwc-primary'),
      '',
      'le fournisseur seul unifie l’état ; c’est tokens.css ou l’app qui peint'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── Icônes ────────────────────────────────────────────────────────────── */

test('lucideIconSet normalise sans imposer de dépendance', async () => {
  const dom = setupDom();
  try {
    const Faux = props => h('svg', { ...props, 'data-faux': 'x' });
    const icons = lucideIconSet({ close: Faux }, { strokeWidth: 1.5 });
    assert.equal(icons.close.displayName, 'LucideIcon(close)');

    const view = await mount(
      h(IconsProvider, { icons }, h(Icon, { role: 'close' }))
    );
    const svg = view.container.querySelector('svg');
    // Décorative par défaut : le nom accessible vit sur le bouton parent.
    assert.equal(svg.getAttribute('aria-hidden'), 'true');
    assert.equal(svg.getAttribute('focusable'), 'false');
    assert.equal(svg.getAttribute('stroke-width'), '1.5');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('un aria-label explicite reprend la main sur aria-hidden', async () => {
  const dom = setupDom();
  try {
    const Faux = props => h('svg', props);
    const icons = lucideIconSet({ close: Faux });
    const view = await mount(
      h(
        IconsProvider,
        { icons },
        h(Icon, { role: 'close', 'aria-label': 'Fermer' })
      )
    );
    const svg = view.container.querySelector('svg');
    assert.equal(svg.getAttribute('aria-hidden'), null);
    assert.equal(svg.getAttribute('aria-label'), 'Fermer');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('lucideIconSet couvre les rôles que le paquet réclame', () => {
  // La table de noms est de la documentation exécutable : si un rôle apparaît
  // dans le paquet sans y figurer, un branchement se fera à l'aveugle.
  assert.deepEqual(
    Object.keys(LUCIDE_NAMES).sort(),
    Object.keys(DEFAULT_ICONS).sort()
  );
  // Une entrée vide est ignorée plutôt que rendue comme composant nul.
  assert.deepEqual(lucideIconSet({ close: null }), {});
});

/* ── Rive ──────────────────────────────────────────────────────────────── */

test('runtime absent : le repli s’affiche, l’écran ne disparaît pas', async () => {
  const dom = setupDom();
  try {
    const erreurs = [];
    const view = await mount(
      h(RiveAnimation, {
        src: '/animations/absente.riv',
        loader: () => Promise.reject(new Error('runtime absent')),
        fallback: h('p', null, 'repli'),
        onError: error => erreurs.push(error),
      })
    );
    // Laisse le rejet du lazy() remonter jusqu'à la frontière.
    await view.act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    assert.match(view.container.textContent, /repli/u);
    assert.equal(erreurs.length, 1);
    assert.equal(erreurs[0].message, 'runtime absent');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('mouvement réduit : le runtime n’est même pas chargé', async () => {
  const dom = setupDom();
  try {
    dom.setMediaQuery('(prefers-reduced-motion: reduce)', true);
    let appelé = false;
    const view = await mount(
      h(RiveAnimation, {
        src: '/x.riv',
        loader: () => {
          appelé = true;
          return Promise.resolve({ Rive: () => null });
        },
        fallback: h('p', null, 'statique'),
      })
    );
    assert.match(view.container.textContent, /statique/u);
    assert.equal(appelé, false);
    await view.unmount();
  } finally {
    dom.restore();
  }
});
