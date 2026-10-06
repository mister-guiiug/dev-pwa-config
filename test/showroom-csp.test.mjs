// La Content-Security-Policy du showroom, et ce qu'elle suppose du code.
//
// Le showroom partage son origine avec les vingt applications de la famille :
// une injection de script ici lirait leur `localStorage`. La politique est en
// `<meta>` (Pages n'accepte pas d'en-têtes), et elle n'a de valeur que si le
// code reste dans ses bornes : pas de gestionnaire `onclick=` en ligne, pas
// d'`eval`, aucune requête réseau. Ces gardes tournent aussi dans le job de
// publication, sans dépendance installée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  SHOWROOM_URL,
  directivesCsp,
  empreinteCsp,
  politiquePour,
  scriptsEnLigne,
} from '../scripts/showroom-csp.mjs';
import { jetons } from '../scripts/showroom-imports.mjs';
import { codeDuShowroom } from '../scripts/showroom-modules.mjs';

const DOSSIER = new URL('../showroom/', import.meta.url);
const lire = nom => readFileSync(new URL(nom, DOSSIER), 'utf8');
const HTML = lire('index.html');
const CSP = directivesCsp(HTML);
const MODULES = readdirSync(DOSSIER).filter(nom => nom.endsWith('.js'));

test('la page pose sa CSP avant toute ressource', () => {
  assert.ok(CSP, '<meta http-equiv="Content-Security-Policy"> absente');
  const meta = HTML.indexOf('http-equiv="Content-Security-Policy"');
  // Une politique en <meta> ne couvre que ce qui la suit.
  for (const ressource of ['<script', '<link rel="stylesheet"']) {
    assert.ok(
      meta < HTML.indexOf(ressource),
      `${ressource} précède la CSP : il lui échapperait`
    );
  }
});

test('les directives ferment tout ce que la page n’utilise pas', () => {
  const attendu = {
    'default-src': ["'none'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'object-src': ["'none'"],
    'style-src-elem': [SHOWROOM_URL],
    'style-src-attr': ["'unsafe-inline'"],
  };
  for (const [nom, sources] of Object.entries(attendu)) {
    assert.deepEqual(CSP.get(nom), sources, `directive ${nom}`);
  }
  // Ignorées en <meta> par la spécification, et signalées en console.
  for (const nom of ['frame-ancestors', 'report-uri', 'sandbox']) {
    assert.ok(!CSP.has(nom), `${nom} n'a aucun effet en <meta>`);
  }
});

test('script-src : l’adresse publiée du showroom, et des empreintes seulement', () => {
  const [base, ...reste] = CSP.get('script-src');
  // Pas `'self'` : il couvrirait toute l'origine, donc les fichiers des
  // autres dépôts. C'est ce chemin qui refuse un import hors de showroom/.
  assert.equal(base, SHOWROOM_URL);
  for (const source of reste) {
    assert.match(source, /^'sha256-[A-Za-z0-9+/]+=*'$/, `source ${source}`);
  }
});

test('chaque script en ligne a son empreinte, et aucune n’est périmée', () => {
  const attendues = scriptsEnLigne(HTML).map(empreinteCsp).sort();
  const posees = CSP.get('script-src')
    .filter(s => s.startsWith("'sha"))
    .sort();
  assert.ok(attendues.length >= 1, 'le script anti-FOUC a disparu ?');
  assert.deepEqual(
    posees,
    attendues,
    'empreintes CSP périmées : relancer `npm run sync`'
  );
});

test('un script se ferme comme le navigateur le ferme', () => {
  // `</script >` et `</SCRIPT>` ferment l'élément pour l'analyseur HTML.
  // Lus comme du texte, le corps courait jusqu'à la fermante suivante.
  const page =
    '<script>un()</script >' +
    '<SCRIPT>deux()</SCRIPT>' +
    '<script type="application/ld+json">{}</script>' +
    '<script>trois()</script\n>';
  assert.deepEqual(scriptsEnLigne(page), ['un()', 'deux()', 'trois()']);
});

test('aucun gestionnaire en ligne ni URL javascript: dans la page', () => {
  assert.doesNotMatch(HTML, /<[a-z][^>]*\son[a-z]+\s*=/i);
  assert.doesNotMatch(HTML, /href="\s*javascript:/i);
});

/** Les jetons de code d'un module : les chaînes et commentaires n'y comptent pas. */
function appels(nom) {
  const t = jetons(lire(nom));
  const trouves = [];
  t.forEach((j, k) => {
    if (j.type !== 'ident') return;
    const suivant = t[k + 1];
    const appel = suivant?.type === 'punct' && suivant.value === '(';
    if (appel && (j.value === 'fetch' || j.value === 'eval')) {
      trouves.push(`${j.value}(`);
    }
    if (
      ['XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon'].includes(
        j.value
      )
    ) {
      trouves.push(j.value);
    }
    if (j.value === 'Function' && t[k - 1]?.value === 'new') {
      trouves.push('new Function');
    }
  });
  return trouves;
}

test('aucune requête réseau ni évaluation de chaîne dans le code du showroom', () => {
  // `connect-src 'none'` les refuserait en production ; mieux vaut le savoir
  // ici. Les extraits de code des fiches sont des CHAÎNES : ils ne comptent
  // pas, le lecteur de jetons les écarte.
  const ecarts = MODULES.flatMap(nom => appels(nom).map(a => `${nom} : ${a}`));
  assert.deepEqual(ecarts, []);
});

test('le showroom n’écrit plus la clé famille `dwc_theme`', () => {
  // La clé de `useTheme` est commune à toutes les apps de l'origine : un
  // essai du sombre dans le showroom changeait leur thème.
  const sources = [...MODULES.map(lire), ...scriptsEnLigne(HTML)];
  for (const source of sources) {
    const cles = jetons(source).filter(j => j.type === 'str');
    assert.ok(!cles.some(j => j.value === 'dwc_theme'));
  }
  assert.match(codeDuShowroom(), /'dwc_showroom_scheme'/);
  assert.match(scriptsEnLigne(HTML)[0], /'dwc_showroom_scheme'/);
});

test('le serveur local tourne la politique vers son adresse, chemin compris', () => {
  const local = 'http://127.0.0.1:5220/dev-pwa-config/';
  const csp = directivesCsp(politiquePour(HTML, local));
  assert.equal(csp.get('script-src')[0], local);
  assert.deepEqual(csp.get('style-src-elem'), [local]);
  // Le reste de la page ne bouge pas.
  assert.equal(
    politiquePour(HTML, local).replace(/content="default-src[^"]*"/, ''),
    HTML.replace(/content="default-src[^"]*"/, '')
  );
});
