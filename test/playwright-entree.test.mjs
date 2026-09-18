/**
 * La garde de l'écran d'entrée.
 *
 * Le socle n'a pas Playwright : on ne peut pas jouer la garde en entier ici.
 * Ce qui SE prouve sans lui — la lecture de la couture de mesure, le
 * refus d'une combinaison d'options qui ne veut rien dire, l'enchaînement des
 * appels — se prouve avec une fausse page. Le reste est éprouvé dans une app
 * réelle (`miss-uwh`), qui, elle, a Playwright.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bloqueMesure,
  expectEcranEntreeCable,
  HOTES_MESURE,
  litServiceWorkers,
  litVuesDePage,
} from '../playwright-entree.js';

/** Une page Playwright réduite à ce que la garde lui demande. */
function faussePage({ mesure = [], serviceWorkers = 0, bandeau = true } = {}) {
  const journal = [];
  return {
    journal,
    async route(motif, gestionnaire) {
      journal.push(`route ${motif}`);
      this.gestionnaireRoute = gestionnaire;
    },
    async goto(url) {
      journal.push(`goto ${url}`);
    },
    async evaluate(fn) {
      // Le code s'exécute « dans la page » : on lui prête nos globales.
      // `navigator` n'a qu'un GETTER sous Node : une affectation simple lève
      // `Cannot set property navigator`. D'où `defineProperty`, et la
      // restitution du descripteur d'origine.
      const avantDL = globalThis.__DWC_MESURE;
      const descNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      globalThis.__DWC_MESURE = mesure;
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          serviceWorker: {
            getRegistrations: async () => Array(serviceWorkers).fill({}),
          },
        },
        configurable: true,
        writable: true,
      });
      try {
        return await fn();
      } finally {
        globalThis.__DWC_MESURE = avantDL;
        if (descNav) Object.defineProperty(globalThis, 'navigator', descNav);
        else delete globalThis.navigator;
      }
    },
    locator(sel) {
      journal.push(`locator ${sel}`);
      return {
        async click() {
          journal.push(`click ${sel}`);
        },
        __sel: sel,
        __visible: bandeau,
      };
    },
  };
}

/** Un `expect` minimal, qui note ce qu'on lui demande et lève comme Playwright. */
function fauxExpect(echecs) {
  const f = (valeur, message) => ({
    async toBeVisible() {
      if (!valeur.__visible)
        echecs.push(message ?? `invisible ${valeur.__sel}`);
    },
    toBeGreaterThan(n) {
      if (!(valeur > n)) echecs.push(message ?? `${valeur} <= ${n}`);
    },
  });
  return f;
}

test('seules les vues de page sont retenues, pas les autres événements', async () => {
  // La couture retient TOUT ce que l'app a demandé d'envoyer ; la garde n'y
  // cherche que les vues. Un `$pageview` noyé dans des clics doit sortir.
  const page = faussePage({
    mesure: [
      { event: 'lancer', des: 2 },
      { event: '$pageview', $pathname: '/accueil' },
      { event: 'export' },
      { event: '$pageview', $pathname: '/aide' },
    ],
  });
  const vues = await litVuesDePage(page);
  assert.equal(vues.length, 2);
  assert.deepEqual(
    vues.map(v => v.$pathname),
    ['/accueil', '/aide']
  );
});

test('une couture vide ou absente ne lève pas', async () => {
  assert.deepEqual(await litVuesDePage(faussePage({ mesure: [] })), []);
});

test('les service workers sont comptés', async () => {
  assert.equal(await litServiceWorkers(faussePage({ serviceWorkers: 2 })), 2);
  assert.equal(await litServiceWorkers(faussePage({ serviceWorkers: 0 })), 0);
});

test('bloqueMesure pose bien une route', async () => {
  const page = faussePage();
  await bloqueMesure(page);
  const motif = page.journal.find(l => l.startsWith('route'));
  assert.match(motif, /posthog/u);
});

test('le motif d’hôtes est ANCRÉ, et ne se laisse pas imiter', () => {
  for (const url of [
    'https://eu.i.posthog.com/e/',
    'http://posthog.com/x',
    'https://eu-assets.i.posthog.com/static/array.js',
  ]) {
    assert.ok(HOTES_MESURE.test(url), `devrait reconnaître ${url}`);
  }
  // Sans ancre, les trois premières passaient : c'est exactement le défaut que
  // CodeQL a refusé.
  for (const url of [
    'https://evil-posthog.com.attaquant.net/x',
    'https://attaquant.net/?u=https://eu.i.posthog.com/e/',
    'https://posthog.com.attaquant.net/',
    'https://notposthog.com/e/',
  ]) {
    assert.ok(!HOTES_MESURE.test(url), `ne devrait PAS reconnaître ${url}`);
  }
});

test('vérifier la vue sans le consentement est refusé', async () => {
  // Rien ne part avant l'accord : cette combinaison vérifierait à vide, et
  // passerait toujours. Mieux vaut lever que rassurer à tort.
  await assert.rejects(
    () =>
      expectEcranEntreeCable(faussePage(), fauxExpect([]), {
        consentement: false,
        vueDePage: true,
      }),
    /ne peut pas être vérifié/u
  );
});

test('le parcours complet : question, accord, vue, service worker', async () => {
  const echecs = [];
  const page = faussePage({
    mesure: [{ event: '$pageview', $pathname: '/connexion' }],
    serviceWorkers: 1,
  });
  await expectEcranEntreeCable(page, fauxExpect(echecs), {
    url: '/miss-uwh/',
    timeout: 200,
  });
  assert.deepEqual(echecs, [], 'aucune vérification ne doit échouer');
  // L'ordre compte : on n'accepte pas avant d'avoir vu la question.
  const indexBandeau = page.journal.findIndex(l =>
    l.includes('consent-banner')
  );
  const indexClic = page.journal.findIndex(l => l.startsWith('click'));
  assert.ok(indexBandeau >= 0 && indexClic > indexBandeau);
  assert.ok(page.journal.includes('goto /miss-uwh/'));
});

test('sans vue de page, la garde échoue en le disant', async () => {
  const echecs = [];
  const page = faussePage({ mesure: [], serviceWorkers: 1 });
  await expectEcranEntreeCable(page, fauxExpect(echecs), { timeout: 200 });
  assert.equal(echecs.length, 1);
  assert.match(echecs[0], /usePageViews.*n’est pas monté/u);
});

test('sans service worker, la garde échoue en le disant', async () => {
  const echecs = [];
  const page = faussePage({
    mesure: [{ event: '$pageview' }],
    serviceWorkers: 0,
  });
  await expectEcranEntreeCable(page, fauxExpect(echecs), { timeout: 200 });
  assert.equal(echecs.length, 1);
  assert.match(echecs[0], /service worker/u);
});

test('une app sans mesure peut ne garder que le service worker', async () => {
  const echecs = [];
  const page = faussePage({ mesure: [], serviceWorkers: 1, bandeau: false });
  await expectEcranEntreeCable(page, fauxExpect(echecs), {
    consentement: false,
    timeout: 200,
  });
  assert.deepEqual(echecs, []);
  // Et on n'a NI cherché le bandeau NI cliqué.
  assert.ok(!page.journal.some(l => l.startsWith('click')));
});
