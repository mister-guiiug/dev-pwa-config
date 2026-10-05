/**
 * Le français source de chaque clé de traduction du showroom, et l'empreinte
 * qu'il avait quand la traduction anglaise a été écrite.
 *
 * LE DÉFAUT QUE CECI FERME. Les tests de traduction vérifiaient que chaque
 * clé EXISTE en anglais, jamais qu'elle dit encore la même chose : réécrire un
 * paragraphe français laissait l'anglais périmé, en silence. On garde donc, à
 * côté de chaque clé anglaise, l'empreinte du français qu'elle traduit.
 *
 * - `npm run sync` ajoute l'empreinte d'une clé NOUVELLE (sa traduction vient
 *   d'être écrite), retire celle d'une clé disparue, et ne touche JAMAIS à une
 *   empreinte devenue fausse : il la signale.
 * - `test/showroom-i18n.test.mjs` échoue tant qu'une empreinte ne correspond
 *   plus au français.
 * - Une fois l'anglais relu : `npm run sync -- --traductions-revues`.
 *
 * Le français vient de trois endroits : le HTML (`data-i18n`, contenu ;
 * `data-i18n-aria`, `aria-label`) et les replis littéraux des appels
 * `t('clé', 'repli')` des modules. Les clés construites (`'theme.' + id`)
 * tirent leur français des données : elles restent hors de ce relevé.
 *
 * Dépendances : `node:crypto`, `node:fs` et jsdom (devDependency : `npm run
 * sync` et les tests l'ont, le job de publication ne s'en sert pas).
 * Non publié (absent de `files`).
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { jetons } from './showroom-imports.mjs';

const DOSSIER = new URL('../showroom/', import.meta.url);
export const FICHIER_EMPREINTES = new URL(
  '../test/showroom-i18n-empreintes.json',
  import.meta.url
);

// Fichiers de données : chargés par `<script src>`, aucun appel `t()`.
const DONNEES = new Set([
  'adoption.js',
  'apps.js',
  'catalogue.js',
  'i18n.js',
  'metrics.js',
  'screenshots.js',
  'snippets.js',
  'themes.js',
]);

/** Le texte, blancs réduits : une remise en forme par Prettier ne compte pas. */
export function normaliser(texte) {
  return String(texte).replace(/\s+/g, ' ').trim();
}

/** Empreinte courte d'un texte français normalisé. */
export function empreinteTexte(texte) {
  return createHash('sha256')
    .update(normaliser(texte), 'utf8')
    .digest('hex')
    .slice(0, 12);
}

/** Les replis français littéraux des appels `t('clé', 'repli')`. */
export function replisDuCode(source) {
  const t = jetons(source);
  const out = new Map();
  for (let k = 0; k + 4 < t.length; k += 1) {
    const [nom, ouvre, cle, virgule, repli] = t.slice(k, k + 5);
    if (
      nom.type === 'ident' &&
      nom.value === 't' &&
      ouvre.type === 'punct' &&
      ouvre.value === '(' &&
      cle.type === 'str' &&
      virgule.type === 'punct' &&
      virgule.value === ',' &&
      repli.type === 'str'
    ) {
      // Un repli concaténé (`'a' + x`) n'est pas un texte fixe : on l'ignore.
      const suite = t[k + 5];
      if (suite?.type === 'punct' && suite.value === '+') continue;
      if (!out.has(cle.value)) out.set(cle.value, repli.value);
    }
  }
  return out;
}

/**
 * Le contenu des éléments `data-i18n`, et les `aria-label` traduisibles, lus
 * par un vrai analyseur HTML : c'est `innerHTML` que la page capture au
 * chargement, et c'est lui que la traduction remplace.
 */
export function sourcesDuHtml(html) {
  const doc = new JSDOM(html).window.document;
  const out = new Map();
  for (const el of doc.querySelectorAll('[data-i18n]')) {
    if (!out.has(el.dataset.i18n)) out.set(el.dataset.i18n, el.innerHTML);
  }
  for (const el of doc.querySelectorAll('[data-i18n-aria]')) {
    const cle = el.dataset.i18nAria;
    if (!out.has(cle)) out.set(cle, el.getAttribute('aria-label') ?? '');
  }
  return out;
}

/** Toutes les sources françaises connues, clé par clé. */
export function sourcesFrancaises() {
  const sources = sourcesDuHtml(
    readFileSync(new URL('index.html', DOSSIER), 'utf8')
  );
  for (const nom of readdirSync(DOSSIER).filter(
    n => n.endsWith('.js') && !DONNEES.has(n)
  )) {
    const code = readFileSync(new URL(nom, DOSSIER), 'utf8');
    for (const [cle, repli] of replisDuCode(code)) {
      if (!sources.has(cle)) sources.set(cle, repli);
    }
  }
  return sources;
}

/** Les empreintes enregistrées : `{ en: { clé: empreinte } }`. */
export function lireEmpreintes() {
  try {
    return JSON.parse(readFileSync(FICHIER_EMPREINTES, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Les empreintes à jour, et ce qui reste à relire.
 *
 * @param {Record<string, Record<string, string>>} dictionnaires `SHOWROOM_I18N`
 * @param {Record<string, Record<string, string>>} enregistrees
 * @param {{ revues?: boolean }} [options] `revues` : l'anglais a été relu,
 *   toutes les empreintes sont remises au français courant.
 */
export function empreintesAJour(dictionnaires, enregistrees, options = {}) {
  const sources = sourcesFrancaises();
  const neuves = {};
  const aRelire = [];
  for (const [langue, dict] of Object.entries(dictionnaires)) {
    const avant = enregistrees[langue] ?? {};
    const apres = {};
    for (const cle of Object.keys(dict).sort()) {
      if (!sources.has(cle)) continue;
      const courante = empreinteTexte(sources.get(cle));
      if (!(cle in avant) || options.revues) apres[cle] = courante;
      else {
        apres[cle] = avant[cle];
        if (avant[cle] !== courante) aRelire.push(`${langue} : ${cle}`);
      }
    }
    neuves[langue] = apres;
  }
  return { empreintes: neuves, aRelire };
}
