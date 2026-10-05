/*
 * Pilotage du showroom — module ESM (serveur local ou pages hébergées).
 *
 * Trois responsabilités :
 *   1. bascule de thème (app) + de schéma (clair/sombre/système), avec le même
 *      contrat que le hook `useTheme` du paquet : `light | dark | system`,
 *      attribut `data-theme` posé sur <html>. Le choix est rangé sous
 *      `dwc_showroom_scheme`, pas sous `dwc_theme` : cette clé est celle de
 *      toute la famille, sur la même origine ;
 *   2. mesure EN DIRECT des tokens fluides (clamp), des safe-areas et du
 *      breakpoint courant — rien n'est recopié à la main ;
 *   3. génération de la palette et de la démo `FamilyApps`.
 *
 * Tout import reste DANS `showroom/` : c'est le seul dossier que publie Pages.
 * `./command.js` est la copie octet pour octet que pose `npm run sync`.
 */
import {
  attachCommandCombobox,
  filterCommandItems,
  isCommandHotkey,
  isSlashHotkey,
} from './command.js?v=822f1c9e81';
import {
  encreSur,
  paletteChrome,
  VARIABLES_CHROME,
} from './contraste.js?v=286644156b';

(function () {
  'use strict';

  var root = document.documentElement;
  var themes = globalThis.SHOWROOM_THEMES || [];
  var APP_KEY = 'dwc_showroom_app';
  // Clé PROPRE au showroom. `dwc_theme` est la clé famille de `useTheme` : les
  // apps la lisent sur la même origine, et un essai du sombre ici changeait
  // leur thème. Aucune reprise de la valeur famille : le showroom part de
  // « système » tant qu'on n'y a rien choisi.
  var SCHEME_KEY = 'dwc_showroom_scheme';
  var LANG_KEY = 'dwc_showroom_lang';
  var DENSITY_KEY = 'dwc_showroom_density';
  var PAIR_A_KEY = 'dwc_showroom_pair_a';
  var PAIR_B_KEY = 'dwc_showroom_pair_b';
  var RECENT_KEY = 'dwc_showroom_recent';
  var NEWS_KEY = 'dwc_showroom_news';
  var TOUR_KEY = 'dwc_showroom_tour_done';
  var PKG_LABEL = '@mister-guiiug/dev-pwa-config';
  // Identifiant du ruban « nouveautés » : porté par `<html data-news-id>`, que
  // lit aussi le script en ligne. L'avancer dans index.html le réaffiche.
  var NEWS_ID = document.documentElement.getAttribute('data-news-id') || '';
  var SCENES_KEY = 'dwc_showroom_scenes';

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

  // Les noms accessibles posés en dur (`aria-label`) se traduisent aussi :
  // `data-i18n-aria` existait dans la page sans que rien ne le lise, et les
  // régions nommées restaient en français dans la page anglaise.
  var originalAria = {};
  document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
    originalAria[el.dataset.i18nAria] = el.getAttribute('aria-label') || '';
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
      // Seulement ce qui change. Au chargement en français, chacun des quelque
      // 340 blocs était remplacé par lui-même : des nœuds recréés et remis en
      // page pour rien, juste après le premier affichage.
      if (value !== undefined && el.innerHTML !== value) el.innerHTML = value;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.dataset.i18nAria;
      var value = lang === 'fr' ? undefined : (DICTS[lang] || {})[key];
      el.setAttribute(
        'aria-label',
        value === undefined ? originalAria[key] : value
      );
    });
    root.lang = lang;
    var codeLangue = document.getElementById('sr-prefs-lang');
    if (codeLangue) codeLangue.textContent = lang.toUpperCase();
    // L'icône est le visage du bouton ; le titre reprend le mot traduit,
    // celui que le nom accessible porte déjà.
    document.querySelectorAll('.sr-segmented label').forEach(function (label) {
      var name = label.querySelector('.sr-visually-hidden');
      if (name) label.title = name.textContent.trim();
    });
    var cmdInput = document.getElementById('sr-cmd');
    if (cmdInput) cmdInput.placeholder = t('ui.cmd.placeholder', 'Rechercher…');
    var dockLabel = document.querySelector('.sr-dock-label');
    if (dockLabel) dockLabel.textContent = t('topbar.themeLabel', 'Habiller');
    fillCounts();
  }

  /**
   * Les comptes de la prose, calculés depuis le catalogue (`apps.js`).
   * « Seize dépôts, dont quinze » et « un adoptant sur seize » étaient écrits
   * à la main, en français comme en anglais, et faux depuis des semaines :
   * 21 apps, toutes consommatrices, 19 adoptants de `components.css` (le
   * champ que lit le filtre « Consomme » juste à côté). Le texte porte des
   * `<span data-count>` ; on les remplit ici, à chaque langue.
   */
  function fillCounts() {
    var apps = (globalThis.SHOWROOM_APPS || {}).apps || [];
    var counts = {
      apps: apps.length,
      consumers: apps.filter(function (a) {
        return (a.configs || []).length > 0;
      }).length,
      'components-css': apps.filter(function (a) {
        return (a.configs || []).indexOf('components.css') !== -1;
      }).length,
    };
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var valeur = counts[el.dataset.count];
      if (valeur === undefined) return;
      if (el.textContent !== String(valeur)) el.textContent = String(valeur);
    });
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

  /**
   * Les trois dessins de `react/icons.js` (`SunIcon`, `MoonIcon`,
   * `SystemIcon`) : même boîte, même trait. Le showroom ne peut pas importer
   * le module, il rejoue les tracés.
   */
  var SCHEME_ICON = {
    light:
      '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>',
    dark: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>',
    system:
      '<rect x="2" y="4" width="20" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path>',
  };

  function schemeIcon(kind) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'sr-ico');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = SCHEME_ICON[kind] || SCHEME_ICON.system;
    return svg;
  }

  /** La barre change de hauteur (réglages ouverts, rail). Les ancres doivent
   *  dégager ce qu'elle couvre vraiment, pas une constante. */
  /**
   * `smooth`, sauf si la personne a demandé moins de mouvement. La règle CSS
   * `scroll-behavior: auto` de `prefers-reduced-motion` ne couvre PAS un
   * `scrollIntoView({ behavior: 'smooth' })` : l'option du script l'emporte.
   */
  function scrollBehavior() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
  }

  /**
   * Hauteur réelle de l'en-tête collant, dans `--sr-header`. Elle sert au
   * `scroll-padding-top` de la page : une ancre, une recherche ou un focus
   * clavier ne finissent pas SOUS l'en-tête.
   */
  function syncHeaderOffset() {
    var bar = document.querySelector('.sr-topbar');
    if (bar) root.style.setProperty('--sr-header', bar.offsetHeight + 'px');
  }

  /**
   * Amène une destination sous l'en-tête et y porte le focus : son titre si
   * elle en a un, sinon elle-même. Sans cela, après une recherche, le focus
   * restait dans le champ et la lecture d'écran ne suivait pas.
   */
  function focusDestination(target) {
    if (!target) return;
    // Une fiche vit souvent dans le `<details>` « Sélecteurs CSS » d'une démo,
    // replié : la recherche y menait sans rien montrer, et le focus échouait
    // sur un élément non rendu. On déplie le chemin jusqu'à elle.
    for (
      var parent = target.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      if (parent.tagName === 'DETAILS' && !parent.open) parent.open = true;
    }
    // La hauteur courante, pas celle du dernier rendu : un en-tête qui vient
    // de se replier ou de grandir déplacerait sinon la destination.
    syncHeaderOffset();
    target.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    // Défilement lissé + `content-visibility` : la destination est calculée
    // au départ avec la taille estimée des sections, qui prennent leur vraie
    // taille au passage. On réaligne à l'arrivée, une fois, et jamais plus
    // tard que trois secondes (sans quoi un défilement de l'utilisateur, bien
    // après, ramènerait la vue ici).
    if (scrollBehavior() === 'smooth' && 'onscrollend' in window) {
      var fini = false;
      var realigner = function () {
        if (fini) return;
        fini = true;
        window.removeEventListener('scrollend', realigner);
        target.scrollIntoView({ block: 'start', behavior: 'auto' });
      };
      window.addEventListener('scrollend', realigner);
      window.setTimeout(function () {
        fini = true;
        window.removeEventListener('scrollend', realigner);
      }, 3000);
    }
    var cible = /^H[1-6]$/.test(target.tagName)
      ? target
      : target.querySelector('h1, h2, h3, h4, h5, h6') || target;
    if (!cible.hasAttribute('tabindex') && cible.tabIndex < 0) {
      cible.setAttribute('tabindex', '-1');
    }
    cible.focus({ preventScroll: true });
  }

  /**
   * Petit écran : passé le haut de page, l'en-tête replie ses rangées
   * « Habiller » et recherche. Il occupait 307 px sur 812 en portrait (38 %)
   * et 184 sur 375 en paysage (49 %), défilement compris. Un bouton les
   * redéploie ; le focus dans l'en-tête et Ctrl+K aussi.
   *
   * Le repli dépend de la POSITION, pas du sens du défilement : un saut vers
   * une ancre ne fait pas grandir l'en-tête par-dessus sa destination.
   */
  function setupCompactHeader() {
    var bar = document.querySelector('.sr-topbar');
    var toggle = document.getElementById('sr-topbar-expand');
    if (!bar || !toggle || !window.matchMedia) return;
    // Petit en largeur (portrait) OU en hauteur (paysage).
    var petit = window.matchMedia('(max-width: 40rem), (max-height: 31.25rem)');
    var SEUIL = 160;
    var deplieA = null;

    function update() {
      var loin = petit.matches && window.scrollY > SEUIL;
      // Déplié à la demande : il le reste jusqu'à 400 px plus loin.
      if (deplieA !== null && Math.abs(window.scrollY - deplieA) > 400) {
        deplieA = null;
      }
      var occupe =
        bar.contains(document.activeElement) ||
        bar.querySelector('details[open]') !== null;
      var compact = loin && deplieA === null && !occupe;
      var avant = bar.hasAttribute('data-compact');
      if (compact) bar.setAttribute('data-compact', '');
      else bar.removeAttribute('data-compact');
      // Le dock du pouce prend le relais de la rangée « Habiller » repliée.
      if (compact) root.setAttribute('data-header-compact', '');
      else root.removeAttribute('data-header-compact');
      toggle.hidden = !loin;
      toggle.setAttribute('aria-expanded', String(!compact));
      // Mesure seulement au changement d'état : pas de mise en page forcée
      // à chaque évènement de défilement.
      if (avant !== compact) syncHeaderOffset();
    }

    function deplier() {
      if (!bar.hasAttribute('data-compact')) return;
      deplieA = window.scrollY;
      update();
    }

    toggle.addEventListener('click', function () {
      if (bar.hasAttribute('data-compact')) {
        deplier();
        var cmd = document.getElementById('sr-cmd');
        if (cmd) cmd.focus();
      } else {
        deplieA = null;
        bar.setAttribute('data-compact', '');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    // Ctrl+K ou « / » sur un en-tête replié : le champ doit exister AVANT
    // que `command.js` lui donne le focus. Phase de capture : ce gestionnaire
    // passe avant le sien.
    window.addEventListener(
      'keydown',
      function (event) {
        if (isCommandHotkey(event) || isSlashHotkey(event)) deplier();
      },
      true
    );
    bar.addEventListener('focusin', update);
    bar.addEventListener('focusout', function () {
      window.setTimeout(update, 0);
    });
    bar.addEventListener('toggle', update, true);
    window.addEventListener('scroll', update, { passive: true });
    if (petit.addEventListener) petit.addEventListener('change', update);
    update();
  }

  /**
   * Le sommaire suit la section visible. Une seule ancre porte
   * `aria-current`, et elle est ramenée au centre du rail s'il défile.
   * La barre de progression du topbar suit le scroll de la page.
   */
  function watchRail() {
    syncHeaderOffset();
    window.addEventListener('resize', syncHeaderOffset);
    // La hauteur change aussi sans redimensionnement : en-tête replié,
    // sommaire ouvert, libellés traduits qui passent à la ligne.
    var bar = document.querySelector('.sr-topbar');
    if (bar && 'ResizeObserver' in window) {
      new ResizeObserver(syncHeaderOffset).observe(bar);
    }
    var progress = document.getElementById('sr-progress');
    function updateProgress() {
      if (!progress) return;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.transform = 'scaleX(' + ratio + ')';
      progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    var links = document.querySelectorAll('.sr-rail a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    links.forEach(function (link) {
      byId[(link.getAttribute('href') || '').slice(1)] = link;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var current = byId[entry.target.id];
          if (!current) return;
          links.forEach(function (link) {
            link.removeAttribute('aria-current');
          });
          current.setAttribute('aria-current', 'location');
          // Le rail défile lui-même, horizontalement. Un `scrollIntoView` sur
          // le lien faisait défiler la PAGE : le rail est dans l'en-tête
          // collant, donc dans la zone de `scroll-padding-top`, et le
          // navigateur l'en « sortait » en remontant la page de 51 px après
          // chaque saut d'ancre.
          var rail = current.closest('.sr-rail');
          if (rail && rail.scrollWidth > rail.clientWidth) {
            rail.scrollTo({
              left:
                current.offsetLeft -
                rail.offsetLeft -
                (rail.clientWidth - current.offsetWidth) / 2,
              behavior: scrollBehavior(),
            });
          }
        });
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
    );
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /** Mobile : le rail TOC se replie derrière « Sommaire ». */
  function setupSommaire() {
    var bar = document.querySelector('.sr-topbar');
    var btn = document.getElementById('sr-sommaire-toggle');
    if (!bar || !btn) return;
    btn.addEventListener('click', function () {
      var open = bar.getAttribute('data-sommaire') === 'open';
      bar.setAttribute('data-sommaire', open ? 'closed' : 'open');
      btn.setAttribute('aria-expanded', String(!open));
      syncHeaderOffset();
    });
    window.addEventListener(
      'resize',
      function () {
        if (!window.matchMedia('(max-width: 40rem)').matches) {
          bar.setAttribute('data-sommaire', 'closed');
          btn.setAttribute('aria-expanded', 'false');
        }
        syncHeaderOffset();
      },
      { passive: true }
    );
  }

  /** Panneau préférences : fermer au clic dehors et sur Échap. */
  function setupPrefs() {
    var prefs = document.getElementById('sr-prefs');
    if (!prefs) return;
    document.addEventListener('click', function (event) {
      if (!prefs.open) return;
      if (prefs.contains(event.target)) return;
      prefs.open = false;
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && prefs.open) prefs.open = false;
    });
  }

  function browserLang() {
    var code = (navigator.language || 'fr').slice(0, 2);
    return LANGS.indexOf(code) === -1 ? 'fr' : code;
  }

  /** Point discret quand schéma ou langue s'écartent du navigateur. */
  function syncPrefsBadge() {
    var badge = document.getElementById('sr-prefs-badge');
    if (!badge) return;
    var off = currentScheme !== 'system' || lang !== browserLang();
    badge.hidden = !off;
    badge.title = off
      ? t(
          'ui.prefs.custom',
          'Préférences personnalisées (schéma ou langue forcé)'
        )
      : '';
  }

  function applyDensity(next) {
    var value = next === 'compact' ? 'compact' : 'comfort';
    root.setAttribute('data-density', value);
    document
      .querySelectorAll('input[name="density"]')
      .forEach(function (input) {
        input.checked = input.value === value;
      });
    write(DENSITY_KEY, value);
    syncHeaderOffset();
    return value;
  }

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
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
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
    } catch {
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
      // L'état de la vitrine n'entre dans l'URL que s'il s'écarte du défaut :
      // trois paramètres vides sur chaque lien partagé, ce serait du bruit.
      setOrDrop(url, 'q', appQuery.trim());
      setOrDrop(url, 'sort', appSort === 'curated' ? '' : appSort);
      setOrDrop(url, 'maturity', appFacets.maturity);
      setOrDrop(url, 'backend', appFacets.backend);
      setOrDrop(url, 'category', appFacets.category);
      setOrDrop(url, 'config', appFacets.config);
      setOrDrop(url, 'view', appView === 'grid' ? '' : appView);
      setOrDrop(
        url,
        'density',
        currentDensity === 'comfort' ? '' : currentDensity
      );
      setOrDrop(url, 'pair', pairA + ',' + pairB);
      setOrDrop(url, 'inspect', inspectOn ? '1' : '');
      setOrDrop(url, 'section', sectionFocus || '');
      setOrDrop(url, 'scene', activeSceneId || '');
      history.replaceState(null, '', url);
    } catch {
      /* URL non manipulable (file://) : le stockage prend le relais */
    }
  }

  // `all` et la chaîne vide désignent tous les deux « pas de filtre » : ni
  // l'un ni l'autre n'a sa place dans la query.
  function setOrDrop(url, name, value) {
    if (!value || value === 'all') url.searchParams.delete(name);
    else url.searchParams.set(name, value);
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
    } catch {
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
      } catch {
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

  /**
   * Habille la page : couleurs, puis tout ce qui en dépend (textes du thème,
   * nuancier, mesures). Le changement de LANGUE n'appelle que la seconde
   * moitié : réécrire la palette sur `<html>` restylait les 7 900 nœuds de la
   * page pour des couleurs qui n'avaient pas changé.
   */
  function applyTheme(theme) {
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
  function renderThemeDependents(theme) {
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

  function themeDisplayName(theme) {
    return t('theme.' + theme.id + '.name', theme.name);
  }

  function paintPickerCurrent(theme) {
    var label = document.getElementById('theme-picker-current');
    if (label) label.textContent = themeDisplayName(theme);
  }

  function renderThemeGrid() {
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
        String(theme.id === currentTheme.id)
      );
      var row = document.createElement('span');
      row.className = 'sr-theme-tile-swatches';
      row.setAttribute('aria-hidden', 'true');
      var palette;
      if (theme.usesCssDefaults) {
        generics = generics || readGenericPalettes();
        palette = generics[scheme] || {};
      } else {
        var s =
          theme.schemes.indexOf(scheme) === -1 ? theme.schemes[0] : scheme;
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

  function fillThemeSelect(select) {
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
    select.value = currentTheme.id;
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

  /* ── Mesures en direct ─────────────────────────────────────────────── */

  function measure() {
    if (typeof renderViewportTwin === 'function') renderViewportTwin();
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

  /**
   * Démo de ConfirmDialog : le vrai balisage du composant, ouvert sur
   * demande. Fermée, la boîte n'existe pas pour les technologies d'assistance,
   * et son h2 n'entre pas dans le plan de la page. Ouverte, elle se comporte
   * comme le composant : focus sur Annuler, Tab qui boucle, Échap, voile et
   * boutons qui ferment, focus rendu au bouton d'ouverture.
   */
  function setupConfirmDemo() {
    var host = document.getElementById('confirm-demo');
    var opener = document.getElementById('confirm-demo-open');
    if (!host || !opener) return;
    var racine = host.querySelector('[data-dwc="confirm"]');
    var panel = host.querySelector('[data-dwc="confirm-panel"]');
    var cancel = host.querySelector('[data-dwc="confirm-cancel"]');

    function close() {
      host.hidden = true;
      document.removeEventListener('keydown', onKeyDown);
      opener.focus();
    }

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
      host.hidden = false;
      document.addEventListener('keydown', onKeyDown);
      if (cancel) cancel.focus();
    });
    racine.addEventListener('mousedown', function (event) {
      var surLeVoile =
        event.target === racine ||
        (event.target instanceof Element &&
          event.target.matches('[data-dwc="confirm-backdrop"]'));
      if (surLeVoile) close();
    });
    host
      .querySelectorAll('[data-dwc="confirm-actions"] button')
      .forEach(function (button) {
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
            color: ok ? 'var(--sr-ink-success)' : 'var(--sr-ink-danger)',
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
        color: ok ? 'var(--sr-ink-success)' : 'var(--sr-ink-danger)',
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
          t(
            'ui.a11y.copyFixFor',
            'Copier la couleur proposée pour {label}'
          ).replace('{label}', label)
        );
      }
      // Cliquer la ligne va voir l'élément mesuré et le met en évidence :
      // un constat qu'on ne peut pas localiser ne se corrige pas.
      if (element) {
        // Un vrai bouton dans la ligne, et non la ligne entière en
        // `role="button"` : une ligne de tableau qui se dit bouton perd sa
        // sémantique de tableau, et elle contenait déjà un bouton de copie
        // (axe : nested-interactive).
        tr.classList.add('sr-row-locatable');
        var locate = function () {
          element.scrollIntoView({
            block: 'center',
            behavior: scrollBehavior(),
          });
          element.dataset.srHighlight = '';
          setTimeout(function () {
            delete element.dataset.srHighlight;
          }, 2200);
        };
        var bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'sr-locate';
        bouton.textContent = t('ui.a11y.locate', 'Localiser');
        bouton.setAttribute(
          'aria-label',
          t('ui.a11y.locateFor', 'Localiser sur la page : {label}').replace(
            '{label}',
            label
          )
        );
        bouton.addEventListener('click', locate);
        if (tr.firstElementChild) tr.firstElementChild.appendChild(bouton);
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
  var CATALOGUE = globalThis.SHOWROOM_CATALOGUE || {};
  var COMPONENTS = CATALOGUE.components || [];
  var HOOKS = CATALOGUE.hooks || [];
  var DECISIONS = CATALOGUE.decisions || [];

  /**
   * Champ bilingue `{ fr, en }` du catalogue, dans la langue courante.
   *
   * Contrairement au reste de la page, le catalogue porte ses deux langues
   * côte à côte : il n'a pas de HTML source dont capturer le français, et un
   * objet unique rend la parité vérifiable par construction.
   */
  function loc(field) {
    if (!field) return '';
    return field[lang] !== undefined ? field[lang] : field.fr;
  }

  function catalogueEntry(id) {
    for (var i = 0; i < COMPONENTS.length; i++) {
      if (COMPONENTS[i].id === id) return COMPONENTS[i];
    }
    return null;
  }

  /**
   * Écrit un texte dont les portions entre accents graves deviennent des
   * `<code>`. Par création de nœuds et non par `innerHTML` : le contenu vient
   * d'un fichier de données, autant ne pas ouvrir cette porte pour du balisage
   * qu'on peut produire directement.
   */
  function richText(target, text) {
    String(text)
      .split('`')
      .forEach(function (part, i) {
        if (!part) return;
        if (i % 2) {
          var code = document.createElement('code');
          code.textContent = part;
          target.appendChild(code);
        } else {
          target.appendChild(document.createTextNode(part));
        }
      });
  }

  /**
   * Remplit chaque emplacement `data-snippet` : extrait d'usage, pièges,
   * note d'accessibilité.
   *
   * Les pièges ne sont pas des conseils — chacun décrit un défaut CONSTATÉ.
   * Ils vivaient jusqu'ici dans les commentaires de `components.css` et les
   * notes de version, c'est-à-dire partout sauf là où l'erreur se commet.
   */
  function renderComponentDocs() {
    document.querySelectorAll('[data-snippet]').forEach(function (slot) {
      var id = slot.dataset.snippet;
      var code = SNIPPETS[id];
      var entry = catalogueEntry(id);
      if (!code && !entry) return;
      slot.textContent = '';
      slot.id = 'doc-' + id;

      if (code) {
        var head = document.createElement('p');
        head.className = 'sr-snippet-head';
        head.textContent = t('ui.usage', 'Utilisation');
        // Un nom par bouton : vingt-cinq « Copier l’extrait » identiques ne
        // se distinguaient pas dans la liste des boutons.
        attachCopy(
          head,
          code,
          t('ui.copySnippetOf', 'Copier l’extrait de {name}').replace(
            '{name}',
            id
          )
        );

        var pre = document.createElement('pre');
        var el = document.createElement('code');
        el.textContent = code;
        pre.appendChild(el);

        slot.appendChild(head);
        slot.appendChild(pre);
      }

      if (!entry) return;

      var donts = loc(entry.donts) || [];
      if (donts.length) {
        var box = document.createElement('div');
        box.className = 'sr-pitfalls';

        var title = document.createElement('p');
        title.className = 'sr-pitfalls-head';
        title.textContent = t('ui.pitfalls', 'Pièges');
        var count = document.createElement('span');
        count.className = 'sr-computed';
        count.textContent = String(donts.length);
        title.appendChild(count);
        box.appendChild(title);

        var list = document.createElement('ul');
        donts.forEach(function (text) {
          var li = document.createElement('li');
          richText(li, text);
          list.appendChild(li);
        });
        box.appendChild(list);
        slot.appendChild(box);
      }

      var a11y = loc(entry.a11y);
      if (a11y) {
        var note = document.createElement('p');
        note.className = 'sr-a11y-note';
        var label = document.createElement('strong');
        label.textContent = t('ui.a11yNote', 'Accessibilité');
        note.appendChild(label);
        note.appendChild(document.createTextNode(' — '));
        richText(note, a11y);
        slot.appendChild(note);
      }
    });
  }

  /* ── Arbres de décision ────────────────────────────────────────────── *
   * Le showroom montrait chaque composant seul et ne disait jamais lequel
   * prendre quand deux conviennent. C'est pourtant là qu'on hésite.
   * ────────────────────────────────────────────────────────────────────── */

  function renderDecisions() {
    var host = document.getElementById('decision-trees');
    if (!host) return;
    host.textContent = '';

    DECISIONS.forEach(function (tree) {
      var block = document.createElement('div');
      block.className = 'sr-tree';
      block.id = 'tree-' + tree.id;

      var q = document.createElement('h3');
      q.className = 'sr-subtitle sr-tree-q';
      q.textContent = loc(tree.question);
      block.appendChild(q);

      var list = document.createElement('ul');
      list.className = 'sr-tree-branches';

      tree.branches.forEach(function (branch) {
        var li = document.createElement('li');
        li.className = 'sr-branch';

        var when = document.createElement('p');
        when.className = 'sr-branch-when';
        when.textContent = loc(branch.when);
        li.appendChild(when);

        // La recommandation est un lien vers la fiche : « lequel » et
        // « comment » ne doivent pas demander de chercher.
        var use = document.createElement('a');
        use.className = 'sr-branch-use';
        use.href = '#doc-' + branch.target;
        use.textContent = branch.use;
        li.appendChild(use);

        var why = document.createElement('p');
        why.className = 'sr-branch-why';
        richText(why, loc(branch.why));
        li.appendChild(why);

        list.appendChild(li);
      });

      block.appendChild(list);
      host.appendChild(block);
    });
  }

  /* ── Hooks ─────────────────────────────────────────────────────────── */

  function renderHooks() {
    var list = document.getElementById('hooks-list');
    if (!list) return;
    list.textContent = '';

    HOOKS.forEach(function (hook) {
      var item = document.createElement('li');
      item.className = 'sr-hook';

      var name = document.createElement('h3');
      name.className = 'sr-hook-name';
      name.textContent = hook.id;
      item.appendChild(name);

      var sigLabel = document.createElement('span');
      sigLabel.className = 'sr-hook-sig-label';
      sigLabel.textContent = t('ui.hooks.th.name', 'Signature');
      item.appendChild(sigLabel);

      var sig = document.createElement('code');
      sig.className = 'sr-hook-sig';
      sig.textContent = hook.signature;
      item.appendChild(sig);

      var what = document.createElement('p');
      richText(what, loc(hook.summary));
      item.appendChild(what);

      var dont = document.createElement('p');
      dont.className = 'sr-hook-dont';
      var label = document.createElement('span');
      label.className = 'sr-hook-dont-label';
      label.textContent = t('ui.hooks.th.dont', 'Piège');
      dont.appendChild(label);
      var pit = document.createElement('span');
      richText(pit, loc(hook.dont));
      dont.appendChild(pit);
      item.appendChild(dont);

      list.appendChild(item);
    });
  }

  /* ── Index cherchable ──────────────────────────────────────────────── *
   * Vingt-trois entrées réparties sur six sections : sans index, trouver
   * `useOfflineMutationQueue` demandait de savoir qu'il existait.
   * ────────────────────────────────────────────────────────────────────── */

  var CAT_ORDER = ['primitive', 'feedback', 'pwa', 'shell', 'hook'];

  /**
   * Libellé d'une catégorie. Un `switch` et non une table indexée : les clés
   * restent LITTÉRALES, donc vérifiables par le test de parité des
   * traductions, qui ne sait pas lire `t(TABLE[x][0])`.
   */
  function catLabel(category) {
    switch (category) {
      case 'primitive':
        return t('ui.cat.primitive', 'Primitive');
      case 'feedback':
        return t('ui.cat.feedback', 'Retour utilisateur');
      case 'pwa':
        return t('ui.cat.pwa', 'PWA');
      case 'shell':
        return t('ui.cat.shell', 'Coque');
      case 'hook':
        return t('ui.cat.hook', 'Hook');
      default:
        return category;
    }
  }

  var catFilter = 'all';
  var catQuery = '';

  /** Composants et hooks dans un même jeu : on cherche une capacité. */
  function catalogueItems() {
    return COMPONENTS.map(function (c) {
      return {
        id: c.id,
        category: c.category,
        href: '#doc-' + c.id,
        meta: (loc(c.donts) || []).length,
        a11y: !!loc(c.a11y),
      };
    }).concat(
      HOOKS.map(function (h) {
        return {
          id: h.id,
          category: 'hook',
          href: '#hooks',
          meta: 0,
          a11y: false,
          summary: loc(h.summary),
        };
      })
    );
  }

  /**
   * Boutons de filtre. Séparés de la grille, et c'est le point : les
   * reconstruire à chaque clic détruisait le bouton sur lequel on venait
   * d'appuyer — au clavier, le focus repartait sur `<body>`, c'est-à-dire en
   * haut de la page. Ils ne se reconstruisent donc qu'au changement de langue ;
   * un clic ne fait plus que déplacer `aria-pressed`.
   */
  function renderCatalogueFilters() {
    var filters = document.getElementById('cat-filters');
    if (!filters) return;

    var items = catalogueItems();
    var kept = filters.querySelector('.sr-visually-hidden');
    filters.textContent = '';
    if (kept) filters.appendChild(kept);

    var buckets = [['all', t('ui.cat.all', 'Tout'), items.length]];
    CAT_ORDER.forEach(function (key) {
      var n = items.filter(function (i) {
        return i.category === key;
      }).length;
      if (n) buckets.push([key, catLabel(key), n]);
    });

    buckets.forEach(function (bucket) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sr-cat-filter';
      button.dataset.cat = bucket[0];
      button.setAttribute('aria-pressed', String(catFilter === bucket[0]));
      button.textContent = bucket[1];
      var badge = document.createElement('span');
      badge.className = 'sr-computed';
      badge.textContent = String(bucket[2]);
      button.appendChild(badge);
      button.addEventListener('click', function () {
        catFilter = bucket[0];
        filters.querySelectorAll('.sr-cat-filter').forEach(function (other) {
          other.setAttribute(
            'aria-pressed',
            String(other.dataset.cat === catFilter)
          );
        });
        renderCatalogueIndex();
      });
      filters.appendChild(button);
    });
  }

  function renderCatalogueIndex() {
    var grid = document.getElementById('cat-grid');
    var count = document.getElementById('cat-count');
    if (!grid || !count) return;

    var items = catalogueItems();
    var term = catQuery.trim().toLowerCase();
    var shown = items.filter(function (item) {
      if (catFilter !== 'all' && item.category !== catFilter) return false;
      if (!term) return true;
      return (
        item.id.toLowerCase().indexOf(term) !== -1 ||
        (item.summary || '').toLowerCase().indexOf(term) !== -1
      );
    });

    grid.textContent = '';
    shown.forEach(function (item) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.className = 'sr-cat-card';
      link.href = item.href;
      link.dataset.cat = item.category;

      var name = document.createElement('span');
      name.className = 'sr-cat-name';
      name.textContent = item.id;
      link.appendChild(name);

      var meta = document.createElement('span');
      meta.className = 'sr-cat-meta';
      meta.textContent = catLabel(item.category);
      if (item.meta) {
        meta.appendChild(
          document.createTextNode(
            ' · ' + item.meta + ' ' + t('ui.pitfalls', 'Pièges').toLowerCase()
          )
        );
      }
      link.appendChild(meta);

      li.appendChild(link);
      grid.appendChild(li);
    });

    count.textContent =
      shown.length === items.length
        ? t('ui.cat.total', '{n} entrées').replace('{n}', String(items.length))
        : t('ui.cat.shown', '{n} sur {total}')
            .replace('{n}', String(shown.length))
            .replace('{total}', String(items.length));
  }

  /* ── Vitrine des dépôts de la famille ──────────────────────────────── *
   * La page documentait le design system sans jamais montrer CE QU'IL HABILLE.
   * Les seize dépôts n'apparaissaient que par fragments : trois cartes de
   * démonstration du composant `FamilyApps`, treize palettes dans le sélecteur,
   * des noms dispersés dans la prose de la section « Stack ».
   *
   * La grille ci-dessous les rassemble, et elle est ENGENDRÉE depuis le miroir
   * de `apps-catalog.js` (`showroom/apps.js`, produit par
   * `npm run sync`) : le même catalogue qu'importent les apps pour
   * s'afficher les unes les autres. Une entrée fausse ici est fausse en
   * production, ce qui est exactement la propriété recherchée.
   * ────────────────────────────────────────────────────────────────────── */

  var CATALOG = globalThis.SHOWROOM_APPS || {};
  var APPS = CATALOG.apps || [];

  /*
   * Relevé nocturne de l'état des dépôts (`metrics.js`, workflow
   * `showroom-metrics.yml`). Vide tant que le workflow n'est pas passé : tout
   * ce qui suit doit rester correct dans ce cas — c'est l'état par défaut du
   * fichier commité, pas une panne.
   */
  var METRICS = globalThis.SHOWROOM_METRICS || {};
  var REPO_METRICS = METRICS.repos || {};
  var HAS_METRICS = Object.keys(REPO_METRICS).length > 0;

  /**
   * « il y a 3 mois » plutôt qu'une date ISO : sur une vitrine, ce qui compte
   * n'est pas QUAND mais DEPUIS COMBIEN DE TEMPS. Calculé à l'affichage, donc
   * jamais périmé — contrairement à une phrase écrite dans le fichier.
   */
  function timeAgo(iso) {
    if (!iso) return '';
    var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (!isFinite(days) || days < 0) return '';
    if (days === 0) return t('ui.ago.today', 'aujourd’hui');
    if (days < 31)
      return t('ui.ago.days', 'il y a {n} j').replace('{n}', String(days));
    var months = Math.floor(days / 30.44);
    if (months < 24)
      return t('ui.ago.months', 'il y a {n} mois').replace(
        '{n}',
        String(months)
      );
    return t('ui.ago.years', 'il y a {n} ans').replace(
      '{n}',
      String(Math.floor(days / 365.25))
    );
  }

  /** Ligne de mesures d'une carte, ou `null` si rien n'a été relevé. */
  function metricsBlock(item) {
    var m = REPO_METRICS[item.id];
    if (!m) return null;

    var parts = [];
    if (m.version) parts.push(['version', m.version]);
    var pushed = timeAgo(m.pushedAt);
    if (pushed)
      parts.push([
        'pushed',
        t('ui.metrics.pushed', 'code {ago}').replace('{ago}', pushed),
      ]);
    // Un dépôt archivé se dit en toutes lettres : c'est la seule mesure qui
    // change ce qu'un lecteur doit faire du lien.
    if (m.archived)
      parts.push(['archived', t('ui.metrics.archived', 'archivé')]);
    if (!parts.length) return null;

    var p = document.createElement('p');
    p.className = 'sr-app-metrics';
    parts.forEach(function (part) {
      var span = document.createElement('span');
      span.dataset.metric = part[0];
      span.textContent = part[1];
      p.appendChild(span);
    });
    return p;
  }

  var MATURITY_RANK = { alpha: 0, beta: 1, stable: 2 };

  // Libellés français par défaut ; `t()` les remplace dans les autres langues.
  // La clé `none` couvre la persistance NON RELEVÉE (l'app desktop) : mieux
  // vaut une case honnêtement vide qu'une famille de base de données devinée.
  var BACKEND_FR = {
    supabase: 'Supabase',
    firebase: 'Firebase',
    local: 'Local-first',
    api: 'API tierce',
    none: 'Non relevé',
  };
  var CATEGORY_FR = {
    sante: 'Santé',
    sport: 'Sport',
    jeux: 'Jeux',
    education: 'Éducation',
    loisirs: 'Loisirs',
    outils: 'Outils',
    dev: 'Développement',
  };
  var PLATFORM_FR = { web: 'Web', desktop: 'Desktop' };
  var SORT_FR = {
    curated: 'Ordre du catalogue',
    maturity: 'Maturité',
    name: 'Nom',
    updated: 'Dernière activité',
  };

  function backendLabel(value) {
    var key = value || 'none';
    return t('ui.backend.' + key, BACKEND_FR[key] || key);
  }
  function categoryLabel(value) {
    return t('ui.category.' + value, CATEGORY_FR[value] || value);
  }
  function platformLabel(value) {
    return t('ui.platform.' + value, PLATFORM_FR[value] || value);
  }
  function sortLabel(value) {
    return t('ui.apps.sortBy.' + value, SORT_FR[value] || value);
  }

  // Axes de filtrage : [clé de facette, clé i18n du titre, repli FR, valeurs,
  // fonction de libellé]. `backend` ajoute `''` pour la persistance non relevée.
  var APP_FACETS = [
    [
      'maturity',
      'ui.apps.facet.maturity',
      'Maturité',
      (CATALOG.maturities || []).slice().reverse(),
      maturityLabel,
    ],
    [
      'backend',
      'ui.apps.facet.backend',
      'Persistance',
      (CATALOG.backends || []).concat(['none']),
      backendLabel,
    ],
    [
      'category',
      'ui.apps.facet.category',
      'Domaine',
      CATALOG.categories || [],
      categoryLabel,
    ],
  ];

  var APP_SORTS = ['curated', 'maturity', 'name'];
  // Trier par activité n'a de sens que si l'activité a été relevée : l'option
  // n'apparaît pas quand `metrics.js` est vide.
  if (HAS_METRICS) APP_SORTS.push('updated');

  /** Valeur d'URL retenue seulement si elle existe vraiment. */
  function facetParam(key, values) {
    var raw = paramOr(key, 'all');
    return values.indexOf(raw) === -1 ? 'all' : raw;
  }

  var APP_VIEWS = ['grid', 'table'];

  var appQuery = paramOr('q', '');
  var appView =
    APP_VIEWS.indexOf(paramOr('view', 'grid')) === -1
      ? 'grid'
      : paramOr('view', 'grid');
  var appSort =
    APP_SORTS.indexOf(paramOr('sort', 'curated')) === -1
      ? 'curated'
      : paramOr('sort', 'curated');
  var appFacets = {
    maturity: facetParam('maturity', CATALOG.maturities || []),
    backend: facetParam('backend', (CATALOG.backends || []).concat(['none'])),
    category: facetParam('category', CATALOG.categories || []),
    // Dix-huit valeurs : servi par un menu déroulant, pas par des pastilles.
    config: facetParam(
      'config',
      (CATALOG.configSubpaths || []).concat(['none'])
    ),
  };

  var currentDensity =
    paramOr('density', read(DENSITY_KEY, 'comfort')) === 'compact'
      ? 'compact'
      : 'comfort';
  var adoptionSort = 'most';

  function parsePairParam() {
    var raw = paramOr('pair', '');
    if (raw && raw.indexOf(',') !== -1) {
      var parts = raw.split(',');
      return [parts[0] || '', parts[1] || ''];
    }
    return [read(PAIR_A_KEY, ''), read(PAIR_B_KEY, '')];
  }
  var pairInit = parsePairParam();
  var pairA = pairInit[0];
  var pairB = pairInit[1];
  var inspectOn = paramOr('inspect', '') === '1';
  var sectionFocus = paramOr('section', '');

  function appsFiltersActive() {
    return !!(
      appQuery.trim() ||
      appFacets.maturity !== 'all' ||
      appFacets.backend !== 'all' ||
      appFacets.category !== 'all' ||
      appFacets.config !== 'all' ||
      appSort !== 'curated' ||
      appView !== 'grid'
    );
  }

  function resetAppsFilters() {
    appQuery = '';
    appFacets.maturity = 'all';
    appFacets.backend = 'all';
    appFacets.category = 'all';
    appFacets.config = 'all';
    appSort = 'curated';
    appView = 'grid';
    var configSelect = document.getElementById('apps-config');
    if (configSelect) configSelect.value = 'all';
    var sortSelect = document.getElementById('apps-sort');
    if (sortSelect) sortSelect.value = 'curated';
    renderAppViewToggle();
    renderAppGrid();
    renderAppSort();
    renderViewChip();
    syncUrl();
  }

  /**
   * Deux lettres du mot distinctif. « Miss » et « Mister » préfixent seize
   * noms : une seule initiale, et la grille afficherait seize fois « M ».
   */
  function monogram(name) {
    var word = name.replace(/^(miss|mister)\s+/i, '');
    return (word || name).slice(0, 2).toUpperCase();
  }

  /**
   * Primaire réelle de l'app, relevée dans `themes.js` pour le schéma courant.
   * Les trois apps sans palette relevée (dice, ticket, quota) retombent sur la
   * primaire du thème actif — pas de couleur inventée.
   */
  function appAccent(id) {
    var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].id !== id) continue;
      var palette = themes[i][scheme] || themes[i].dark || themes[i].light;
      return palette && palette.primary ? palette.primary : '';
    }
    return '';
  }

  /**
   * Encre lisible SUR la primaire de l'app. La couleur de contraste de la
   * page n'a aucun rapport avec cet aplat : en schéma sombre, le texte de la
   * page est clair et la primaire d'une autre app souvent claire aussi.
   */
  function inkOn(color) {
    // Blanc ou encre sombre, et le noir si aucune ne tient 4,5:1 : sur le
    // violet de miss-dice (#7c5cf6), le blanc plafonnait à 4,45:1.
    try {
      return encreSur(color);
    } catch {
      return '';
    }
  }

  function paintMonogram(el) {
    var accent = appAccent(el.dataset.app);
    if (!accent) {
      el.style.removeProperty('--sr-app-accent');
      el.style.removeProperty('--sr-app-ink');
      return;
    }
    el.style.setProperty('--sr-app-accent', accent);
    var ink = inkOn(accent);
    if (ink) el.style.setProperty('--sr-app-ink', ink);
  }

  /** Une app a-t-elle une palette relevée, donc une démo à montrer ? */
  function hasTheme(id) {
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].id === id) return true;
    }
    return false;
  }

  function normalizeText(value) {
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Texte dans lequel la recherche pioche. Les FACETTES en font partie, sous
   * leur identifiant ET sous leur libellé traduit : la page affichait une
   * pastille « Supabase 6 » à côté d'un champ où « supabase » ne renvoyait
   * qu'une seule carte — elle se contredisait sous les yeux de qui l'utilise.
   * Le libellé traduit compte autant que l'identifiant : en anglais, on tape
   * « health », pas « sante ».
   */
  function searchText(a) {
    return [
      a.id,
      a.name,
      a.description,
      a.category,
      a.category ? categoryLabel(a.category) : '',
      a.backend || 'none',
      backendLabel(a.backend),
      a.platform,
      platformLabel(a.platform),
      (a.configs || []).join(' '),
    ]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Applique les critères. `overrides` permet de compter ce que DONNERAIT une
   * facette sans l'appliquer — c'est le nombre affiché sur chaque pastille.
   */
  function selectApps(overrides) {
    var facets = {
      maturity: appFacets.maturity,
      backend: appFacets.backend,
      category: appFacets.category,
      config: appFacets.config,
    };
    if (overrides) {
      for (var key in overrides) {
        if (Object.prototype.hasOwnProperty.call(overrides, key)) {
          facets[key] = overrides[key];
        }
      }
    }
    var terms = normalizeText(appQuery).split(/\s+/).filter(Boolean);

    return APPS.filter(function (a) {
      if (facets.maturity !== 'all' && a.maturity !== facets.maturity)
        return false;
      if (facets.category !== 'all' && a.category !== facets.category)
        return false;
      if (facets.backend !== 'all' && (a.backend || 'none') !== facets.backend)
        return false;
      if (facets.config !== 'all') {
        // `none` isole les dépôts qui ne consomment RIEN du paquet — la
        // question la plus intéressante que cette facette sache poser.
        var uses = (a.configs || []).indexOf(facets.config) !== -1;
        if (facets.config === 'none' ? (a.configs || []).length : !uses)
          return false;
      }
      if (!terms.length) return true;
      // Recherche sans diacritiques : « molkky » doit trouver « Mölkky », sinon
      // seule l'orthographe exacte fonctionne — autant ne pas offrir de champ.
      var hay = normalizeText(searchText(a));
      return terms.every(function (term) {
        return hay.indexOf(term) !== -1;
      });
    });
  }

  function sortedApps(list) {
    var out = list.slice();
    if (appSort === 'name') {
      return out.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    }
    if (appSort === 'updated') {
      return out.sort(function (a, b) {
        // Un dépôt sans relevé descend en bas : mieux vaut le dire par sa
        // position que lui inventer une date.
        var ta = Date.parse((REPO_METRICS[a.id] || {}).pushedAt || '') || 0;
        var tb = Date.parse((REPO_METRICS[b.id] || {}).pushedAt || '') || 0;
        return tb - ta || a.name.localeCompare(b.name);
      });
    }
    if (appSort === 'maturity') {
      return out.sort(function (a, b) {
        return (
          MATURITY_RANK[b.maturity] - MATURITY_RANK[a.maturity] ||
          a.name.localeCompare(b.name)
        );
      });
    }
    return out;
  }

  /**
   * Pastilles de filtre, construites UNE fois par langue. Les reconstruire à
   * chaque clic détruirait le bouton pressé — au clavier, le focus repartirait
   * sur `<body>`. Seuls `aria-pressed` et le compte bougent ensuite.
   */
  function renderAppFacets() {
    var host = document.getElementById('apps-facets');
    if (!host) return;
    host.textContent = '';

    APP_FACETS.forEach(function (facet) {
      var key = facet[0];
      var group = document.createElement('div');
      group.className = 'sr-facet-group';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', 'facet-' + key + '-label');

      var label = document.createElement('span');
      label.className = 'sr-facet-label';
      label.id = 'facet-' + key + '-label';
      label.textContent = t(facet[1], facet[2]);
      group.appendChild(label);

      var values = ['all'].concat(facet[3]);
      values.forEach(function (value) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'sr-cat-filter';
        button.dataset.facet = key;
        button.dataset.value = value;
        button.textContent =
          value === 'all' ? t('ui.apps.all', 'Tout') : facet[4](value);

        var badge = document.createElement('span');
        badge.className = 'sr-computed';
        button.appendChild(badge);

        button.addEventListener('click', function () {
          // Re-cliquer la pastille active revient à « Tout » : sans cela, il
          // faut viser une autre cible pour annuler un filtre.
          appFacets[key] = appFacets[key] === value ? 'all' : value;
          renderAppGrid();
          syncUrl();
        });

        group.appendChild(button);
      });

      host.appendChild(group);
    });
  }

  /**
   * Menu « Consomme… ». Le compte accompagne chaque option : « components.css
   * (1) » raconte l'adoption du paquet mieux qu'un paragraphe.
   */
  function renderAppConfigFilter() {
    var select = document.getElementById('apps-config');
    if (!select) return;
    var usage = CATALOG.configUsage || {};
    select.textContent = '';

    var all = document.createElement('option');
    all.value = 'all';
    all.textContent = t('ui.apps.all', 'Tout');
    select.appendChild(all);

    (CATALOG.configSubpaths || []).forEach(function (subpath) {
      var option = document.createElement('option');
      option.value = subpath;
      option.textContent = subpath + ' (' + (usage[subpath] || 0) + ')';
      select.appendChild(option);
    });

    var none = document.createElement('option');
    none.value = 'none';
    none.textContent = t('ui.apps.consumesNothing', 'Ne consomme rien');
    select.appendChild(none);

    select.value = appFacets.config;
  }

  /** Grille ou tableau. Le tableau compare seize lignes d'un coup d'œil. */
  function renderAppViewToggle() {
    var host = document.getElementById('apps-view');
    if (!host) return;
    var kept = host.querySelector('.sr-visually-hidden');
    host.textContent = '';
    if (kept) host.appendChild(kept);

    APP_VIEWS.forEach(function (view) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sr-cat-filter';
      button.dataset.view = view;
      button.setAttribute('aria-pressed', String(appView === view));
      button.textContent =
        view === 'grid'
          ? t('ui.apps.viewGrid', 'Grille')
          : t('ui.apps.viewTable', 'Tableau');
      button.addEventListener('click', function () {
        appView = view;
        host.querySelectorAll('[data-view]').forEach(function (other) {
          other.setAttribute(
            'aria-pressed',
            String(other.dataset.view === view)
          );
        });
        renderAppGrid();
        syncUrl();
      });
      host.appendChild(button);
    });
  }

  /**
   * Copier le lien de la vue courante. L'état de la vitrine entrait déjà dans
   * l'URL, mais l'attraper supposait d'aller la lire dans la barre d'adresse —
   * l'affordance manquait, pas la fonctionnalité.
   */
  /**
   * De quand datent les mesures ? Une donnée « vivante » sans date est pire
   * qu'une donnée absente : on la croit d'aujourd'hui.
   */
  function renderMetricsDate() {
    var node = document.getElementById('apps-metrics-date');
    if (!node) return;
    var ago = HAS_METRICS ? timeAgo(METRICS.generatedAt) : '';
    node.textContent = ago
      ? t('ui.metrics.date', 'état des dépôts relevé {ago}').replace(
          '{ago}',
          ago
        )
      : '';
  }

  /**
   * Carte d'adoption (symbole → N apps). Les données viennent de
   * `adoption.js` (relevé local) : sans mesure, la section reste masquée.
   */
  function renderAdoption() {
    var host = document.getElementById('apps-adoption');
    var table = document.getElementById('apps-adoption-table');
    var dateNode = document.getElementById('apps-adoption-date');
    var dupsWrap = document.getElementById('apps-adoption-dups-wrap');
    var dupsTable = document.getElementById('apps-adoption-dups');
    var sortSelect = document.getElementById('apps-adoption-sort');
    if (!host || !table) return;
    var data = globalThis.SHOWROOM_ADOPTION;
    var measured =
      data && typeof data.measured === 'number' ? data.measured : 0;
    if (!measured || !data.bySymbol) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    if (sortSelect) {
      sortSelect.value = adoptionSort;
      if (!sortSelect.dataset.bound) {
        sortSelect.dataset.bound = '1';
        sortSelect.addEventListener('change', function () {
          adoptionSort = sortSelect.value === 'least' ? 'least' : 'most';
          renderAdoption();
        });
      }
    }
    if (dateNode) {
      var ago = timeAgo(data.generatedAt);
      dateNode.textContent = ago
        ? t('ui.apps.adoptionDate', 'adoption relevée {ago}').replace(
            '{ago}',
            ago
          )
        : '';
    }
    var total = measured;
    var rows = Object.entries(data.bySymbol)
      .map(function (entry) {
        return [entry[0], entry[1].length];
      })
      .sort(function (a, b) {
        var delta = adoptionSort === 'least' ? a[1] - b[1] : b[1] - a[1];
        return delta || a[0].localeCompare(b[0]);
      });
    var tbody = table.querySelector('tbody');
    tbody.textContent = '';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var c1 = document.createElement('td');
      var code = document.createElement('code');
      code.textContent = row[0];
      c1.appendChild(code);
      var c2 = document.createElement('td');
      c2.textContent = String(row[1]);
      c2.title = (data.bySymbol[row[0]] || []).join(', ');
      var c3 = document.createElement('td');
      var pct = total ? Math.round((row[1] / total) * 100) : 0;
      var bar = document.createElement('span');
      bar.className = 'sr-adoption-bar';
      bar.setAttribute('role', 'img');
      bar.setAttribute(
        'aria-label',
        pct +
          '% — ' +
          row[1] +
          '/' +
          total +
          ' ' +
          t('ui.apps.adoptionCount', 'Apps').toLowerCase()
      );
      var fill = document.createElement('span');
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      c3.appendChild(bar);
      tr.appendChild(c1);
      tr.appendChild(c2);
      tr.appendChild(c3);
      tbody.appendChild(tr);
    });
    var dups = data.byDuplicate ? Object.entries(data.byDuplicate) : [];
    if (dupsWrap && dupsTable) {
      if (!dups.length) {
        dupsWrap.hidden = true;
      } else {
        dupsWrap.hidden = false;
        var dupSym = document.getElementById('apps-adoption-dups-symbol');
        var dupCnt = document.getElementById('apps-adoption-dups-count');
        if (dupSym) dupSym.textContent = t('ui.apps.adoptionSymbol', 'Symbole');
        if (dupCnt) dupCnt.textContent = t('ui.apps.adoptionCount', 'Apps');
        var dupRows = dups
          .map(function (entry) {
            return [entry[0], entry[1].length];
          })
          .sort(function (a, b) {
            return b[1] - a[1] || a[0].localeCompare(b[0]);
          });
        var dupBody = dupsTable.querySelector('tbody');
        dupBody.textContent = '';
        dupRows.forEach(function (row) {
          var tr = document.createElement('tr');
          var c1 = document.createElement('td');
          var code = document.createElement('code');
          code.textContent = row[0];
          c1.appendChild(code);
          var c2 = document.createElement('td');
          c2.textContent = String(row[1]);
          c2.title = (data.byDuplicate[row[0]] || []).join(', ');
          tr.appendChild(c1);
          tr.appendChild(c2);
          dupBody.appendChild(tr);
        });
      }
    }
  }

  function renderViewChip() {
    var chip = document.getElementById('apps-view-chip');
    if (!chip) return;
    if (!appsFiltersActive()) {
      chip.hidden = true;
      chip.textContent = '';
      return;
    }
    chip.hidden = false;
    chip.textContent = '';
    var label = document.createElement('span');
    label.textContent = t('ui.apps.filtered', 'Vue filtrée');
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = t('ui.apps.resetChip', 'Réinitialiser');
    reset.addEventListener('click', resetAppsFilters);
    chip.appendChild(label);
    chip.appendChild(reset);
  }

  function renderAppShare() {
    var host = document.getElementById('apps-share');
    if (!host) return;
    host.textContent = '';
    host.appendChild(
      copyButton(
        function () {
          return location.href;
        },
        t('ui.apps.share', 'Copier le lien de cette vue')
      )
    );
    renderViewChip();
  }

  function renderAppSort() {
    var select = document.getElementById('apps-sort');
    if (!select) return;
    select.textContent = '';
    APP_SORTS.forEach(function (value) {
      var option = document.createElement('option');
      option.value = value;
      option.textContent = sortLabel(value);
      select.appendChild(option);
    });
    select.value = appSort;
  }

  /**
   * Ce que le dépôt consomme du paquet — la seule chose qu'une vitrine de
   * design system doit vraiment savoir dire de ses dépôts. Replié par défaut :
   * quinze sous-chemins par carte noieraient la description.
   *
   * `<details>` natif plutôt qu'un dépliant maison : clavier, lecteur d'écran
   * et « rechercher dans la page » du navigateur marchent sans une ligne de JS.
   */
  function configsBlock(item) {
    var configs = item.configs || [];
    if (!configs.length) {
      var empty = document.createElement('p');
      empty.className = 'sr-app-nodep';
      empty.textContent = t('ui.apps.noConfig', 'Ne consomme rien du paquet.');
      return empty;
    }

    var details = document.createElement('details');
    details.className = 'sr-app-configs';

    var summary = document.createElement('summary');
    summary.textContent = t('ui.apps.configs', '{n} sous-chemins').replace(
      '{n}',
      String(configs.length)
    );
    details.appendChild(summary);

    var list = document.createElement('ul');
    configs.forEach(function (subpath) {
      var li = document.createElement('li');
      var code = document.createElement('code');
      code.textContent = subpath;
      li.appendChild(code);
      list.appendChild(li);
    });
    details.appendChild(list);
    return details;
  }

  /** Carte d'un dépôt. Deux liens (app, dépôt) et, si elle a une palette
   *  relevée, un bouton qui rhabille la page entière avec. */
  function appCard(item) {
    var li = document.createElement('li');
    li.className = 'sr-app';
    // Ancre stable : sans elle, on ne peut partager qu'un filtre, jamais UNE
    // application.
    li.id = 'app-' + item.id;
    li.dataset.maturity = item.maturity;
    if (item.category) li.dataset.category = item.category;
    if (item.backend) li.dataset.backend = item.backend;
    li.dataset.platform = item.platform;

    // Une VRAIE capture prend la place du monogramme quand elle existe. Les
    // deux font la même taille : déposer un fichier ne bouscule pas la grille.
    var shot = SHOTS[item.id];
    if (shot) {
      var thumb = document.createElement('img');
      thumb.className = 'sr-app-shot';
      thumb.src = 'screenshots/' + shot.file;
      thumb.alt = shot.alt || item.name;
      thumb.loading = 'lazy';
      thumb.width = 44;
      thumb.height = 44;
      li.appendChild(thumb);
    } else {
      var mono = document.createElement('span');
      mono.className = 'sr-app-mono';
      mono.setAttribute('aria-hidden', 'true');
      mono.dataset.app = item.id;
      paintMonogram(mono);
      mono.textContent = monogram(item.name);
      li.appendChild(mono);
    }

    var body = document.createElement('div');
    body.className = 'sr-app-body';

    var head = document.createElement('h3');
    head.className = 'sr-app-name';
    head.appendChild(document.createTextNode(item.name));
    var anchor = document.createElement('a');
    anchor.className = 'sr-app-anchor';
    anchor.href = '#app-' + item.id;
    anchor.textContent = '#';
    anchor.setAttribute(
      'aria-label',
      t('ui.apps.permalink', 'Lien direct vers {app}').replace(
        '{app}',
        item.name
      )
    );
    head.appendChild(anchor);
    var badge = document.createElement('span');
    badge.dataset.dwc = 'maturity';
    badge.dataset.maturity = item.maturity;
    badge.textContent = maturityLabel(item.maturity);
    head.appendChild(badge);
    body.appendChild(head);

    var desc = document.createElement('p');
    desc.className = 'sr-app-desc';
    desc.textContent = item.description;
    // Le catalogue n'écrit ses descriptions qu'en français (apps-catalog.js) :
    // dans la page anglaise, la lecture d'écran doit le savoir (WCAG 3.1.2).
    if (lang !== 'fr') desc.lang = 'fr';
    body.appendChild(desc);

    var meta = document.createElement('p');
    meta.className = 'sr-app-meta';
    var tags = [
      ['category', item.category ? categoryLabel(item.category) : ''],
      ['backend', backendLabel(item.backend)],
    ];
    // La plateforme n'est affichée que lorsqu'elle SURPREND : quinze PWA et une
    // application desktop, répéter « Web » quinze fois n'apprend rien.
    if (item.platform !== 'web') {
      tags.push(['platform', platformLabel(item.platform)]);
    }
    tags.forEach(function (tag) {
      if (!tag[1]) return;
      var span = document.createElement('span');
      span.className = 'sr-app-tag';
      span.dataset.facet = tag[0];
      span.textContent = tag[1];
      meta.appendChild(span);
    });
    body.appendChild(meta);
    var metrics = metricsBlock(item);
    if (metrics) body.appendChild(metrics);
    body.appendChild(configsBlock(item));

    var actions = document.createElement('p');
    actions.className = 'sr-app-actions';

    var open = document.createElement('a');
    open.className = 'sr-app-link';
    open.href = item.appUrl;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    // L'app desktop n'a pas de page publique : son « ouvrir » mène aux
    // releases du dépôt, et le libellé le dit.
    var openLabel =
      item.platform === 'desktop'
        ? t('ui.apps.releases', 'Téléchargements')
        : t('ui.apps.open', 'Ouvrir l’app');
    open.textContent = openLabel;
    open.setAttribute(
      'aria-label',
      openLabel +
        ' — ' +
        item.name +
        ' (' +
        t('ui.newTab', 'nouvel onglet') +
        ')'
    );
    actions.appendChild(open);

    var repo = document.createElement('a');
    repo.className = 'sr-app-link';
    repo.href = item.repoUrl;
    repo.target = '_blank';
    repo.rel = 'noopener noreferrer';
    repo.textContent = t('ui.apps.repo', 'Dépôt');
    repo.setAttribute(
      'aria-label',
      t('ui.apps.repo', 'Dépôt') +
        ' — ' +
        item.name +
        ' (' +
        t('ui.newTab', 'nouvel onglet') +
        ')'
    );
    actions.appendChild(repo);

    if (hasTheme(item.id)) {
      var demo = document.createElement('button');
      demo.type = 'button';
      demo.className = 'sr-app-link';
      demo.dataset.demo = item.id;
      demo.textContent = t('ui.apps.theme', 'Habiller la page');
      demo.setAttribute(
        'aria-pressed',
        item.id === currentTheme.id ? 'true' : 'false'
      );
      demo.addEventListener('click', function () {
        selectTheme(themeById(item.id));
      });
      actions.appendChild(demo);
    }

    body.appendChild(actions);
    li.appendChild(body);
    return li;
  }

  /**
   * Vue tableau : seize lignes, cinq colonnes, tout comparable d'un coup
   * d'œil. La grille montre les apps une par une ; le tableau montre la
   * FAMILLE — deux questions différentes, deux formes.
   */
  function renderAppTable(shown) {
    var table = document.getElementById('apps-table');
    if (!table) return;
    table.textContent = '';

    var columns = [
      t('ui.apps.th.app', 'Application'),
      t('ui.apps.facet.maturity', 'Maturité'),
      t('ui.apps.facet.backend', 'Persistance'),
      t('ui.apps.facet.category', 'Domaine'),
      t('ui.apps.th.configs', 'Sous-chemins'),
    ];
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    columns.forEach(function (label) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    shown.forEach(function (item) {
      var tr = document.createElement('tr');

      var th = document.createElement('th');
      th.scope = 'row';
      var link = document.createElement('a');
      link.href = item.repoUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = item.name;
      th.appendChild(link);
      tr.appendChild(th);

      [
        maturityLabel(item.maturity),
        backendLabel(item.backend),
        item.category ? categoryLabel(item.category) : '—',
        String((item.configs || []).length),
      ].forEach(function (value) {
        var td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    // Sous `sm`, les tableaux du showroom deviennent des cartes : chaque
    // cellule doit porter l'en-tête de sa colonne.
    labelTableCells();
  }

  function renderAppGrid() {
    var grid = document.getElementById('apps-grid');
    var count = document.getElementById('apps-count');
    if (!grid || !count) return;

    var shown = sortedApps(selectApps(null));
    var wrap = document.getElementById('apps-table-wrap');
    var asTable = appView === 'table' && shown.length > 0;
    if (wrap) wrap.hidden = !asTable;
    grid.hidden = asTable;
    grid.textContent = '';
    if (asTable) {
      renderAppTable(shown);
      renderAppCount(count, shown.length);
      syncAppFacets();
      renderViewChip();
      return;
    }

    if (!shown.length) {
      var empty = document.createElement('li');
      empty.className = 'sr-app-empty';
      var text = document.createElement('span');
      text.textContent = t(
        'ui.apps.none',
        'Aucune application ne correspond à ces critères.'
      );
      empty.appendChild(text);
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'sr-app-link';
      reset.textContent = t('ui.apps.reset', 'Tout réafficher');
      reset.addEventListener('click', function () {
        resetAppsFilters();
        var cmd = document.getElementById('sr-cmd');
        if (cmd) cmd.focus();
      });
      empty.appendChild(reset);
      grid.appendChild(empty);
    } else {
      shown.forEach(function (item) {
        grid.appendChild(appCard(item));
      });
    }

    renderAppCount(count, shown.length);
    syncAppFacets();
    renderViewChip();
    // La vue tableau et le panneau d'adoption apparaissent ici : leurs
    // boîtes défilantes doivent recevoir focus et nom à ce moment-là.
    scheduleScrollLabels();
  }

  function renderAppCount(node, n) {
    node.textContent =
      n === APPS.length
        ? t('ui.apps.total', '{n} applications').replace('{n}', String(n))
        : t('ui.apps.shown', '{n} sur {total}')
            .replace('{n}', String(n))
            .replace('{total}', String(APPS.length));
  }

  /**
   * État pressé et compte de chaque pastille, SANS reconstruire les boutons.
   * Le compte est celui qu'obtiendrait un clic : les autres facettes et la
   * recherche restent appliquées, seule la facette du groupe est remplacée.
   */
  function syncAppFacets() {
    var host = document.getElementById('apps-facets');
    if (!host) return;
    host.querySelectorAll('.sr-cat-filter').forEach(function (button) {
      var key = button.dataset.facet;
      var value = button.dataset.value;
      button.setAttribute('aria-pressed', String(appFacets[key] === value));
      var override = {};
      override[key] = value;
      var badge = button.querySelector('.sr-computed');
      if (badge) badge.textContent = String(selectApps(override).length);
    });
  }

  /**
   * Suit une bascule de thème sans reconstruire la grille : recolorer les
   * pastilles et déplacer `aria-pressed` suffit, et le bouton qui vient d'être
   * activé garde le focus.
   */
  function syncAppGrid() {
    document.querySelectorAll('#apps-grid .sr-app-mono').forEach(paintMonogram);
    document
      .querySelectorAll('#apps-grid [data-demo]')
      .forEach(function (button) {
        button.setAttribute(
          'aria-pressed',
          button.dataset.demo === currentTheme.id ? 'true' : 'false'
        );
      });
  }

  /**
   * Bouton de copie sur chaque nom de token et chaque sélecteur listé.
   *
   * Une custom property est copiée SOUS SA FORME UTILISABLE — `var(--x)` et
   * non `--x`. Ce qu'on colle doit marcher sans retouche ; coller `--x` dans
   * une déclaration en fait une variable qu'on redéfinit, pas qu'on lit. Les
   * sélecteurs `[data-dwc='…']`, eux, se copient tels quels.
   */
  function attachTokenCopies() {
    document
      .querySelectorAll('#fondations tbody th code, .sr-selectors code')
      .forEach(function (code) {
        var parent = code.parentElement;
        if (!parent || parent.querySelector(':scope > .sr-copy')) return;
        var raw = code.textContent.trim();
        var value = raw.indexOf('--') === 0 ? 'var(' + raw + ')' : raw;
        parent.appendChild(
          copyButton(value, t('ui.copyToken', 'Copier') + ' ' + value)
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

  /**
   * Un tableau qui déborde se fait défiler au clavier aussi : sa boîte prend
   * le focus et un nom (WCAG 2.1.1 ; axe : scrollable-region-focusable, relevé
   * sur le tableau d'adoption). Seulement s'il déborde : sinon ce serait une
   * région de plus, sans raison, dans la liste des repères.
   */
  function labelScrollableTables() {
    document
      .querySelectorAll('.sr-table-wrap, main pre')
      .forEach(function (boite) {
        // En largeur (téléphone) comme en hauteur : le tableau d'adoption a
        // une hauteur bornée et défile verticalement, même sur grand écran ;
        // un extrait de code déborde en largeur sur téléphone.
        var deborde =
          !boite.hidden &&
          boite.getClientRects().length > 0 &&
          (boite.scrollWidth > boite.clientWidth + 1 ||
            boite.scrollHeight > boite.clientHeight + 1);
        if (!deborde) {
          if (boite.hasAttribute('data-scroll-region')) {
            ['data-scroll-region', 'tabindex', 'role', 'aria-label'].forEach(
              function (attribut) {
                boite.removeAttribute(attribut);
              }
            );
          }
          return;
        }
        var nom;
        if (boite.tagName === 'PRE') {
          // L'extrait d'une fiche porte le nom de son composant ; celui du bac
          // à sable, le composant réglé. Deux régions sans nom distinct ne se
          // distinguent pas dans la liste des repères.
          var fiche = boite.closest('[data-snippet]');
          nom = boite.closest('#pg-code')
            ? t(
                'ui.code.scrollPg',
                'Code défilant du bac à sable : {name}'
              ).replace('{name}', pgCurrent)
            : t('ui.code.scroll', 'Code défilant : {name}').replace(
                '{name}',
                fiche ? fiche.dataset.snippet : ''
              );
        } else {
          var titre =
            boite.querySelector('h1, h2, h3, h4, h5, h6, caption') ||
            boite
              .closest('.sr-adoption, .sr-demo, section')
              ?.querySelector('h2, h3, h4');
          nom = t('ui.table.scroll', 'Tableau défilant : {name}').replace(
            '{name}',
            titre ? titre.textContent.replace(/\s+/g, ' ').trim() : ''
          );
        }
        boite.setAttribute('data-scroll-region', '');
        boite.setAttribute('tabindex', '0');
        boite.setAttribute('role', 'region');
        boite.setAttribute('aria-label', nom);
      });
  }

  // Une seule mesure par image, quel que soit le nombre de rendus qui la
  // demandent : chaque appel direct forçait une mise en page complète de la
  // page (trois par changement de langue).
  var scrollLabelsPending = false;
  function scheduleScrollLabels() {
    if (scrollLabelsPending) return;
    scrollLabelsPending = true;
    var plusTard = window.requestAnimationFrame || window.setTimeout;
    plusTard(function () {
      scrollLabelsPending = false;
      labelScrollableTables();
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
        // L'icône dans le libellé, comme le composant : plus d'en-tête.
        var label = dwc('figcaption', 'stat-label', {});
        label.textContent = t('ui.pg.members', 'Adhérents');
        if (p.icon) {
          var icon = dwc('span', 'stat-icon', { 'aria-hidden': 'true' });
          icon.appendChild(plusIcon());
          label.appendChild(icon);
        }
        fig.appendChild(label);

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
    // L'extrait change de longueur et de composant : son nom et son état
    // défilant aussi.
    scheduleScrollLabels();
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
        t('ui.copySnippetOf', 'Copier l’extrait de {name}').replace(
          '{name}',
          pgCurrent
        )
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
      [
        t('fc.row.nav', 'Onglet courant de la barre basse'),
        t(
          'fc.cause.tint',
          'Primaire et texte doux sont ramenés à la MÊME encre système : distinguer l’onglet actif par la couleur ne marche plus.'
        ),
        'border-block-start-color: Highlight',
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

    var toast = dwc('div', 'toast', { 'data-tone': 'success' });
    var toastMsg = dwc('span', 'toast-message', {});
    toastMsg.textContent = t('ui.fc.toast', 'Enregistré');
    toast.appendChild(toastMsg);

    // La barre basse est la démonstration la plus nette du chapitre : son
    // onglet courant ne se distingue QUE par la couleur dans quatre apps sur
    // sept, et le forçage ramène les deux teintes à la même encre.
    // Deux panneaux (sans et avec correctifs) portent chacun cette barre :
    // deux repères de même nom ne se distinguent pas à la lecture d'écran.
    var corrige = host.closest('[data-fix]')?.getAttribute('data-fix') === 'on';
    var nav = dwc('nav', 'bottom-nav', {
      'aria-label': corrige
        ? t('ui.fc.navOn', 'Exemple : barre d’onglets, avec correctifs')
        : t('ui.fc.navOff', 'Exemple : barre d’onglets, sans correctifs'),
    });
    [
      [t('ui.fc.tab.home', 'Accueil'), true],
      [t('ui.fc.tab.settings', 'Réglages'), false],
    ].forEach(function (pair) {
      var tab = dwc(
        'span',
        'bottom-nav-item',
        pair[1] ? { 'data-current': '' } : {}
      );
      var label = dwc('span', 'bottom-nav-label', {});
      label.textContent = pair[0];
      tab.appendChild(label);
      nav.appendChild(tab);
    });

    var themeBtn = dwc('button', 'theme-toggle', {
      type: 'button',
      'data-theme-state': 'dark',
      'aria-label': t('ui.fc.theme', 'Thème : sombre'),
    });
    var themeIcon = dwc('span', 'theme-toggle-icon', { 'aria-hidden': 'true' });
    themeIcon.appendChild(schemeIcon('dark'));
    themeBtn.appendChild(themeIcon);

    [primary, off, badge, sync, skeleton, panel, toast, nav, themeBtn].forEach(
      function (node) {
        host.appendChild(node);
      }
    );
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
    // Le chrome posé DANS ce panneau (valeurs, libellés) lit les encres de
    // SA palette, pas celles de la page : un panneau sombre dans une page
    // claire hériterait sinon d'une encre faite pour un fond clair.
    try {
      var chrome = paletteChrome(palette);
      VARIABLES_CHROME.forEach(function (paire) {
        el.style.setProperty(paire[1], chrome[paire[0]]);
      });
    } catch {
      /* palette non hexadécimale : les encres de la page restent */
    }
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
        attachCopy(
          line,
          value,
          t('ui.copyTokenIn', 'Copier {value} ({token}, {panel})')
            .replace('{value}', value)
            .replace('{token}', role[1])
            .replace('{panel}', title.textContent)
        );
        panel.appendChild(line);
      });

      host.appendChild(panel);
    });
  }

  function fillPairSelect(select, selected) {
    if (!select) return;
    var previous = select.value;
    select.textContent = '';
    themes.forEach(function (theme) {
      var option = document.createElement('option');
      option.value = theme.id;
      option.textContent = t('theme.' + theme.id + '.name', theme.name);
      select.appendChild(option);
    });
    var want = selected || previous;
    if (want && themeById(want)) select.value = want;
    else if (themes[1]) select.value = themes[1].id;
    else if (themes[0]) select.value = themes[0].id;
  }

  function setupPairCompare() {
    var a = document.getElementById('pair-a');
    var b = document.getElementById('pair-b');
    if (!a || !b) return;
    if (!pairA) pairA = themes[1] ? themes[1].id : 'generic';
    if (!pairB) {
      pairB = themes[2] ? themes[2].id : themes[0] ? themes[0].id : 'generic';
    }
    fillPairSelect(a, pairA);
    fillPairSelect(b, pairB);
    pairA = a.value;
    pairB = b.value;
    function onChange() {
      pairA = a.value;
      pairB = b.value;
      write(PAIR_A_KEY, pairA);
      write(PAIR_B_KEY, pairB);
      renderPairCompare();
      syncUrl();
    }
    if (!a.dataset.bound) {
      a.dataset.bound = '1';
      a.addEventListener('change', onChange);
      b.addEventListener('change', onChange);
    }
  }

  /** Deux apps côte à côte dans le schéma courant (pas clair/sombre). */
  function renderPairCompare() {
    var host = document.getElementById('compare-pair');
    if (!host) return;
    host.textContent = '';
    var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var generics = null;
    [pairA, pairB].forEach(function (id) {
      var theme = themeById(id);
      if (!theme) return;
      var palette = theme.usesCssDefaults
        ? (generics || (generics = readGenericPalettes()))[scheme]
        : theme[scheme] || theme.dark || theme.light;
      if (!palette) return;
      var panel = document.createElement('div');
      panel.className = 'sr-compare-panel';
      paintPalette(panel, palette, scheme);
      if (theme.radius) {
        panel.style.setProperty('--ds-radius', theme.radius);
        panel.style.setProperty('--dwc-radius', theme.radius);
      }
      var title = document.createElement('p');
      title.className = 'sr-compare-title';
      title.textContent = t('theme.' + theme.id + '.name', theme.name);
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
        attachCopy(
          line,
          value,
          t('ui.copyTokenIn', 'Copier {value} ({token}, {panel})')
            .replace('{value}', value)
            .replace('{token}', role[1])
            .replace('{panel}', title.textContent)
        );
        panel.appendChild(line);
      });
      host.appendChild(panel);
    });
    renderPairDiff();
  }

  function paletteForTheme(theme, scheme) {
    if (!theme) return null;
    if (theme.usesCssDefaults) {
      return readGenericPalettes()[scheme];
    }
    return theme[scheme] || theme.dark || theme.light || null;
  }

  /** Table des seuls rôles qui diffèrent entre App A et App B. */
  function renderPairDiff() {
    var table = document.getElementById('compare-diff');
    var sameNote = document.getElementById('compare-diff-same');
    var headA = document.getElementById('compare-diff-a');
    var headB = document.getElementById('compare-diff-b');
    if (!table) return;
    var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var themeA = themeById(pairA);
    var themeB = themeById(pairB);
    var palA = paletteForTheme(themeA, scheme);
    var palB = paletteForTheme(themeB, scheme);
    if (headA) headA.textContent = themeDisplayName(themeA);
    if (headB) headB.textContent = themeDisplayName(themeB);
    var tbody = table.querySelector('tbody');
    tbody.textContent = '';
    if (!palA || !palB) {
      if (sameNote) {
        sameNote.hidden = false;
        sameNote.textContent = t(
          'ui.compare.missing',
          'Palette indisponible pour l’une des deux apps.'
        );
      }
      return;
    }
    var diffs = 0;
    var same = 0;
    var extras = [];
    if (themeA.radius !== themeB.radius) {
      extras.push(['radius', themeA.radius || '—', themeB.radius || '—']);
    }
    ROLES.forEach(function (role) {
      var a = palA[role[0]] || '';
      var b = palB[role[0]] || '';
      if (!a && !b) return;
      if (a === b) {
        same += 1;
        return;
      }
      diffs += 1;
      var tr = document.createElement('tr');
      var c0 = document.createElement('td');
      var code = document.createElement('code');
      code.textContent = role[0];
      c0.appendChild(code);
      var c1 = document.createElement('td');
      if (a) {
        c1.appendChild(swatchDot(a));
        c1.appendChild(document.createTextNode(' ' + a));
      } else c1.textContent = '—';
      var c2 = document.createElement('td');
      if (b) {
        c2.appendChild(swatchDot(b));
        c2.appendChild(document.createTextNode(' ' + b));
      } else c2.textContent = '—';
      tr.appendChild(c0);
      tr.appendChild(c1);
      tr.appendChild(c2);
      tbody.appendChild(tr);
    });
    extras.forEach(function (row) {
      diffs += 1;
      var tr = document.createElement('tr');
      row.forEach(function (cell, i) {
        var td = document.createElement('td');
        if (i === 0) {
          var code = document.createElement('code');
          code.textContent = cell;
          td.appendChild(code);
        } else td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    if (sameNote) {
      if (!diffs) {
        sameNote.hidden = false;
        sameNote.textContent = t(
          'ui.compare.allSame',
          'Aucun écart sur les rôles sémantiques dans ce schéma.'
        );
      } else {
        sameNote.hidden = false;
        sameNote.textContent = t(
          'ui.compare.hiddenSame',
          '{n} rôles identiques masqués'
        ).replace('{n}', String(same));
      }
    }
  }

  /**
   * Deep-link `?focus=ShareButton` : scroll + surbrillance temporaire.
   * Accepte un id DOM, un id de composant (`doc-…`) ou une app (`app-…`).
   */
  function applyFocusFromUrl() {
    var focus = paramOr('focus', '');
    if (!focus) return;
    var candidates = [focus, 'doc-' + focus, 'app-' + focus];
    var target = null;
    for (var i = 0; i < candidates.length; i++) {
      target = document.getElementById(candidates[i]);
      if (target) break;
    }
    if (!target) {
      var items = catalogueItems();
      for (var j = 0; j < items.length; j++) {
        if (items[j].id.toLowerCase() === focus.toLowerCase()) {
          target = document.getElementById(items[j].href.slice(1));
          break;
        }
      }
    }
    if (!target) return;
    target.classList.add('sr-focus-flash');
    target.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    window.setTimeout(function () {
      target.classList.remove('sr-focus-flash');
    }, 1800);
    try {
      var url = new URL(location.href);
      url.searchParams.delete('focus');
      history.replaceState(null, '', url);
    } catch {
      /* file:// */
    }
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
  /**
   * Les palettes du thème générique, telles que les définit showroom.css.
   *
   * Elles étaient relues à chaque rendu en basculant deux fois `data-theme`
   * sur `<html>` : deux restylages complets de la page, quatre fois par
   * changement de langue. Et sous un thème d'app, la lecture voyait les
   * surcharges en ligne de ce thème au lieu des valeurs génériques. Le cliché
   * ôte ces surcharges, et il est pris une seule fois.
   */
  function readGenericPalettes() {
    return snapshotGenericPalettes();
  }

  /* ── Galerie de démo par application ───────────────────────────────── */

  var SHOTS = globalThis.SHOWROOM_SCREENSHOTS || {};

  /**
   * Bascule vers un thème d'app, quelle que soit la commande qui le demande :
   * le sélecteur de la barre supérieure, le bouton « Habiller la page » d'une
   * carte, ou une tuile de la galerie. Une seule bascule : la tuile ne fait
   * pas revenir un second menu, elle montre ce que ce menu cachait — toutes
   * les palettes en même temps.
   */
  function selectTheme(theme) {
    currentTheme = theme;
    write(APP_KEY, theme.id);
    pushRecent(theme.id);
    applyScheme(currentScheme, theme);
    syncSchemeInputs(currentScheme, theme);
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

  function pushRecent(id) {
    if (!id || id === 'generic') return;
    var list = readRecent().filter(function (x) {
      return x !== id;
    });
    list.unshift(id);
    write(RECENT_KEY, JSON.stringify(list.slice(0, 3)));
  }

  function renderRecent() {
    var host = document.getElementById('sr-recent');
    if (!host) return;
    var list = readRecent().filter(function (id) {
      return themeById(id) && id !== 'generic';
    });
    host.textContent = '';
    host.hidden = list.length === 0;
    host.setAttribute(
      'aria-label',
      t('ui.recent.legend', 'Habillages récents')
    );
    var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    list.forEach(function (id) {
      var theme = themeById(id);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sr-recent-chip';
      btn.setAttribute('aria-pressed', String(theme.id === currentTheme.id));
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
  function setupNews() {
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

  function setupTour() {
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

  function setupExportReview() {
    var btn = document.getElementById('sr-export-review');
    if (!btn) return;
    btn.addEventListener('click', function () {
      exportReviewCard();
    });
  }

  function exportReviewCard() {
    var btn = document.getElementById('sr-export-review');
    var canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 280;
    canvas.className = 'sr-export-canvas';
    var ctx = canvas.getContext('2d');
    if (!ctx) {
      window.alert(
        t('ui.export.fail', 'Export indisponible dans ce navigateur.')
      );
      return;
    }
    var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var pal = paletteForTheme(currentTheme, scheme) || {};
    var bg = pal.surface || (scheme === 'dark' ? '#161b22' : '#ffffff');
    var text = pal.text || (scheme === 'dark' ? '#e6e9ef' : '#14181f');
    var primary = pal.primary || text;
    var soft = pal.primarySoft || pal.surface2 || bg;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = text;
    ctx.font = '700 22px Segoe UI, system-ui, sans-serif';
    ctx.fillText(themeDisplayName(currentTheme), 24, 40);
    ctx.font = '400 14px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = pal.textSoft || text;
    ctx.fillText(
      t('ui.export.caption', 'Showroom · {scheme}').replace(
        '{scheme}',
        scheme === 'dark'
          ? t('ui.scheme.dark', 'Sombre')
          : t('ui.scheme.light', 'Clair')
      ),
      24,
      64
    );
    var colors = [
      ['primary', primary],
      ['soft', soft],
      ['text', text],
      ['surface', bg],
    ];
    colors.forEach(function (entry, i) {
      var x = 24 + i * 72;
      ctx.fillStyle = entry[1];
      ctx.fillRect(x, 90, 56, 56);
      ctx.strokeStyle = text;
      ctx.globalAlpha = 0.25;
      ctx.strokeRect(x + 0.5, 90.5, 55, 55);
      ctx.globalAlpha = 1;
      ctx.fillStyle = text;
      ctx.font = '12px ui-monospace, Consolas, monospace';
      ctx.fillText(entry[0], x, 166);
    });
    var labels = ['Primary', 'Secondary', 'Ghost'];
    labels.forEach(function (label, i) {
      var x = 24 + i * 140;
      var y = 195;
      if (i === 0) {
        ctx.fillStyle = primary;
        ctx.fillRect(x, y, 120, 40);
        ctx.fillStyle = pal.primaryContrast || bg;
      } else if (i === 1) {
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, 118, 38);
        ctx.fillStyle = text;
      } else {
        ctx.fillStyle = soft;
        ctx.fillRect(x, y, 120, 40);
        ctx.fillStyle = text;
      }
      ctx.font = '600 14px Segoe UI, system-ui, sans-serif';
      ctx.fillText(label, x + 18, y + 26);
    });
    canvas.toBlob(function (blob) {
      if (!blob) {
        window.alert(
          t('ui.export.fail', 'Export indisponible dans ce navigateur.')
        );
        return;
      }
      var done = function () {
        if (!btn) return;
        btn.textContent = t('ui.export.done', 'Image prête');
        window.setTimeout(function () {
          btn.textContent = t('ui.export.cta', 'Exporter pour revue');
        }, 1600);
      };
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard
          .write([new ClipboardItem({ 'image/png': blob })])
          .then(done)
          .catch(function () {
            downloadBlob(blob, 'showroom-' + currentTheme.id + '.png');
            done();
          });
      } else {
        downloadBlob(blob, 'showroom-' + currentTheme.id + '.png');
        done();
      }
    }, 'image/png');
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function setupDemoSplit() {
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

  function setupContrastCampaign() {
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
      if (label)
        label.textContent = t('ui.scheme.legend', 'Schéma de couleurs');
      Array.prototype.forEach.call(select.options, function (opt) {
        opt.textContent =
          opt.value === 'dark'
            ? t('ui.scheme.dark', 'Sombre')
            : t('ui.scheme.light', 'Clair');
      });
    }
    renderContrastCampaign();
  }

  function setInspect(on) {
    inspectOn = !!on;
    root.setAttribute('data-inspect', inspectOn ? 'on' : 'off');
    var toggle = document.getElementById('inspect-toggle');
    if (toggle) toggle.checked = inspectOn;
    var tip = document.getElementById('sr-inspect-tip');
    if (tip && !inspectOn) {
      tip.hidden = true;
      tip.textContent = '';
    }
    document.querySelectorAll('.sr-inspect-hot').forEach(function (el) {
      el.classList.remove('sr-inspect-hot');
    });
    syncUrl();
  }

  function setSectionFocus(id) {
    sectionFocus = id || '';
    document
      .querySelectorAll('.sr-section[data-section-pinned]')
      .forEach(function (el) {
        el.removeAttribute('data-section-pinned');
      });
    if (sectionFocus) {
      var section = document.getElementById(sectionFocus);
      if (section && section.classList.contains('sr-section')) {
        section.setAttribute('data-section-pinned', '');
        root.setAttribute('data-section-focus', sectionFocus);
      } else {
        sectionFocus = '';
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
    if (!sectionFocus) {
      chip.hidden = true;
      chip.textContent = '';
      return;
    }
    var link = document.querySelector(
      '.sr-rail a[href="#' + sectionFocus + '"]'
    );
    var label = link
      ? (link.textContent || '').replace(/\s+/g, ' ').trim()
      : sectionFocus;
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

  function setupThemePicker() {
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

  function setupDock() {
    var dock = document.getElementById('theme-app-dock');
    if (!dock || dock.dataset.bound) return;
    dock.dataset.bound = '1';
    dock.addEventListener('change', function () {
      selectTheme(themeById(dock.value));
    });
  }

  function setupInspect() {
    var tip = document.getElementById('sr-inspect-tip');
    var toggle = document.getElementById('inspect-toggle');
    if (toggle) {
      toggle.checked = inspectOn;
      toggle.addEventListener('change', function () {
        setInspect(toggle.checked);
      });
    }
    setInspect(inspectOn);
    if (!tip) return;
    var hot = null;
    document.addEventListener(
      'mousemove',
      function (event) {
        if (!inspectOn) return;
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
            rootCs.getPropertyValue('--ds-surface').trim() ||
            cs.backgroundColor;
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

  function setupSectionFocus() {
    document.querySelectorAll('.sr-rail a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (!event.altKey) return;
        event.preventDefault();
        var id = (link.getAttribute('href') || '').slice(1);
        setSectionFocus(sectionFocus === id ? '' : id);
        var target = document.getElementById(id);
        if (target) target.scrollIntoView({ block: 'start' });
      });
      link.title = t('ui.section.hint', 'Alt+clic pour épingler cette section');
    });
    if (sectionFocus) setSectionFocus(sectionFocus);
    else renderSectionChip();
  }

  function setupCheatsheet() {
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
        setInspect(!inspectOn);
        return;
      }
      if (event.key === 'd' || event.key === 'D') {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        currentDensity = applyDensity(
          currentDensity === 'compact' ? 'comfort' : 'compact'
        );
        syncUrl();
      }
    });
  }

  /**
   * Quelle application l'aperçu montre-t-il ? Sans le menu, plus rien ne le
   * disait — et `role="status"` l'annonce à qui ne voit pas la page changer
   * de couleur.
   */
  function renderDemoCurrent() {
    var node = document.getElementById('demo-current');
    if (!node) return;
    node.textContent =
      currentTheme.id === 'generic'
        ? t(
            'ui.demo.generic',
            'Aperçu générique : aucune application sélectionnée.'
          )
        : t('ui.demo.current', 'Aperçu habillé par {app}.').replace(
            '{app}',
            t('theme.' + currentTheme.id + '.name', currentTheme.name)
          );
  }

  /**
   * Palette du thème générique, lue dans la feuille : elle n'existe pas dans
   * `themes.js`. On retire d'abord les surcharges inline, sinon la lecture
   * renverrait le thème d'app en cours.
   */
  var genericSnapshot = null;
  function snapshotGenericPalettes() {
    if (genericSnapshot) return genericSnapshot;
    var previous = root.getAttribute('data-theme');
    var saved = ROLES.map(function (role) {
      return [role[1], root.style.getPropertyValue(role[1])];
    });
    var bgImage = root.style.getPropertyValue('--ds-bg-image');
    ROLES.forEach(function (role) {
      root.style.removeProperty(role[1]);
    });
    root.style.removeProperty('--ds-bg-image');

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
    saved.forEach(function (pair) {
      if (pair[1]) root.style.setProperty(pair[0], pair[1]);
      else root.style.removeProperty(pair[0]);
    });
    if (bgImage) root.style.setProperty('--ds-bg-image', bgImage);
    genericSnapshot = out;
    return out;
  }

  /** Schéma dans lequel montrer une app : le schéma de la page, sauf si
   *  l'app n'en a qu'un (qowa et quota sont sombres seules). */
  function schemeForTheme(theme) {
    var pageDark = root.getAttribute('data-theme') === 'dark';
    if (theme.schemes.indexOf('light') === -1) return 'dark';
    if (theme.schemes.indexOf('dark') === -1) return 'light';
    return pageDark ? 'dark' : 'light';
  }

  function paletteOf(theme, scheme) {
    if (theme.usesCssDefaults) return snapshotGenericPalettes()[scheme];
    return theme[scheme];
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
    el.style.setProperty(
      '--ds-bg-image',
      (palette && palette.bgImage) || 'none'
    );
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
      button.setAttribute('aria-pressed', String(theme.id === currentTheme.id));
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
        selectTheme(theme);
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
  function renderDemoStage() {
    renderDemoGallery();
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
      t('theme.' + currentTheme.id + '.name', currentTheme.name) +
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
    // Rejoué à chaque changement de langue : sans remise à zéro, chaque
    // bascule ajoutait trois cartes de plus à la démo.
    list.textContent = '';

    DEMO_APPS.forEach(function (entry) {
      var theme = themeById(entry[0]);
      var maturity = entry[1];

      var link = document.createElement('a');
      link.href = 'https://github.com/mister-guiiug/' + theme.id;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.dataset.dwc = 'family-app';
      // Comme le composant : le nom accessible est le texte de la carte, et
      // l'ouverture dans un nouvel onglet passe en description (WCAG 2.5.3).
      link.title = t('ui.newTab', 'Ouvre un nouvel onglet');

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

  fillThemeSelect(select);
  if (select) {
    select.addEventListener('change', function () {
      selectTheme(themeById(select.value));
    });
  }

  document.querySelectorAll('input[name="scheme"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      currentScheme = input.value;
      write(SCHEME_KEY, currentScheme);
      applyScheme(currentScheme, currentTheme);
      applyTheme(currentTheme);
      syncPrefsBadge();
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
  /**
   * Changement de langue : réécrire le TEXTE engendré, sans réappliquer la
   * palette ni remesurer les jetons de la page. Rejouer tout
   * `renderGenerated` coûtait 240 à 500 ms par bascule (mesuré le
   * 05/10/2026), surtout en styles recalculés et en mises en page forcées.
   * Les mesures (`measure`) ne dépendent pas de la langue : seul le tableau
   * des cibles, qui porte des verdicts traduits, est réécrit.
   */
  function retranslate() {
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
    renderComponentDocs();
    renderDecisions();
    renderHooks();
    renderCatalogueFilters();
    renderCatalogueIndex();
    renderAppFacets();
    renderAppConfigFilter();
    renderAppViewToggle();
    renderAppSort();
    renderAppShare();
    renderMetricsDate();
    renderAdoption();
    renderAppGrid();
    renderPlayground();
    renderForcedColors();
    fillThemeSelect(document.getElementById('theme-app'));
    fillThemeSelect(document.getElementById('theme-app-dock'));
    renderThemeGrid();
    renderThemeDependents(currentTheme);
    renderRecent();
    setupContrastCampaign();
    renderChecklist();
    renderViewportTwin();
    measureTargets();
    labelTableCells();
    attachTokenCopies();
    scheduleScrollLabels();
  }

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
    renderDemoCurrent();
    renderDemoStage();
    renderComponentDocs();
    renderDecisions();
    renderHooks();
    renderCatalogueFilters();
    renderCatalogueIndex();
    renderAppFacets();
    renderAppConfigFilter();
    renderAppViewToggle();
    renderAppSort();
    renderAppShare();
    renderMetricsDate();
    renderAdoption();
    renderAppGrid();
    renderPlayground();
    renderForcedColors();
    setupPairCompare();
    fillThemeSelect(document.getElementById('theme-app'));
    fillThemeSelect(document.getElementById('theme-app-dock'));
    renderThemeGrid();
    setupDemoSplit();
    applyTheme(currentTheme);
    renderRecent();
    setupContrastCampaign();
    renderChecklist();
    renderViewportTwin();
    measure();
    // Après le rendu : les tableaux engendrés doivent être étiquetés eux aussi.
    labelTableCells();
    attachTokenCopies();
    scheduleScrollLabels();
    // L'en-tête vient d'être rempli (thème courant, habillages récents) : sa
    // hauteur a pu changer depuis la première mesure.
    syncHeaderOffset();
  }

  // Recherche de l'index : `input` et non `change`, pour que la grille suive
  // la frappe. Le filtre par catégorie, lui, se recâble à chaque rendu.
  var catSearch = document.getElementById('cat-search');
  if (catSearch) {
    catSearch.addEventListener('input', function () {
      catQuery = catSearch.value;
      renderCatalogueIndex();
    });
  }

  // Vitrine : la recherche vit dans la commande d'en-tête (Ctrl+K). Le tri
  // et les facettes restent ici — un lien « apps Supabase en bêta » doit
  // encore montrer ce qu'il promet.
  var appConfigSelect = document.getElementById('apps-config');
  if (appConfigSelect) {
    appConfigSelect.addEventListener('change', function () {
      appFacets.config = appConfigSelect.value;
      renderAppGrid();
      syncUrl();
    });
  }

  var appSortSelect = document.getElementById('apps-sort');
  if (appSortSelect) {
    appSortSelect.addEventListener('change', function () {
      appSort = appSortSelect.value;
      renderAppGrid();
      renderViewChip();
      syncUrl();
    });
  }

  setupSheet();
  setupConfirmDemo();

  // Les formulaires des démos (LoginForm, MfaChallenge) ne doivent rien
  // envoyer. Ils le disaient par `onsubmit="return false;"`, un gestionnaire
  // en ligne que la CSP refuse : la page aurait alors tenté une soumission,
  // refusée à son tour par `form-action 'none'`. Un seul écouteur délégué.
  // Les `<form method="dialog">` de la page, eux, gardent leur fermeture.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form instanceof HTMLFormElement && form.closest('.sr-demo-stage')) {
      event.preventDefault();
    }
  });

  // Langue : préférence stockée, sinon celle du navigateur, sinon français.
  // Même forme que le schéma : deux radios, le code langue en icône.
  var storedLang = paramOr('lang', read(LANG_KEY, ''));
  var initialLang = storedLang || browserLang();

  document.querySelectorAll('input[name="lang"]').forEach(function (input) {
    input.checked = input.value === initialLang;
    input.addEventListener('change', function () {
      if (!input.checked) return;
      write(LANG_KEY, input.value);
      applyLang(input.value);
      retranslate();
      syncPrefsBadge();
      syncUrl();
    });
  });

  document.querySelectorAll('input[name="density"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) return;
      currentDensity = applyDensity(input.value);
      syncUrl();
    });
  });

  /* ── Vague 4 : scènes, présentation, recettes, checklist, CSS, viewport ─ */

  var FLUID_TYPE = [
    { token: '--text-fluid-xs', label: 'xs', min: 0.7, vw: 1.6, max: 0.8125 },
    { token: '--text-fluid-sm', label: 'sm', min: 0.8125, vw: 1.9, max: 0.95 },
    { token: '--text-fluid-base', label: 'base', min: 0.9, vw: 2.2, max: 1.05 },
    { token: '--text-fluid-lg', label: 'lg', min: 1, vw: 2.6, max: 1.25 },
    { token: '--text-fluid-xl', label: 'xl', min: 1.15, vw: 3, max: 1.5 },
    { token: '--text-fluid-2xl', label: '2xl', min: 1.35, vw: 4.2, max: 2 },
  ];

  var ADOPTION_CHECKS = [
    { symbol: 'ThemeProvider', href: '#hooks' },
    { symbol: 'EmptyState', href: '#composants' },
    { symbol: 'ShareButton', href: '#composants', alts: ['shareOrCopy'] },
    { symbol: 'BottomNav', href: '#composants' },
    { symbol: 'LoginForm', href: '#composants' },
    { symbol: 'ToastProvider', href: '#composants', alts: ['useToast'] },
    { symbol: 'ConfirmDialog', href: '#composants' },
    { symbol: 'ConsentBanner', href: '#composants' },
  ];

  var RECIPES = [
    {
      id: 'form',
      titleKey: 'ui.recipe.form',
      steps: [
        {
          target: '#composants',
          titleKey: 'ui.recipe.form.s1.title',
          bodyKey: 'ui.recipe.form.s1.body',
          hot: '[data-snippet="LoginForm"]',
        },
        {
          target: '#composants',
          titleKey: 'ui.recipe.form.s2.title',
          bodyKey: 'ui.recipe.form.s2.body',
          hot: '#button-matrix',
        },
        {
          target: '#composants',
          titleKey: 'ui.recipe.form.s3.title',
          bodyKey: 'ui.recipe.form.s3.body',
          hot: '[data-snippet="ConfirmDialog"]',
        },
      ],
    },
    {
      id: 'empty',
      titleKey: 'ui.recipe.empty',
      steps: [
        {
          target: '#composants',
          titleKey: 'ui.recipe.empty.s1.title',
          bodyKey: 'ui.recipe.empty.s1.body',
          hot: '[data-dwc="empty-state"]',
        },
        {
          target: '#composants',
          titleKey: 'ui.recipe.empty.s2.title',
          bodyKey: 'ui.recipe.empty.s2.body',
          hot: '[data-snippet="ErrorBanner"]',
        },
      ],
    },
    {
      id: 'nav',
      titleKey: 'ui.recipe.nav',
      steps: [
        {
          target: '#composants',
          titleKey: 'ui.recipe.nav.s1.title',
          bodyKey: 'ui.recipe.nav.s1.body',
          hot: '[data-snippet="BottomNav"]',
        },
        {
          target: '#composants',
          titleKey: 'ui.recipe.nav.s2.title',
          bodyKey: 'ui.recipe.nav.s2.body',
          hot: '[data-snippet="PageContainer"]',
        },
        {
          target: '#composants',
          titleKey: 'ui.recipe.nav.s3.title',
          bodyKey: 'ui.recipe.nav.s3.body',
          hot: '[data-snippet="AppHeader"]',
        },
      ],
    },
    {
      id: 'toast',
      titleKey: 'ui.recipe.toast',
      steps: [
        {
          target: '#composants',
          titleKey: 'ui.recipe.toast.s1.title',
          bodyKey: 'ui.recipe.toast.s1.body',
          hot: '[data-snippet="Toast"]',
        },
        {
          target: '#composants',
          titleKey: 'ui.recipe.toast.s2.title',
          bodyKey: 'ui.recipe.toast.s2.body',
          hot: '[data-snippet="ErrorBanner"]',
        },
      ],
    },
  ];

  var presentIndex = -1;
  var presentSections = [];
  var recipeId = '';
  var recipeStep = 0;
  var activeSceneId = '';

  function slugifyScene(name) {
    var s = String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || 'scene';
  }

  function readScenes() {
    try {
      var raw = localStorage.getItem(SCENES_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeScenes(list) {
    write(SCENES_KEY, JSON.stringify(list.slice(0, 12)));
  }

  function captureSceneState() {
    return {
      app: currentTheme.id,
      scheme: currentScheme,
      lang: lang,
      density: currentDensity,
      pair: pairA && pairB ? pairA + ',' + pairB : '',
      inspect: inspectOn ? '1' : '',
      section: sectionFocus || '',
      hash: (location.hash || '').replace(/^#/, ''),
    };
  }

  function applySceneState(state) {
    if (!state || typeof state !== 'object') return;
    if (state.lang && LANGS.indexOf(state.lang) !== -1) {
      lang = state.lang;
      write(LANG_KEY, lang);
      applyLang(lang);
    }
    if (state.density) currentDensity = applyDensity(state.density);
    if (state.scheme) {
      currentScheme = state.scheme;
      write(SCHEME_KEY, currentScheme);
    }
    if (state.app) {
      var theme = themeById(state.app);
      currentTheme = theme;
      write(APP_KEY, theme.id);
      pushRecent(theme.id);
    }
    if (state.pair && state.pair.indexOf(',') !== -1) {
      var parts = state.pair.split(',');
      pairA = parts[0] || pairA;
      pairB = parts[1] || pairB;
      write(PAIR_A_KEY, pairA);
      write(PAIR_B_KEY, pairB);
    }
    applyScheme(currentScheme, currentTheme);
    syncSchemeInputs(currentScheme, currentTheme);
    applyTheme(currentTheme);
    setInspect(state.inspect === '1');
    setSectionFocus(state.section || '');
    if (state.hash) {
      var el = document.getElementById(state.hash);
      if (el) el.scrollIntoView({ block: 'start' });
    }
    renderGenerated();
    syncUrl();
  }

  function sceneUrl(scene) {
    var url = new URL(location.href);
    var st = scene.state || {};
    url.searchParams.set('scene', scene.id);
    url.searchParams.set('app', st.app || 'generic');
    url.searchParams.set('scheme', st.scheme || 'system');
    if (st.lang) url.searchParams.set('lang', st.lang);
    else url.searchParams.delete('lang');
    setOrDrop(url, 'density', st.density === 'comfort' ? '' : st.density || '');
    setOrDrop(url, 'pair', st.pair || '');
    setOrDrop(url, 'inspect', st.inspect || '');
    setOrDrop(url, 'section', st.section || '');
    url.hash = st.hash ? '#' + st.hash : '';
    return url.toString();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text) ? Promise.resolve() : Promise.reject();
      });
    }
    return legacyCopy(text) ? Promise.resolve() : Promise.reject();
  }

  function renderScenes() {
    var list = document.getElementById('sr-scene-list');
    if (!list) return;
    list.textContent = '';
    var scenes = readScenes();
    if (!scenes.length) {
      var empty = document.createElement('li');
      empty.textContent = t(
        'ui.scenes.empty',
        'Aucune scène enregistrée sur cet appareil.'
      );
      list.appendChild(empty);
      return;
    }
    scenes.forEach(function (scene) {
      var li = document.createElement('li');
      if (scene.id === activeSceneId) li.setAttribute('aria-current', 'true');
      var main = document.createElement('div');
      var title = document.createElement('p');
      title.className = 'sr-scene-title';
      title.textContent = scene.name;
      main.appendChild(title);
      var meta = document.createElement('div');
      meta.className = 'sr-scene-meta';
      ['app', 'scheme', 'section'].forEach(function (key) {
        if (!scene.state || !scene.state[key]) return;
        var chip = document.createElement('span');
        chip.className = 'sr-scene-chip';
        chip.textContent = key + ' · ' + scene.state[key];
        meta.appendChild(chip);
      });
      main.appendChild(meta);
      li.appendChild(main);
      var actions = document.createElement('div');
      actions.className = 'sr-scene-actions';
      var open = document.createElement('button');
      open.type = 'button';
      open.className = 'sr-app-link';
      open.textContent = t('ui.scenes.apply', 'Ouvrir');
      open.addEventListener('click', function () {
        activeSceneId = scene.id;
        applySceneState(scene.state);
        renderScenes();
      });
      var copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'sr-app-link';
      copy.textContent = t('ui.scenes.copy', 'Copier le lien');
      copy.addEventListener('click', function () {
        copyText(sceneUrl(scene)).then(function () {
          copy.textContent = t('ui.copied', 'Copié');
          window.setTimeout(function () {
            copy.textContent = t('ui.scenes.copy', 'Copier le lien');
          }, 1200);
        });
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'sr-app-link';
      del.textContent = t('ui.scenes.delete', 'Supprimer');
      del.addEventListener('click', function () {
        writeScenes(
          readScenes().filter(function (s) {
            return s.id !== scene.id;
          })
        );
        if (activeSceneId === scene.id) activeSceneId = '';
        renderScenes();
        syncUrl();
      });
      actions.appendChild(open);
      actions.appendChild(copy);
      actions.appendChild(del);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function setupScenes() {
    var dialog = document.getElementById('sr-scenes');
    var openBtn = document.getElementById('sr-scenes-open');
    var saveBtn = document.getElementById('sr-scene-save');
    var nameInput = document.getElementById('sr-scene-name');
    if (!dialog || !openBtn) return;
    function openScenes() {
      renderScenes();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      if (nameInput) nameInput.focus();
    }
    openBtn.addEventListener('click', openScenes);
    if (saveBtn && nameInput) {
      saveBtn.addEventListener('click', function () {
        var name = nameInput.value.trim();
        if (!name) {
          nameInput.focus();
          return;
        }
        var id = slugifyScene(name);
        var scenes = readScenes().filter(function (s) {
          return s.id !== id;
        });
        scenes.unshift({ id: id, name: name, state: captureSceneState() });
        writeScenes(scenes);
        activeSceneId = id;
        nameInput.value = '';
        renderScenes();
        syncUrl();
      });
    }
    var fromUrl = paramOr('scene', '');
    if (fromUrl) activeSceneId = fromUrl;
  }

  function presentSectionsList() {
    return Array.prototype.slice.call(
      document.querySelectorAll('main .sr-section[id]')
    );
  }

  function setPresent(on, index) {
    if (!on) {
      presentIndex = -1;
      root.removeAttribute('data-present');
      document
        .querySelectorAll('[data-present-current]')
        .forEach(function (el) {
          el.removeAttribute('data-present-current');
        });
      var barOff = document.getElementById('sr-present-bar');
      if (barOff) barOff.hidden = true;
      return;
    }
    presentSections = presentSectionsList();
    if (!presentSections.length) return;
    presentIndex = Math.max(
      0,
      Math.min(index || 0, presentSections.length - 1)
    );
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

  function setupPresent() {
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

  function clearRecipeHot() {
    document.querySelectorAll('.sr-recipe-hot').forEach(function (el) {
      el.classList.remove('sr-recipe-hot');
    });
  }

  function recipeById(id) {
    for (var i = 0; i < RECIPES.length; i += 1) {
      if (RECIPES[i].id === id) return RECIPES[i];
    }
    return null;
  }

  function renderRecipe() {
    var panel = document.getElementById('sr-recipe');
    var rail = document.getElementById('sr-recipe-rail');
    var title = document.getElementById('sr-recipe-title');
    var body = document.getElementById('sr-recipe-body');
    var meta = document.getElementById('sr-recipe-meta');
    var next = document.getElementById('sr-recipe-next');
    if (!panel || !rail) return;
    rail.textContent = '';
    RECIPES.forEach(function (recipe) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'listitem');
      btn.textContent = t(recipe.titleKey, recipe.id);
      if (recipe.id === recipeId) btn.setAttribute('aria-current', 'true');
      btn.addEventListener('click', function () {
        startRecipe(recipe.id);
      });
      rail.appendChild(btn);
    });
    var recipe = recipeById(recipeId);
    if (!recipe) {
      panel.hidden = true;
      clearRecipeHot();
      return;
    }
    panel.hidden = false;
    var step = recipe.steps[recipeStep] || recipe.steps[0];
    if (title) title.textContent = t(step.titleKey, step.titleKey);
    if (body) body.textContent = t(step.bodyKey, step.bodyKey);
    if (meta)
      meta.textContent = t('ui.recipe.meta', 'Étape {n} / {total}')
        .replace('{n}', String(recipeStep + 1))
        .replace('{total}', String(recipe.steps.length));
    if (next)
      next.textContent =
        recipeStep >= recipe.steps.length - 1
          ? t('ui.recipe.finish', 'Terminer')
          : t('ui.recipe.next', 'Étape suivante');
    clearRecipeHot();
    var target = document.querySelector(step.target);
    if (target) target.scrollIntoView({ block: 'start' });
    var hot = document.querySelector(step.hot || step.target);
    if (hot) hot.classList.add('sr-recipe-hot');
  }

  function startRecipe(id) {
    recipeId = id || RECIPES[0].id;
    recipeStep = 0;
    renderRecipe();
  }

  function stopRecipe() {
    recipeId = '';
    recipeStep = 0;
    renderRecipe();
  }

  function setupRecipes() {
    var start = document.getElementById('sr-recipe-start');
    var skip = document.getElementById('sr-recipe-skip');
    var next = document.getElementById('sr-recipe-next');
    if (start)
      start.addEventListener('click', function () {
        startRecipe(RECIPES[0].id);
      });
    if (skip) skip.addEventListener('click', stopRecipe);
    if (next)
      next.addEventListener('click', function () {
        var recipe = recipeById(recipeId);
        if (!recipe) return;
        if (recipeStep >= recipe.steps.length - 1) stopRecipe();
        else {
          recipeStep += 1;
          renderRecipe();
        }
      });
  }

  function checklistAppId() {
    var select = document.getElementById('apps-checklist-app');
    return (select && select.value) || '';
  }

  function adoptionEntry(appId) {
    var data = globalThis.SHOWROOM_ADOPTION;
    if (!data || !data.apps) return null;
    return data.apps[appId] || null;
  }

  function checkStatus(entry, check) {
    if (!entry) return 'ko';
    var symbols = entry.symbols || [];
    var kept = entry.kept || [];
    var names = [check.symbol].concat(check.alts || []);
    for (var i = 0; i < names.length; i += 1) {
      if (symbols.indexOf(names[i]) !== -1) return 'ok';
    }
    for (var k = 0; k < kept.length; k += 1) {
      if (names.indexOf(kept[k].exported) !== -1) return 'kept';
    }
    return 'ko';
  }

  function renderChecklist() {
    var host = document.getElementById('apps-checklist');
    var select = document.getElementById('apps-checklist-app');
    var list = document.getElementById('apps-checklist-list');
    var summary = document.getElementById('apps-checklist-summary');
    if (!host || !select || !list) return;
    var data = globalThis.SHOWROOM_ADOPTION;
    if (!data || !data.measured) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    var ids = Object.keys(data.apps || {}).sort();
    var previous = select.value;
    select.textContent = '';
    ids.forEach(function (id) {
      var opt = document.createElement('option');
      opt.value = id;
      var theme = themeById(id);
      opt.textContent = theme ? themeDisplayName(theme) : id;
      select.appendChild(opt);
    });
    if (previous && ids.indexOf(previous) !== -1) select.value = previous;
    else if (ids.indexOf(currentTheme.id) !== -1)
      select.value = currentTheme.id;
    else if (ids.length) select.value = ids[0];

    var entry = adoptionEntry(select.value);
    list.textContent = '';
    var ok = 0;
    var keptN = 0;
    var ko = 0;
    ADOPTION_CHECKS.forEach(function (check) {
      var status = checkStatus(entry, check);
      if (status === 'ok') ok += 1;
      else if (status === 'kept') keptN += 1;
      else ko += 1;
      var li = document.createElement('li');
      var mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = status === 'ok' ? '✓' : status === 'kept' ? '·' : '×';
      var label = document.createElement('a');
      label.href = check.href;
      label.textContent = check.symbol;
      var badge = document.createElement('span');
      badge.className =
        status === 'ok'
          ? 'sr-check-ok'
          : status === 'kept'
            ? 'sr-check-kept'
            : 'sr-check-ko';
      badge.textContent =
        status === 'ok'
          ? t('ui.check.present', 'présent')
          : status === 'kept'
            ? t('ui.check.kept', 'équivalent local')
            : t('ui.check.absent', 'absent');
      li.appendChild(mark);
      li.appendChild(label);
      li.appendChild(badge);
      list.appendChild(li);
    });
    if (summary) {
      summary.textContent = t(
        'ui.check.summary',
        '{ok} présents · {kept} locaux · {ko} absents'
      )
        .replace('{ok}', String(ok))
        .replace('{kept}', String(keptN))
        .replace('{ko}', String(ko));
    }
  }

  function setupChecklist() {
    var select = document.getElementById('apps-checklist-app');
    var copy = document.getElementById('apps-checklist-copy');
    if (select && !select.dataset.bound) {
      select.dataset.bound = '1';
      select.addEventListener('change', renderChecklist);
    }
    if (copy && !copy.dataset.bound) {
      copy.dataset.bound = '1';
      copy.addEventListener('click', function () {
        var entry = adoptionEntry(checklistAppId());
        var gaps = ADOPTION_CHECKS.filter(function (check) {
          return checkStatus(entry, check) !== 'ok';
        }).map(function (check) {
          var st = checkStatus(entry, check);
          return (
            check.symbol +
            ' — ' +
            (st === 'kept'
              ? t('ui.check.kept', 'équivalent local')
              : t('ui.check.absent', 'absent'))
          );
        });
        var text = gaps.length
          ? gaps.join('\n')
          : t('ui.check.none', 'Aucun écart sur cette checklist.');
        copyText(text).then(function () {
          copy.textContent = t('ui.copied', 'Copié');
          window.setTimeout(function () {
            copy.textContent = t('ui.check.copy', 'Copier les écarts');
          }, 1200);
        });
      });
    }
    renderChecklist();
  }

  function themeCssText() {
    var scheme =
      currentScheme === 'dark' ||
      (currentScheme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : 'light';
    var pal = paletteForTheme(currentTheme, scheme) || {};
    var lines = [
      ':root[data-app="' +
        currentTheme.id +
        '"][data-theme="' +
        scheme +
        '"] {',
    ];
    ROLES.forEach(function (role) {
      var value = pal[role[0]];
      if (value) lines.push('  ' + role[1] + ': ' + value + ';');
    });
    if (pal.bgImage && pal.bgImage !== 'none')
      lines.push('  --ds-bg-image: ' + pal.bgImage + ';');
    if (currentTheme.fontDisplay)
      lines.push('  --ds-font-display: ' + currentTheme.fontDisplay + ';');
    if (currentTheme.radius)
      lines.push('  --ds-radius: ' + currentTheme.radius + ';');
    lines.push('}');
    return lines.join('\n');
  }

  function setupExportCss() {
    var btn = document.getElementById('sr-export-css');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      var css = themeCssText();
      var blob = new Blob([css + '\n'], { type: 'text/css;charset=utf-8' });
      var scheme =
        root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      downloadBlob(blob, 'theme-' + currentTheme.id + '-' + scheme + '.css');
      var prev = btn.textContent;
      btn.textContent = t('ui.css.done', 'CSS prêt');
      window.setTimeout(function () {
        btn.textContent = prev || t('ui.css.cta', 'Exporter le CSS');
      }, 1400);
    });
  }

  function fluidPx(widthPx, minRem, vw, maxRem) {
    var rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    var preferred = (vw / 100) * widthPx;
    var lo = minRem * rem;
    var hi = maxRem * rem;
    return Math.min(hi, Math.max(lo, preferred));
  }

  function renderViewportTwin() {
    var panes = [
      ['sr-viewport-phone', 390],
      ['sr-viewport-desk', 1280],
    ];
    panes.forEach(function (pane) {
      var host = document.getElementById(pane[0]);
      if (!host) return;
      host.textContent = '';
      FLUID_TYPE.forEach(function (row) {
        var li = document.createElement('li');
        var sample = document.createElement('span');
        sample.className = 'sr-vp-sample';
        var px = fluidPx(pane[1], row.min, row.vw, row.max);
        sample.style.fontSize = px.toFixed(1) + 'px';
        sample.textContent = 'Aa · ' + row.label;
        var meta = document.createElement('span');
        meta.className = 'sr-vp-px';
        meta.textContent = px.toFixed(1) + ' px';
        li.appendChild(sample);
        li.appendChild(meta);
        host.appendChild(li);
      });
    });
  }

  watchRail();
  setupSommaire();
  setupCompactHeader();
  document.addEventListener(
    'toggle',
    function (event) {
      if (event.target instanceof HTMLDetailsElement && event.target.open) {
        scheduleScrollLabels();
      }
    },
    true
  );
  window.addEventListener('resize', scheduleScrollLabels, { passive: true });
  setupPrefs();
  setupThemePicker();
  setupDock();
  setupCheatsheet();
  setupExportReview();
  setupTour();
  setupScenes();
  setupPresent();
  setupRecipes();
  setupExportCss();
  setupChecklist();

  currentDensity = applyDensity(currentDensity);
  applyScheme(currentScheme, currentTheme);
  syncSchemeInputs(currentScheme, currentTheme);
  applyLang(initialLang);
  renderGenerated();
  setupNews();
  setupInspect();
  setupSectionFocus();
  syncPrefsBadge();
  syncUrl();
  setupCommand();

  // Une ancre peut viser l'intérieur d'un `<details>` replié : les liens
  // `#doc-…` des arbres de décision menaient à une fiche invisible, et le
  // navigateur ne déplie rien. On déplie le chemin, puis on y amène la vue
  // et le focus. Les autres ancres gardent le comportement natif.
  function revelerAncre() {
    var id = decodeURIComponent(location.hash.slice(1));
    var cible = id && document.getElementById(id);
    if (cible && cible.closest('details:not([open])')) focusDestination(cible);
  }
  window.addEventListener('hashchange', revelerAncre);
  revelerAncre();
  applyFocusFromUrl();

  /* Recherche unifiée. Ctrl+K (⌘K) et « / » y amènent le curseur.
     Sections, composants, apps — et filtre de la vitrine Apps. */
  function setupCommand() {
    var input = document.getElementById('sr-cmd');
    var list = document.getElementById('sr-cmd-list');
    if (!input || !list) return;

    function kinds() {
      return {
        section: t('ui.cmd.section', 'Section'),
        component: t('ui.cmd.component', 'Composant'),
        app: t('ui.cmd.app', 'Application'),
        filter: t('ui.cmd.filter', 'Filtrer'),
        token: t('ui.cmd.token', 'Token'),
        action: t('ui.cmd.action', 'Action'),
      };
    }

    function index() {
      var out = [];
      document.querySelectorAll('.sr-rail a[href^="#"]').forEach(function (a) {
        var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
        var href = a.getAttribute('href');
        if (label && href)
          out.push({ kind: 'section', label: label, href: href });
      });
      catalogueItems().forEach(function (item) {
        out.push({ kind: 'component', label: item.id, href: item.href });
      });
      APPS.forEach(function (item) {
        out.push({
          kind: 'app',
          label: item.name || item.id,
          href: '#app-' + item.id,
        });
      });
      var styles = getComputedStyle(root);
      ROLES.forEach(function (role) {
        var value = styles.getPropertyValue(role[1]).trim();
        out.push({
          kind: 'token',
          label: role[1] + (value ? ' · ' + value : ''),
          href: '#couleurs',
          token: role[1],
          value: value,
          search: (
            role[0] +
            ' ' +
            role[1] +
            ' ' +
            role[2] +
            ' ' +
            value
          ).toLowerCase(),
        });
        if (value) {
          out.push({
            kind: 'action',
            label: t('ui.cmd.copyToken', 'Copier {token}').replace(
              '{token}',
              role[1]
            ),
            copy: value,
            search: (role[0] + ' ' + role[1] + ' copy copier').toLowerCase(),
          });
        }
      });
      return out;
    }

    function go(hit) {
      if (hit.copy) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(hit.copy).catch(function () {});
        }
        return;
      }
      if (hit.filter != null) {
        appQuery = hit.filter;
        renderAppGrid();
        renderViewChip();
        syncUrl();
        focusDestination(document.getElementById('apps'));
        return;
      }
      var href = hit.href;
      if (href.charAt(0) === '#') {
        var target = document.getElementById(href.slice(1));
        if (target) {
          focusDestination(target);
          if (history.replaceState) {
            var url = new URL(location.href);
            url.hash = href;
            history.replaceState(null, '', url);
          }
        } else {
          location.hash = href;
        }
      } else {
        location.href = href;
      }
    }

    attachCommandCombobox({
      input: input,
      list: list,
      idPrefix: 'sr-cmd-hit',
      emptyLabel: t('ui.cmd.empty', 'Aucun résultat'),
      emptyClass: 'sr-cmd-empty',
      getItems: function (query) {
        var term = query.trim();
        var hits = filterCommandItems(index(), query, { limit: 7 });
        hits.unshift({
          kind: 'filter',
          label: t('ui.cmd.filterApps', 'Apps contenant « {q} »').replace(
            '{q}',
            term
          ),
          filter: term,
          href: '#apps',
        });
        return hits;
      },
      renderItem: function (hit, i, selected) {
        var labels = kinds();
        var li = document.createElement('li');
        li.id = 'sr-cmd-hit-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(selected));
        var kind = document.createElement('span');
        kind.className = 'sr-cmd-kind';
        kind.textContent = labels[hit.kind] || hit.kind;
        var name = document.createElement('span');
        name.textContent = hit.label;
        li.appendChild(kind);
        li.appendChild(name);
        return li;
      },
      onSelect: go,
    });
  }
})();
