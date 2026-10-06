/**
 * Les modules ES du showroom, lus depuis leur point d'entrée.
 *
 * Jusqu'au 06/10/2026, le code de la page tenait dans `showroom/showroom.js`
 * seul, et les tests y cherchaient ce qu'ils vérifient (une clé de stockage,
 * un libellé, une règle d'impression). Il est désormais découpé en modules :
 * les tests lisent le graphe entier, suivi depuis `showroom.js` par le même
 * lecteur d'imports que le cache et la résolution, et non une liste de
 * fichiers qui vieillirait à chaque module ajouté.
 *
 * Sans dépendance (Node seul) : le job de publication rejoue ces tests sans
 * rien installer. Non publié (absent de `files`).
 */
import { readFileSync } from 'node:fs';
import { importsDe } from './showroom-imports.mjs';

const DOSSIER = new URL('../showroom/', import.meta.url);

/**
 * Les modules atteints depuis l'entrée, entrée comprise et en premier.
 *
 * @param {string} [entree]
 * @returns {Map<string, string>} nom du fichier → source
 */
export function modulesDuShowroom(entree = 'showroom.js') {
  const out = new Map();
  const visiter = nom => {
    if (out.has(nom)) return;
    const source = readFileSync(new URL(nom, DOSSIER), 'utf8');
    out.set(nom, source);
    for (const { specificateur } of importsDe(source)) {
      const local = /^\.\/([\w.-]+\.js)(?:\?.*)?$/.exec(specificateur);
      if (local) visiter(local[1]);
    }
  };
  visiter(entree);
  return out;
}

/** Leur code bout à bout : ce que les tests cherchaient dans showroom.js. */
export function codeDuShowroom() {
  return [...modulesDuShowroom().values()].join('\n');
}

/**
 * Le source d'une fonction de premier niveau, où qu'elle vive : de sa
 * déclaration à son accolade fermante, en colonne 0 une fois Prettier passé.
 *
 * @param {string} nom
 */
export function sourceDeFonction(nom) {
  const debut = new RegExp(`^(?:export )?(?:async )?function ${nom}\\b`, 'm');
  for (const source of modulesDuShowroom().values()) {
    const i = source.search(debut);
    if (i === -1) continue;
    const fin = source.indexOf('\n}\n', i);
    return source.slice(i, fin === -1 ? source.length : fin + 2);
  }
  throw new Error(`showroom : fonction ${nom} introuvable`);
}
