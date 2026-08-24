/**
 * Formatage — dates, nombres, monnaie, texte.
 *
 * PROMU, PAS INVENTÉ. Six apps avaient un `format.ts`, et **trois d'entre elles
 * portaient exactement la même liste de dix fonctions** (miss-carbook,
 * miss-contraction, mister-puzzle) — du copier-coller, pas une convergence
 * d'idées. Les trois autres (`formatEuro`, `formatPrice`, `fmtUnit`) sont
 * spécifiques à leur métier et restent chez elles : ce module ne prend que le
 * tronc commun.
 *
 * `Intl.NumberFormat` apparaît dans treize apps sur seize, `Intl.DateTimeFormat`
 * dans neuf. Le formatage n'est donc pas un détail local : c'est une couche que
 * chacune réimplémentait.
 *
 * SANS DÉPENDANCE, SANS DOM. Utilisable dans un test Node, un service worker ou
 * un rendu serveur — contrairement aux copies, dont `sanitizeHtml` créait un
 * élément DOM (voir `security.js`).
 *
 * LOCALE. Chaque fonction accepte une locale en dernier argument, `'fr-FR'` par
 * défaut — c'est ce que faisaient les copies. Une app multilingue passe la
 * locale courante de son `createI18n`.
 */

/** Convertit une entrée en `Date`, ou `null` si elle n'en est pas une. */
function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ── Nombres ────────────────────────────────────────────────────────────── */

/** Montant monétaire (`1 234,50 €`). */
export function formatCurrency(amount, locale = 'fr-FR', currency = 'EUR') {
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    amount
  );
}

/** Nombre avec séparateurs de milliers. */
export function formatNumber(value, locale = 'fr-FR', options = {}) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Pourcentage. `value` est la PROPORTION (0,42 → « 42 % »), pas déjà multipliée
 * par cent : c'est la convention d'`Intl`, et les copies s'en écartaient chacune
 * à leur façon.
 */
export function formatPercentage(value, locale = 'fr-FR', digits = 0) {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/* ── Dates ─────────────────────────────────────────────────────────────── */

/** Date courte (`12 août 2026`). */
export function formatDate(date, locale = 'fr-FR', options = {}) {
  const value = toDate(date);
  if (!value) return '';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(value);
}

/** Date et heure (`12 août 2026, 14:05`). */
export function formatDateTime(date, locale = 'fr-FR', options = {}) {
  return formatDate(date, locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Temps relatif (`il y a 3 jours`, `dans 2 h`).
 *
 * `numeric: 'auto'` fait dire « hier » plutôt que « il y a 1 jour » — c'est ce
 * que rend `Intl`, et c'est ce qu'attend un lecteur.
 *
 * @param {Date|string|number} date
 * @param {string} [locale]
 * @param {Date|number} [now] Référence, pour rendre la fonction testable.
 */
export function formatRelativeTime(date, locale = 'fr-FR', now = Date.now()) {
  const value = toDate(date);
  if (!value) return '';
  const reference = now instanceof Date ? now.getTime() : now;
  const seconds = Math.round((value.getTime() - reference) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const units = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return rtf.format(seconds, 'second');
}

/* ── Texte ─────────────────────────────────────────────────────────────── */

/** Tronque en ajoutant une ellipse, sans couper au milieu de rien. */
export function truncate(text, maxLength = 80, ellipsis = '…') {
  const value = String(text ?? '');
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - ellipsis.length)) + ellipsis;
}

/** Première lettre en capitale, le reste inchangé. */
export function capitalize(text) {
  const value = String(text ?? '');
  return value ? value[0].toLocaleUpperCase() + value.slice(1) : '';
}

/**
 * Identifiant d'URL à partir d'un titre.
 *
 * Les diacritiques sont décomposés PUIS retirés explicitement : les copies
 * s'appuyaient sur `[^\w-]` pour les faire disparaître au passage, ce qui
 * marchait par effet de bord. Les tirets de bord sont rognés — « Bonjour ! »
 * donnait « bonjour- » dans les copies.
 */
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Numéro de téléphone français (dix chiffres) en groupes de deux.
 * Tout ce qui n'a pas dix chiffres est renvoyé tel quel : mieux vaut afficher
 * la saisie de l'utilisateur qu'un regroupement faux.
 */
export function formatPhoneNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length !== 10) return String(phone ?? '');
  return digits.replace(
    /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
    '$1 $2 $3 $4 $5'
  );
}

/** Taille de fichier lisible (`1,4 Mo`). */
export function formatBytes(bytes, locale = 'fr-FR', digits = 1) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const units = ['o', 'ko', 'Mo', 'Go', 'To'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === 0 ? 0 : digits,
  }).format(value);
  return `${formatted} ${units[unit]}`;
}
