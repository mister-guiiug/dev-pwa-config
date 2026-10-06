/**
 * La Content-Security-Policy du showroom, et l'empreinte de ses scripts en
 * ligne.
 *
 * POURQUOI UNE CSP SUR UNE PAGE DE DOCUMENTATION. Le showroom partage l'origine
 * `mister-guiiug.github.io` avec toute la famille. Une injection de script ici
 * lirait le `localStorage` des vingt applications, où dorment par exemple les
 * sessions Supabase (`persistSession: true`). La politique est posée en
 * `<meta>` : Pages ne permet pas d'en-têtes HTTP.
 *
 * `script-src` est limité au CHEMIN de publication, pas à `'self'` : `'self'`
 * couvrirait toute l'origine, donc les fichiers de tous les autres dépôts.
 * C'est aussi ce qui ferait échouer un import qui sortirait de `showroom/`,
 * comme l'ancien `../command.js`.
 *
 * Dépendance : `node:crypto` seulement. Le job de publication n'installe rien,
 * et le serveur local s'en sert aussi.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { createHash } from 'node:crypto';

/** L'adresse publiée du showroom : la seule source de scripts et de feuilles. */
export const SHOWROOM_URL = 'https://mister-guiiug.github.io/dev-pwa-config/';

const META_CSP =
  /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/;

/**
 * Le contenu des `<script>` en ligne qui S'EXÉCUTENT. Un bloc de données
 * (`application/ld+json`) n'est pas un script pour la CSP.
 *
 * La balise fermante se lit comme le navigateur la lit : `</script >` et
 * `</SCRIPT>` ferment aussi l'élément. Sinon l'expression courrait jusqu'à
 * la fermante suivante : l'empreinte ne serait pas celle du script, que la
 * CSP bloquerait (CodeQL js/bad-tag-filter).
 *
 * @param {string} html
 * @returns {string[]}
 */
export function scriptsEnLigne(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)]
    .filter(([, attributs]) => {
      if (/\ssrc=/.test(attributs)) return false;
      const type = /\stype="([^"]*)"/.exec(attributs)?.[1];
      return !type || /^(module|(text|application)\/javascript)$/.test(type);
    })
    .map(([, , corps]) => corps);
}

/**
 * L'empreinte CSP d'un script en ligne, telle que la calcule le navigateur :
 * sur le texte de l'élément, fins de ligne normalisées par l'analyseur HTML.
 *
 * @param {string} corps
 */
export function empreinteCsp(corps) {
  const texte = corps.replace(/\r\n?/g, '\n');
  return `'sha256-${createHash('sha256').update(texte, 'utf8').digest('base64')}'`;
}

/**
 * La politique posée dans la page, découpée en directives.
 *
 * @param {string} html
 * @returns {Map<string, string[]> | null}
 */
export function directivesCsp(html) {
  const lu = META_CSP.exec(html);
  if (!lu) return null;
  const directives = new Map();
  for (const morceau of lu[2].split(';')) {
    const [nom, ...sources] = morceau.trim().split(/\s+/);
    if (nom) directives.set(nom, sources);
  }
  return directives;
}

/**
 * Réécrit les empreintes de `script-src` d'après les scripts en ligne de la
 * page : une empreinte par script, aucune de trop. Les autres directives ne
 * bougent pas.
 *
 * @param {string} html
 */
export function avecEmpreintesCsp(html) {
  const lu = META_CSP.exec(html);
  if (!lu) {
    throw new Error(
      'showroom/index.html : <meta http-equiv="Content-Security-Policy"> introuvable'
    );
  }
  const empreintes = scriptsEnLigne(html).map(empreinteCsp);
  const directives = lu[2]
    .split(';')
    .map(morceau => morceau.trim())
    .filter(Boolean)
    .map(morceau => {
      const [nom, ...sources] = morceau.split(/\s+/);
      if (nom !== 'script-src') return morceau;
      const gardees = sources.filter(s => !/^'sha(256|384|512)-/.test(s));
      return [nom, ...gardees, ...empreintes].join(' ');
    });
  return html.replace(
    META_CSP,
    (_tout, avant, _politique, apres) => avant + directives.join('; ') + apres
  );
}

/**
 * La même page, sa politique tournée vers une autre adresse. Le serveur local
 * s'en sert : sur `http://127.0.0.1:5220/dev-pwa-config/`, une politique qui
 * n'autorise que l'adresse publiée bloquerait tous les scripts.
 *
 * @param {string} html
 * @param {string} base adresse de remplacement, terminée par `/`
 */
export function politiquePour(html, base) {
  return html.replace(
    META_CSP,
    (_tout, avant, politique, apres) =>
      avant + politique.split(SHOWROOM_URL).join(base) + apres
  );
}
