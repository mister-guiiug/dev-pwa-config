/*
 * Habiller la page : appliquer le thème d'une app et le schéma, repeindre ce
 * qui en dépend, et les commandes qui le demandent (sélecteur, dock, thèmes
 * récents, inspection, focus de section, aide-mémoire, ruban des
 * nouveautés).
 */

import { paletteChrome, VARIABLES_CHROME } from './contraste.js?v=286644156b';
import {
  APP_KEY,
  etat,
  NEWS_ID,
  NEWS_KEY,
  PKG_LABEL,
  rappels,
  RECENT_KEY,
  root,
  syncUrl,
  themes,
  write,
} from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import {
  applyDensity,
  ROLES,
  themeById,
  themeDisplayName,
} from './communs.js?v=0f95ffd5f1';
import { syncPrefsBadge } from './navigation.js?v=1ee0f765a8';
import { contrastRatio, measureContrast } from './controles.js?v=b9fcfeb8a4';
import {
  paletteForTheme,
  paletteOf,
  readGenericPalettes,
} from './palettes.js?v=cf070637d3';
import { labelTableCells } from './tableaux.js?v=ab72120a8e';
import { APPS, syncAppGrid } from './vitrine.js?v=32fd06c619';
import {
  renderCompare,
  renderPairCompare,
} from './comparaison.js?v=a3ca09a590';
import { renderDemoCurrent, renderDemoStage } from './galerie.js?v=2095bea587';

/**
 * Habille la page : couleurs, puis tout ce qui en dépend (textes du thème,
 * nuancier, mesures). Le changement de LANGUE n'appelle que la seconde
 * moitié : réécrire la palette sur `<html>` restylait les 7 900 nœuds de la
 * page pour des couleurs qui n'avaient pas changé.
 */
export function applyTheme(theme) {
  applyThemeColors(theme);
  renderThemeDependents(theme);
}

function applyThemeColors(theme) {
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
  applyChromeInks(theme, scheme);
}

/** Ce qui suit le thème appliqué : textes, nuancier, mesures, aperçus. */
export function renderThemeDependents(theme) {
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
  if (nameEl) nameEl.textContent = t('theme.' + theme.id + '.name', theme.name);
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
  paintHeaderSwatches();
  paintBrandStatus(theme);
  paintOpenApp(theme);
  syncThemeControls(theme);
  // Le contraste dépend du thème appliqué : on le recalcule à chaque bascule.
  measureContrast();
  labelTableCells();
  // La galerie, la vitrine et la comparaison suivent le thème, quelle que
  // soit la commande qui l'a changé (tuile de la galerie, carte de la
  // vitrine ou sélecteur de la barre).
  renderDemoCurrent();
  syncAppGrid();
  renderDemoStage();
  renderCompare();
  renderPairCompare();
  syncPrefsBadge();
}

/**
 * Encres du chrome, dérivées de la palette habillée (voir `contraste.js`) :
 * le texte de la page tient 4,5:1 dans chaque thème, les démos gardent les
 * couleurs réelles de l'app. Une palette illisible (couleur non
 * hexadécimale) retombe sur les replis CSS, qui sont la palette elle-même.
 */
function applyChromeInks(theme, scheme) {
  var style = root.style;
  try {
    var chrome = paletteChrome(paletteOf(theme, scheme));
    VARIABLES_CHROME.forEach(function (paire) {
      style.setProperty(paire[1], chrome[paire[0]]);
    });
  } catch {
    VARIABLES_CHROME.forEach(function (paire) {
      style.removeProperty(paire[1]);
    });
  }
}

/** Sous-titre de marque : paquet générique, sinon « Habillé · App ». */
function paintBrandStatus(theme) {
  var el = document.getElementById('theme-brand-status');
  if (!el) return;
  var name = t('theme.' + theme.id + '.name', theme.name);
  if (theme.id === 'generic') {
    el.textContent = PKG_LABEL;
    el.title = PKG_LABEL;
    return;
  }
  el.textContent = t('ui.brand.dressed', 'Habillé · {app}').replace(
    '{app}',
    name
  );
  el.title = PKG_LABEL + ' — ' + name;
}

/** Lien direct vers Pages (ou releases desktop) pour le thème courant. */
function paintOpenApp(theme) {
  var links = [
    document.getElementById('theme-open-app'),
    document.getElementById('theme-open-app-dock'),
  ];
  var item = null;
  for (var i = 0; i < APPS.length; i++) {
    if (APPS[i].id === theme.id) {
      item = APPS[i];
      break;
    }
  }
  var hide = theme.id === 'generic' || !item || !item.appUrl;
  var openLabel = '';
  if (!hide) {
    openLabel =
      item.platform === 'desktop'
        ? t('ui.apps.releases', 'Téléchargements')
        : t('ui.apps.open', 'Ouvrir l’app');
  }
  links.forEach(function (link) {
    if (!link) return;
    if (hide) {
      link.hidden = true;
      link.removeAttribute('href');
      return;
    }
    link.hidden = false;
    link.href = item.appUrl;
    link.textContent = openLabel;
    link.setAttribute(
      'aria-label',
      openLabel +
        ' — ' +
        item.name +
        ' (' +
        t('ui.newTab', 'nouvel onglet') +
        ')'
    );
  });
}

function paintPickerCurrent(theme) {
  var label = document.getElementById('theme-picker-current');
  if (label) label.textContent = themeDisplayName(theme);
}

export function renderThemeGrid() {
  var grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.textContent = '';
  var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var generics = null;
  themes.forEach(function (theme) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'sr-theme-tile';
    button.setAttribute('role', 'option');
    button.dataset.themeId = theme.id;
    button.setAttribute(
      'aria-selected',
      String(theme.id === etat.currentTheme.id)
    );
    var row = document.createElement('span');
    row.className = 'sr-theme-tile-swatches';
    row.setAttribute('aria-hidden', 'true');
    var palette;
    if (theme.usesCssDefaults) {
      generics = generics || readGenericPalettes();
      palette = generics[scheme] || {};
    } else {
      var s = theme.schemes.indexOf(scheme) === -1 ? theme.schemes[0] : scheme;
      palette = theme[s] || theme.dark || theme.light || {};
    }
    ['primary', 'surface', 'text'].forEach(function (role) {
      var dot = document.createElement('span');
      dot.dataset.role = role;
      if (palette[role]) dot.style.background = palette[role];
      row.appendChild(dot);
    });
    var name = document.createElement('span');
    name.textContent = themeDisplayName(theme);
    button.appendChild(row);
    button.appendChild(name);
    button.addEventListener('click', function () {
      selectTheme(theme);
      var picker = document.getElementById('theme-picker');
      if (picker) picker.open = false;
    });
    grid.appendChild(button);
  });
}

function syncThemeControls(theme) {
  var select = document.getElementById('theme-app');
  var dock = document.getElementById('theme-app-dock');
  if (select) select.value = theme.id;
  if (dock) dock.value = theme.id;
  paintPickerCurrent(theme);
  document
    .querySelectorAll('#theme-grid .sr-theme-tile')
    .forEach(function (tile) {
      tile.setAttribute(
        'aria-selected',
        String(tile.dataset.themeId === theme.id)
      );
    });
}

export function fillThemeSelect(select) {
  if (!select) return;
  select.textContent = '';
  var groupGeneric = document.createElement('optgroup');
  groupGeneric.label = t('ui.groups.reference', 'Référence');
  var groupApps = document.createElement('optgroup');
  groupApps.label = t('ui.groups.apps', 'Applications consommatrices');
  themes.forEach(function (theme) {
    var option = document.createElement('option');
    option.value = theme.id;
    option.textContent = themeDisplayName(theme);
    (theme.id === 'generic' ? groupGeneric : groupApps).appendChild(option);
  });
  select.appendChild(groupGeneric);
  select.appendChild(groupApps);
  select.value = etat.currentTheme.id;
}

/** Pastilles primaire / surface / texte à côté du select « Habiller ». */
function paintHeaderSwatches() {
  var host = document.getElementById('theme-swatches');
  if (!host) return;
  var styles = getComputedStyle(root);
  var map = {
    primary: '--ds-primary',
    surface: '--ds-surface',
    text: '--ds-text',
  };
  host.querySelectorAll('[data-swatch]').forEach(function (el) {
    var key = el.getAttribute('data-swatch');
    var value = styles.getPropertyValue(map[key] || '').trim();
    if (value) el.style.background = value;
  });
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveScheme(scheme) {
  if (scheme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return scheme;
}

export function applyScheme(scheme, theme) {
  // Une app dark-only n'a pas de palette claire : on force le sombre plutôt
  // que d'inventer des couleurs qui n'existent pas dans le produit.
  var effective = theme.schemes.indexOf('light') === -1 ? 'dark' : scheme;
  var resolved = resolveScheme(effective);
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
}

export function syncSchemeInputs(scheme, theme) {
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
        // Le verdict est du texte du chrome : encres sûres. Le vert brut du
        // thème générique (#15803d) tombait à 4,39:1 sur la surface 2.
        badge.style.color =
          ratio >= 4.5 ? 'var(--sr-ink-success)' : 'var(--sr-ink-danger)';
        meta.appendChild(badge);
      }
    }

    li.appendChild(meta);
    list.appendChild(li);
  });
}

/**
 * Bascule vers un thème d'app, quelle que soit la commande qui le demande :
 * le sélecteur de la barre supérieure, le bouton « Habiller la page » d'une
 * carte, ou une tuile de la galerie. Une seule bascule : la tuile ne fait
 * pas revenir un second menu, elle montre ce que ce menu cachait — toutes
 * les palettes en même temps.
 */
export function selectTheme(theme) {
  etat.currentTheme = theme;
  write(APP_KEY, theme.id);
  pushRecent(theme.id);
  applyScheme(etat.currentScheme, theme);
  syncSchemeInputs(etat.currentScheme, theme);
  // `applyTheme` rafraîchit déjà l'aperçu, la vitrine et cette légende.
  applyTheme(theme);
  renderRecent();
  syncUrl();
}

function readRecent() {
  try {
    var raw = localStorage.getItem(RECENT_KEY);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function pushRecent(id) {
  if (!id || id === 'generic') return;
  var list = readRecent().filter(function (x) {
    return x !== id;
  });
  list.unshift(id);
  write(RECENT_KEY, JSON.stringify(list.slice(0, 3)));
}

export function renderRecent() {
  var host = document.getElementById('sr-recent');
  if (!host) return;
  var list = readRecent().filter(function (id) {
    return themeById(id) && id !== 'generic';
  });
  host.textContent = '';
  host.hidden = list.length === 0;
  host.setAttribute('aria-label', t('ui.recent.legend', 'Habillages récents'));
  var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  list.forEach(function (id) {
    var theme = themeById(id);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sr-recent-chip';
    btn.setAttribute('aria-pressed', String(theme.id === etat.currentTheme.id));
    var pal = paletteForTheme(theme, scheme) || {};
    var sw = document.createElement('span');
    sw.className = 'sr-sw';
    sw.setAttribute('aria-hidden', 'true');
    if (pal.primary) sw.style.background = pal.primary;
    btn.appendChild(sw);
    btn.appendChild(
      document.createTextNode(
        themeDisplayName(theme).replace(/^Miss |^Mister /, '')
      )
    );
    btn.addEventListener('click', function () {
      selectTheme(theme);
    });
    host.appendChild(btn);
  });
}

/**
 * Le ruban est affiché (ou non) par le script en ligne, avant le premier
 * rendu, et traduit comme tout bloc `data-i18n` : ici, on ne lui donne
 * que son bouton. Son texte vivait en double (une liste dans ce fichier,
 * une copie dans la page, deux clés anglaises) : il n'est plus que dans la
 * page et dans i18n.js.
 */
export function setupNews() {
  var banner = document.getElementById('sr-news');
  if (!banner || root.getAttribute('data-news') !== 'on') return;
  var dismiss = document.getElementById('sr-news-dismiss');
  if (dismiss) {
    dismiss.addEventListener('click', function () {
      write(NEWS_KEY, NEWS_ID);
      root.removeAttribute('data-news');
    });
  }
}

export function setInspect(on) {
  etat.inspectOn = !!on;
  root.setAttribute('data-inspect', etat.inspectOn ? 'on' : 'off');
  var toggle = document.getElementById('inspect-toggle');
  if (toggle) toggle.checked = etat.inspectOn;
  var tip = document.getElementById('sr-inspect-tip');
  if (tip && !etat.inspectOn) {
    tip.hidden = true;
    tip.textContent = '';
  }
  document.querySelectorAll('.sr-inspect-hot').forEach(function (el) {
    el.classList.remove('sr-inspect-hot');
  });
  syncUrl();
}

export function setSectionFocus(id) {
  etat.sectionFocus = id || '';
  document
    .querySelectorAll('.sr-section[data-section-pinned]')
    .forEach(function (el) {
      el.removeAttribute('data-section-pinned');
    });
  if (etat.sectionFocus) {
    var section = document.getElementById(etat.sectionFocus);
    if (section && section.classList.contains('sr-section')) {
      section.setAttribute('data-section-pinned', '');
      root.setAttribute('data-section-focus', etat.sectionFocus);
    } else {
      etat.sectionFocus = '';
      root.removeAttribute('data-section-focus');
    }
  } else {
    root.removeAttribute('data-section-focus');
  }
  renderSectionChip();
  syncUrl();
}

function renderSectionChip() {
  var chip = document.getElementById('sr-section-chip');
  if (!chip) return;
  if (!etat.sectionFocus) {
    chip.hidden = true;
    chip.textContent = '';
    return;
  }
  var link = document.querySelector(
    '.sr-rail a[href="#' + etat.sectionFocus + '"]'
  );
  var label = link
    ? (link.textContent || '').replace(/\s+/g, ' ').trim()
    : etat.sectionFocus;
  chip.hidden = false;
  chip.textContent = '';
  var text = document.createElement('span');
  text.textContent = t('ui.section.chip', 'Mode section · {name}').replace(
    '{name}',
    label
  );
  var reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = t('ui.section.reset', 'Tout réafficher');
  reset.addEventListener('click', function () {
    setSectionFocus('');
  });
  chip.appendChild(text);
  chip.appendChild(reset);
}

export function setupThemePicker() {
  var picker = document.getElementById('theme-picker');
  if (!picker) return;
  document.addEventListener('click', function (event) {
    if (!picker.open) return;
    if (picker.contains(event.target)) return;
    picker.open = false;
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && picker.open) picker.open = false;
  });
}

export function setupDock() {
  var dock = document.getElementById('theme-app-dock');
  if (!dock || dock.dataset.bound) return;
  dock.dataset.bound = '1';
  dock.addEventListener('change', function () {
    selectTheme(themeById(dock.value));
  });
}

export function setupInspect() {
  var tip = document.getElementById('sr-inspect-tip');
  var toggle = document.getElementById('inspect-toggle');
  if (toggle) {
    toggle.checked = etat.inspectOn;
    toggle.addEventListener('change', function () {
      setInspect(toggle.checked);
    });
  }
  setInspect(etat.inspectOn);
  if (!tip) return;
  var hot = null;
  document.addEventListener(
    'mousemove',
    function (event) {
      if (!etat.inspectOn) return;
      var target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          '.sr-topbar, .sr-dock, .sr-inspect-tip, .sr-cheatsheet, .sr-prefs'
        )
      ) {
        tip.hidden = true;
        if (hot) {
          hot.classList.remove('sr-inspect-hot');
          hot = null;
        }
        return;
      }
      var el =
        target.closest(
          '[data-dwc], .sr-swatch, .sr-compare-panel, .sr-app, .sr-theme-tile, button, a, code'
        ) || target;
      if (hot && hot !== el) hot.classList.remove('sr-inspect-hot');
      hot = el;
      el.classList.add('sr-inspect-hot');
      var cs = getComputedStyle(el);
      var rootCs = getComputedStyle(root);
      var color = cs.color;
      var bg = cs.backgroundColor;
      if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        bg =
          rootCs.getPropertyValue('--ds-surface').trim() || cs.backgroundColor;
      }
      var primary = rootCs.getPropertyValue('--ds-primary').trim();
      var ratio = contrastRatio(color, bg);
      tip.textContent = '';
      var title = document.createElement('div');
      var codeTitle = document.createElement('code');
      var dwc = el.getAttribute('data-dwc');
      codeTitle.textContent = dwc
        ? 'data-dwc="' + dwc + '"'
        : el.tagName.toLowerCase();
      title.appendChild(codeTitle);
      tip.appendChild(title);
      function line(label, value) {
        if (!value) return;
        var row = document.createElement('div');
        row.className = 'sr-inspect-hex';
        var dot = document.createElement('span');
        dot.className = 'sr-inspect-dot';
        dot.style.background = value;
        var code = document.createElement('code');
        code.textContent = label + ' · ' + value;
        row.appendChild(dot);
        row.appendChild(code);
        tip.appendChild(row);
      }
      line('color', color);
      line('background', bg);
      line('--ds-primary', primary);
      if (ratio != null) {
        var c = document.createElement('div');
        c.style.marginTop = '0.25rem';
        c.style.color = 'var(--sr-ink-soft)';
        c.textContent =
          t('ui.inspect.contrast', 'Contraste texte') +
          ' : ' +
          ratio.toFixed(1) +
          ':1';
        tip.appendChild(c);
      }
      tip.hidden = false;
      var x = Math.min(
        event.clientX + 14,
        window.innerWidth - tip.offsetWidth - 8
      );
      var y = Math.min(
        event.clientY + 14,
        window.innerHeight - tip.offsetHeight - 8
      );
      tip.style.left = Math.max(8, x) + 'px';
      tip.style.top = Math.max(8, y) + 'px';
    },
    { passive: true }
  );
}

export function setupSectionFocus() {
  document.querySelectorAll('.sr-rail a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (!event.altKey) return;
      event.preventDefault();
      var id = (link.getAttribute('href') || '').slice(1);
      setSectionFocus(etat.sectionFocus === id ? '' : id);
      var target = document.getElementById(id);
      if (target) target.scrollIntoView({ block: 'start' });
    });
    link.title = t('ui.section.hint', 'Alt+clic pour épingler cette section');
  });
  if (etat.sectionFocus) setSectionFocus(etat.sectionFocus);
  else renderSectionChip();
}

export function setupCheatsheet() {
  var dialog = document.getElementById('sr-cheatsheet');
  if (!dialog) return;
  function openCheat() {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function closeCheat() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  document.addEventListener('keydown', function (event) {
    var tag = (event.target && event.target.tagName) || '';
    var typing =
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      (event.target && event.target.isContentEditable);
    if (typing) return;
    if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
      event.preventDefault();
      if (dialog.open) closeCheat();
      else openCheat();
      return;
    }
    if (event.key === 'i' || event.key === 'I') {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      setInspect(!etat.inspectOn);
      return;
    }
    if (event.key === 'd' || event.key === 'D') {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      etat.currentDensity = applyDensity(
        etat.currentDensity === 'compact' ? 'comfort' : 'compact'
      );
      syncUrl();
    }
  });
}

// Inscrit ici, appelé par la vitrine et la galerie : voir `rappels`,
// dans etat.js.
rappels.selectTheme = selectTheme;
