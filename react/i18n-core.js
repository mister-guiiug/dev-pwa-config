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
