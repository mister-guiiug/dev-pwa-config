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
  var LANG_KEY = 'dwc_showroom_lang';

  /* ── Langue ────────────────────────────────────────────────────────── *
   * Le français n'est pas dans un dictionnaire : c'est le HTML lui-même,
   * capturé au chargement. On ne maintient donc qu'UNE langue en double, et
   * la page reste juste sans JavaScript.
   * ────────────────────────────────────────────────────────────────────── */

  var DICTS = globalThis.SHOWROOM_I18N || {};
  var LANGS = ['fr'].concat(Object.keys(DICTS));
  var originalHtml = {};
  var lang = 'fr';

  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    originalHtml[el.dataset.i18n] = el.innerHTML;
  });

  /** Traduit une clé ; `fallback` est le libellé français par défaut. */
  function t(key, fallback) {
    if (lang === 'fr') return fallback;
    var value = (DICTS[lang] || {})[key];
    return value === undefined ? fallback : value;
  }

  function applyLang(next) {
    lang = LANGS.indexOf(next) === -1 ? 'fr' : next;
    var dict = lang === 'fr' ? originalHtml : DICTS[lang] || {};
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var value = dict[el.dataset.i18n];
      // Clé absente d'une traduction : on garde le français plutôt que de
      // vider le bloc — une page trouée est pire qu'une page mixte.
      if (value === undefined && lang !== 'fr') {
        value = originalHtml[el.dataset.i18n];
      }
      if (value !== undefined) el.innerHTML = value;
    });
    root.lang = lang;
  }

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
    ['info', '--ds-info', 'Information', 'Neutre, contextuel, aide'],
  ];

  // Maturités RÉELLES (apps-catalog.js) pour la démo FamilyApps : montre les
  // trois badges sans dupliquer le catalogue.
  var DEMO_APPS = [
    ['miss-carbook', 'stable'],
    ['mister-doc', 'beta'],
    ['miss-badminton', 'alpha'],
  ];
  var MATURITY_FR = { alpha: 'Alpha', beta: 'Bêta', stable: 'Stable' };
  function maturityLabel(m) {
    return t('ui.maturity.' + m, MATURITY_FR[m]);
  }

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

  /* ── État partageable ──────────────────────────────────────────────── *
   * Le showroom sert à COMPARER des thèmes : ne pas pouvoir en envoyer un par
   * lien était le manque le plus surprenant. L'état vit donc dans l'URL, le
   * stockage local ne servant plus que de mémoire entre deux visites.
   * ────────────────────────────────────────────────────────────────────── */

  function paramOr(name, fallback) {
    try {
      return new URLSearchParams(location.search).get(name) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  /**
   * Reflète l'état courant dans la query, sans empiler d'entrées d'historique
   * — chaque bascule de thème polluerait le bouton « précédent » — et sans
   * toucher au fragment, qui porte l'ancre de section.
   */
  function syncUrl() {
    try {
      var url = new URL(location.href);
      url.searchParams.set('app', currentTheme.id);
      url.searchParams.set('scheme', currentScheme);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url);
    } catch (e) {
      /* URL non manipulable (file://) : le stockage prend le relais */
    }
  }

  /* ── Copie au presse-papier ────────────────────────────────────────── *
   * Geste n°1 dans une doc de design system : on vient chercher un nom de
   * token, un sélecteur, un hex ou un appel de composant. La page n'en offrait
   * aucun.
   * ────────────────────────────────────────────────────────────────────── */

  /**
   * Repli quand l'API presse-papier est refusée : contexte non sécurisé
   * (`file://`), permission bloquée, ou navigateur ancien. `execCommand` est
   * déprécié mais reste la seule voie universelle, et un bouton de copie qui
   * ne copie pas vaut moins que pas de bouton du tout.
   */
  function legacyCopy(text) {
    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  // Région d'annonce unique : le changement de glyphe sur le bouton est
  // invisible pour un lecteur d'écran, et 88 régions live seraient pires que
  // pas de région du tout.
  var liveRegion = document.createElement('p');
  liveRegion.className = 'sr-visually-hidden';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  document.body.appendChild(liveRegion);

  function announce(message) {
    liveRegion.textContent = message;
    setTimeout(function () {
      liveRegion.textContent = '';
    }, 2000);
  }

  function copyButton(getText, describedLabel) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'sr-copy';
    button.setAttribute('aria-label', describedLabel);
    button.textContent = '⧉';

    button.addEventListener('click', function () {
      var text = typeof getText === 'function' ? getText() : getText;
      var done = function (ok) {
        button.dataset.state = ok ? 'ok' : 'ko';
        button.textContent = ok ? '✓' : '✗';
        announce(
          ok
            ? t('ui.copied', 'Copié')
            : t('ui.copyFailed', 'Copie impossible — sélectionnez le texte')
        );
        setTimeout(function () {
          delete button.dataset.state;
          button.textContent = '⧉';
        }, 1400);
      };
      try {
        navigator.clipboard.writeText(text).then(
          function () {
            done(true);
          },
          function () {
            done(legacyCopy(text));
          }
        );
      } catch (e) {
        done(legacyCopy(text));
      }
    });

    return button;
  }

  /** Ajoute un bouton de copie à la fin d'un élément, une seule fois. */
  function attachCopy(el, getText, label) {
    if (!el || el.querySelector(':scope > .sr-copy')) return;
    el.appendChild(copyButton(getText, label));
  }

  /* ── Contraste WCAG ────────────────────────────────────────────────── */

  // `getComputedStyle` ne résout PAS les custom properties : la valeur revient
  // telle qu'écrite (`#6d28d9`), jamais en `rgb()`. On gère donc l'hex d'abord
  // — sinon `#0f172a` se laisserait lire comme trois nombres bidon.
  //
  // Retourne `{ rgb: [r, g, b], a }`, l'alpha étant indispensable : les fonds
  // teintés du design system sont des `color-mix(… , transparent)`.
  function parseColor(value) {
    var raw = String(value).trim();

    var short = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (short) {
      return {
        rgb: [1, 2, 3].map(function (i) {
          return parseInt(short[i] + short[i], 16);
        }),
        a: 1,
      };
    }

    var long = raw.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (long) {
      return {
        rgb: [1, 2, 3].map(function (i) {
          return parseInt(long[i], 16);
        }),
        a: 1,
      };
    }

    var fn = raw.match(/^rgba?\(([^)]+)\)$/i);
    if (fn) {
      var parts = fn[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
        return {
          rgb: parts.slice(0, 3),
          a: parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1,
        };
      }
    }

    // `color-mix()` revient en `color(srgb r g b / a)`, canaux 0→1.
    var srgb = raw.match(/^color\(srgb\s+([^)]+)\)$/i);
    if (srgb) {
      var chans = srgb[1]
        .split(/[\s/]+/)
        .filter(Boolean)
        .map(Number);
      if (chans.length >= 3 && chans.slice(0, 3).every(Number.isFinite)) {
        return {
          rgb: chans.slice(0, 3).map(function (v) {
            return Math.round(v * 255);
          }),
          a: chans.length > 3 && Number.isFinite(chans[3]) ? chans[3] : 1,
        };
      }
    }

    return null;
  }

  function parseRgb(value) {
    var color = parseColor(value);
    return color ? color.rgb : null;
  }

  /**
   * Couleur de fond RÉELLEMENT perçue derrière un élément.
   *
   * Ne pas se contenter du premier fond non transparent : les fonds teintés du
   * design system (`color-mix(…, transparent)`) sont SEMI-transparents. Les
   * comparer tels quels revient à mesurer une couleur contre elle-même — le
   * ratio sort à 1,00:1 et le contrôle ne détecte plus rien. On empile donc
   * les couches jusqu'à la première opaque, puis on les compose.
   */
  function effectiveBackground(el) {
    var layers = [];
    for (var node = el; node; node = node.parentElement) {
      var color = parseColor(getComputedStyle(node).backgroundColor);
      if (!color || color.a === 0) continue;
      layers.push(color);
      if (color.a >= 1) break;
    }

    var base = layers.pop() ?? { rgb: [255, 255, 255], a: 1 };
    var out = base.rgb;
    while (layers.length) {
      var top = layers.pop();
      out = out.map(function (under, i) {
        return Math.round(top.rgb[i] * top.a + under * (1 - top.a));
      });
    }
    return 'rgb(' + out.join(', ') + ')';
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
      hints.push(
        t(
          'ui.hint.darkOnly',
          'application dark-only : le schéma clair est désactivé'
        )
      );
    }
    if (theme.attribute === 'class') {
      hints.push(
        t('ui.hint.classAttr', 'thème piloté par la classe .dark côté app')
      );
    }

    var nameEl = document.getElementById('theme-name');
    var taglineEl = document.getElementById('theme-tagline');
    if (nameEl)
      nameEl.textContent = t('theme.' + theme.id + '.name', theme.name);
    if (taglineEl) {
      taglineEl.textContent =
        t('theme.' + theme.id + '.tagline', theme.tagline) +
        (hints.length ? ' — ' + hints.join(' ; ') + '.' : '');
    }

    var sample = document.getElementById('font-display-sample');
    if (sample) {
      sample.textContent = theme.fontDisplay
        ? t('ui.font.some', 'Titrage —') +
          ' ' +
          theme.fontDisplay.split(',')[0].replace(/'/g, '')
        : t('ui.font.none', 'Titrage — pile système (aucune police dédiée)');
    }

    renderSwatches();
    // Le contraste dépend du thème appliqué : on le recalcule à chaque bascule.
    measureContrast();
    labelTableCells();
    // La galerie et la comparaison suivent le thème, quelle que soit la
    // commande qui l'a changé (menu de démo ou sélecteur de la barre).
    syncDemoMenu();
    renderDemoStage();
    renderCompare();
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
      name.textContent = t('ui.role.' + role[0], role[2]);
      meta.appendChild(name);

      var token = document.createElement('code');
      token.textContent = role[1] + ' · ' + value;
      meta.appendChild(token);

      var desc = document.createElement('span');
      desc.textContent = t('ui.role.' + role[0] + '.desc', role[3]);
      meta.appendChild(desc);

      if (role[4]) {
        var ratio = contrastRatio(value, styles.getPropertyValue(role[4]));
        if (ratio) {
          var badge = document.createElement('span');
          badge.textContent =
            t('ui.contrast', 'contraste') +
            ' ' +
            ratio.toFixed(2) +
            ':1 — ' +
            (ratio >= 4.5
              ? t('ui.contrast.aa', 'AA ✓')
              : ratio >= 3
                ? t('ui.contrast.aaLarge', 'AA (grand texte)')
                : '✗');
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

    // Les tailles fluides bougent avec la fenêtre : la cible tactile se
    // remesure, elle ne se déduit pas.
    measureTargets();
  }

  /* ── Matrices de primitives ────────────────────────────────────────── */

  var BUTTON_VARIANTS = [
    ['primary', 'Primaire'],
    ['secondary', 'Secondaire'],
    ['outline', 'Contour'],
    ['ghost', 'Fantôme'],
    ['danger', 'Danger'],
  ];

  // Colonnes = tailles puis états. Les états sont testés en taille `md`.
  var BUTTON_COLUMNS = [
    {
      key: 'sm',
      head: 'sm',
      props: { size: 'sm' },
      label: 'Petit',
      i18n: 'ui.button.small',
    },
    {
      key: 'md',
      head: 'md',
      props: { size: 'md' },
      label: 'Moyen',
      i18n: 'ui.button.medium',
    },
    {
      key: 'lg',
      head: 'lg',
      props: { size: 'lg' },
      label: 'Grand',
      i18n: 'ui.button.large',
    },
    {
      key: 'loading',
      head: 'loading',
      props: { size: 'md', loading: true },
      label: 'Envoi…',
      i18n: 'ui.button.sending',
    },
    {
      key: 'disabled',
      head: 'disabled',
      props: { size: 'md', disabled: true },
      label: 'Inactif',
      i18n: 'ui.button.inactive',
    },
    {
      key: 'icon',
      head: 'iconOnly',
      props: { size: 'md', iconOnly: true },
      label: '+',
    },
  ];

  function makeButton(variant, column) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.dwc = 'button';
    b.dataset.variant = variant;
    b.dataset.size = column.props.size;
    if (column.props.loading) {
      b.dataset.loading = '';
      b.setAttribute('aria-busy', 'true');
      b.disabled = true;
      var spinner = document.createElement('span');
      spinner.dataset.dwc = 'button-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      b.appendChild(spinner);
    }
    if (column.props.disabled) b.disabled = true;
    if (column.props.iconOnly) {
      b.dataset.iconOnly = '';
      // Sans libellé visible, le libellé accessible est obligatoire.
      b.setAttribute('aria-label', t('ui.button.add', 'Ajouter'));
    }
    b.appendChild(document.createTextNode(t(column.i18n, column.label)));
    return b;
  }

  function buildMatrix(
    table,
    headLabel,
    rows,
    columns,
    cellFactory,
    rowKeyPrefix
  ) {
    if (!table) return;
    table.textContent = '';

    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    [headLabel].concat(columns.map(c => c.head ?? c)).forEach(function (label) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.scope = 'row';
      th.textContent = t(rowKeyPrefix + row[0], row[1]);
      tr.appendChild(th);
      columns.forEach(function (column) {
        var td = document.createElement('td');
        td.appendChild(cellFactory(row[0], column));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }

  var BADGE_TONES = [
    ['brand', 'brand'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['danger', 'danger'],
    ['info', 'info'],
    ['muted', 'muted'],
  ];
  var BADGE_VARIANTS = [
    { key: 'soft', head: 'soft' },
    { key: 'outline', head: 'outline' },
  ];

  function makeBadge(tone, column) {
    var span = document.createElement('span');
    span.dataset.dwc = 'badge';
    span.dataset.tone = tone;
    span.dataset.variant = column.key;
    span.textContent = tone;
    return span;
  }

  /* ── Feuille modale de démonstration ───────────────────────────────── */

  var FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function setupSheet() {
    var sheet = document.getElementById('demo-sheet');
    var opener = document.getElementById('sheet-open');
    if (!sheet || !opener) return;
    var panel = sheet.querySelector('[data-dwc="sheet-panel"]');
    var restore = null;

    function close() {
      sheet.hidden = true;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      restore?.focus();
    }

    // Reproduit le comportement du composant : Échap ferme, Tab boucle.
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      var items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    opener.addEventListener('click', function () {
      restore = opener;
      sheet.hidden = false;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKeyDown);
      panel.focus();
    });

    sheet.addEventListener('mousedown', function (event) {
      if (event.target === sheet) close();
    });
    // Croix, « Enregistrer » et « Annuler » ferment tous la feuille : dans une
    // vraie app, l'action d'enregistrement ferme aussi le panneau.
    sheet
      .querySelector('[data-dwc="sheet-close"]')
      ?.addEventListener('click', close);
    sheet.querySelectorAll('[data-sheet-close]').forEach(function (button) {
      button.addEventListener('click', close);
    });
  }

  /* ── Contrôles d'accessibilité, mesurés sur la page ────────────────── */

  var TARGET_MIN = 44;

  // Ce qu'on mesure : les commandes réellement tapables, groupées par type.
  var TARGET_GROUPS = [
    [
      'Button — toutes tailles',
      '#button-matrix [data-dwc="button"]',
      'ui.a11y.group.buttons',
    ],
    ['Champs de saisie', '[data-dwc="field-control"]', 'ui.a11y.group.fields'],
    [
      'Fermeture de feuille',
      '[data-dwc="sheet-close"]',
      'ui.a11y.group.sheetClose',
    ],
    [
      'Actions de bannière',
      '[data-dwc="error-banner-retry"]',
      'ui.a11y.group.bannerActions',
    ],
    ['Cartes famille', '[data-dwc="family-app"]', 'ui.a11y.group.familyCards'],
    [
      'Liens de pied de page',
      '[data-dwc="footer-source"]',
      'ui.a11y.group.footerLinks',
    ],
  ];

  function row(cells) {
    var tr = document.createElement('tr');
    cells.forEach(function (cell, i) {
      var el = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) el.scope = 'row';
      if (cell && typeof cell === 'object') {
        el.textContent = cell.text;
        if (cell.className) el.className = cell.className;
        if (cell.color) el.style.color = cell.color;
      } else {
        el.textContent = cell;
      }
      tr.appendChild(el);
    });
    return tr;
  }

  function headRow(labels) {
    var thead = document.createElement('thead');
    var tr = document.createElement('tr');
    labels.forEach(function (label) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    return thead;
  }

  function measureTargets() {
    var table = document.getElementById('a11y-target');
    if (!table) return;
    table.textContent = '';
    table.appendChild(
      headRow([
        t('ui.a11y.control', 'Commande'),
        t('ui.a11y.measured', 'Mesurées'),
        t('ui.a11y.minHeight', 'Hauteur min.'),
        t('ui.a11y.verdict', 'Verdict'),
      ])
    );
    var tbody = document.createElement('tbody');

    TARGET_GROUPS.forEach(function (group) {
      var nodes = [...document.querySelectorAll(group[1])].filter(function (n) {
        // Un élément masqué mesure 0 : il fausserait le minimum.
        return n.getClientRects().length > 0;
      });
      if (!nodes.length) return;
      var min = Math.min(
        ...nodes.map(function (n) {
          return n.getBoundingClientRect().height;
        })
      );
      var ok = min >= TARGET_MIN - 0.5;
      tbody.appendChild(
        row([
          t(group[2], group[0]),
          String(nodes.length),
          { text: min.toFixed(1) + ' px', className: 'sr-computed' },
          {
            text: ok
              ? t('ui.a11y.pass', '✓ ≥ 44 px')
              : t('ui.a11y.fail', '✗ sous le seuil'),
            color: ok ? 'var(--ds-success)' : 'var(--ds-danger)',
          },
        ])
      );
    });

    table.appendChild(tbody);
  }

  function toHex(rgb) {
    return (
      '#' +
      rgb
        .map(function (v) {
          return Math.max(0, Math.min(255, Math.round(v)))
            .toString(16)
            .padStart(2, '0');
        })
        .join('')
    );
  }

  /**
   * Couleur la plus PROCHE de l'originale qui tienne le seuil, obtenue par
   * recherche dichotomique sur un mélange vers le noir ou vers le blanc.
   *
   * Conserver la teinte compte : proposer « mets du noir » ferait passer le
   * test en détruisant l'identité de l'app.
   */
  function nudge(from, against, threshold) {
    var source = parseColor(from);
    var other = parseColor(against);
    if (!source || !other) return null;

    // On s'éloigne de la couleur d'en face : elle est claire → on fonce.
    var target = luminance(other.rgb) > 0.35 ? [0, 0, 0] : [255, 255, 255];
    var mix = function (amount) {
      return source.rgb.map(function (channel, i) {
        return channel * (1 - amount) + target[i] * amount;
      });
    };

    // Même poussé à fond, le mélange ne suffit pas : inutile de proposer.
    if (contrastRatio(toHex(mix(1)), against) < threshold) return null;

    var low = 0;
    var high = 1;
    for (var i = 0; i < 20; i += 1) {
      var mid = (low + high) / 2;
      if (contrastRatio(toHex(mix(mid)), against) >= threshold) high = mid;
      else low = mid;
    }
    return toHex(mix(high));
  }

  /**
   * Que corriger, et vers quoi.
   *
   * Le texte d'abord : c'est le moins invasif. Mais du blanc sur une couleur
   * de marque — le cas le plus fréquent — ne se rattrape PAS en touchant au
   * texte : il est déjà à l'extrême. Il faut alors foncer le fond, et le dire.
   */
  function suggestFix(fg, bg, threshold) {
    var text = nudge(fg, bg, threshold);
    if (text) return { role: 'text', color: text };
    var back = nudge(bg, fg, threshold);
    if (back) return { role: 'background', color: back };
    return null;
  }

  function swatchDot(color) {
    var dot = document.createElement('span');
    dot.className = 'sr-inline-swatch';
    dot.style.background = color;
    dot.setAttribute('aria-hidden', 'true');
    return dot;
  }

  function contrastRow(label, fg, bg, threshold, element) {
    var ratio = contrastRatio(fg, bg);
    if (!ratio) return null;
    var ok = ratio >= threshold;

    var tr = row([
      label,
      { text: ratio.toFixed(2) + ':1', className: 'sr-computed' },
      threshold.toFixed(1) + ':1',
      {
        text: ok
          ? t('ui.a11y.ok', '✓ conforme')
          : t('ui.a11y.ko', '✗ insuffisant'),
        color: ok ? 'var(--ds-success)' : 'var(--ds-danger)',
      },
    ]);

    // Les deux couleurs en cause, à côté du libellé : un ratio seul ne dit pas
    // QUOI corriger.
    var head = tr.firstChild;
    head.prepend(swatchDot(bg));
    head.prepend(swatchDot(fg));

    if (!ok) {
      var fix = suggestFix(fg, bg, threshold);
      var cell = tr.lastChild;
      if (fix) {
        var hint = document.createElement('span');
        hint.className = 'sr-fix';
        hint.textContent =
          (fix.role === 'text'
            ? t('ui.a11y.suggestText', 'texte')
            : t('ui.a11y.suggestBg', 'fond')) +
          ' → ' +
          fix.color;
        cell.appendChild(hint);
        attachCopy(
          cell,
          fix.color,
          t('ui.a11y.copyFix', 'Copier la couleur proposée')
        );
      }
      // Cliquer la ligne va voir l'élément mesuré et le met en évidence :
      // un constat qu'on ne peut pas localiser ne se corrige pas.
      if (element) {
        tr.classList.add('sr-row-locatable');
        tr.tabIndex = 0;
        tr.setAttribute('role', 'button');
        tr.title = t('ui.a11y.locate', 'Localiser sur la page');
        var locate = function () {
          element.scrollIntoView({ block: 'center' });
          element.dataset.srHighlight = '';
          setTimeout(function () {
            delete element.dataset.srHighlight;
          }, 2200);
        };
        tr.addEventListener('click', locate);
        tr.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            locate();
          }
        });
      }
    }

    return tr;
  }

  function measureContrast() {
    var table = document.getElementById('a11y-contrast');
    if (!table) return;
    table.textContent = '';
    table.appendChild(
      headRow([
        t('ui.a11y.pair', 'Paire'),
        t('ui.a11y.ratio', 'Ratio'),
        t('ui.a11y.threshold', 'Seuil AA'),
        t('ui.a11y.verdict', 'Verdict'),
      ])
    );
    var tbody = document.createElement('tbody');

    function push(label, el, threshold) {
      if (!el) return;
      var styles = getComputedStyle(el);
      var line = contrastRow(
        label,
        styles.color,
        effectiveBackground(el),
        threshold,
        el
      );
      if (line) tbody.appendChild(line);
    }

    BUTTON_VARIANTS.forEach(function (variant) {
      push(
        'Button ' + variant[0],
        document.querySelector(
          '#button-matrix [data-variant="' +
            variant[0] +
            '"][data-size="md"]:not([disabled])'
        ),
        4.5
      );
    });

    BADGE_TONES.forEach(function (tone) {
      push(
        'Badge ' + tone[0],
        document.querySelector(
          '#badge-matrix [data-tone="' + tone[0] + '"][data-variant="soft"]'
        ),
        4.5
      );
    });

    push(
      t('ui.a11y.mutedOnSurface', 'Texte atténué sur surface'),
      document.querySelector('.sr-note'),
      4.5
    );

    table.appendChild(tbody);
  }

  /* ── Extraits d'usage, copies, tableaux en cartes ──────────────────── */

  var SNIPPETS = globalThis.SHOWROOM_SNIPPETS || {};

  /** Injecte l'extrait React dans chaque emplacement `data-snippet`. */
  function renderSnippets() {
    document.querySelectorAll('[data-snippet]').forEach(function (slot) {
      var code = SNIPPETS[slot.dataset.snippet];
      if (!code) return;
      slot.textContent = '';

      var head = document.createElement('p');
      head.className = 'sr-snippet-head';
      head.textContent = t('ui.usage', 'Utilisation');
      attachCopy(head, code, t('ui.copySnippet', 'Copier l’extrait'));

      var pre = document.createElement('pre');
      var el = document.createElement('code');
      el.textContent = code;
      pre.appendChild(el);

      slot.appendChild(head);
      slot.appendChild(pre);
    });
  }

  /** Bouton de copie sur chaque nom de token et chaque sélecteur listé. */
  function attachTokenCopies() {
    document
      .querySelectorAll('#fondations tbody th code, .sr-selectors code')
      .forEach(function (code) {
        var parent = code.parentElement;
        if (!parent || parent.querySelector(':scope > .sr-copy')) return;
        parent.appendChild(
          copyButton(
            code.textContent.trim(),
            t('ui.copyToken', 'Copier') + ' ' + code.textContent.trim()
          )
        );
      });
  }

  /**
   * Étiquette chaque cellule avec l'en-tête de sa colonne, pour que les
   * tableaux puissent devenir des cartes sous `sm` sans réécrire le HTML.
   *
   * Fait en JS : les tableaux ENGENDRÉS (matrices, contrôles a11y) en
   * bénéficient aussi, et aucune cellule n'est recopiée à la main.
   */
  function labelTableCells() {
    document.querySelectorAll('.sr-table').forEach(function (table) {
      var heads = [].map.call(
        table.querySelectorAll('thead th'),
        function (th) {
          return th.textContent.trim();
        }
      );
      if (!heads.length) return;
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        [].forEach.call(tr.children, function (cell, i) {
          if (heads[i]) cell.dataset.label = heads[i];
        });
      });
    });
  }

  /* ── Bac à sable ───────────────────────────────────────────────────── *
   * Les matrices montrent des combinaisons CHOISIES. Celle qu'on cherche n'y
   * est pas forcément, et c'est le moment où l'on quitte la doc pour aller
   * lire la source.
   *
   * Chaque composant décrit ses props réglables, le DOM qu'il produit et
   * l'appel React correspondant — les trois au même endroit, pour qu'ajouter
   * une prop ne puisse pas en oublier une des deux autres.
   * ────────────────────────────────────────────────────────────────────── */

  /** Assemble un appel JSX, sur une ligne tant que ça tient. */
  function jsx(name, attrs, children) {
    var list = attrs.filter(Boolean);
    var head = '<' + name + (list.length ? ' ' + list.join(' ') : '');
    var flat =
      head + (children == null ? ' />' : '>' + children + '</' + name + '>');
    if (flat.length <= 74 && flat.indexOf('\n') === -1) return flat;

    var open =
      '<' +
      name +
      '\n  ' +
      list.join('\n  ') +
      '\n' +
      (children == null ? '/>' : '>');
    if (children == null) return open;
    return (
      open +
      '\n  ' +
      String(children).split('\n').join('\n  ') +
      '\n</' +
      name +
      '>'
    );
  }

  function attr(name, value) {
    return value === true ? name : name + '="' + value + '"';
  }

  /** Élément avec attributs `data-dwc` — le balisage exact des composants. */
  function dwc(tag, name, attrs) {
    var node = document.createElement(tag);
    node.dataset.dwc = name;
    Object.keys(attrs || {}).forEach(function (key) {
      if (attrs[key] === false || attrs[key] == null) return;
      node.setAttribute(key, attrs[key] === true ? '' : attrs[key]);
    });
    return node;
  }

  var PG_COMPONENTS = [
    {
      id: 'Button',
      props: [
        {
          name: 'variant',
          values: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
        },
        { name: 'size', values: ['sm', 'md', 'lg'], def: 'md' },
        { name: 'loading', bool: true },
        { name: 'disabled', bool: true },
        { name: 'block', bool: true },
        { name: 'iconOnly', bool: true },
      ],
      build: function (p) {
        var label = t('ui.pg.save', 'Enregistrer');
        var b = dwc('button', 'button', {
          type: 'button',
          'data-variant': p.variant,
          'data-size': p.size,
          'data-block': p.block,
        });
        if (p.iconOnly) {
          b.dataset.iconOnly = '';
          // Sans libellé visible, le libellé accessible n'est pas optionnel.
          b.setAttribute('aria-label', t('ui.button.add', 'Ajouter'));
        }
        if (p.loading) {
          b.dataset.loading = '';
          b.setAttribute('aria-busy', 'true');
          b.disabled = true;
          b.appendChild(
            dwc('span', 'button-spinner', { 'aria-hidden': 'true' })
          );
        }
        if (p.disabled) b.disabled = true;
        if (p.iconOnly) b.appendChild(plusIcon());
        else b.appendChild(document.createTextNode(label));
        return b;
      },
      code: function (p) {
        var label = t('ui.pg.save', 'Enregistrer');
        return jsx(
          'Button',
          [
            attr('variant', p.variant),
            attr('size', p.size),
            p.block && 'block',
            p.loading && 'loading',
            p.disabled && 'disabled',
            p.iconOnly && 'iconOnly',
            p.iconOnly && attr('aria-label', t('ui.button.add', 'Ajouter')),
            'onClick={save}',
          ],
          p.iconOnly ? '<Plus size={18} aria-hidden="true" />' : label
        );
      },
      note: function (p) {
        if (p.iconOnly)
          return t(
            'ui.pg.note.iconOnly',
            '`iconOnly` impose `aria-label` — il est ajouté à l’extrait ci-dessus : sans lui, le bouton n’aurait aucun nom accessible.'
          );
        if (p.loading)
          return t(
            'ui.pg.note.loading',
            '`loading` pose `aria-busy` ET désactive : c’est ce qui empêche la double soumission.'
          );
        return '';
      },
    },
    {
      id: 'Badge',
      props: [
        {
          name: 'tone',
          values: ['brand', 'success', 'warning', 'danger', 'info', 'muted'],
          def: 'muted',
        },
        { name: 'variant', values: ['soft', 'outline'] },
      ],
      build: function (p) {
        var s = dwc('span', 'badge', {
          'data-tone': p.tone,
          'data-variant': p.variant,
        });
        s.textContent = t('ui.pg.badge', 'À jour');
        return s;
      },
      code: function (p) {
        return jsx(
          'Badge',
          [attr('tone', p.tone), attr('variant', p.variant)],
          t('ui.pg.badge', 'À jour')
        );
      },
      note: function () {
        return t(
          'ui.pg.note.badge',
          'Le ton dit une INTENTION ; la teinte vient du thème de l’application.'
        );
      },
    },
    {
      id: 'Field',
      props: [
        { name: 'hint', bool: true, def: true },
        { name: 'error', bool: true },
        { name: 'multiline', bool: true },
      ],
      build: function (p) {
        var wrap = dwc('div', 'field', { 'data-invalid': p.error });
        var label = dwc('label', 'field-label', { for: 'pg-field' });
        label.textContent = t('ui.pg.amount', 'Montant');
        wrap.appendChild(label);

        var control = dwc(p.multiline ? 'textarea' : 'input', 'field-control', {
          id: 'pg-field',
          'data-multiline': p.multiline,
          'aria-invalid': p.error ? 'true' : false,
        });
        // En erreur, l'aide RESTE référencée : la retirer masque la consigne
        // au pire moment.
        var described = [];
        if (p.hint) described.push('pg-field-hint');
        if (p.error) described.push('pg-field-error');
        if (described.length)
          control.setAttribute('aria-describedby', described.join(' '));
        if (!p.multiline) control.value = '42,00';
        else control.textContent = '42,00';
        wrap.appendChild(control);

        if (p.hint) {
          var hint = dwc('p', 'field-hint', { id: 'pg-field-hint' });
          hint.textContent = t('ui.pg.hint', 'En euros, deux décimales.');
          wrap.appendChild(hint);
        }
        if (p.error) {
          var err = dwc('p', 'field-error', { id: 'pg-field-error' });
          err.textContent = t('ui.pg.error', 'Le montant doit être positif.');
          wrap.appendChild(err);
        }
        return wrap;
      },
      code: function (p) {
        // `multiline` est une prop de TextField, pas un autre composant.
        return jsx('TextField', [
          attr('label', t('ui.pg.amount', 'Montant')),
          p.hint && attr('hint', t('ui.pg.hint', 'En euros, deux décimales.')),
          p.error &&
            attr('error', t('ui.pg.error', 'Le montant doit être positif.')),
          p.multiline && 'multiline',
          'value={amount}',
          'onChange={e => setAmount(e.target.value)}',
        ]);
      },
      note: function (p) {
        if (p.hint && p.error)
          return t(
            'ui.pg.note.field',
            'aria-describedby référence l’aide ET l’erreur — les copies locales remplaçaient l’une par l’autre.'
          );
        return '';
      },
    },
    {
      id: 'Stat',
      props: [
        { name: 'trend', values: ['none', 'up', 'down'] },
        { name: 'icon', bool: true },
      ],
      build: function (p) {
        var fig = dwc('figure', 'stat', {});
        var head = dwc('div', 'stat-head', {});
        var label = dwc('figcaption', 'stat-label', {});
        label.textContent = t('ui.pg.members', 'Adhérents');
        head.appendChild(label);
        if (p.icon) {
          var icon = dwc('span', 'stat-icon', { 'aria-hidden': 'true' });
          icon.appendChild(plusIcon());
          head.appendChild(icon);
        }
        fig.appendChild(head);

        var value = dwc('p', 'stat-value', {});
        value.textContent = '128';
        fig.appendChild(value);

        if (p.trend !== 'none') {
          var delta = dwc('p', 'stat-delta', { 'data-trend': p.trend });
          delta.textContent = p.trend === 'up' ? '+12' : '−12';
          var hidden = dwc('span', 'stat-trend-label', {});
          // La flèche et la couleur ne disent rien à un lecteur d'écran.
          hidden.textContent =
            p.trend === 'up'
              ? t('ui.pg.up', 'en hausse')
              : t('ui.pg.down', 'en baisse');
          delta.appendChild(hidden);
          fig.appendChild(delta);
        }
        return fig;
      },
      code: function (p) {
        return jsx('Stat', [
          attr('label', t('ui.pg.members', 'Adhérents')),
          'value={128}',
          p.trend !== 'none' && attr('delta', p.trend === 'up' ? '+12' : '−12'),
          p.trend !== 'none' && attr('trend', p.trend),
          p.trend !== 'none' &&
            attr(
              'trendLabel',
              p.trend === 'up'
                ? t('ui.pg.up', 'en hausse')
                : t('ui.pg.down', 'en baisse')
            ),
          p.icon && 'icon={<Users size={16} aria-hidden="true" />}',
        ]);
      },
      note: function (p) {
        if (p.trend !== 'none')
          return t(
            'ui.pg.note.stat',
            '`trendLabel` est lu par les lecteurs d’écran : la flèche et la couleur ne suffisent pas.'
          );
        return '';
      },
    },
    {
      id: 'Skeleton',
      props: [
        { name: 'lines', values: ['1', '3', '5'], def: '3' },
        { name: 'radius', values: ['sm', 'md', 'lg', 'full'], def: 'md' },
      ],
      build: function (p) {
        var group = dwc('div', 'skeleton-group', {
          role: 'status',
          'aria-live': 'polite',
        });
        var label = dwc('span', 'skeleton-label', {});
        label.textContent = t('ui.pg.loading', 'Chargement des écritures');
        group.appendChild(label);
        for (var i = 0; i < Number(p.lines); i++) {
          var bar = dwc('span', 'skeleton', {
            'data-radius': p.radius,
            'aria-hidden': 'true',
          });
          bar.style.height = '0.9rem';
          // Dernière barre plus courte : c'est ce que fait le composant.
          bar.style.width = i === Number(p.lines) - 1 ? '60%' : '100%';
          group.appendChild(bar);
        }
        return group;
      },
      code: function (p) {
        return jsx('SkeletonGroup', [
          attr('label', t('ui.pg.loading', 'Chargement des écritures')),
          'lines={' + p.lines + '}',
          attr('radius', p.radius),
        ]);
      },
      note: function () {
        return t(
          'ui.pg.note.skeleton',
          'Le libellé est annoncé UNE fois, par le conteneur — pas une fois par barre.'
        );
      },
    },
  ];

  function plusIcon() {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('width', '18');
    s.setAttribute('height', '18');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M12 5v14M5 12h14');
    s.appendChild(path);
    return s;
  }

  // État par composant : revenir sur Button doit retrouver ses réglages.
  //
  // `def` porte la valeur PAR DÉFAUT DU COMPOSANT, qui n'est pas toujours la
  // première de la liste : `size` s'ordonne sm → lg mais vaut `md`. Sans ça, le
  // premier extrait qu'on copie n'est pas l'appel par défaut.
  var pgState = {};
  var pgCurrent = 'Button';
  PG_COMPONENTS.forEach(function (spec) {
    var state = {};
    spec.props.forEach(function (prop) {
      if (prop.bool) state[prop.name] = prop.def === true;
      else state[prop.name] = prop.def || prop.values[0];
    });
    pgState[spec.id] = state;
  });

  function pgSpec() {
    for (var i = 0; i < PG_COMPONENTS.length; i++) {
      if (PG_COMPONENTS[i].id === pgCurrent) return PG_COMPONENTS[i];
    }
    return PG_COMPONENTS[0];
  }

  var pgCodeText = '';

  /** Rejoue l'aperçu et l'extrait ; les commandes, elles, ne bougent pas. */
  function pgPaint() {
    var spec = pgSpec();
    var props = pgState[spec.id];
    var stage = document.getElementById('pg-stage');
    var code = document.getElementById('pg-code');
    if (!stage || !code) return;

    stage.textContent = '';
    stage.appendChild(spec.build(props));

    pgCodeText = spec.code(props);
    code.querySelector('code').textContent = pgCodeText;

    var note = code.querySelector('.sr-pg-note');
    var text = spec.note ? spec.note(props) : '';
    note.textContent = text;
    note.hidden = !text;
  }

  function renderPlayground() {
    var controls = document.getElementById('pg-controls');
    var code = document.getElementById('pg-code');
    var stageHead = document.getElementById('pg-stage-head');
    if (!controls || !code) return;

    controls.textContent = '';
    code.textContent = '';

    var pick = document.createElement('p');
    pick.className = 'sr-control';
    var pickLabel = document.createElement('label');
    pickLabel.htmlFor = 'pg-component';
    pickLabel.textContent = t('ui.pg.component', 'Composant');
    var select = document.createElement('select');
    select.id = 'pg-component';
    PG_COMPONENTS.forEach(function (spec) {
      var option = document.createElement('option');
      option.value = spec.id;
      option.textContent = spec.id;
      select.appendChild(option);
    });
    select.value = pgCurrent;
    select.addEventListener('change', function () {
      pgCurrent = select.value;
      renderPlayground();
    });
    pick.appendChild(pickLabel);
    pick.appendChild(select);
    controls.appendChild(pick);

    var spec = pgSpec();
    var props = pgState[spec.id];

    spec.props.forEach(function (prop) {
      var id = 'pg-' + spec.id + '-' + prop.name;
      var wrap = document.createElement('p');
      wrap.className = prop.bool ? 'sr-control sr-control--bool' : 'sr-control';

      var input;
      if (prop.bool) {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!props[prop.name];
        input.addEventListener('change', function () {
          props[prop.name] = input.checked;
          pgPaint();
        });
      } else {
        input = document.createElement('select');
        prop.values.forEach(function (value) {
          var option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          input.appendChild(option);
        });
        input.value = props[prop.name];
        input.addEventListener('change', function () {
          props[prop.name] = input.value;
          pgPaint();
        });
      }
      input.id = id;

      var label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = prop.name;

      // Case à cocher : commande d'abord, libellé ensuite — l'ordre visuel
      // attendu, et le seul qui laisse la cible cliquable au bon endroit.
      if (prop.bool) {
        wrap.appendChild(input);
        wrap.appendChild(label);
      } else {
        wrap.appendChild(label);
        wrap.appendChild(input);
      }
      controls.appendChild(wrap);
    });

    if (stageHead) stageHead.textContent = t('ui.pg.preview', 'Aperçu');

    var head = document.createElement('p');
    head.className = 'sr-snippet-head';
    head.textContent = t('ui.usage', 'Utilisation');
    // Getter et non valeur : le bouton survit aux changements de props.
    head.appendChild(
      copyButton(
        function () {
          return pgCodeText;
        },
        t('ui.copySnippet', 'Copier l’extrait')
      )
    );
    var pre = document.createElement('pre');
    pre.appendChild(document.createElement('code'));
    var note = document.createElement('p');
    note.className = 'sr-pg-note';

    code.appendChild(head);
    code.appendChild(pre);
    code.appendChild(note);

    pgPaint();
  }

  /* ── Contraste forcé ───────────────────────────────────────────────── *
   * `components.css` repose entièrement sur des variables et des
   * `color-mix()`. En contraste forcé, le navigateur écrase tout ça — un
   * rendu que personne ne regarde jamais.
   *
   * La page en montre deux choses : l'état RÉEL du navigateur qui lit (seule
   * mesure non simulée), et une émulation côte à côte du avant / après.
   * ────────────────────────────────────────────────────────────────────── */

  /**
   * Régressions constatées, et la règle qui les rattrape. L'ordre suit celui du
   * bloc `@media (forced-colors: active)` de `components.css`.
   *
   * Construit dans une FONCTION, et pas dans une constante : les clés restent
   * littérales — donc vérifiables par le test de parité des traductions — et
   * le tableau se réécrit au changement de langue.
   */
  function fcRows() {
    return [
      [
        t('fc.row.button', 'Bouton primaire, pastille douce'),
        t(
          'fc.cause.transparent',
          '`transparent` n’est pas remplacé : l’aplat disparaît, le contour reste invisible.'
        ),
        'border-color: currentColor',
      ],
      [
        t('fc.row.sheet', 'Panneau modal'),
        t(
          'fc.cause.shadow',
          '`box-shadow` est supprimée et le voile devient opaque : les deux se confondent.'
        ),
        'outline: 1px solid CanvasText',
      ],
      [
        t('fc.row.skeleton', 'Squelette de chargement'),
        t(
          'fc.cause.fill',
          'Il n’existait que par sa couleur de fond, ramenée à `Canvas`.'
        ),
        'outline: 1px solid GrayText',
      ],
      [
        t('fc.row.sync', 'Pastille de synchro'),
        t(
          'fc.cause.dot',
          'Même cause. Les tons ne se distinguent plus — sans perte : l’état est écrit à côté.'
        ),
        'background: CanvasText',
      ],
      [
        t('fc.row.hover', 'Survol'),
        t(
          'fc.cause.filter',
          '`filter` n’est pas forcé : `brightness()` délave la palette choisie par l’utilisateur.'
        ),
        'background: Highlight',
      ],
      [
        t('fc.row.disabled', 'Bouton désactivé'),
        t(
          'fc.cause.opacity',
          '`opacity` n’est pas forcé non plus : le bouton reste lisible, donc trompeur.'
        ),
        'color: GrayText',
      ],
    ];
  }

  /** Le même balisage dans les deux panneaux : l'écart doit venir du CSS. */
  function fcDemo(host) {
    host.textContent = '';

    var primary = dwc('button', 'button', {
      type: 'button',
      'data-variant': 'primary',
      'data-size': 'sm',
    });
    primary.textContent = t('ui.pg.save', 'Enregistrer');

    var off = dwc('button', 'button', {
      type: 'button',
      'data-variant': 'primary',
      'data-size': 'sm',
    });
    off.textContent = t('ui.button.inactive', 'Inactif');
    off.disabled = true;

    var badge = dwc('span', 'badge', {
      'data-tone': 'success',
      'data-variant': 'soft',
    });
    badge.textContent = t('ui.pg.badge', 'À jour');

    var sync = dwc('span', 'sync-status', { 'data-status': 'synced' });
    sync.appendChild(document.createTextNode(t('ui.fc.synced', 'Synchronisé')));

    var skeleton = dwc('span', 'skeleton', { 'data-radius': 'md' });
    skeleton.style.height = '0.9rem';
    skeleton.style.width = '100%';

    var panel = dwc('div', 'sheet-panel', {});
    var title = dwc('p', 'sheet-title', {});
    title.textContent = t('ui.fc.panel', 'Panneau modal');
    panel.appendChild(title);

    [primary, off, badge, sync, skeleton, panel].forEach(function (node) {
      host.appendChild(node);
    });
  }

  var fcQuery = null;

  function renderForcedColors() {
    document.querySelectorAll('[data-fc-demo]').forEach(fcDemo);

    var table = document.getElementById('fc-table');
    if (table) {
      table.textContent = '';
      // `headRow` rend un <thead> complet, pas une ligne.
      table.appendChild(
        headRow([
          t('ui.fc.th.what', 'Ce qui casse'),
          t('ui.fc.th.why', 'Pourquoi'),
          t('ui.fc.th.fix', 'Correctif livré'),
        ])
      );

      var tbody = document.createElement('tbody');
      fcRows().forEach(function (item) {
        var tr = row([item[0], item[1], '']);
        var fix = tr.lastChild;
        var code = document.createElement('code');
        code.textContent = item[2];
        fix.appendChild(code);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    }

    var state = document.getElementById('fc-state');
    if (!state) return;
    if (!fcQuery && window.matchMedia) {
      fcQuery = window.matchMedia('(forced-colors: active)');
      // Le réglage peut changer sans recharger la page.
      fcQuery.addEventListener('change', renderForcedColors);
    }
    var active = fcQuery ? fcQuery.matches : false;
    state.dataset.active = active ? 'yes' : 'no';
    state.textContent = active
      ? t(
          'ui.fc.on',
          'Votre navigateur est en contraste forcé : toute cette page est déjà rendue par le vrai mode, émulation comprise.'
        )
      : t(
          'ui.fc.off',
          'Votre navigateur n’est pas en contraste forcé — les deux panneaux ci-dessous sont donc une reconstitution.'
        );
  }

  /* ── Comparaison clair / sombre ────────────────────────────────────── */

  /**
   * Peint un conteneur avec une palette donnée.
   *
   * Il faut poser `--ds-*` ET `--dwc-*` : le mappage `--dwc-x: var(--ds-x)`
   * est déclaré sur `:root`, donc RÉSOLU à ce niveau. Redéfinir `--ds-x` plus
   * bas dans l'arbre ne le recalcule pas — les composants garderaient les
   * couleurs de la page.
   */
  function paintPalette(el, palette, scheme) {
    ROLES.forEach(function (role) {
      var value = palette[role[0]];
      if (!value) return;
      el.style.setProperty(role[1], value);
      el.style.setProperty(role[1].replace('--ds-', '--dwc-'), value);
    });
    el.style.setProperty('--dwc-radius', 'var(--ds-radius)');
    el.style.colorScheme = scheme;
  }

  function renderCompare() {
    var host = document.getElementById('compare');
    if (!host) return;
    host.textContent = '';

    var theme = currentTheme;
    // Le thème générique n'a pas de palette propre : ses valeurs vivent dans
    // showroom.css. On lit alors les deux schémas depuis la feuille elle-même.
    var palettes = { light: theme.light, dark: theme.dark };
    if (theme.usesCssDefaults) {
      palettes = readGenericPalettes();
    }

    ['light', 'dark'].forEach(function (scheme) {
      var palette = palettes[scheme];
      if (!palette) return;

      var panel = document.createElement('div');
      panel.className = 'sr-compare-panel';
      paintPalette(panel, palette, scheme);

      var title = document.createElement('p');
      title.className = 'sr-compare-title';
      title.textContent =
        scheme === 'light'
          ? t('ui.scheme.light', 'Clair')
          : t('ui.scheme.dark', 'Sombre');
      panel.appendChild(title);

      ROLES.forEach(function (role) {
        var value = palette[role[0]];
        if (!value) return;
        var line = document.createElement('div');
        line.className = 'sr-compare-line';
        line.appendChild(swatchDot(value));
        var name = document.createElement('code');
        name.textContent = role[1].replace('--ds-', '');
        var hex = document.createElement('span');
        hex.className = 'sr-computed';
        hex.textContent = value;
        line.appendChild(name);
        line.appendChild(hex);
        attachCopy(line, value, t('ui.copyToken', 'Copier') + ' ' + value);
        panel.appendChild(line);
      });

      host.appendChild(panel);
    });
  }

  /**
   * Palette du thème générique, lue dans la feuille de style : elle n'existe
   * nulle part ailleurs, et la recopier en JS créerait la dérive qu'on évite
   * partout ailleurs.
   *
   * La lecture se fait sur `<html>`, pas sur une sonde détachée : les valeurs
   * sombres sont déclarées par `:root[data-theme='dark']`, un sélecteur qui ne
   * matche QUE l'élément racine. On bascule donc l'attribut, on lit, on
   * restaure — le tout dans la même tâche, donc sans repeint intermédiaire.
   */
  function readGenericPalettes() {
    var previous = root.getAttribute('data-theme');
    var out = {};

    ['light', 'dark'].forEach(function (scheme) {
      root.setAttribute('data-theme', scheme);
      var styles = getComputedStyle(root);
      var palette = {};
      ROLES.forEach(function (role) {
        palette[role[0]] = styles.getPropertyValue(role[1]).trim();
      });
      out[scheme] = palette;
    });

    if (previous) root.setAttribute('data-theme', previous);
    else root.removeAttribute('data-theme');
    return out;
  }

  /* ── Galerie de démo par application ───────────────────────────────── */

  var SHOTS = globalThis.SHOWROOM_SCREENSHOTS || {};

  function appThemes() {
    return themes.filter(function (theme) {
      return theme.id !== 'generic';
    });
  }

  function renderDemoMenu() {
    var menu = document.getElementById('demo-menu');
    if (!menu) return;
    menu.textContent = '';

    appThemes().forEach(function (theme) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sr-demo-chip';
      button.dataset.app = theme.id;
      button.setAttribute(
        'aria-pressed',
        theme.id === currentTheme.id ? 'true' : 'false'
      );

      var dot = document.createElement('span');
      dot.className = 'sr-demo-dot';
      // Pastille peinte avec la primaire de l'app : le menu se lit d'un coup
      // d'œil, même sans avoir sélectionné quoi que ce soit.
      var palette = theme.dark ?? theme.light;
      dot.style.background = palette ? palette.primary : 'currentColor';
      button.appendChild(dot);
      button.appendChild(document.createTextNode(theme.name));

      button.addEventListener('click', function () {
        currentTheme = theme;
        write(APP_KEY, theme.id);
        var select = document.getElementById('theme-app');
        if (select) select.value = theme.id;
        applyScheme(currentScheme, theme);
        syncSchemeInputs(currentScheme, theme);
        // `applyTheme` rafraîchit déjà le menu et l'aperçu.
        applyTheme(theme);
        syncUrl();
      });

      menu.appendChild(button);
    });
  }

  // État sélectionné du menu, sans le reconstruire : `applyTheme` est appelé
  // à chaque bascule, y compris depuis la barre supérieure.
  function syncDemoMenu() {
    document.querySelectorAll('#demo-menu .sr-demo-chip').forEach(function (b) {
      b.setAttribute(
        'aria-pressed',
        b.dataset.app === currentTheme.id ? 'true' : 'false'
      );
    });
  }

  // Petit écran de démonstration : rien d'inventé, uniquement des composants
  // du paquet, donc peints par `components.css` et le thème courant.
  function renderDemoStage() {
    var stage = document.getElementById('demo-stage');
    if (!stage) return;
    stage.textContent = '';

    var frame = document.createElement('div');
    frame.className = 'sr-phone';

    var shot = SHOTS[currentTheme.id];
    if (shot) {
      var img = document.createElement('img');
      img.src = 'screenshots/' + shot.file;
      img.alt = shot.alt || currentTheme.name;
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
      currentTheme.name +
      ' — ' +
      t('theme.' + currentTheme.id + '.tagline', currentTheme.tagline);

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
        el('strong', { text: currentTheme.name }),
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
        el('div', { 'data-dwc': 'stat-head' }, [
          el('dt', {
            'data-dwc': 'stat-label',
            text: t('ui.demo.members', 'Adhérents'),
          }),
        ]),
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
        theme.name +
          ' (' +
          maturityLabel(maturity) +
          ') — ' +
          t('ui.newTab', 'nouvel onglet')
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
      badge.textContent = maturityLabel(maturity);
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
  var currentScheme = paramOr('scheme', read(SCHEME_KEY, 'system'));
  var currentTheme = themeById(paramOr('app', read(APP_KEY, 'generic')));

  if (select) {
    select.textContent = '';
    var groupGeneric = document.createElement('optgroup');
    groupGeneric.label = t('ui.groups.reference', 'Référence');
    var groupApps = document.createElement('optgroup');
    groupApps.label = t('ui.groups.apps', 'Applications consommatrices');

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
      syncUrl();
    });
  }

  document.querySelectorAll('input[name="scheme"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      currentScheme = input.value;
      write(SCHEME_KEY, currentScheme);
      applyScheme(currentScheme, currentTheme);
      applyTheme(currentTheme);
      syncUrl();
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

  // Les listes de sélecteurs CSS vivent dans des `<details>` repliés. À
  // l'impression, elles manqueraient : le contenu d'un `<details>` fermé est
  // masqué par le navigateur d'une façon qu'aucune règle CSS ne défait. On
  // ouvre donc avant, et on restaure après — l'écran ne doit rien y perdre.
  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('details:not([open])').forEach(function (el) {
      el.dataset.srPrintOpened = '';
      el.open = true;
    });
  });

  window.addEventListener('afterprint', function () {
    document
      .querySelectorAll('details[data-sr-print-opened]')
      .forEach(function (el) {
        el.open = false;
        delete el.dataset.srPrintOpened;
      });
  });

  // Les matrices doivent exister AVANT la première mesure : les contrôles
  // a11y s'appuient sur les éléments réellement présents dans le document.
  // Tout ce qui est ENGENDRÉ doit être reconstruit à chaque changement de
  // langue : les matrices, la grille famille, la palette et les mesures
  // portent des libellés traduits.
  function renderGenerated() {
    buildMatrix(
      document.getElementById('button-matrix'),
      t('ui.matrix.variant', 'Variante'),
      BUTTON_VARIANTS,
      BUTTON_COLUMNS,
      makeButton,
      'ui.button.'
    );
    buildMatrix(
      document.getElementById('badge-matrix'),
      t('ui.matrix.tone', 'Ton'),
      BADGE_TONES,
      BADGE_VARIANTS,
      makeBadge,
      'ui.tone.'
    );
    renderFamilyApps();
    renderDemoMenu();
    renderDemoStage();
    renderSnippets();
    renderPlayground();
    renderForcedColors();
    applyTheme(currentTheme);
    measure();
    // Après le rendu : les tableaux engendrés doivent être étiquetés eux aussi.
    labelTableCells();
    attachTokenCopies();
  }

  setupSheet();

  // Langue : préférence stockée, sinon celle du navigateur, sinon français.
  var langSelect = document.getElementById('lang');
  var storedLang = paramOr('lang', read(LANG_KEY, ''));
  var initialLang =
    storedLang ||
    (LANGS.indexOf((navigator.language || 'fr').slice(0, 2)) !== -1
      ? navigator.language.slice(0, 2)
      : 'fr');

  if (langSelect) {
    langSelect.value = initialLang;
    langSelect.addEventListener('change', function () {
      write(LANG_KEY, langSelect.value);
      applyLang(langSelect.value);
      renderGenerated();
      syncUrl();
    });
  }

  // Divulgation des réglages sous `sm`. Le panneau reste dans le DOM au-delà
  // (la media query le ré-affiche) : rien à déplacer, rien à recâbler.
  var settingsToggle = document.getElementById('settings-toggle');
  var settingsPanel = document.getElementById('settings');
  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener('click', function () {
      var open = settingsToggle.getAttribute('aria-expanded') === 'true';
      settingsToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (open) settingsPanel.removeAttribute('data-open');
      else settingsPanel.setAttribute('data-open', '');
    });
  }

  applyScheme(currentScheme, currentTheme);
  syncSchemeInputs(currentScheme, currentTheme);
  applyLang(initialLang);
  renderGenerated();
  syncUrl();
})();
