// Les démos du showroom : engendrées par les vrais composants, ou nommément
// écrites à la main.
//
// Les démos étaient du balisage recopié à la main, comparé à rien. Relevé du
// 05/10/2026 : la barre d'onglets n'avait pas l'`aria-current` que promettait
// sa légende, et le titre d'AppHeader était un `<p>` au lieu du `h1` du
// composant. `npm run sync` rend désormais les démos de
// `scripts/showroom-demos.mjs` avec `renderToStaticMarkup` ; ce test refuse un
// bloc qui diffère d'un rendu frais, et tient la liste des démos encore écrites
// à la main : elle ne peut que raccourcir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  DEMOS,
  debutDemo,
  finDemo,
  rendreDemo,
  signature,
} from '../scripts/showroom-demos.mjs';

const HTML = readFileSync(
  new URL('../showroom/index.html', import.meta.url),
  'utf8'
);

/** Le bloc engendré d'une démo, tel qu'il est dans la page. */
function bloc(id) {
  const debut = HTML.indexOf(debutDemo(id));
  const fin = HTML.indexOf(finDemo(id));
  assert.ok(debut !== -1 && fin > debut, `marqueurs de ${id} absents`);
  return HTML.slice(debut + debutDemo(id).length, fin);
}

test('chaque démo engendrée est le rendu actuel de son composant', () => {
  const perimees = Object.keys(DEMOS).filter(
    id => signature(bloc(id)) !== signature(rendreDemo(id))
  );
  assert.deepEqual(
    perimees,
    [],
    'démo périmée : le composant a changé, relancer `npm run sync`'
  );
});

test('les deux dérives relevées le 05/10 sont corrigées par construction', () => {
  assert.match(bloc('BottomNav'), /aria-current="page"/);
  assert.match(bloc('AppHeader'), /<h1[^>]*data-dwc="app-header-title"/);
});

// Démos ENCORE écrites à la main, chacune avec sa raison. La liste ne peut
// que raccourcir : une démo qui devient engendrée doit en sortir, et une
// nouvelle démo écrite à la main fait échouer ce test.
const A_LA_MAIN = {
  ErrorBoundary:
    'la vue de repli n’existe qu’après une erreur levée au rendu, ce que renderToStaticMarkup ne rejoue pas',
  PwaInstallPrompt:
    'son contenu dépend de beforeinstallprompt et de la plateforme : vide au rendu serveur',
  ShareButton:
    'la démo montre l’état « Lien copié », qui n’existe qu’après un clic',
  // Le texte lu de la démo (« de 4 à 28 vues ») n'est déjà plus celui que
  // rend Sparkline (« 6 points, de 4 vues à 28 vues, minimum… »).
  'Sparkline · BarChart · Gauge':
    'react/sparkline.js passe stroke-width en kebab-case : React avertit à chaque rendu ; corriger le composant, puis engendrer',
  UpdatePromptBanner:
    'importe virtual:pwa-register/react, un module de Vite qui n’existe pas sous Node',
  Toast: 'les notifications vivent dans l’état du fournisseur ToastProvider',
  AppShell:
    'coquille complète (en-tête, main, barre d’onglets) : un second <main> dans la page',
  FamilyAbout:
    'contient FamilyApps, dont les icônes se chargeraient depuis les apps : « aucune requête réseau »',
  AppVersion:
    'montre l’état « mise à jour disponible », qui vient du service worker',
  FamilyApps:
    'rendue par showroom.js avec des pastilles peintes, sans icône distante',
};

test('les démos écrites à la main sont nommées, et leur liste raccourcit', () => {
  const doc = new JSDOM(HTML).window.document;
  const scenes = [...doc.querySelectorAll('.sr-demo-stage')].map(scene => ({
    titre: scene
      .closest('article')
      ?.querySelector('.sr-demo-head h3')
      ?.textContent.replace(/\s+/g, ' ')
      .trim(),
    engendree: scene.innerHTML.includes('<!-- DÉMO:'),
  }));
  assert.ok(
    scenes.length >= 20,
    'scènes de démo introuvables : motif changé ?'
  );

  const aLaMain = scenes.filter(s => !s.engendree).map(s => s.titre);
  const inconnues = aLaMain.filter(titre => !(titre in A_LA_MAIN));
  assert.deepEqual(
    inconnues,
    [],
    'démo écrite à la main hors liste : l’engendrer (scripts/showroom-demos.mjs), ou la nommer avec sa raison'
  );
  const sorties = Object.keys(A_LA_MAIN).filter(
    titre => !aLaMain.includes(titre)
  );
  assert.deepEqual(
    sorties,
    [],
    'ces démos sont engendrées désormais, ou n’existent plus : les retirer de A_LA_MAIN'
  );
  // Le cliquet, chiffré : relevé du 06/10/2026, 10 scènes sur 22.
  assert.ok(aLaMain.length <= 10, `${aLaMain.length} démos écrites à la main`);
});
