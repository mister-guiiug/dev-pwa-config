/*
 * Tableaux et blocs de code : les copies de jetons, les cellules étiquetées
 * pour la lecture en cartes, et les blocs défilants nommés et atteignables
 * au clavier. Rejoués après chaque rendu engendré.
 */

import { etat } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { copyButton } from './presse-papier.js?v=8913ceeeb8';

/**
 * Bouton de copie sur chaque nom de token et chaque sélecteur listé.
 *
 * Une custom property est copiée SOUS SA FORME UTILISABLE — `var(--x)` et
 * non `--x`. Ce qu'on colle doit marcher sans retouche ; coller `--x` dans
 * une déclaration en fait une variable qu'on redéfinit, pas qu'on lit. Les
 * sélecteurs `[data-dwc='…']`, eux, se copient tels quels.
 */
export function attachTokenCopies() {
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
export function labelTableCells() {
  document.querySelectorAll('.sr-table').forEach(function (table) {
    var heads = [].map.call(table.querySelectorAll('thead th'), function (th) {
      return th.textContent.trim();
    });
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
            ).replace('{name}', etat.pgCurrent)
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
export function scheduleScrollLabels() {
  if (scrollLabelsPending) return;
  scrollLabelsPending = true;
  var plusTard = window.requestAnimationFrame || window.setTimeout;
  plusTard(function () {
    scrollLabelsPending = false;
    labelScrollableTables();
  });
}
