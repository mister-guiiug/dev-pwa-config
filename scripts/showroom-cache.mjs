#!/usr/bin/env node
/**
 * Cohérence du cache du showroom : `?v=<empreinte>` sur tout ce que charge la
 * page.
 *
 * POURQUOI. Pages sert chaque fichier avec `Cache-Control: max-age=600`, et
 * leurs noms ne portent aucune empreinte. Pendant dix minutes après une
 * publication, un `index.html` neuf pouvait donc tourner avec un `showroom.js`
 * ancien, ou l'inverse : identifiants introuvables, clés de traduction
 * absentes. Une empreinte du CONTENU dans l'URL fait de chaque version un
 * fichier distinct pour tous les caches.
 *
 * Les modules s'importent entre eux : l'empreinte d'un module dépend de celles
 * qu'il écrit dans ses imports. Elles se calculent donc des feuilles vers la
 * racine, puis vient `index.html`, que rien n'importe.
 *
 * Dépendances : `node:crypto` et `node:fs`. `npm run sync` s'en sert (avec
 * Prettier pour mettre en forme), et le job de publication aussi, après avoir
 * réécrit `metrics.js`, sans rien installer.
 *
 *   node scripts/showroom-cache.mjs --write   réécrit les empreintes
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { importsDe } from './showroom-imports.mjs';
import { estPointDEntree } from './entree.mjs';

/** Dix caractères hexadécimaux : 40 bits, largement assez pour un dossier. */
export const LONGUEUR = 10;

const DOSSIER = new URL('../showroom/', import.meta.url);

/** L'empreinte d'un contenu, fins de ligne normalisées. */
export function empreinte(contenu) {
  return createHash('sha256')
    .update(String(contenu).replace(/\r\n?/g, '\n'), 'utf8')
    .digest('hex')
    .slice(0, LONGUEUR);
}

/** `./a.js?v=x#y` → `a.js` ; `null` si le spécificateur n'est pas local. */
export function nomLocal(specificateur) {
  if (!/^\.\/[^/]+$/.test(specificateur.replace(/[?#].*$/, ''))) return null;
  return specificateur.replace(/[?#].*$/, '').slice(2);
}

/**
 * Réécrit le `?v=` de chaque import local d'un module.
 *
 * @param {string} source
 * @param {(nom: string) => string} versionDe empreinte du fichier visé
 */
export function avecVersionsDImports(source, versionDe) {
  const imports = importsDe(source)
    .map(i => ({ ...i, nom: nomLocal(i.specificateur) }))
    .filter(i => i.nom)
    .sort((a, b) => b.start - a.start);
  let out = source;
  for (const i of imports) {
    out =
      out.slice(0, i.start) +
      `./${i.nom}?v=${versionDe(i.nom)}` +
      out.slice(i.end);
  }
  return out;
}

// `src` d'un script, `href` d'un lien : les fichiers .js et .css du dossier.
// Une URL avec un schéma (`data:`, `https:`) n'est jamais réécrite.
const RESSOURCE =
  /(<(?:script|link)\b[^>]*?\s(?:src|href)=")([^"#?:/]+\.(?:js|css))(?:\?v=[0-9a-f]*)?(")/g;

/** Les ressources locales que charge la page, dans l'ordre. */
export function ressourcesHtml(html) {
  return [...html.matchAll(RESSOURCE)].map(m => m[2]);
}

/**
 * Réécrit le `?v=` de chaque ressource locale de la page.
 *
 * @param {string} html
 * @param {(nom: string) => string} versionDe
 */
export function avecVersionsHtml(html, versionDe) {
  return html.replace(
    RESSOURCE,
    (_tout, avant, nom, apres) => `${avant}${nom}?v=${versionDe(nom)}${apres}`
  );
}

/**
 * Calcule les empreintes du dossier, des feuilles vers la racine, en
 * réécrivant au passage les imports des modules.
 *
 * @param {{ lire: (nom: string) => string,
 *   ecrire: (nom: string, contenu: string) => Promise<string> }} acces
 *   `ecrire` rend le contenu FINAL (après une éventuelle mise en forme) :
 *   c'est lui qu'on empreinte.
 * @returns {Promise<(nom: string) => string>}
 */
export async function empreintesDuDossier({ lire, ecrire }) {
  const memo = new Map();
  const enCours = new Set();
  const calculer = async nom => {
    if (memo.has(nom)) return memo.get(nom);
    if (enCours.has(nom))
      throw new Error(`showroom : cycle d'imports via ${nom}`);
    enCours.add(nom);
    let contenu = lire(nom);
    if (nom.endsWith('.js')) {
      const cibles = importsDe(contenu)
        .map(i => nomLocal(i.specificateur))
        .filter(Boolean);
      const versions = new Map();
      for (const cible of cibles) versions.set(cible, await calculer(cible));
      const neuf = avecVersionsDImports(contenu, c => versions.get(c));
      if (neuf !== contenu) contenu = await ecrire(nom, neuf);
    }
    enCours.delete(nom);
    const v = empreinte(contenu);
    memo.set(nom, v);
    return v;
  };
  const noms = readdirSync(DOSSIER).filter(n => /\.(js|css)$/.test(n));
  for (const nom of noms) await calculer(nom);
  return nom => {
    if (!memo.has(nom)) throw new Error(`showroom : ${nom} introuvable`);
    return memo.get(nom);
  };
}

/** Accès disque au dossier du showroom ; `mettreEnForme` est facultatif. */
export function accesDisque(mettreEnForme = async (_nom, contenu) => contenu) {
  const chemin = nom => fileURLToPath(new URL(nom, DOSSIER));
  return {
    lire: nom => readFileSync(chemin(nom), 'utf8'),
    ecrire: async (nom, contenu) => {
      const final = await mettreEnForme(chemin(nom), contenu);
      writeFileSync(chemin(nom), final);
      return final;
    },
  };
}

async function main() {
  if (!process.argv.includes('--write')) {
    console.error('Usage : node scripts/showroom-cache.mjs --write');
    process.exit(2);
  }
  const acces = accesDisque();
  const versionDe = await empreintesDuDossier(acces);
  const html = acces.lire('index.html');
  const neuf = avecVersionsHtml(html, versionDe);
  if (neuf !== html) await acces.ecrire('index.html', neuf);
  console.log(
    `showroom : empreintes de cache à jour (${ressourcesHtml(neuf).length} ressources).`
  );
}

if (estPointDEntree(import.meta.url)) await main();
