/**
 * Cœur i18n PUR — logique de résolution et d'interpolation, sans React.
 * Séparé de `i18n.js` pour être testable sans la dépendance React (le package
 * ne l'installe pas ; ses tests `node --test` tourneraient sinon en skip).
 */

/** Résout une clé dot-notation (`a.b.c`) dans un objet de messages. */
export function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) return acc[key];
    return undefined;
  }, obj);
}

/** Remplace les placeholders `{nom}` par les valeurs de `params`. */
export function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(params[key] ?? `{${key}}`)
  );
}

/**
 * Fabrique une fonction de traduction pour une locale : résout la clé, repli sur
 * `fallbackLocale` puis sur la clé brute si absente, interpole les placeholders.
 *
 * @param {Record<string, any>} messages - dictionnaire par locale
 * @param {string} locale - locale courante
 * @param {string} fallbackLocale - locale de repli
 * @returns {(path: string, params?: Record<string, string | number>) => string}
 */
export function createTranslator(messages, locale, fallbackLocale) {
  const primary = messages[locale] ?? messages[fallbackLocale];
  const fallback = messages[fallbackLocale];
  return (path, params) => {
    const resolved = resolvePath(primary, path);
    if (typeof resolved === 'string') return interpolate(resolved, params);
    const fb = resolvePath(fallback, path);
    return typeof fb === 'string' ? interpolate(fb, params) : path;
  };
}

/**
 * Choisit la forme correcte selon la quantité, via `Intl.PluralRules`.
 *
 * Le cœur i18n interpolait `{count}` mais ne savait pas accorder : chaque app
 * écrivait donc son propre ternaire `n > 1 ? …`. Ce ternaire est faux dès qu'on
 * sort du français — l'anglais n'accorde pas comme le français à zéro, et les
 * langues slaves ont trois à quatre formes. `Intl` connaît les règles ; il n'y
 * a aucune raison de les réécrire.
 *
 *   plural(0, { one: '{count} élément', other: '{count} éléments' })
 *   → « 0 élément »  en français, « 0 items » en anglais.
 *
 * `{count}` est interpolé automatiquement. Une forme `zero` est honorée quand
 * elle est fournie, même si la langue n'en a pas : « Aucun élément » se dit
 * mieux que « 0 élément ».
 *
 * @param {number} count
 * @param {Record<string, string>} forms Formes CLDR : zero, one, two, few, many, other.
 * @param {string} [locale]
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function plural(count, forms, locale = 'fr', params) {
  if (!Number.isFinite(count)) return '';
  if (count === 0 && typeof forms.zero === 'string') {
    return interpolate(forms.zero, { count, ...params });
  }
  let category = 'other';
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    /* locale inconnue : on garde `other` */
  }
  const template = forms[category] ?? forms.other ?? '';
  return interpolate(template, { count, ...params });
}
