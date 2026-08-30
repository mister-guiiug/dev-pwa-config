/**
 * La table `EQUIVALENTS` du relevé d'adoption — l'instrument qui produit LE
 * chiffre de ce dépôt. Ce fichier existe parce qu'il s'est trompé, deux fois,
 * dans les deux sens.
 *
 * LE DÉFAUT, MESURÉ LE 30/08/2026. L'acquittement d'un besoin testait que
 * l'app importe un symbole portant LE NOM DU BESOIN. Or neuf des vingt-six
 * clés — `links`, `backup`, `format`, `Toast`, `share`, `geo`, `webVitals`,
 * `security`, `useI18n` — ne sont le nom d'AUCUN export du paquet. Ces besoins
 * étaient donc **inacquittables par construction** : sept apps pouvaient migrer
 * `links` à la perfection et rester comptées en dette pour toujours.
 *
 * Personne ne pouvait le voir en lisant la table : rien ne reliait ses clés à
 * la surface publique du paquet. C'est ce que ce test fait, et c'est tout ce
 * qu'il fait.
 *
 * Le pendant existe déjà, écrit après un défaut symétrique et consigné dans
 * `CAMPAGNE.md` : un relevé faux dans le sens FLATTEUR annonce une dette
 * éteinte que personne n'a payée. Faux dans le sens PESSIMISTE, il fait migrer
 * ce qui n'a pas à l'être et décourage en annonçant que rien ne bouge.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { EQUIVALENTS } from '../scripts/adoption-equivalents.mjs';
import { SUBPATHS } from '../scripts/adopt-plan.mjs';

const at = path => fileURLToPath(new URL(`../${path}`, import.meta.url));
const PKG = JSON.parse(readFileSync(at('package.json'), 'utf8'));

/** Tout ce que le paquet exporte, tous sous-chemins confondus. */
async function surfacePublique() {
  const noms = new Set();
  for (const [subpath, target] of Object.entries(PKG.exports)) {
    if (subpath.includes('*')) continue;
    const file = typeof target === 'string' ? target : (target.default ?? '');
    if (!file.endsWith('.js')) continue;
    try {
      for (const nom of Object.keys(await import(`../${file.slice(2)}`)))
        noms.add(nom);
    } catch {
      /* un module qui exige un DOM ou une peer absente : ignoré ici, il est
         couvert par `package-surface.test.mjs`. */
    }
  }
  return noms;
}

test('chaque besoin déclare des symboles qui EXISTENT dans le paquet', async () => {
  const publics = await surfacePublique();
  assert.ok(publics.size > 100, 'surface publique suspicieusement courte');

  const fantomes = [];
  for (const [besoin, regle] of Object.entries(EQUIVALENTS)) {
    for (const symbole of regle.symbols ?? [besoin]) {
      if (!publics.has(symbole)) fantomes.push(`${besoin} → ${symbole}`);
    }
  }

  assert.deepEqual(
    fantomes,
    [],
    `ces symboles libérateurs n'existent pas : ${fantomes.join(', ')} — le besoin serait INACQUITTABLE, et l'app resterait en dette après une migration parfaite`
  );
});

test('aucun besoin n’est acquitté par un symbole trop générique', () => {
  // `data`, `store`, `config`… seraient importés par accident depuis un autre
  // sous-chemin et éteindraient la dette sans qu'on ait rien migré. Le seuil
  // est grossier à dessein : il attrape la faute de frappe, pas le jugement.
  const suspects = [];
  for (const [besoin, regle] of Object.entries(EQUIVALENTS)) {
    for (const symbole of regle.symbols ?? [besoin]) {
      if (symbole.length < 4) suspects.push(`${besoin} → ${symbole}`);
    }
  }
  assert.deepEqual(
    suspects,
    [],
    `symboles trop courts : ${suspects.join(', ')}`
  );
});

test('chaque besoin guette au moins un nom de fichier', () => {
  for (const [besoin, regle] of Object.entries(EQUIVALENTS)) {
    assert.ok(
      Array.isArray(regle.files) && regle.files.length > 0,
      `${besoin} ne guette aucun fichier : il ne comptera jamais rien`
    );
    for (const nom of regle.files) {
      assert.match(
        nom,
        /\.(ts|tsx|js|jsx)$/,
        `${besoin} guette « ${nom} », qui n'est pas un nom de fichier source`
      );
    }
  }
});

/**
 * `EQUIVALENTS` dit QUEL FICHIER double quel besoin ; `SUBPATHS` dit PAR QUOI
 * le remplacer. Deux tables tenues à la main, dans deux fichiers, que rien ne
 * comparait — la même famille de défaut que les deux barrels `react/index`.
 * Un besoin sans sous-chemin est un blocage que le codemod signale sans savoir
 * quoi proposer.
 */
test('tout besoin mesuré a un sous-chemin de remplacement', () => {
  // Les clés se comparent ENTIÈRES : `TextField / SelectField / TextAreaField`
  // est une seule entrée des deux côtés, pas trois.
  const sansIssue = Object.keys(EQUIVALENTS)
    .filter(besoin => !(besoin in SUBPATHS))
    .sort();

  assert.deepEqual(
    sansIssue,
    [],
    `ces besoins sont comptés mais adopt-plan ne sait pas par quoi les remplacer : ${sansIssue.join(', ')}`
  );
});
