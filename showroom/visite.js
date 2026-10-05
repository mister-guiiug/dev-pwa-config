/*
 * Deux façons de parcourir la page pas à pas : la visite guidée, et le mode
 * présentation, une section à la fois.
 */

import { paramOr, read, root, TOUR_KEY, write } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { scrollBehavior } from './navigation.js?v=bed0b21921';

var TOUR_STEPS = [
  {
    id: 'habiller',
    target: 'theme-picker',
    titleKey: 'ui.tour.step1.title',
    title: 'Habiller la page',
    bodyKey: 'ui.tour.step1.body',
    body: 'Ouvrez Habiller et choisissez une application — toute la page prend sa palette.',
  },
  {
    id: 'couleurs',
    target: 'couleurs',
    titleKey: 'ui.tour.step2.title',
    title: 'Lire les couleurs',
    bodyKey: 'ui.tour.step2.body',
    body: 'Les rôles sémantiques (--ds-*) sont ce que la bascule réécrit. Comparez deux apps plus bas.',
  },
  {
    id: 'primitives',
    target: 'primitives',
    titleKey: 'ui.tour.step3.title',
    title: 'Essayer les primitives',
    bodyKey: 'ui.tour.step3.body',
    body: 'Matrices Button et Badge : c’est là que les régressions de contraste se voient.',
  },
];
var tourStep = 0;

export function setupTour() {
  var panel = document.getElementById('sr-tour');
  var start = document.getElementById('sr-tour-start');
  var next = document.getElementById('sr-tour-next');
  var skip = document.getElementById('sr-tour-skip');
  if (!panel) return;

  function renderTour() {
    var step = TOUR_STEPS[tourStep];
    if (!step) {
      endTour(true);
      return;
    }
    var stepsEl = document.getElementById('sr-tour-steps');
    var title = document.getElementById('sr-tour-title');
    var body = document.getElementById('sr-tour-body');
    if (stepsEl) {
      stepsEl.textContent = '';
      TOUR_STEPS.forEach(function (s, i) {
        var li = document.createElement('li');
        li.textContent = i + 1 + ' ' + t(s.titleKey, s.title);
        if (i === tourStep) li.setAttribute('aria-current', 'step');
        if (i < tourStep) li.className = 'done';
        stepsEl.appendChild(li);
      });
    }
    if (title) title.textContent = t(step.titleKey, step.title);
    if (body) body.textContent = t(step.bodyKey, step.body);
    if (next) {
      next.textContent =
        tourStep >= TOUR_STEPS.length - 1
          ? t('ui.tour.finish', 'Terminer')
          : t('ui.tour.next', 'Étape suivante');
    }
    panel.hidden = false;
    var target = document.getElementById(step.target);
    if (target) {
      if (step.target === 'theme-picker') {
        var picker = document.getElementById('theme-picker');
        if (picker) picker.open = true;
      }
      target.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    }
  }

  function endTour(done) {
    panel.hidden = true;
    var picker = document.getElementById('theme-picker');
    if (picker) picker.open = false;
    if (done) write(TOUR_KEY, '1');
  }

  function beginTour() {
    tourStep = 0;
    renderTour();
  }

  if (start) start.addEventListener('click', beginTour);
  if (skip)
    skip.addEventListener('click', function () {
      endTour(true);
    });
  if (next)
    next.addEventListener('click', function () {
      tourStep += 1;
      renderTour();
    });

  if (
    paramOr('tour', '') === '1' ||
    (!read(TOUR_KEY, '') && paramOr('tour', 'auto') !== '0')
  ) {
    // Auto seulement si jamais fait et pas ?tour=0 — on n'auto-démarre PAS
    // pour ne pas surprendre les habitués ; seul ?tour=1 force.
    if (paramOr('tour', '') === '1') beginTour();
  }
}

var presentIndex = -1;
var presentSections = [];

function presentSectionsList() {
  return Array.prototype.slice.call(
    document.querySelectorAll('main .sr-section[id]')
  );
}

function setPresent(on, index) {
  if (!on) {
    presentIndex = -1;
    root.removeAttribute('data-present');
    document.querySelectorAll('[data-present-current]').forEach(function (el) {
      el.removeAttribute('data-present-current');
    });
    var barOff = document.getElementById('sr-present-bar');
    if (barOff) barOff.hidden = true;
    return;
  }
  presentSections = presentSectionsList();
  if (!presentSections.length) return;
  presentIndex = Math.max(0, Math.min(index || 0, presentSections.length - 1));
  root.setAttribute('data-present', 'on');
  var bar = document.getElementById('sr-present-bar');
  if (bar) bar.hidden = false;
  presentSections.forEach(function (section, i) {
    if (i === presentIndex) section.setAttribute('data-present-current', '');
    else section.removeAttribute('data-present-current');
  });
  var status = document.getElementById('sr-present-status');
  var current = presentSections[presentIndex];
  if (status && current) {
    var heading = current.querySelector('h1, h2');
    status.textContent = t('ui.present.status', '{n} / {total} · {title}')
      .replace('{n}', String(presentIndex + 1))
      .replace('{total}', String(presentSections.length))
      .replace(
        '{title}',
        (heading && heading.textContent.trim()) || current.id
      );
  }
  if (current) current.scrollIntoView({ block: 'start' });
}

export function setupPresent() {
  var start = document.getElementById('sr-present-start');
  var prev = document.getElementById('sr-present-prev');
  var next = document.getElementById('sr-present-next');
  var exit = document.getElementById('sr-present-exit');
  if (start)
    start.addEventListener('click', function () {
      setPresent(true, 0);
    });
  if (prev)
    prev.addEventListener('click', function () {
      if (presentIndex < 0) return;
      setPresent(true, presentIndex - 1);
    });
  if (next)
    next.addEventListener('click', function () {
      if (presentIndex < 0) return;
      setPresent(true, presentIndex + 1);
    });
  if (exit)
    exit.addEventListener('click', function () {
      setPresent(false);
    });
  document.addEventListener('keydown', function (event) {
    var tag = (event.target && event.target.tagName) || '';
    var typing =
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      (event.target && event.target.isContentEditable);
    if (typing) return;
    if (presentIndex >= 0) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPresent(false);
        return;
      }
      if (
        event.key === 'ArrowRight' ||
        event.key === 'ArrowDown' ||
        event.key === ' '
      ) {
        event.preventDefault();
        setPresent(true, presentIndex + 1);
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setPresent(true, presentIndex - 1);
        return;
      }
    }
    if (
      (event.key === 'p' || event.key === 'P') &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      if (presentIndex >= 0) setPresent(false);
      else setPresent(true, 0);
    }
  });
}
