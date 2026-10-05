/*
 * Copie au presse-papier.
 *
 * Geste n°1 dans une doc de design system : on vient chercher un nom de
 * token, un sélecteur, un hex ou un appel de composant. La page n'en offrait
 * aucun.
 *
 * Chaque copie est annoncée par une région vivante, posée à l'évaluation de
 * ce module.
 */

import { t } from './langue.js?v=d92afbcf3f';

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

export function copyButton(getText, describedLabel) {
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
export function attachCopy(el, getText, label) {
  if (!el || el.querySelector(':scope > .sr-copy')) return;
  el.appendChild(copyButton(getText, label));
}

export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(function () {
      return legacyCopy(text) ? Promise.resolve() : Promise.reject();
    });
  }
  return legacyCopy(text) ? Promise.resolve() : Promise.reject();
}
