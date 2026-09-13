// Les deux règles de nommage des contextes exigés, chacune écrite depuis la
// panne qu'elle empêche.
//
// Les deux ont réellement gelé un dépôt, à cinq jours d'intervalle : un job
// devenu matriciel les 10–13/09/2026 sur ce dépôt, puis le risque de basculer
// un ruleset sur un job encore en PR, rencontré le 13/09 sur `mister-quota`.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  indiceMatrice,
  jamaisHorsPROuverte,
} from '../scripts/rulesets-contextes.mjs';

/** Le relevé que `checksObserves` produit, monté à la main. */
function vus({ defaut = [], fermees = [], ouvertes = [] } = {}) {
  return {
    defaut: new Set(defaut),
    fermees: new Set(fermees),
    ouvertes: new Set(ouvertes),
    toutes: new Set([...defaut, ...fermees, ...ouvertes]),
  };
}

test('un job qui ne vit que dans une PR OUVERTE est refusé', () => {
  // L'état exact de `mister-quota` le 13/09/2026, entre l'ouverture de sa PR
  // #25 et sa fusion : le portail tournait déjà sur la PR, mais `main` ne le
  // portait pas. L'exiger là aurait gelé toute PR ouverte ensuite.
  const releve = vus({
    defaut: ['typecheck · test · build (20.x)'],
    fermees: ['typecheck · test · build (20.x)'],
    ouvertes: ['typecheck · test · build (20.x)', 'Toute la CI est verte'],
  });
  assert.deepEqual(jamaisHorsPROuverte(['Toute la CI est verte'], releve), [
    'Toute la CI est verte',
  ]);
});

test("un check réservé aux PR passe, parce qu'il a tourné sur des PR FERMÉES", () => {
  // « Revue des dépendances » ne s'exécute que sur `pull_request` : il est
  // absent de la branche par défaut POUR TOUJOURS. Le refuser bloquerait un
  // ruleset parfaitement sain — c'est l'état des PR, pas le fait d'être une
  // PR, qui distingue les deux cas.
  const releve = vus({
    defaut: ['ci / Format · Lint · Type · Test · Build'],
    fermees: ['Revue des dépendances'],
    ouvertes: ['Revue des dépendances'],
  });
  assert.deepEqual(jamaisHorsPROuverte(['Revue des dépendances'], releve), []);
});

test('un contexte présent sur la branche par défaut passe', () => {
  const releve = vus({
    defaut: ['Toute la CI est verte'],
    ouvertes: ['Toute la CI est verte'],
  });
  assert.deepEqual(jamaisHorsPROuverte(['Toute la CI est verte'], releve), []);
});

test('un contexte que rien ne rapporte nulle part ne relève pas de cette règle', () => {
  // Celui-là est attrapé en amont, par le refus « aucun job ne le rapporte ».
  // Cette fonction-ci ne parle que du cas « vu, mais au mauvais endroit ».
  assert.deepEqual(jamaisHorsPROuverte(['Inexistant'], vus()), []);
});

test('indiceMatrice nomme les entrées réelles du job devenu matriciel', () => {
  // La panne du 10/09/2026 : `In-repo config parse` avait cessé d'exister au
  // profit d'un contexte par entrée de matrice, et rien ne le disait.
  const releve = vus({
    defaut: [
      'In-repo config parse (Node 22)',
      'In-repo config parse (Node 26.2.0)',
    ],
  });
  const message = indiceMatrice('In-repo config parse', releve);
  assert.match(message, /MATRICIEL/);
  assert.match(message, /In-repo config parse \(Node 22\)/);
  assert.match(message, /In-repo config parse \(Node 26\.2\.0\)/);
});

test("indiceMatrice se tait quand le nom n'est pas un préfixe de matrice", () => {
  // Sans cette retenue, tout contexte absent se verrait attribuer une cause
  // matricielle qui n'est pas la sienne.
  const releve = vus({ defaut: ['Autre chose', 'In-repo config parsing (x)'] });
  assert.equal(indiceMatrice('In-repo config parse', releve), '');
});
