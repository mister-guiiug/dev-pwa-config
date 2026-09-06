// `issue-report` — l'URL d'un signalement prérempli : ce que l'application
// sait et que l'utilisateur ne sait jamais dire.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ISSUE_TEMPLATE,
  currentIssueReportUrl,
  currentRoute,
  describeEnvironment,
  issueReportUrl,
  versionLine,
} from '../issue-report.js';
import { BUILD_INFO_GLOBAL } from '../version.js';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FIREFOX_ANDROID =
  'Mozilla/5.0 (Android 15; Mobile; rv:142.0) Gecko/142.0 Firefox/142.0';
const EDGE_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';
const SAFARI_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const sansDom = { navigator: null, window: null };

test('l’URL vise issues/new du dépôt, avec le gabarit et les champs du gabarit', () => {
  const url = issueReportUrl({
    repoUrl: 'https://github.com/mister-guiiug/miss-genius/',
    version: '1.2.0',
    commit: 'abc1234def',
    buildTime: '2026-09-06T10:00:00.000Z',
    route: '/reglages',
    environment: 'Chrome 140, Windows, ordinateur',
    fields: { reproduire: '1. Ouvrir les réglages', journal: '' },
  });
  const u = new URL(url);
  // Le `/` final du dépôt ne produit pas `//issues`.
  assert.equal(
    u.origin + u.pathname,
    'https://github.com/mister-guiiug/miss-genius/issues/new'
  );
  assert.equal(u.searchParams.get('template'), ISSUE_TEMPLATE);
  assert.equal(
    u.searchParams.get('version'),
    'v1.2.0 (abc1234), compilée le 2026-09-06'
  );
  assert.equal(
    u.searchParams.get('environnement'),
    'Chrome 140, Windows, ordinateur — écran /reglages'
  );
  assert.equal(u.searchParams.get('reproduire'), '1. Ouvrir les réglages');
  // Un champ vide est omis : GitHub montre alors son texte d'aide.
  assert.equal(u.searchParams.has('journal'), false);
  assert.equal(u.searchParams.has('title'), false);
});

test('sans dépôt, pas de lien ; sans rien d’autre, un lien vers le gabarit nu', () => {
  assert.equal(issueReportUrl({}), '');
  assert.equal(
    issueReportUrl({
      repoUrl: 'https://github.com/o/r',
      template: 'feature.yml',
    }),
    'https://github.com/o/r/issues/new?template=feature.yml'
  );
});

test('versionLine : la version, le commit court, la date — chacun facultatif', () => {
  assert.equal(
    versionLine({ version: '1.2.0', commit: 'abc1234def' }),
    'v1.2.0 (abc1234)'
  );
  assert.equal(versionLine({ version: '1.2.0' }), 'v1.2.0');
  assert.equal(versionLine({ commit: 'abc1234def' }), 'abc1234');
  assert.equal(
    versionLine({ buildTime: '2026-09-06T10:00:00Z' }),
    'compilée le 2026-09-06'
  );
  assert.equal(versionLine({}), '');
  // Un numéro de déploiement qui n'est pas du SemVer passe tel quel.
  assert.equal(versionLine({ version: 'build-42' }), 'build-42');
});

test('describeEnvironment reconnaît le navigateur, le système et l’appareil', () => {
  assert.equal(
    describeEnvironment({ userAgent: CHROME_WINDOWS, ...sansDom }),
    'Chrome 140, Windows, ordinateur'
  );
  assert.equal(
    describeEnvironment({ userAgent: SAFARI_IPHONE, ...sansDom }),
    'Safari 17, iOS 17, téléphone'
  );
  assert.equal(
    describeEnvironment({ userAgent: FIREFOX_ANDROID, ...sansDom }),
    'Firefox 142, Android 15, téléphone'
  );
  // Edge se déguise en Chrome : c'est sa marque qui gagne.
  assert.equal(
    describeEnvironment({ userAgent: EDGE_MAC, ...sansDom }),
    'Edge 140, macOS, ordinateur'
  );
  assert.equal(
    describeEnvironment({ userAgent: SAFARI_IPAD, ...sansDom }),
    'Safari 17, iOS 17, tablette'
  );
  assert.equal(describeEnvironment({ userAgent: '', ...sansDom }), '');
});

test('une app installée le dit — c’est souvent la moitié du diagnostic', () => {
  const fenetre = { matchMedia: () => ({ matches: true }) };
  assert.equal(
    describeEnvironment({
      userAgent: CHROME_WINDOWS,
      navigator: null,
      window: fenetre,
    }),
    'Chrome 140, Windows, ordinateur, installée'
  );
  // Une `matchMedia` qui lève (vieux WebView) n'empêche pas la description.
  const casse = {
    matchMedia: () => {
      throw new Error('non');
    },
  };
  assert.equal(
    describeEnvironment({
      userAgent: CHROME_WINDOWS,
      navigator: null,
      window: casse,
    }),
    'Chrome 140, Windows, ordinateur'
  );
});

test('currentRoute rend chemin, requête et fragment — une app en # route dans le fragment', () => {
  assert.equal(currentRoute(null), '');
  assert.equal(
    currentRoute({
      location: { pathname: '/mister-doc/', search: '', hash: '#/notes/3' },
    }),
    '/mister-doc/#/notes/3'
  );
});

test('currentIssueReportUrl lit le build injecté par vite-version, et rien sous Node', () => {
  const avant = globalThis[BUILD_INFO_GLOBAL];
  globalThis[BUILD_INFO_GLOBAL] = {
    version: '3.4.5',
    commit: 'fedcba9876',
    buildTime: '2026-09-06T08:00:00Z',
  };
  try {
    const u = new URL(
      currentIssueReportUrl({ repoUrl: 'https://github.com/o/r' })
    );
    assert.equal(
      u.searchParams.get('version'),
      'v3.4.5 (fedcba9), compilée le 2026-09-06'
    );
    // Ni fenêtre ni navigateur sous Node : le champ est simplement absent.
    assert.equal(u.searchParams.has('environnement'), false);
  } finally {
    globalThis[BUILD_INFO_GLOBAL] = avant;
  }
});
