// La mesure de similarité qui trie les candidats à la promotion : ce qu'elle
// doit dire d'une copie littérale, d'un homonyme, et de ce qui n'est pas du
// code (commentaires, espaces). Importer le module ne lance PAS le balayage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lignesNormalisees,
  motifNom,
  similarite,
  TROP_COMMUNS,
} from '../scripts/promotion-candidates.mjs';

const copieA = `
export function createId(prefix = 'id'): string {
  const rnd = crypto.randomUUID().slice(0, 8);
  return \`\${prefix}_\${rnd}\`;
}
`;

test('une copie littérale vaut 1, deux sources disjointes valent 0', () => {
  const a = lignesNormalisees(copieA);
  assert.equal(similarite(a, lignesNormalisees(copieA)), 1);
  assert.equal(
    similarite(a, lignesNormalisees('export const PALETTE = ["#fff"];')),
    0
  );
  assert.equal(
    similarite(new Set(), a),
    0,
    'un fichier vide ne ressemble à rien'
  );
});

test('les espaces et les commentaires ne comptent pas', () => {
  // Le même code, réindenté et commenté : c'est la copie que Prettier et un
  // en-tête différent déguisent, et c'est celle qu'il faut voir.
  const b = `
  /** Identifiants courts, stables, sans dépendance externe. */
  // promu ?
  export function createId(prefix = 'id'): string {
      const rnd = crypto.randomUUID().slice(0, 8);
      return \`\${prefix}_\${rnd}\`;
  }
  `;
  assert.equal(similarite(lignesNormalisees(copieA), lignesNormalisees(b)), 1);
});

test('un homonyme reste bas : même signature, corps différent', () => {
  // `addDays` de mister-footcoach (chaîne ISO) contre celui du socle (Date) —
  // le cas du 01/09 : une seule ligne en commun sur une dizaine.
  const chaine = `
export function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
`;
  const date = `
export function addDays(date: Date, n: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}
`;
  const s = similarite(lignesNormalisees(chaine), lignesNormalisees(date));
  assert.ok(s < 0.3, `attendu un homonyme (< 0,30), obtenu ${s.toFixed(2)}`);
});

test('le motif d’un nom échappe tout, et ne matche que le nom entier', () => {
  // La clé par nom de fichier porte des points : sans échappement,
  // `vite.config` matcherait `viteXconfig`, et `a(b` ferait lever `RegExp`.
  assert.ok(motifNom('vite.config').test("import './vite.config'"));
  assert.ok(!motifNom('vite.config').test('viteXconfig'));
  assert.ok(!motifNom('Card').test('CardHeader'), 'le nom entier seulement');
  assert.ok(motifNom('Card').test('<Card className="x">'));
  assert.doesNotThrow(() => motifNom('a(b'));
  assert.doesNotThrow(() => motifNom('c:\\d$'));
});

test('les noms trop communs sont écartés du balayage', () => {
  for (const nom of ['default', 'App', 'main', 'config', 'types'])
    assert.ok(TROP_COMMUNS.has(nom), `${nom} devrait être écarté`);
  assert.ok(!TROP_COMMUNS.has('AppHeader'), 'un vrai candidat ne l’est pas');
});
