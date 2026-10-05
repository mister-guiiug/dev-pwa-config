/**
 * Les imports d'un module ES du showroom, lus SANS dépendance.
 *
 * POURQUOI PAS UN ANALYSEUR. Le job de publication du showroom ne fait pas
 * `npm ci` : ses gardes tournent avec Node seul. Or c'est précisément là que
 * la résolution des imports doit être vérifiée, juste avant de téléverser
 * `showroom/` et rien d'autre. Ce lecteur découpe le source en jetons
 * (commentaires, chaînes, gabarits, expressions régulières) : un chemin cité
 * dans un commentaire ou dans une chaîne n'est donc jamais pris pour un import.
 *
 * Il sert aussi à `npm run sync`, qui réécrit `?v=<empreinte>` dans les
 * spécificateurs : il lui faut leur position exacte dans le source.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */

// Ce qui, juste avant une barre oblique, en fait le début d'une expression
// régulière et non une division.
const PONCTUATION_AVANT_REGEX = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '<',
  '>',
  '~',
  '^',
]);
const MOTS_AVANT_REGEX = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
]);

/**
 * @typedef {{ type: 'str', value: string, start: number, end: number }
 *   | { type: 'ident' | 'punct', value: string }
 *   | { type: 'tmpl' | 'regex' | 'num' }} Jeton
 */

/**
 * Découpe un source JavaScript en jetons utiles à la lecture des imports.
 *
 * @param {string} source
 * @returns {Jeton[]}
 */
export function jetons(source) {
  /** @type {Jeton[]} */
  const out = [];
  const n = source.length;
  // Profondeur d'accolades, et celle à laquelle chaque `${` a été ouvert.
  let profondeur = 0;
  /** @type {number[]} */
  const gabarits = [];
  let i = 0;

  const regexPermise = () => {
    const p = out[out.length - 1];
    if (!p) return true;
    if (p.type === 'punct') return PONCTUATION_AVANT_REGEX.has(p.value);
    if (p.type === 'ident') return MOTS_AVANT_REGEX.has(p.value);
    return false;
  };

  /** Lit un morceau de gabarit à partir de `j` ; rend l'index qui suit. */
  const lireGabarit = j => {
    while (j < n && source[j] !== '`') {
      if (source[j] === '\\') {
        j += 2;
        continue;
      }
      if (source[j] === '$' && source[j + 1] === '{') {
        gabarits.push(profondeur);
        out.push({ type: 'tmpl' });
        return j + 2;
      }
      j += 1;
    }
    out.push({ type: 'tmpl' });
    return j + 1;
  };

  while (i < n) {
    const c = source[i];
    if (/\s/.test(c)) {
      i += 1;
    } else if (c === '/' && source[i + 1] === '/') {
      const fin = source.indexOf('\n', i);
      i = fin === -1 ? n : fin;
    } else if (c === '/' && source[i + 1] === '*') {
      const fin = source.indexOf('*/', i + 2);
      i = fin === -1 ? n : fin + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && source[j] !== c && source[j] !== '\n') {
        if (source[j] === '\\') j += 1;
        j += 1;
      }
      out.push({
        type: 'str',
        value: source.slice(i + 1, j),
        start: i + 1,
        end: j,
      });
      i = j + 1;
    } else if (c === '`') {
      i = lireGabarit(i + 1);
    } else if (
      c === '}' &&
      gabarits.length &&
      gabarits[gabarits.length - 1] === profondeur
    ) {
      gabarits.pop();
      i = lireGabarit(i + 1);
    } else if (c === '/' && regexPermise()) {
      let j = i + 1;
      let classe = false;
      while (j < n && source[j] !== '\n') {
        const d = source[j];
        if (d === '\\') {
          j += 2;
          continue;
        }
        if (d === '[') classe = true;
        else if (d === ']') classe = false;
        else if (d === '/' && !classe) break;
        j += 1;
      }
      j += 1;
      while (j < n && /[a-z]/i.test(source[j])) j += 1;
      out.push({ type: 'regex' });
      i = j;
    } else if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(source[j])) j += 1;
      out.push({ type: 'ident', value: source.slice(i, j) });
      i = j;
    } else if (/\d/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(source[j])) j += 1;
      out.push({ type: 'num' });
      i = j;
    } else {
      if (c === '{') profondeur += 1;
      if (c === '}') profondeur -= 1;
      out.push({ type: 'punct', value: c });
      i += 1;
    }
  }
  return out;
}

/** Vrai si l'instruction qui contient le jeton `k` commence par import/export. */
function instructionDImport(t, k) {
  for (let m = k - 1; m >= 0; m -= 1) {
    const j = t[m];
    if (j.type === 'punct' && j.value === ';') return false;
    if (j.type === 'ident' && (j.value === 'import' || j.value === 'export')) {
      return true;
    }
  }
  return false;
}

/**
 * Les spécificateurs importés : `import … from`, `export … from`, `import 'x'`
 * et `import('x')` avec une chaîne littérale.
 *
 * @param {string} source
 * @returns {{ specificateur: string, start: number, end: number }[]}
 *   `start`/`end` bornent le texte du spécificateur, guillemets exclus.
 */
export function importsDe(source) {
  const t = jetons(source);
  const out = [];
  const garder = j =>
    out.push({ specificateur: j.value, start: j.start, end: j.end });
  for (let k = 0; k < t.length; k += 1) {
    const j = t[k];
    if (j.type !== 'ident') continue;
    const suivant = t[k + 1];
    const precedent = t[k - 1];
    // `objet.import('x')` est un appel de méthode, pas un import.
    if (precedent?.type === 'punct' && precedent.value === '.') continue;
    if (j.value === 'import') {
      if (suivant?.type === 'str') garder(suivant);
      else if (
        suivant?.type === 'punct' &&
        suivant.value === '(' &&
        t[k + 2]?.type === 'str'
      ) {
        garder(t[k + 2]);
      }
    } else if (
      j.value === 'from' &&
      suivant?.type === 'str' &&
      instructionDImport(t, k)
    ) {
      garder(suivant);
    }
  }
  return out;
}
