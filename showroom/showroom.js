/*
 * Pilotage du showroom — script classique (pas de module) pour rester ouvrable
 * en `file://` sans serveur.
 *
 * Trois responsabilités :
 *   1. bascule de thème (app) + de schéma (clair/sombre/système), avec le même
 *      contrat que le hook `useTheme` du paquet : `light | dark | system`
 *      persisté sous `dwc_theme`, attribut `data-theme` posé sur <html> ;
 *   2. mesure EN DIRECT des tokens fluides (clamp), des safe-areas et du
 *      breakpoint courant — rien n'est recopié à la main ;
 *   3. génération de la palette et de la démo `FamilyApps`.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var themes = globalThis.SHOWROOM_THEMES || [];
  var APP_KEY = 'dwc_showroom_app';
  var SCHEME_KEY = 'dwc_theme';

  // Rôle sémantique → variable CSS + libellé. `on` désigne la couleur sur
  // laquelle le rôle est censé être posé (calcul du contraste WCAG).
  var ROLES = [
    ['bg', '--ds-bg', 'Fond', 'Arrière-plan de page'],
    ['surface', '--ds-surface', 'Surface', 'Cartes, panneaux, barres'],
    ['surface2', '--ds-surface-2', 'Surface 2', 'Zones en retrait, en-têtes'],
    ['border', '--ds-border', 'Bordure', 'Séparateurs, contours de champ'],
    ['text', '--ds-text', 'Texte', 'Contenu principal', '--ds-surface'],
    [
      'textSoft',
      '--ds-text-soft',
      'Texte atténué',
      'Légendes, aides',
      '--ds-surface',
    ],
    ['primary', '--ds-primary', 'Primaire', 'Action principale, sélection'],
    [
      'primaryContrast',
      '--ds-primary-contrast',
      'Sur primaire',
      'Texte posé sur la primaire',
      '--ds-primary',
    ],
    [
      'primarySoft',
      '--ds-primary-soft',
      'Primaire douce',
      'Fonds teintés, pastilles',
    ],
    ['accent', '--ds-accent', 'Accent', 'Second plan de marque'],
    ['success', '--ds-success', 'Succès', 'Validé, crédit, en ligne'],
    ['warning', '--ds-warning', 'Avertissement', 'En attente, dégradé'],
    ['danger', '--ds-danger', 'Danger', 'Erreur, suppression, débit'],
  ];

  // Maturités RÉELLES (apps-catalog.js) pour la démo FamilyApps : montre les
  // trois badges sans dupliquer le catalogue.
  var DEMO_APPS = [
    ['miss-carbook', 'stable'],
    ['mister-doc', 'beta'],
    ['miss-badminton', 'alpha'],
  ];
  var MATURITY_LABELS = { alpha: 'Alpha', beta: 'Bêta', stable: 'Stable' };

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Sonde hors écran : sert à faire évaluer les `clamp()` / `env()` par le
  // navigateur plutôt qu'à les recalculer en JS.
  var probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);

  function themeById(id) {
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].id === id) return themes[i];
    }
    return themes[0];
  }

  function read(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* mode privé / stockage plein : la bascule reste fonctionnelle */
    }
  }

  /* ── Contraste WCAG ────────────────────────────────────────────────── */

  // `getComputedStyle` ne résout PAS les custom properties : la valeur revient
  // telle qu'écrite (`#6d28d9`), jamais en `rgb()`. On gère donc l'hex d'abord
  // — sinon `#0f172a` se laisserait lire comme trois nombres bidon.
  function parseRgb(value) {
    var hex = String(value).trim();
    var short = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (short) {
      return [1, 2, 3].map(function (i) {
        return parseInt(short[i] + short[i], 16);
      });
    }
    var long = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (long) {
      return [1, 2, 3].map(function (i) {
        return parseInt(long[i], 16);
      });
    }
    var fn = hex.match(/^rgba?\(([^)]+)\)$/i);
    if (fn) {
      var parts = fn[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        return parts.slice(0, 3);
      }
    }
    return null;
  }

  function luminance(rgb) {
    var c = rgb.map(function (v) {
      var s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function contrastRatio(a, b) {
    var ra = parseRgb(a);
    var rb = parseRgb(b);
    if (!ra || !rb) return null;
    var la = luminance(ra);
    var lb = luminance(rb);
    var hi = Math.max(la, lb);
    var lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  /* ── Application d'un thème ────────────────────────────────────────── */

  function applyTheme(theme) {
    var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var style = root.style;

    // Le thème générique n'a pas de couleurs propres : on retire les
    // surcharges pour laisser parler les valeurs par défaut de showroom.css.
    ROLES.forEach(function (role) {
      style.removeProperty(role[1]);
    });
    style.removeProperty('--ds-bg-image');
    style.removeProperty('--ds-font-display');
    style.removeProperty('--ds-radius');

    root.setAttribute('data-app', theme.id);

    var palette = theme[scheme];
    if (palette) {
      ROLES.forEach(function (role) {
        var value = palette[role[0]];
        if (value) style.setProperty(role[1], value);
      });
      style.setProperty('--ds-bg-image', palette.bgImage || 'none');
    }
    if (theme.fontDisplay)
      style.setProperty('--ds-font-display', theme.fontDisplay);
    if (theme.radius) style.setProperty('--ds-radius', theme.radius);

    var hints = [];
    if (theme.schemes.indexOf('light') === -1) {
      hints.push('application dark-only : le schéma clair est désactivé');
    }
    if (theme.attribute === 'class') {
      hints.push('thème piloté par la classe .dark côté app');
    }

    var nameEl = document.getElementById('theme-name');
    var taglineEl = document.getElementById('theme-tagline');
    if (nameEl) nameEl.textContent = theme.name;
    if (taglineEl) {
      taglineEl.textContent =
        theme.tagline + (hints.length ? ' — ' + hints.join(' ; ') + '.' : '');
    }

    var sample = document.getElementById('font-display-sample');
    if (sample) {
      sample.textContent = theme.fontDisplay
        ? 'Titrage — ' + theme.fontDisplay.split(',')[0].replace(/'/g, '')
        : 'Titrage — pile système (aucune police dédiée)';
    }

    renderSwatches();
  }

  /* ── Schéma clair / sombre / système ───────────────────────────────── */

  function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolveScheme(scheme) {
    if (scheme === 'system') return systemPrefersDark() ? 'dark' : 'light';
    return scheme;
  }

  function applyScheme(scheme, theme) {
    // Une app dark-only n'a pas de palette claire : on force le sombre plutôt
    // que d'inventer des couleurs qui n'existent pas dans le produit.
    var effective = theme.schemes.indexOf('light') === -1 ? 'dark' : scheme;
    var resolved = resolveScheme(effective);
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;
  }

  function syncSchemeInputs(scheme, theme) {
    var lightOnly = theme.schemes.indexOf('light') === -1;
    document.querySelectorAll('input[name="scheme"]').forEach(function (input) {
      input.checked = input.value === scheme;
      input.disabled = lightOnly && input.value !== 'dark';
    });
    if (lightOnly) {
      var darkInput = document.getElementById('scheme-dark');
      if (darkInput) darkInput.checked = true;
    }
  }

  /* ── Palette ───────────────────────────────────────────────────────── */

  function renderSwatches() {
    var list = document.getElementById('swatches');
    if (!list) return;
    var styles = getComputedStyle(root);
    list.textContent = '';

    ROLES.forEach(function (role) {
      var value = styles.getPropertyValue(role[1]).trim();
      var li = document.createElement('li');
      li.className = 'sr-swatch';

      var chip = document.createElement('div');
      chip.className = 'sr-swatch-chip';
      chip.style.background = value;
      li.appendChild(chip);

      var meta = document.createElement('div');
      meta.className = 'sr-swatch-meta';

      var name = document.createElement('strong');
      name.textContent = role[2];
      meta.appendChild(name);

      var token = document.createElement('code');
      token.textContent = role[1] + ' · ' + value;
      meta.appendChild(token);

      var desc = document.createElement('span');
      desc.textContent = role[3];
      meta.appendChild(desc);

      if (role[4]) {
        var ratio = contrastRatio(value, styles.getPropertyValue(role[4]));
        if (ratio) {
          var badge = document.createElement('span');
          badge.textContent =
            'contraste ' +
            ratio.toFixed(2) +
            ':1 — ' +
            (ratio >= 4.5 ? 'AA ✓' : ratio >= 3 ? 'AA (grand texte)' : '✗');
          badge.style.color =
            ratio >= 4.5 ? 'var(--ds-success)' : 'var(--ds-danger)';
          meta.appendChild(badge);
        }
      }

      li.appendChild(meta);
      list.appendChild(li);
    });
  }

  /* ── Mesures en direct ─────────────────────────────────────────────── */

  function measure() {
    document
      .querySelectorAll('#type-scale tr[data-token]')
      .forEach(function (row) {
        probe.style.fontSize = 'var(' + row.dataset.token + ')';
        var size = getComputedStyle(probe).fontSize;
        row.querySelector('[data-computed]').textContent = size;
        row.querySelector('.sr-sample').style.fontSize = size;
      });
    probe.style.fontSize = '';

    document
      .querySelectorAll('#space-scale tr[data-token]')
      .forEach(function (row) {
        probe.style.width = 'var(' + row.dataset.token + ')';
        row.querySelector('[data-computed]').textContent =
          getComputedStyle(probe).width;
      });
    probe.style.width = '';

    document
      .querySelectorAll('#safe-areas tr[data-inset]')
      .forEach(function (row) {
        var side = row.dataset.inset;
        probe.style.padding = '0';
        probe.style.paddingTop = 'env(safe-area-inset-' + side + ')';
        row.querySelector('[data-computed]').textContent =
          getComputedStyle(probe).paddingTop;
      });
    probe.style.padding = '';

    var rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    var widthRem = window.innerWidth / rem;
    var current = 'base';
    document.querySelectorAll('#bp-list li').forEach(function (li) {
      var active = widthRem >= Number(li.dataset.min);
      if (active) current = li.dataset.bp;
      li.dataset.active = 'false';
    });
    var activeEl = document.querySelector(
      '#bp-list li[data-bp="' + current + '"]'
    );
    if (activeEl) activeEl.dataset.active = 'true';

    var badge = document.getElementById('bp-badge');
    if (badge) {
      badge.textContent =
        current +
        ' · ' +
        window.innerWidth +
        ' px · 1rem = ' +
        rem.toFixed(0) +
        ' px';
    }
  }

  /* ── Démo FamilyApps ───────────────────────────────────────────────── */

  function svg(width, height, viewBox, children) {
    var el = document.createElementNS(SVG_NS, 'svg');
    el.setAttribute('width', width);
    el.setAttribute('height', height);
    el.setAttribute('viewBox', viewBox);
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    children.forEach(function (d) {
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      el.appendChild(path);
    });
    return el;
  }

  function renderFamilyApps() {
    var list = document.getElementById('family-app-list');
    if (!list) return;

    DEMO_APPS.forEach(function (entry) {
      var theme = themeById(entry[0]);
      var maturity = entry[1];

      var link = document.createElement('a');
      link.href = 'https://github.com/mister-guiiug/' + theme.id;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.dataset.dwc = 'family-app';
      link.setAttribute(
        'aria-label',
        theme.name + ' (' + MATURITY_LABELS[maturity] + ') — nouvel onglet'
      );

      // Chemin de repli du composant : initiale du nom quand l'icône distante
      // n'est pas chargée (le showroom reste hors ligne).
      var icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.dataset.dwc = 'family-app-icon';
      icon.textContent = theme.name.charAt(0);
      link.appendChild(icon);

      var body = document.createElement('span');
      body.dataset.dwc = 'family-app-body';

      var head = document.createElement('span');
      head.dataset.dwc = 'family-app-head';

      var name = document.createElement('span');
      name.dataset.dwc = 'family-app-name';
      name.textContent = theme.name;
      head.appendChild(name);

      var badge = document.createElement('span');
      badge.dataset.dwc = 'maturity';
      badge.dataset.maturity = maturity;
      badge.textContent = MATURITY_LABELS[maturity];
      head.appendChild(badge);

      body.appendChild(head);

      var desc = document.createElement('span');
      desc.dataset.dwc = 'family-app-desc';
      desc.textContent = theme.tagline;
      body.appendChild(desc);

      link.appendChild(body);

      var arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.dataset.dwc = 'family-app-arrow';
      arrow.appendChild(
        svg(14, 14, '0 0 24 24', [
          'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
          'M15 3h6v6',
          'M10 14 21 3',
        ])
      );
      link.appendChild(arrow);

      var li = document.createElement('li');
      li.appendChild(link);
      list.appendChild(li);
    });
  }

  /* ── Amorçage ──────────────────────────────────────────────────────── */

  var select = document.getElementById('theme-app');
  var currentScheme = read(SCHEME_KEY, 'system');
  var currentTheme = themeById(read(APP_KEY, 'generic'));

  if (select) {
    select.textContent = '';
    var groupGeneric = document.createElement('optgroup');
    groupGeneric.label = 'Référence';
    var groupApps = document.createElement('optgroup');
    groupApps.label = 'Applications consommatrices';

    themes.forEach(function (theme) {
      var option = document.createElement('option');
      option.value = theme.id;
      option.textContent = theme.name;
      (theme.id === 'generic' ? groupGeneric : groupApps).appendChild(option);
    });

    select.appendChild(groupGeneric);
    select.appendChild(groupApps);
    select.value = currentTheme.id;

    select.addEventListener('change', function () {
      currentTheme = themeById(select.value);
      write(APP_KEY, currentTheme.id);
      applyScheme(currentScheme, currentTheme);
      syncSchemeInputs(currentScheme, currentTheme);
      applyTheme(currentTheme);
    });
  }

  document.querySelectorAll('input[name="scheme"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      currentScheme = input.value;
      write(SCHEME_KEY, currentScheme);
      applyScheme(currentScheme, currentTheme);
      applyTheme(currentTheme);
    });
  });

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function () {
      if (currentScheme !== 'system') return;
      applyScheme(currentScheme, currentTheme);
      applyTheme(currentTheme);
    });

  window.addEventListener('resize', measure, { passive: true });

  applyScheme(currentScheme, currentTheme);
  syncSchemeInputs(currentScheme, currentTheme);
  applyTheme(currentTheme);
  renderFamilyApps();
  measure();
})();
