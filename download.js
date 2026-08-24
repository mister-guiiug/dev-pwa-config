/**
 * Télécharger et relire un fichier, côté navigateur.
 *
 * PROMU, PAS INVENTÉ — et c'est la duplication la plus large du parc.
 * **Douze apps sur seize** recopient la même danse : `URL.createObjectURL`,
 * une ancre fabriquée à la volée, `click()`, puis `revokeObjectURL`. Personne
 * ne l'a inventée deux fois : elle circule par copier-coller, et chaque copie
 * a sa variante — certaines oublient `revokeObjectURL` et fuient un peu de
 * mémoire à chaque export, d'autres n'attachent pas l'ancre au document, ce
 * qui ne déclenche rien sur Firefox.
 *
 * Trois apps portent en plus la paire export/import JSON de sauvegarde
 * (miss-genius, miss-uwh, mister-cim10) et `dateSlug()` pour nommer le fichier.
 *
 * CE QUI N'EST PAS REPRIS : la FORME des données sauvegardées. Ce qu'une app
 * met dans son export lui appartient — c'est son métier. Le paquet ne prend que
 * la mécanique, qui est identique partout.
 *
 * SANS DÉPENDANCE, SANS REACT. Demande un DOM (c'est un téléchargement).
 */

/** Date du jour en `AAAA-MM-JJ`, pour nommer un fichier. */
export function dateSlug(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Provoque le téléchargement d'un blob.
 *
 * L'ancre est ATTACHÉE au document avant le clic puis retirée : détachée, elle
 * ne déclenche rien sur Firefox — défaut présent dans deux des douze copies.
 * L'URL d'objet est révoquée dans un `finally`, y compris si le clic lève.
 *
 * @returns {boolean} `false` si aucun DOM n'est disponible.
 */
export function downloadBlob(blob, filename) {
  const doc = globalThis.document;
  if (!doc?.createElement || !globalThis.URL?.createObjectURL) return false;
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  doc.body.appendChild(anchor);
  try {
    anchor.click();
    return true;
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

/** Télécharge une valeur sérialisable en JSON indenté. */
export function downloadJson(data, filename) {
  const text = JSON.stringify(data, null, 2);
  return downloadBlob(new Blob([text], { type: 'application/json' }), filename);
}

/** Télécharge du texte brut (CSV, Markdown, journal…). */
export function downloadText(
  text,
  filename,
  type = 'text/plain;charset=utf-8'
) {
  return downloadBlob(new Blob([String(text ?? '')], { type }), filename);
}

/**
 * Relit un fichier choisi par l'utilisateur et rend l'objet JSON.
 *
 * Lève sur un JSON invalide, au lieu de rendre `false` comme le faisait
 * mister-cim10 : un import raté doit pouvoir dire POURQUOI à l'utilisateur,
 * et un booléen ne le permet pas.
 *
 * @param {Blob} file
 * @returns {Promise<unknown>}
 */
export async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}
