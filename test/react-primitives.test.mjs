// Rendu réel des primitives promues en couche 2 (Button, Field, Skeleton,
// Sheet, Stat, Badge).
//
// Ces composants ont été extraits parce que plusieurs apps les avaient
// réécrits, chacune en oubliant un morceau d'accessibilité. Les tests ci-dessous
// verrouillent précisément ces morceaux — pas l'apparence, qui appartient aux
// apps.
//
// `react` / `react-dom` sont des devDependencies du paquet : contrairement à
// `react-components.test.mjs` (écrit quand ils étaient absents), on n'ignore
// plus le test silencieusement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Button } from '../react/button.js';
import { TextField, SelectField, TextAreaField } from '../react/field.js';
import { Skeleton, SkeletonGroup } from '../react/skeleton.js';
import { Sheet } from '../react/sheet.js';
import { Stat } from '../react/stat.js';
import { Badge } from '../react/badge.js';

const render = (component, props, ...children) =>
  renderToStaticMarkup(h(component, props, ...children));

/* ── Button ─────────────────────────────────────────────────────────────── */

test('Button : variante et taille exposées, type "button" par défaut', () => {
  const html = render(Button, {}, 'Valider');
  assert.match(html, /data-dwc="button"/);
  assert.match(html, /data-variant="primary"/);
  assert.match(html, /data-size="md"/);
  // Sans `type`, un bouton dans un formulaire soumet : piège classique.
  assert.match(html, /type="button"/);
  assert.match(html, />Valider</);
});

test('Button : loading pose aria-busy et aria-disabled, sans retirer le focus', () => {
  const html = render(Button, { loading: true }, 'Enregistrer');
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-disabled="true"/);
  // `disabled` retirerait le bouton du parcours clavier : le focus retombe sur
  // <body> au moment précis où l'utilisateur attend le résultat. Le double-clic
  // est bloqué par le gestionnaire, pas par l'attribut.
  assert.doesNotMatch(html, /(^|\s)disabled=""/);
  assert.match(html, /data-dwc="button-spinner"/);
});

test('Button : disabled explicite respecté sans loading', () => {
  const html = render(Button, { disabled: true }, 'X');
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /aria-busy/);
});

test('Button : block et iconOnly sont des marqueurs, pas des classes', () => {
  const html = render(Button, { block: true, iconOnly: true, size: 'sm' }, '×');
  assert.match(html, /data-block=""/);
  assert.match(html, /data-icon-only=""/);
  assert.match(html, /data-size="sm"/);
});

/* ── Field ──────────────────────────────────────────────────────────────── */

test('TextField : label lié au contrôle par un id généré', () => {
  const html = render(TextField, { label: 'Nom' });
  const forMatch = html.match(/for="([^"]+)"/);
  const idMatch = html.match(/id="([^"]+)"/);
  assert.ok(forMatch && idMatch, 'label[for] et input[id] requis');
  assert.equal(forMatch[1], idMatch[1], 'for et id doivent coïncider');
});

test('TextField : aide ET erreur référencées ensemble par aria-describedby', () => {
  const html = render(TextField, {
    label: 'Email',
    hint: 'Format attendu : nom@domaine',
    error: 'Adresse invalide',
  });
  const described = html.match(/aria-describedby="([^"]+)"/);
  assert.ok(described, 'aria-describedby manquant');
  const ids = described[1].split(' ');
  assert.equal(ids.length, 2, "l'aide ne doit pas disparaître en erreur");
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /data-invalid=""/);
});

test('TextField : sans erreur, ni aria-invalid ni role alert', () => {
  const html = render(TextField, { label: 'Nom', hint: 'Aide' });
  assert.doesNotMatch(html, /aria-invalid/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.match(html, /aria-describedby="[^"]*-hint"/);
});

test('SelectField et TextAreaField partagent le même habillage', () => {
  const select = render(
    SelectField,
    { label: 'Catégorie' },
    h('option', { key: 'a' }, 'A')
  );
  assert.match(select, /<select[^>]*data-dwc="field-control"/);
  assert.match(select, /<option>A<\/option>/);

  const area = render(TextAreaField, { label: 'Notes' });
  assert.match(area, /<textarea[^>]*data-multiline=""/);
});

/* ── Skeleton ───────────────────────────────────────────────────────────── */

test('Skeleton : les barres sont décoratives, le groupe est annoncé', () => {
  const html = render(SkeletonGroup, { label: 'Chargement des scores' });
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Chargement des scores/);
  // Une barre annoncée une par une produirait un bavardage inutile.
  const bars = html.match(/data-dwc="skeleton"/g) ?? [];
  assert.equal(bars.length, 3, '3 lignes par défaut');
  assert.equal(
    (html.match(/aria-hidden="true"/g) ?? []).length,
    3,
    'chaque barre doit être aria-hidden'
  );
});

test('Skeleton : la dernière ligne est plus courte (silhouette de paragraphe)', () => {
  const html = render(SkeletonGroup, { label: 'x', lines: 2 });
  assert.match(html, /width:60%/);
});

test('Skeleton : une barre isolée porte ses dimensions', () => {
  const html = render(Skeleton, { width: '4rem', height: 8, radius: 'full' });
  assert.match(html, /data-radius="full"/);
  assert.match(html, /width:4rem/);
});

/* ── Sheet ──────────────────────────────────────────────────────────────── */

test('Sheet : rien n’est monté tant que open est faux', () => {
  assert.equal(render(Sheet, { open: false, title: 'T', onClose() {} }), '');
});

test('Sheet : dialogue modal correctement étiqueté', () => {
  const html = render(
    Sheet,
    { open: true, title: 'Ajouter une dépense', onClose() {} },
    h('p', { key: 'p' }, 'Contenu')
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  // Étiqueté PAR le titre affiché, pas par une copie de son texte : un seul
  // endroit à traduire, et le nom accessible ne peut pas diverger du visible.
  const labelledBy = html.match(/aria-labelledby="([^"]+)"/);
  assert.ok(labelledBy, 'aria-labelledby attendu sur le dialogue');
  assert.match(
    html,
    new RegExp(`id="${labelledBy[1]}"[^>]*>Ajouter une dépense<`)
  );
  assert.doesNotMatch(html, /aria-label="Ajouter une dépense"/);
  // Le panneau doit être focusable pour recevoir le focus à l'ouverture.
  assert.match(html, /tabindex="-1"/);
  assert.match(html, /data-dwc="sheet-backdrop"[^>]*aria-hidden="true"/);
  assert.match(html, /data-dwc="sheet-close"/);
  assert.match(html, /aria-label="Fermer"/);
  assert.match(html, /Contenu/);
});

test('Sheet : le libellé de fermeture est traduisible', () => {
  const html = render(Sheet, {
    open: true,
    title: 'T',
    onClose() {},
    closeLabel: 'Close',
  });
  assert.match(html, /aria-label="Close"/);
});

/* ── Stat ───────────────────────────────────────────────────────────────── */

test('Stat : le libellé est relié à la valeur par dl/dt/dd', () => {
  const html = render(Stat, { label: 'Adhérents', value: 128 });
  assert.match(html, /<dl[^>]*data-dwc="stat"/);
  assert.match(html, /<dt[^>]*data-dwc="stat-label"[^>]*>Adhérents<\/dt>/);
  assert.match(html, /<dd[^>]*data-dwc="stat-value"[^>]*>128<\/dd>/);
});

test('Stat : la tendance ne repose pas sur la seule couleur', () => {
  const html = render(Stat, {
    label: 'Cotisations',
    value: '1 284 €',
    delta: '+12',
    trend: 'up',
    trendLabel: 'en hausse',
  });
  assert.match(html, /data-trend="up"/);
  assert.match(html, /↑/, 'flèche visuelle attendue');
  assert.match(html, /en hausse/, 'libellé textuel attendu');
});

test('Stat : pas de bloc de variation sans delta', () => {
  const html = render(Stat, { label: 'L', value: 1 });
  assert.doesNotMatch(html, /stat-delta/);
});

/* ── Badge ──────────────────────────────────────────────────────────────── */

test('Badge : ton sémantique et variante exposés', () => {
  const html = render(Badge, { tone: 'success', variant: 'outline' }, 'Payé');
  assert.match(html, /data-dwc="badge"/);
  assert.match(html, /data-tone="success"/);
  assert.match(html, /data-variant="outline"/);
  assert.match(html, />Payé</);
});

test('Badge : par défaut, ton neutre et variante douce', () => {
  const html = render(Badge, {}, 'Brouillon');
  assert.match(html, /data-tone="muted"/);
  assert.match(html, /data-variant="soft"/);
});

/* ── Contrat transverse ─────────────────────────────────────────────────── */

test('toutes les primitives acceptent une className de l’app', () => {
  const cases = [
    [Button, { className: 'x' }],
    [TextField, { label: 'L', className: 'x' }],
    [SelectField, { label: 'L', className: 'x' }],
    [TextAreaField, { label: 'L', className: 'x' }],
    [Skeleton, { className: 'x' }],
    [SkeletonGroup, { label: 'L', className: 'x' }],
    [Stat, { label: 'L', value: 1, className: 'x' }],
    [Badge, { className: 'x' }],
    [Sheet, { open: true, title: 'T', onClose() {}, className: 'x' }],
  ];
  for (const [component, props] of cases) {
    assert.match(
      render(component, props),
      /class="x"/,
      `${component.name} ignore className`
    );
  }
});
