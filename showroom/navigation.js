/*
 * Se déplacer dans la page : l'en-tête collant et sa hauteur, son repli sur
 * petit écran, le rail et le sommaire, le panneau des préférences, et
 * l'arrivée sur une ancre (titre sous l'en-tête, focus posé, `<details>`
 * ouvert s'il la cachait).
 */

import { isCommandHotkey, isSlashHotkey } from './command.js?v=822f1c9e81';
import { etat, root } from './etat.js?v=542f37cc5d';
import { browserLang, t } from './langue.js?v=d92afbcf3f';

/**
 * `smooth`, sauf si la personne a demandé moins de mouvement. La règle CSS
 * `scroll-behavior: auto` de `prefers-reduced-motion` ne couvre PAS un
 * `scrollIntoView({ behavior: 'smooth' })` : l'option du script l'emporte.
 */
export function scrollBehavior() {
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
export function syncHeaderOffset() {
  var bar = document.querySelector('.sr-topbar');
  if (bar) root.style.setProperty('--sr-header', bar.offsetHeight + 'px');
}

// Ce qui, pendant une arrivée, dit que la personne a repris la main. Seuls
// comptent les gestes qui COMMENCENT après le départ : la recherche choisit
// sur `mousedown`, et le `click` du même appui arrive ensuite.
var GESTES = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

/**
 * Garde une destination sous l'en-tête le temps que la page se mette en
 * place autour d'elle.
 *
 * Hors de l'écran, une section n'a qu'une taille estimée
 * (`content-visibility`, 1 600 px) : un saut d'ancre calcule sa destination
 * avec ces estimations, puis les sections qui entrent dans l'écran prennent
 * leur vraie taille et poussent la cible. Sur téléphone, où une section
 * dépasse souvent 6 000 px, le sommaire laissait la vue à des milliers de
 * pixels de sa destination ; et l'en-tête, qui se replie en défilant,
 * changeait sous elle la marge à dégager (relevé le 06/10/2026). On
 * réaligne donc d'image en image, jusqu'à trois images immobiles, sans
 * jamais reprendre la main après un geste de l'utilisateur, ni au-delà de
 * trois secondes.
 *
 * @param {Element} cible
 */
export function stabiliser(cible) {
  var fini = false;
  var immobiles = 0;
  var arreter = function () {
    fini = true;
    GESTES.forEach(function (type) {
      window.removeEventListener(type, arreter, true);
    });
  };
  var pas = function () {
    if (fini) return;
    syncHeaderOffset();
    var marge = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    var avant = window.scrollY;
    if (Math.abs(cible.getBoundingClientRect().top - marge) > 1) {
      cible.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    // Rien n'a bougé : alignée, ou en bas de page, où elle ne peut monter.
    immobiles = window.scrollY === avant ? immobiles + 1 : 0;
    if (immobiles >= 3) arreter();
    else window.requestAnimationFrame(pas);
  };
  GESTES.forEach(function (type) {
    window.addEventListener(type, arreter, { capture: true, passive: true });
  });
  window.setTimeout(arreter, 3000);
  window.requestAnimationFrame(pas);
}

/**
 * Les ancres natives (sommaire, liens de la page, adresse partagée avec un
 * `#`) sautent sans script : on stabilise seulement leur arrivée.
 */
export function setupArrivees() {
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    var lien =
      event.target instanceof Element && event.target.closest('a[href^="#"]');
    if (!lien) return;
    var id = decodeURIComponent(lien.getAttribute('href').slice(1));
    var cible = id && document.getElementById(id);
    // Le saut natif suit ce clic : on prend la suite.
    if (cible) {
      window.setTimeout(function () {
        stabiliser(cible);
      }, 0);
    }
  });
  var id = decodeURIComponent(location.hash.slice(1));
  var cible = id && document.getElementById(id);
  if (cible) stabiliser(cible);
}

/**
 * Amène une destination sous l'en-tête et y porte le focus : son titre si
 * elle en a un, sinon elle-même. Sans cela, après une recherche, le focus
 * restait dans le champ et la lecture d'écran ne suivait pas.
 */
export function focusDestination(target) {
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
  // taille au passage. On stabilise à l'arrivée, et jamais plus tard que
  // trois secondes (sans quoi un défilement de l'utilisateur, bien après,
  // ramènerait la vue ici).
  //
  // Et jamais après un geste de l'utilisateur : un appui, une molette ou une
  // touche pendant le trajet interrompt le défilement, et la fin de CE
  // défilement-là ramenait la vue ici, contre son geste (relevé le
  // 06/10/2026 : Ctrl+K vers les hooks, puis un lien vers la vitrine
  // avant l'arrivée, et la page revenait aux hooks).
  if (scrollBehavior() === 'smooth' && 'onscrollend' in window) {
    var fini = false;
    var arreter = function () {
      fini = true;
      window.removeEventListener('scrollend', arriver);
      GESTES.forEach(function (type) {
        window.removeEventListener(type, arreter, true);
      });
    };
    var arriver = function () {
      if (fini) return;
      arreter();
      stabiliser(target);
    };
    window.addEventListener('scrollend', arriver);
    // En capture sur `window` : le geste qui a déclenché ce trajet (l'appui
    // sur un résultat, Entrée dans la recherche) a déjà passé cette étape.
    GESTES.forEach(function (type) {
      window.addEventListener(type, arreter, { capture: true, passive: true });
    });
    window.setTimeout(arreter, 3000);
  } else {
    stabiliser(target);
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
export function setupCompactHeader() {
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
export function watchRail() {
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
export function setupSommaire() {
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
export function setupPrefs() {
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

/** Point discret quand schéma ou langue s'écartent du navigateur. */
export function syncPrefsBadge() {
  var badge = document.getElementById('sr-prefs-badge');
  if (!badge) return;
  var off = etat.currentScheme !== 'system' || etat.lang !== browserLang();
  badge.hidden = !off;
  badge.title = off
    ? t(
        'ui.prefs.custom',
        'Préférences personnalisées (schéma ou langue forcé)'
      )
    : '';
}

// Une ancre peut viser l'intérieur d'un `<details>` replié : les liens
// `#doc-…` des arbres de décision menaient à une fiche invisible, et le
// navigateur ne déplie rien. On déplie le chemin, puis on y amène la vue
// et le focus. Les autres ancres gardent le comportement natif.
export function revelerAncre() {
  var id = decodeURIComponent(location.hash.slice(1));
  var cible = id && document.getElementById(id);
  if (cible && cible.closest('details:not([open])')) focusDestination(cible);
}
