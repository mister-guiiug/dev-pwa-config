/**
 * `pwa-doctor` — `entree-hors-precache` : un morceau que l'entrée importe
 * STATIQUEMENT et que le service worker ne précache pas.
 *
 * Relevé le 05/11/2026 en rechargeant la production hors ligne : mister-qowa,
 * mister-settle et miss-ticket-pwa ne démarraient plus. Toutes trois nomment
 * leur morceau Sentry `assets/sentry.js` et l'excluent du précache
 * (`globIgnores`), comme quinze autres apps ; chez elles, Rolldown y avait
 * rangé React, et l'entrée commençait par `import{n}from"./sentry.js"`. Hors
 * ligne, ce fichier manque, l'import statique échoue, et rien ne monte. Ni le
 * docteur, ni le budget, ni les e2e ne l'avaient vu.
 *
 * Les builds factices ci-dessous reprennent la FORME de la production de
 * mister-qowa (index.html, en-tête minifié de l'entrée, manifeste Workbox), en
 * quelques octets.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { diagnose, importsStatiques } from '../scripts/pwa-doctor.mjs';

/** Un dépôt factice à partir d'une carte chemin → contenu. */
function repo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-doctor-precache-'));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      typeof content === 'string' ? content : JSON.stringify(content)
    );
  }
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const ID = 'entree-hors-precache';
const trouve = root => diagnose(root).findings.find(f => f.id === ID);

const INDEX = 'index-6t9x8ACQ.js';
const RUNTIME = 'rolldown-runtime-XKyaHtl9.js';

/** `index.html` tel que Vite l'écrit sous `/miss-x/` : l'entrée, et ses préchargements. */
const page = (preloads = [RUNTIME]) =>
  [
    '<!doctype html><html lang="fr"><head>',
    '<meta name="viewport" content="width=device-width">',
    `<script type="module" crossorigin src="/miss-x/assets/${INDEX}"></script>`,
    ...preloads.map(
      p => `<link rel="modulepreload" crossorigin href="/miss-x/assets/${p}">`
    ),
    '</head><body><div id="root"></div></body></html>',
  ].join('\n');

/** Le `sw.js` de `generateSW` : chargeur AMD, puis le manifeste de précache. */
const sw = urls =>
  'if(!self.define){let s,e={};}define(["./workbox-35e397ac"],function(s){"use strict";' +
  `s.precacheAndRoute([{url:"index.html",revision:"1ffb"},${urls
    .map(u => `{url:"assets/${u}",revision:null}`)
    .join(',')}],{}),s.cleanupOutdatedCaches()});`;

/** Le cas de mister-qowa : l'entrée importe STATIQUEMENT le morceau exclu. */
const QOWA = {
  'package.json': { name: 'miss-x' },
  'dist/index.html': page(),
  [`dist/assets/${INDEX}`]:
    `import{r as e,t}from"./${RUNTIME}";import{n}from"./sentry.js";` +
    '(function(){})();var x=n(()=>import(`./en-CBgUlS20.js`));',
  [`dist/assets/${RUNTIME}`]: 'var e=Object.create;export{e as r,e as t};',
  'dist/assets/sentry.js': `import{n as e}from"./${RUNTIME}";var r=Symbol.for(\`react.transitional.element\`);export{e as n};`,
  'dist/assets/en-CBgUlS20.js': 'export const en={};',
  'dist/workbox-35e397ac.js': 'define(["exports"],function(t){});',
  'dist/sw.js': sw([INDEX, RUNTIME, 'en-CBgUlS20.js']),
};

test('défaut : l’entrée importe statiquement un morceau hors précache', () => {
  repo(QOWA, root => {
    const f = trouve(root);
    assert.ok(f, 'le morceau manquant hors ligne est signalé');
    assert.equal(f.level, 'défaut', 'l’app ne démarre pas : c’est un défaut');
    assert.match(
      f.message,
      /assets\/sentry\.js/,
      'le message NOMME le fichier'
    );
    assert.match(
      f.message,
      new RegExp(`${INDEX.replace('.', '\\.')} → sentry\\.js`),
      'et la chaîne d’import qui l’amène au démarrage'
    );
    assert.match(f.fix, /globIgnores/, 'la piste : le motif qui l’exclut');
  });
});

test('la fermeture est transitive : un morceau précaché qui importe l’exclu', () => {
  repo(
    {
      ...QOWA,
      [`dist/assets/${INDEX}`]: `import{r as e}from"./${RUNTIME}";import{t}from"./vendor-Ck_iTwKK.js";`,
      'dist/assets/vendor-Ck_iTwKK.js': `import{n}from"./sentry.js";export{n as t};`,
      'dist/sw.js': sw([INDEX, RUNTIME, 'vendor-Ck_iTwKK.js']),
    },
    root => {
      const f = trouve(root);
      assert.ok(f, 'deux sauts plus loin, le fichier manque tout autant');
      assert.match(f.message, /→ vendor-Ck_iTwKK\.js → sentry\.js/);
    }
  );
});

test('un préchargement (`modulepreload`) hors précache compte aussi', () => {
  // Vite ne précharge que ce que l'entrée importe statiquement : c'est la même
  // dépendance, vue depuis la page.
  repo(
    {
      ...QOWA,
      'dist/index.html': page([RUNTIME, 'react-vendor-KPuNr9iS.js']),
      [`dist/assets/${INDEX}`]: `import{r as e}from"./${RUNTIME}";`,
      'dist/assets/react-vendor-KPuNr9iS.js': 'export const r=1;',
      'dist/sw.js': sw([INDEX, RUNTIME]),
    },
    root => {
      const f = trouve(root);
      assert.ok(f, 'le préchargement exclu est signalé');
      assert.match(f.message, /react-vendor-KPuNr9iS\.js/);
    }
  );
});

test('sain : le morceau exclu n’est importé que DYNAMIQUEMENT', () => {
  // Le cas de miss-badminton et de treize autres : `initSentry` charge le SDK à
  // la demande, et l'exclure du précache est exactement le but.
  repo(
    {
      ...QOWA,
      [`dist/assets/${INDEX}`]:
        `import{r as e,t}from"./${RUNTIME}";` +
        'var s=()=>import(`./sentry.js`),p=()=>import("./sentry.js");',
    },
    root => {
      assert.equal(
        trouve(root),
        undefined,
        'un import() ne bloque pas le démarrage'
      );
    }
  );
});

test('sain : tout ce que l’entrée importe statiquement est précaché', () => {
  repo({ ...QOWA, 'dist/sw.js': sw([INDEX, RUNTIME, 'sentry.js']) }, root => {
    assert.equal(trouve(root), undefined);
  });
});

test('sans service worker, le contrôle se TAIT — contre-épreuve comprise', () => {
  // Sans précache, rien n'est servi hors ligne : il n'y a pas de démarrage hors
  // ligne à casser. Le même build, avec le sw, est signalé.
  const sansSw = { ...QOWA };
  delete sansSw['dist/sw.js'];
  repo(sansSw, root => {
    assert.equal(trouve(root), undefined, 'pas de sw : rien à conclure');
  });
  repo(QOWA, root => {
    assert.ok(trouve(root), 'le MÊME build avec un sw est signalé');
  });
});

test('un manifeste illisible ne fait rien accuser', () => {
  // Un sw dont on ne sait pas lire le précache (injectManifest mal branché,
  // `self.__WB_MANIFEST` resté tel quel) : le contrôle ne sait pas, il se tait.
  repo(
    { ...QOWA, 'dist/sw.js': 'precacheAndRoute(self.__WB_MANIFEST);' },
    root => {
      assert.equal(trouve(root), undefined);
    }
  );
});

test('le manifeste peut vivre dans un script importé par le worker', () => {
  repo(
    {
      ...QOWA,
      'dist/sw.js':
        'importScripts("precache-manifest.js");precacheAndRoute(self.__precacheManifest);',
      'dist/precache-manifest.js': `self.__precacheManifest=[${[
        INDEX,
        RUNTIME,
        'sentry.js',
      ]
        .map(u => `{"url":"assets/${u}","revision":null}`)
        .join(',')}];`,
    },
    root => {
      assert.equal(
        trouve(root),
        undefined,
        'sentry.js est précaché par le fichier importé : pas de faux défaut'
      );
    }
  );
});

test('un refus motivé l’éteint sans le cacher', () => {
  repo(
    {
      ...QOWA,
      'package.json': {
        name: 'miss-x',
        pwaDoctor: {
          refus: { [ID]: 'télécommande : rien à faire hors ligne' },
        },
      },
    },
    root => {
      const f = trouve(root);
      assert.equal(f?.level, 'refus');
      assert.match(f.raison, /télécommande/);
    }
  );
});

test('importsStatiques : les formes statiques, minifiées ou non — jamais import()', () => {
  const code = [
    'import"./effet.js";',
    "import './effet-espace.js';",
    'import e from"./defaut.js";',
    'import*as ns from"./espace.js";',
    "import d,{a as b}from'./mixte.js';",
    'import {\n  x,\n  y\n} from "./multi.js";',
    'export*from"./tout.js";',
    'export{a as b}from"./reexport.js";',
    'export * as m from "./ns-reexport.js";',
    'import{q}from"posthog-js";',
    // Rien de ce qui suit n'est un import statique.
    'const l=()=>import(`./dyn.js`),k=()=>import("./dyn2.js");',
    'const u=new URL(`./w.js`,import.meta.url);',
    'export{l,k};',
    'o.import("./methode.js");',
  ].join('\n');
  assert.deepEqual(importsStatiques(code), [
    './effet.js',
    './effet-espace.js',
    './defaut.js',
    './espace.js',
    './mixte.js',
    './multi.js',
    './tout.js',
    './reexport.js',
    './ns-reexport.js',
    'posthog-js',
  ]);
});
