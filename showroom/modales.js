/*
 * Les démos modales : la feuille (Sheet) et la confirmation (ConfirmDialog),
 * ouvertes sur demande, focus piégé, Échap et voile compris.
 */

var FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function setupSheet() {
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
export function setupConfirmDemo() {
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
