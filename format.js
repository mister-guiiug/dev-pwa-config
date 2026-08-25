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
 * LOCALE. Chaque fonction accepte une locale en dernier argument. Le défaut
 * n'est plus la constante `'fr-FR'` : c'est `getDefaultLocale()`, que
 * `setDefaultLocale` déplace.
 *
 * POURQUOI CE CHANGEMENT. Mesure sur les seize apps : **78 sites de formatage
 * à locale figée** — 27 constructions `Intl.*('xx-XX', …)` et 51 appels
 * `toLocale*('fr-FR')`. L'utilisateur bascule en anglais, les libellés
 * changent, les nombres et les dates restent français. Ce module reproduisait
 * exactement le défaut qu'il devait corriger : `'fr-FR'` écrit en dur onze
 * fois, donc insensible à `setLocale`.
 *
 * `createI18n` appelle désormais `setDefaultLocale` à chaque changement de
 * langue : une app sous i18n obtient le bon formatage sans toucher un seul
 * appel. Une app sans i18n garde `'fr-FR'`, exactement comme avant.
 */

/* ── La locale par défaut ───────────────────────────────────────────────── */

/**
 * Locale par défaut du module. Mutable À DESSEIN : c'est le seul point où une
 * app peut faire suivre le formatage à sa langue courante sans réécrire ses
 * appels. `createI18n` la pose ; un appel explicite l'emporte toujours.
 */
let defaultLocale = 'fr-FR';

/**
 * Déplace la locale par défaut. Une valeur vide ou non-chaîne est ignorée :
 * mieux vaut garder le français que formater avec `undefined`.
 *
 * @param {string} tag Étiquette BCP-47 (`'en-GB'`, `'es-ES'`…).
 */
export function setDefaultLocale(tag) {
  if (typeof tag === 'string' && tag.trim()) defaultLocale = tag.trim();
}

/** Locale par défaut courante. */
export function getDefaultLocale() {
  return defaultLocale;
}

/**
 * Fabriques `Intl` mémorisées.
 *
 * POURQUOI. Construire un `Intl.NumberFormat` coûte cher — c'est la raison
 * pour laquelle la documentation d'`Intl` recommande de réutiliser
 * l'instance. Les fonctions ci-dessous en construisaient une PAR APPEL, donc
 * une par ligne de liste. Le cache est clé par `(locale, options)` sérialisées.
 */
const INTL_CACHE = new Map();
// Borné : la clé contient les options sérialisées, qu'un appelant peut faire
// varier à l'infini (une date formatée avec un fuseau par ligne). Au-delà, on
// vide plutôt que de garder une carte qui grossit pour la vie de l'onglet.
const INTL_CACHE_MAX = 64;

function intl(Ctor, name, locale, options) {
  const key = `${name}|${locale}|${JSON.stringify(options ?? {})}`;
  let instance = INTL_CACHE.get(key);
  if (!instance) {
    if (INTL_CACHE.size >= INTL_CACHE_MAX) INTL_CACHE.clear();
    instance = new Ctor(locale, options);
    INTL_CACHE.set(key, instance);
  }
  return instance;
}

const numberFormat = (locale, options) =>
  intl(Intl.NumberFormat, 'n', locale, options);
const dateFormat = (locale, options) =>
  intl(Intl.DateTimeFormat, 'd', locale, options);
const relativeFormat = (locale, options) =>
  intl(Intl.RelativeTimeFormat, 'r', locale, options);

/** Convertit une entrée en `Date`, ou `null` si elle n'en est pas une. */
function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ── Nombres ────────────────────────────────────────────────────────────── */

/** Montant monétaire (`1 234,50 €`). */
export function formatCurrency(
  amount,
  locale = defaultLocale,
  currency = 'EUR'
) {
  if (!Number.isFinite(amount)) return '';
  return numberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** Nombre avec séparateurs de milliers. */
export function formatNumber(value, locale = defaultLocale, options = {}) {
  if (!Number.isFinite(value)) return '';
  return numberFormat(locale, options).format(value);
}

/**
 * Pourcentage. `value` est la PROPORTION (0,42 → « 42 % »), pas déjà multipliée
 * par cent : c'est la convention d'`Intl`, et les copies s'en écartaient chacune
 * à leur façon.
 */
export function formatPercentage(value, locale = defaultLocale, digits = 0) {
  if (!Number.isFinite(value)) return '';
  return numberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/* ── Dates ─────────────────────────────────────────────────────────────── */

/** Date courte (`12 août 2026`). */
export function formatDate(date, locale = defaultLocale, options = {}) {
  const value = toDate(date);
  if (!value) return '';
  return dateFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(value);
}

/** Date et heure (`12 août 2026, 14:05`). */
export function formatDateTime(date, locale = defaultLocale, options = {}) {
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
export function formatRelativeTime(
  date,
  locale = defaultLocale,
  now = Date.now()
) {
  const value = toDate(date);
  if (!value) return '';
  const reference = now instanceof Date ? now.getTime() : now;
  const seconds = Math.round((value.getTime() - reference) / 1000);
  const rtf = relativeFormat(locale, { numeric: 'auto' });

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

/**
 * Taille de fichier lisible (`1,4 Mo`, `1.4 MB`).
 *
 * L'UNITÉ SUIT LA LANGUE. Elle était écrite en français dans le tableau
 * (`['o','ko','Mo',…]`), donc une app en anglais affichait « 1,4 Mo ».
 * `Intl.NumberFormat` avec `style: 'unit'` rend les bonnes unités partout, et
 * les mêmes qu'avant en français. Le tableau reste le repli si `style: 'unit'`
 * manque.
 *
 * UNE DIFFÉRENCE VISIBLE, ET VOULUE. L'espace avant l'unité devient une espace
 * fine insécable (U+202F) au lieu d'une espace ordinaire : « 1,4 Mo » ne se
 * coupe plus en fin de ligne. C'est déjà le séparateur que `formatNumber`
 * produit pour les milliers — cette fonction était la seule à s'en écarter,
 * parce qu'elle assemblait sa chaîne à la main. Une comparaison de chaînes
 * écrite avec une espace ordinaire échoue donc désormais.
 */
const BYTE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
const BYTE_UNITS_FR = ['o', 'ko', 'Mo', 'Go', 'To'];

export function formatBytes(bytes, locale = defaultLocale, digits = 1) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const maximumFractionDigits = unit === 0 ? 0 : digits;
  try {
    return numberFormat(locale, {
      style: 'unit',
      unit: BYTE_UNITS[unit],
      maximumFractionDigits,
    }).format(value);
  } catch {
    const formatted = numberFormat(locale, { maximumFractionDigits }).format(
      value
    );
    return `${formatted} ${BYTE_UNITS_FR[unit]}`;
  }
}

/* ── Un jeu de formateurs lié à une locale ─────────────────────────────── */

/**
 * Les mêmes fonctions, la locale déjà posée.
 *
 * CE QUE ÇA REMPLACE. Un composant qui affiche dix nombres écrivait dix fois
 * `formatNumber(v, locale)` — ou, dans la mesure réelle, dix fois
 * `toLocaleString('fr-FR')`, ce qui est la même chose en pire. Ici la locale
 * est capturée une fois, à l'endroit où elle est connue : le fournisseur i18n.
 *
 * `createI18n` expose le résultat sous `fmt`, si bien qu'un appelant écrit
 * `fmt.number(v)` sans jamais nommer de locale — et suit donc automatiquement
 * la langue choisie.
 *
 * @param {string} [locale] Étiquette BCP-47. Défaut : `getDefaultLocale()`.
 * @param {{ currency?: string }} [options] Devise de `currency()` (défaut EUR).
 */
export function createFormatters(locale = defaultLocale, options = {}) {
  const { currency = 'EUR' } = options;
  return {
    locale,
    currency: (value, code = currency) => formatCurrency(value, locale, code),
    number: (value, opts) => formatNumber(value, locale, opts),
    percent: (value, digits) => formatPercentage(value, locale, digits),
    date: (value, opts) => formatDate(value, locale, opts),
    dateTime: (value, opts) => formatDateTime(value, locale, opts),
    relative: (value, now) => formatRelativeTime(value, locale, now),
    bytes: (value, digits) => formatBytes(value, locale, digits),
    list: (values, opts) => formatList(values, locale, opts),
  };
}

/**
 * Énumération dans la langue (`« a, b et c »`, `« a, b, and c »`).
 *
 * `Intl.ListFormat` n'est pas partout : le repli joint par la virgule, ce que
 * les apps font déjà à la main — mais alors avec un « et » français figé.
 *
 * @param {readonly unknown[]} values
 * @param {string} [locale]
 * @param {Intl.ListFormatOptions} [options]
 */
export function formatList(values, locale = defaultLocale, options = {}) {
  const items = (Array.isArray(values) ? values : [])
    .filter(value => value != null && value !== '')
    .map(String);
  if (items.length === 0) return '';
  try {
    return intl(Intl.ListFormat, 'l', locale, {
      style: 'long',
      type: 'conjunction',
      ...options,
    }).format(items);
  } catch {
    return items.join(', ');
  }
}
