/**
 * `pwa-doctor` — `prefetch-routes` et `nav-attente`, les deux dettes nées du
 * signalement du 20/09/2026 (« je clique sur historique, rien ne se passe »)
 * et corrigées le même jour dans dix dépôts, à la main, sans qu'aucun contrôle
 * ne l'ait jamais dit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { diagnose } from '../scripts/pwa-doctor.mjs';

/** Un dépôt factice à partir d'une carte chemin → contenu. */
function repo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-doctor-nav-'));
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

const dettes = root =>
  diagnose(root)
    .findings.filter(f => f.level === 'dette')
    .map(f => f.id);

const PKG = { 'package.json': { name: 'miss-x', version: '1.0.0' } };

test('des routes paresseuses sans préchargement ni retour au clic : les deux dettes', () => {
  repo(
    {
      ...PKG,
      'src/App.tsx': [
        "import { lazy, Suspense } from 'react';",
        "import { HashRouter, Route, Routes } from 'react-router-dom';",
        "const HistoryView = lazy(() => import('./HistoryView'));",
        'export function App() { return <HashRouter><Suspense fallback={<p>…</p>}><Routes><Route path="/h" element={<HistoryView />} /></Routes></Suspense></HashRouter>; }',
      ].join('\n'),
    },
    root => {
      const ids = dettes(root);
      assert.ok(ids.includes('prefetch-routes'), 'le morceau part au clic');
      assert.ok(ids.includes('nav-attente'), 'le repli ne paraît jamais');
    }
  );
});

test('le remède du socle éteint les deux : `navigate` sur la barre et un préchargement', () => {
  repo(
    {
      ...PKG,
      'src/App.tsx': [
        "import { lazy } from 'react';",
        "import { BrowserRouter, useNavigate } from 'react-router';",
        "import { BottomNav } from '@mister-guiiug/dev-pwa-config/react/bottom-nav';",
        "import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';",
        "const chargeHistory = () => import('./HistoryView');",
        'const HistoryView = lazy(chargeHistory);',
        'function Shell() { useIdlePrefetch(chargeHistory); return <BottomNav items={[]} navigate={useNavigate()} />; }',
      ].join('\n'),
    },
    root => {
      const ids = dettes(root);
      assert.ok(!ids.includes('prefetch-routes'));
      assert.ok(!ids.includes('nav-attente'));
    }
  );
});

test('une transition propre au menu et un `requestIdleCallback` maison valent aussi', () => {
  // Les dix corrections du 20/09/2026 ont cette forme : le docteur les
  // reconnaît, il ne réclame pas la barre du socle.
  repo(
    {
      ...PKG,
      'src/Shell.tsx': [
        "import { lazy, useTransition } from 'react';",
        "import { BrowserRouter, useNavigate } from 'react-router-dom';",
        "const chargeMatch = () => import('./MatchView');",
        'const MatchView = lazy(chargeMatch);',
        'function usePrecharge() { window.requestIdleCallback(() => chargeMatch()); }',
        'function Menu() { const [enCours, demarre] = useTransition(); const navigate = useNavigate(); return null; }',
      ].join('\n'),
    },
    root => {
      const ids = dettes(root);
      assert.ok(!ids.includes('prefetch-routes'));
      assert.ok(!ids.includes('nav-attente'));
    }
  );
});

test('une frontière remontée à chaque route suffit pour l’attente, pas pour le préchargement', () => {
  // miss-supaboss et miss-uwh : `key={pathname}` sur l'ancêtre du Suspense —
  // le repli d'une frontière NEUVE paraît même au sein d'une transition.
  repo(
    {
      ...PKG,
      'src/App.tsx': [
        "import { lazy, Suspense } from 'react';",
        "import { HashRouter, useLocation } from 'react-router-dom';",
        "const Dashboard = lazy(() => import('./Dashboard'));",
        'function Shell() { const { pathname } = useLocation(); return <ErrorBoundary key={pathname}><Suspense fallback={null}><Dashboard /></Suspense></ErrorBoundary>; }',
      ].join('\n'),
    },
    root => {
      const ids = dettes(root);
      assert.ok(!ids.includes('nav-attente'));
      assert.ok(ids.includes('prefetch-routes'));
    }
  );
});

test('sans routeur, un `lazy()` vit dans une page : silence', () => {
  // miss-dice et mister-puzzle : le repli y paraît normalement.
  repo(
    {
      ...PKG,
      'src/App.tsx': [
        "import { lazy, Suspense } from 'react';",
        "const Yahtzee = lazy(() => import('./games/Yahtzee'));",
        'export function App() { return <Suspense fallback={null}><Yahtzee /></Suspense>; }',
      ].join('\n'),
    },
    root => {
      const ids = dettes(root);
      assert.ok(!ids.includes('prefetch-routes'));
      assert.ok(!ids.includes('nav-attente'));
    }
  );
});

test('un routeur sans route paresseuse n’a rien à précharger ni à attendre', () => {
  repo(
    {
      ...PKG,
      'src/App.tsx': [
        "import { HashRouter, Route, Routes } from 'react-router';",
        "import { Home } from './Home';",
        'export function App() { return <HashRouter><Routes><Route path="/" element={<Home />} /></Routes></HashRouter>; }',
      ].join('\n'),
    },
    root => {
      const ids = dettes(root);
      assert.ok(!ids.includes('prefetch-routes'));
      assert.ok(!ids.includes('nav-attente'));
    }
  );
});
