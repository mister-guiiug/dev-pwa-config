/*
 * La galerie de démo par application : toutes les palettes en tuiles, la
 * scène de démonstration habillée du thème courant, la vue partagée, et la
 * campagne de contraste.
 */

import { etat, rappels, root, themes } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { SHOTS, themeDisplayName } from './communs.js?v=0f95ffd5f1';
import { contrastRatio } from './controles.js?v=b9fcfeb8a4';
import {
  paintPalette,
  paletteForTheme,
  paletteOf,
  schemeForTheme,
} from './palettes.js?v=039110034f';

export function setupDemoSplit() {
  document.querySelectorAll('.sr-demo').forEach(function (demo) {
    if (demo.querySelector('.sr-demo-docs')) return;
    var details = demo.querySelector(':scope > details');
    if (!details) return;
    var wrap = document.createElement('div');
    wrap.className = 'sr-demo-docs';
    demo.insertBefore(wrap, details);
    wrap.appendChild(details);
  });
}

function renderContrastCampaign() {
  var table = document.getElementById('a11y-campaign');
  var status = document.getElementById('a11y-campaign-status');
  var select = document.getElementById('a11y-campaign-scheme');
  if (!table) return;
  var scheme = select && select.value === 'dark' ? 'dark' : 'light';
  var tbody = table.querySelector('tbody');
  tbody.textContent = '';
  var fails = 0;
  themes.forEach(function (theme) {
    var pal = paletteForTheme(theme, scheme);
    if (!pal) return;
    var pairs = [
      [pal.text, pal.surface || pal.bg],
      [pal.primaryContrast, pal.primary],
      [pal.text, pal.primarySoft || pal.surface2],
    ];
    var tr = document.createElement('tr');
    var name = document.createElement('th');
    name.scope = 'row';
    name.textContent = themeDisplayName(theme);
    tr.appendChild(name);
    pairs.forEach(function (pair) {
      var td = document.createElement('td');
      var ratio = pair[0] && pair[1] ? contrastRatio(pair[0], pair[1]) : null;
      if (ratio == null) {
        td.textContent = '—';
      } else {
        var ok = ratio >= 4.5;
        if (!ok) fails += 1;
        td.textContent = ratio.toFixed(1);
        td.className = ok ? 'sr-cell-ok' : 'sr-cell-ko';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  if (status) {
    status.textContent = fails
      ? t('ui.campaign.fails', '{n} échecs sous 4,5:1').replace(
          '{n}',
          String(fails)
        )
      : t('ui.campaign.ok', 'Tous les ratios ≥ 4,5:1');
  }
}

export function setupContrastCampaign() {
  var select = document.getElementById('a11y-campaign-scheme');
  if (select && !select.dataset.bound) {
    select.dataset.bound = '1';
    select.value =
      root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    select.addEventListener('change', renderContrastCampaign);
  }
  // Libellés du select (pas de data-i18n : clés déjà prises par les prefs).
  if (select) {
    var label = document.querySelector('label[for="a11y-campaign-scheme"]');
    if (label) label.textContent = t('ui.scheme.legend', 'Schéma de couleurs');
    Array.prototype.forEach.call(select.options, function (opt) {
      opt.textContent =
        opt.value === 'dark'
          ? t('ui.scheme.dark', 'Sombre')
          : t('ui.scheme.light', 'Clair');
    });
  }
  renderContrastCampaign();
}

/**
 * Quelle application l'aperçu montre-t-il ? Sans le menu, plus rien ne le
 * disait — et `role="status"` l'annonce à qui ne voit pas la page changer
 * de couleur.
 */
export function renderDemoCurrent() {
  var node = document.getElementById('demo-current');
  if (!node) return;
  node.textContent =
    etat.currentTheme.id === 'generic'
      ? t(
          'ui.demo.generic',
          'Aperçu générique : aucune application sélectionnée.'
        )
      : t('ui.demo.current', 'Aperçu habillé par {app}.').replace(
          '{app}',
          t('theme.' + etat.currentTheme.id + '.name', etat.currentTheme.name)
        );
}

/**
 * Pose la palette sur la tuile elle-même. `paintPalette` écrit `--ds-*` et
 * `--dwc-*` : sans les deux, les composants de la tuile garderaient les
 * couleurs de la page.
 */
function paintTheme(el, theme, scheme, palette) {
  paintPalette(el, palette, scheme);
  if (theme.radius) {
    el.style.setProperty('--ds-radius', theme.radius);
    el.style.setProperty('--dwc-radius', theme.radius);
  }
  el.style.setProperty('--ds-bg-image', (palette && palette.bgImage) || 'none');
  if (theme.fontDisplay)
    el.style.setProperty('--ds-font-display', theme.fontDisplay);
}

function renderDemoGallery() {
  var host = document.getElementById('demo-gallery');
  if (!host) return;
  var restore = host.contains(document.activeElement);
  host.textContent = '';

  themes.forEach(function (theme) {
    var scheme = schemeForTheme(theme);
    var palette = paletteOf(theme, scheme);
    if (!palette) return;

    var name = t('theme.' + theme.id + '.name', theme.name);
    var darkOnly = theme.schemes.indexOf('light') === -1;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'sr-gallery-tile';
    button.dataset.themeId = theme.id;
    button.setAttribute(
      'aria-pressed',
      String(theme.id === etat.currentTheme.id)
    );
    paintTheme(button, theme, scheme, palette);

    // Le nom accessible est le TEXTE visible de la tuile (nom, et « Sombre
    // seul »), précédé d'un verbe pour les lecteurs d'écran. Un
    // `aria-label` le remplaçait : le texte visible n'était pas dans le nom
    // (WCAG 2.5.3). Les échantillons (Aa, Valider…) sont décoratifs.
    button.appendChild(
      el('span', {
        class: 'sr-visually-hidden',
        text: t('ui.demo.dressPrefix', 'Habiller la page avec') + ' ',
      })
    );
    var head = el('span', { class: 'sr-gallery-head' });
    head.appendChild(el('span', { class: 'sr-gallery-name', text: name }));
    if (darkOnly) {
      head.appendChild(
        el('span', {
          class: 'sr-gallery-flag',
          text: t('ui.demo.darkOnly', 'Sombre seul'),
        })
      );
    }
    button.appendChild(head);

    var dots = el('span', {
      class: 'sr-gallery-dots',
      'aria-hidden': 'true',
    });
    ['primary', 'accent', 'success', 'warning', 'danger'].forEach(
      function (key) {
        if (!palette[key]) return;
        var dot = document.createElement('span');
        dot.style.background = 'var(--ds-' + key + ')';
        dots.appendChild(dot);
      }
    );
    button.appendChild(dots);

    button.appendChild(
      el('span', { class: 'sr-gallery-surface', 'aria-hidden': 'true' }, [
        el('span', { class: 'sr-gallery-ink', text: 'Aa' }),
        el('span', {
          class: 'sr-gallery-ink-soft',
          text: t('ui.demo.sample', 'Texte'),
        }),
      ])
    );

    button.appendChild(
      el('span', { class: 'sr-gallery-sample', 'aria-hidden': 'true' }, [
        el('span', {
          'data-dwc': 'button',
          'data-variant': 'primary',
          'data-size': 'sm',
          text: t('ui.demo.validate', 'Valider'),
        }),
        el('span', {
          'data-dwc': 'badge',
          'data-tone': 'success',
          'data-variant': 'soft',
          'data-size': 'sm',
          text: t('ui.demo.paid', 'À jour'),
        }),
      ])
    );

    button.addEventListener('click', function () {
      rappels.selectTheme(theme);
    });
    host.appendChild(button);
  });

  if (restore) {
    var current = host.querySelector('[aria-pressed="true"]');
    if (current) current.focus();
  }
}

// Petit écran de démonstration : rien d'inventé, uniquement des composants
// du paquet, donc peints par `components.css` et le thème courant.
export function renderDemoStage() {
  renderDemoGallery();
  var stage = document.getElementById('demo-stage');
  if (!stage) return;
  stage.textContent = '';

  var frame = document.createElement('div');
  frame.className = 'sr-phone';

  var shot = SHOTS[etat.currentTheme.id];
  if (shot) {
    var img = document.createElement('img');
    img.src = 'screenshots/' + shot.file;
    img.alt = shot.alt || etat.currentTheme.name;
    img.loading = 'lazy';
    img.className = 'sr-phone-shot';
    frame.appendChild(img);
  } else {
    frame.appendChild(buildPreview());
  }

  var caption = document.createElement('p');
  caption.className = 'sr-note';
  caption.style.marginTop = 'var(--spacing-fluid-sm)';
  caption.textContent =
    t('theme.' + etat.currentTheme.id + '.name', etat.currentTheme.name) +
    ' — ' +
    t('theme.' + etat.currentTheme.id + '.tagline', etat.currentTheme.tagline);

  stage.appendChild(frame);
  stage.appendChild(caption);
}

function el(tag, attrs, children) {
  var node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(function (entry) {
    if (entry[0] === 'text') node.textContent = entry[1];
    else if (entry[0] === 'style') node.style.cssText = entry[1];
    else node.setAttribute(entry[0], entry[1]);
  });
  (children || []).forEach(function (child) {
    node.appendChild(child);
  });
  return node;
}

function buildPreview() {
  var screen = el('div', { class: 'sr-phone-screen' });

  screen.appendChild(
    el('div', { class: 'sr-phone-bar' }, [
      el('strong', { text: etat.currentTheme.name }),
      el('span', {
        'data-dwc': 'badge',
        'data-tone': 'brand',
        'data-variant': 'soft',
        text: t('ui.demo.season', 'Saison'),
      }),
    ])
  );

  screen.appendChild(
    el('dl', { 'data-dwc': 'stat' }, [
      el('dt', {
        'data-dwc': 'stat-label',
        text: t('ui.demo.members', 'Adhérents'),
      }),
      el('dd', { 'data-dwc': 'stat-value', text: '128' }),
      el('dd', { 'data-dwc': 'stat-delta', 'data-trend': 'up' }, [
        el('span', { 'aria-hidden': 'true', text: '↑ ' }),
        document.createTextNode('12'),
      ]),
    ])
  );

  screen.appendChild(
    el('div', { class: 'sr-phone-row' }, [
      el('span', {
        'data-dwc': 'badge',
        'data-tone': 'success',
        'data-variant': 'soft',
        text: t('ui.demo.paid', 'À jour'),
      }),
      el('span', {
        'data-dwc': 'badge',
        'data-tone': 'warning',
        'data-variant': 'soft',
        text: t('ui.demo.pending', 'En attente'),
      }),
    ])
  );

  screen.appendChild(
    el('div', { 'data-dwc': 'field' }, [
      el('span', {
        'data-dwc': 'field-label',
        text: t('ui.demo.search', 'Rechercher'),
      }),
      el('span', {
        'data-dwc': 'field-control',
        class: 'sr-phone-input',
        text: t('ui.demo.searchValue', 'Cotisation…'),
      }),
    ])
  );

  screen.appendChild(
    el('div', { class: 'sr-phone-actions' }, [
      el('span', {
        'data-dwc': 'button',
        'data-variant': 'primary',
        'data-size': 'md',
        text: t('ui.demo.validate', 'Valider'),
      }),
      el('span', {
        'data-dwc': 'button',
        'data-variant': 'ghost',
        'data-size': 'md',
        text: t('ui.demo.later', 'Plus tard'),
      }),
    ])
  );

  return screen;
}
