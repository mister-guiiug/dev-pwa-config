/*
 * Ce qui sort de la page : la fiche de revue d'un thème, et le CSS de ses
 * variables, prêt à coller dans une app.
 */

import { etat, root } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { ROLES, themeDisplayName } from './communs.js?v=0f95ffd5f1';
import { paletteForTheme } from './palettes.js?v=039110034f';

export function setupExportReview() {
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
  var pal = paletteForTheme(etat.currentTheme, scheme) || {};
  var bg = pal.surface || (scheme === 'dark' ? '#161b22' : '#ffffff');
  var text = pal.text || (scheme === 'dark' ? '#e6e9ef' : '#14181f');
  var primary = pal.primary || text;
  var soft = pal.primarySoft || pal.surface2 || bg;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = text;
  ctx.font = '700 22px Segoe UI, system-ui, sans-serif';
  ctx.fillText(themeDisplayName(etat.currentTheme), 24, 40);
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
          downloadBlob(blob, 'showroom-' + etat.currentTheme.id + '.png');
          done();
        });
    } else {
      downloadBlob(blob, 'showroom-' + etat.currentTheme.id + '.png');
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

function themeCssText() {
  var scheme =
    etat.currentScheme === 'dark' ||
    (etat.currentScheme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light';
  var pal = paletteForTheme(etat.currentTheme, scheme) || {};
  var lines = [
    ':root[data-app="' +
      etat.currentTheme.id +
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
  if (etat.currentTheme.fontDisplay)
    lines.push('  --ds-font-display: ' + etat.currentTheme.fontDisplay + ';');
  if (etat.currentTheme.radius)
    lines.push('  --ds-radius: ' + etat.currentTheme.radius + ';');
  lines.push('}');
  return lines.join('\n');
}

export function setupExportCss() {
  var btn = document.getElementById('sr-export-css');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', function () {
    var css = themeCssText();
    var blob = new Blob([css + '\n'], { type: 'text/css;charset=utf-8' });
    var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    downloadBlob(blob, 'theme-' + etat.currentTheme.id + '-' + scheme + '.css');
    var prev = btn.textContent;
    btn.textContent = t('ui.css.done', 'CSS prêt');
    window.setTimeout(function () {
      btn.textContent = prev || t('ui.css.cta', 'Exporter le CSS');
    }, 1400);
  });
}
