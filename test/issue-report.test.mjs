// `issue-report` — l'URL d'un signalement prérempli : ce que l'application
// sait et que l'utilisateur ne sait jamais dire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FEATURE_TEMPLATE,
  ISSUE_TEMPLATE,
  currentIssueReportMailto,
  currentIssueReportUrl,
  currentRoute,
  describeEnvironment,
  emailAddress,
  featureRequestUrl,
  issueReportMailto,
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

/*
 * Le lien part dans une issue PUBLIQUE. Les cas viennent du parc, relevé du
 * 07/11/2026 : le jeton d'invitation de miss-carbook en requête, ceux de
 * mister-settle, mister-miss-koh et miss-holi-voyage dans la route.
 */
test('currentRoute ne recopie aucun secret de l’adresse dans l’issue publique', () => {
  const route = (pathname, search = '', hash = '') =>
    currentRoute({ location: { pathname, search, hash } });

  // Requête : les noms restent, les valeurs opaques partent.
  assert.equal(
    route('/miss-carbook/', '?invite=9f2c4e1a7b&tab=2'),
    '/miss-carbook/?invite=…&tab=…'
  );
  // Jetons dans la route d'une app en # : hexadécimal, base64url, code court.
  assert.equal(
    route('/mister-settle/', '', '#/invitation/' + 'a1b2c3d4'.repeat(6)),
    '/mister-settle/#/invitation/…'
  );
  assert.equal(
    route('/mister-miss-koh/', '', '#/partage/notes/Zx-9_QpL0mNbVc3T'),
    '/mister-miss-koh/#/partage/notes/…'
  );
  assert.equal(
    route('/miss-holi-voyage/', '', '#/rejoindre/KPQZMWHT'),
    '/miss-holi-voyage/#/rejoindre/…'
  );
  // Un retour d'authentification, ou une ancre : pas une route, retiré.
  assert.equal(
    route('/miss-uwh/', '', '#access_token=eyJhbGciOi&type=recovery'),
    '/miss-uwh/'
  );
  // La requête d'une route en # suit la même règle.
  assert.equal(
    route('/miss-genius/', '', '#/notes?code=4f9a1c2e7d'),
    '/miss-genius/#/notes?code=…'
  );
  // Ce qui dit où l'on est reste lisible.
  assert.equal(
    route('/miss-arcade/', '', '#/guides/installer-une-borne'),
    '/miss-arcade/#/guides/installer-une-borne'
  );
});

/*
 * 6.34.0 retirait toutes les valeurs : miss-ticket-pwa range ses écrans en
 * `?vue=…`, et ses signalements ne disaient plus lequel. Un mot garde sa
 * valeur ; un nom qui porte un secret ou une saisie la perd quand même.
 */
test('currentRoute garde la valeur d’un paramètre qui dit où l’on est', () => {
  const route = (search, hash = '') =>
    currentRoute({ location: { pathname: '/app/', search, hash } });

  // Un mot, composé ou non, sous un nom neutre : gardé.
  assert.equal(route('?vue=historique'), '/app/?vue=historique');
  assert.equal(
    route('?tab=entretiens&filtre=en-pause'),
    '/app/?tab=entretiens&filtre=en-pause'
  );
  assert.equal(
    route('', '#/projets?statut=archives'),
    '/app/#/projets?statut=archives'
  );
  // Ni nombre, ni identifiant, ni majuscule, ni texte encodé : un code PIN,
  // un numéro de dossier, un code de partie, une saisie à deux mots.
  assert.equal(
    route('?page=2&id=4821&partie=ABCDEF&titre=deux%20mots&t=a+b'),
    '/app/?page=…&id=…&partie=…&titre=…&t=…'
  );
  // Un nom qui porte un secret ou un texte saisi perd sa valeur, même
  // lisible : `?code=bonjour` est un code, `?q=diabete` une recherche.
  for (const nom of [
    'code',
    'invite',
    'access_token',
    'pin',
    'password',
    'q',
    'search',
    'email',
    'recherche',
  ]) {
    assert.equal(route(`?${nom}=bonjour`), `/app/?${nom}=…`, nom);
  }
  // Sans valeur, ou vide : le nom seul ne dit rien de plus.
  assert.equal(route('?debug&vue='), '/app/?debug=…&vue=…');
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

/**
 * LE CONTRAT ENTRE `issue-report` ET LE FORMULAIRE DU SOCLE. GitHub ne
 * préremplit un champ que si son `id` correspond à un paramètre de l'URL : un
 * paramètre sans champ est perdu EN SILENCE, sans erreur nulle part. C'est
 * arrivé — le `bug.yml` du socle n'avait pas de champ `environnement` avant le
 * 23/09/2026, et l'environnement d'un signalement parti d'un pied de page
 * disparaissait sans trace.
 *
 * Les paramètres sont tirés d'un VRAI appel, pas recopiés : si `issue-report`
 * en émet un nouveau demain, ce test dira que le formulaire ne sait pas le
 * recevoir. Les `id:` sont lus au texte — le socle n'a pas de parseur YAML, et
 * ce format plat n'en demande pas.
 */
test('chaque paramètre émis par issue-report a son champ dans le bug.yml du socle', () => {
  const url = new URL(
    issueReportUrl({
      repoUrl: 'https://github.com/mister-guiiug/dev-pwa-config',
      version: '6.7.1',
      commit: 'abc1234def',
      buildTime: '2026-09-23T10:00:00.000Z',
      route: '/',
      environment: 'Node 26, Firefox 156',
    })
  );
  const emis = [...url.searchParams.keys()].filter(
    k => k !== 'template' && k !== 'title'
  );
  const gabarit = readFileSync(
    new URL('../.github/ISSUE_TEMPLATE/bug.yml', import.meta.url),
    'utf8'
  );
  const champs = new Set(
    [...gabarit.matchAll(/^\s+id:\s*(\S+)\s*$/gm)].map(m => m[1])
  );

  assert.ok(
    emis.includes('version') && emis.includes('environnement'),
    `issue-report doit émettre version et environnement, a émis : ${emis.join(', ')}`
  );
  assert.deepEqual(
    emis.filter(p => !champs.has(p)),
    [],
    'paramètres émis sans champ dans le formulaire — perdus en silence'
  );
});

/**
 * LE SIGNALEMENT SANS COMPTE GITHUB (07/11/2026). `issues/new` exige un
 * compte ; aucune issue du compte n'avait jamais été écrite par un
 * utilisateur des apps. Le `mailto:` porte le même contexte, adressé au
 * contact que le dépôt déclare pour le panneau de confidentialité.
 */
test('« Proposer une idée » vise feature.yml, sans version ni environnement', () => {
  assert.equal(FEATURE_TEMPLATE, 'feature.yml');
  assert.equal(
    featureRequestUrl({
      repoUrl: 'https://github.com/mister-guiiug/miss-dice/',
    }),
    'https://github.com/mister-guiiug/miss-dice/issues/new?template=feature.yml'
  );
  assert.equal(featureRequestUrl({}), '');
});

/**
 * Le gabarit d'évolution est celui du dépôt `.github` du compte ; le socle en
 * porte une copie (il a son propre `ISSUE_TEMPLATE/`, et n'hérite donc pas de
 * celui du compte). Le nom visé doit exister.
 */
test('le gabarit visé par featureRequestUrl existe dans le socle', () => {
  const gabarit = readFileSync(
    new URL(`../.github/ISSUE_TEMPLATE/${FEATURE_TEMPLATE}`, import.meta.url),
    'utf8'
  );
  assert.match(gabarit, /^body:/m);
});

test('emailAddress : une adresse, `mailto:` retiré — tout le reste se tait', () => {
  assert.equal(emailAddress('t4da3r2qk@mozmail.com'), 't4da3r2qk@mozmail.com');
  assert.equal(emailAddress('  mailto:a.b+c@exemple.fr '), 'a.b+c@exemple.fr');
  // Ce que `VITE_PRIVACY_CONTACT` pourrait légitimement porter, et qui n'est
  // pas une adresse : le lien ne doit pas ouvrir un brouillon sans destinataire.
  for (const valeur of [
    '',
    '   ',
    undefined,
    null,
    42,
    'https://exemple.fr/contact',
    'Mister GuiiuG',
    'a@b',
    'a@b.fr, c@d.fr',
    'a@b.fr?cc=c@d.fr',
    'Nom <a@b.fr>',
    'a@b@c.fr',
    'a@.fr',
    'a@fr.',
    '@b.fr',
  ]) {
    assert.equal(emailAddress(valeur), '', String(valeur));
  }
});

test('emailAddress reste linéaire sur l’entrée que CodeQL a construite', () => {
  // js/polynomial-redos sur le premier motif, d'un seul tenant : « !@!. »
  // suivi de « !. » répété. Mesuré le 07/11/2026, ce motif-là croissait au
  // carré — 65 ms à 10 000 répétitions, 262 ms à 20 000 — ; les deux tests
  // par partie restent linéaires.
  const piege = `!@!.${'!.'.repeat(50_000)}`;
  const debut = performance.now();
  assert.equal(emailAddress(piege), '');
  assert.ok(performance.now() - debut < 500, 'trop lent : motif ambigu ?');
});

test('issueReportMailto : objet, consigne, puis le contexte du gabarit', () => {
  const url = issueReportMailto({
    to: 'contact@exemple.fr',
    app: 'miss-genius',
    version: '1.2.0',
    commit: 'abc1234def',
    buildTime: '2026-09-06T10:00:00.000Z',
    route: '/reglages?onglet=notes',
    environment: 'Chrome 140, Windows, ordinateur',
  });
  assert.match(url, /^mailto:contact@exemple\.fr\?subject=/);
  // `encodeURIComponent`, jamais `+` pour l'espace : la plupart des clients
  // de messagerie lisent un `+` littéralement (RFC 6068).
  assert.doesNotMatch(url, /\+/);
  const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
  assert.equal(params.get('subject'), 'Signalement : miss-genius');
  const corps = params.get('body');
  assert.ok(
    corps.startsWith('Décrivez ce qui était attendu'),
    'la consigne ouvre le courrier'
  );
  // Fins de ligne CRLF, et deux lignes vides où écrire avant le contexte.
  assert.match(corps, /reproduire :\r\n\r\n\r\n—\r\n/);
  assert.match(corps, /Application : miss-genius\r\n/);
  assert.match(corps, /Version : v1\.2\.0 \(abc1234\), compilée le 2026-09-06/);
  assert.match(corps, /Environnement : Chrome 140, Windows, ordinateur/);
  assert.match(corps, /Écran : \/reglages\?onglet=notes$/);
});

test('issueReportMailto : objet et consigne traduits, contexte omis s’il manque', () => {
  const url = issueReportMailto({
    to: 'mailto:contact@exemple.fr',
    subject: 'Problem report: miss-dice',
    intro: 'Describe what you expected:',
  });
  const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
  assert.equal(params.get('subject'), 'Problem report: miss-dice');
  assert.equal(params.get('body'), 'Describe what you expected:\r\n\r\n');
  // Sans adresse valide : pas de lien du tout.
  assert.equal(issueReportMailto({ to: 'https://exemple.fr' }), '');
  assert.equal(issueReportMailto({}), '');
});

test('currentIssueReportMailto lit le build injecté par vite-version', () => {
  const avant = globalThis[BUILD_INFO_GLOBAL];
  globalThis[BUILD_INFO_GLOBAL] = { version: '3.4.5', commit: 'fedcba9876' };
  try {
    const url = currentIssueReportMailto({ to: 'a@b.fr', app: 'mister-doc' });
    const corps = new URLSearchParams(url.slice(url.indexOf('?') + 1)).get(
      'body'
    );
    assert.match(corps, /Version : v3\.4\.5 \(fedcba9\)/);
    // Ni fenêtre ni navigateur sous Node : ni écran ni environnement.
    assert.doesNotMatch(corps, /Écran|Environnement/);
  } finally {
    globalThis[BUILD_INFO_GLOBAL] = avant;
  }
});
