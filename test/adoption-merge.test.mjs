// Fusion des relevés d'adoption (`scripts/adoption-merge.mjs`).
//
// LE DÉFAUT, CONSTATÉ EN VRAI. `npm run adoption` lancé dans un environnement
// où un seul dépôt d'app est cloné écrivait `measured: 1` et EFFAÇAIT le relevé
// des seize autres — 1187 lignes perdues en une commande, sans un mot, et
// rattrapées seulement parce que le `git diff` était sous les yeux. La CI l'a
// confirmé ensuite : la section ADOPTION du README, engendrée depuis ce
// fichier, portait « Relevé du 2026-08-26 sur 1 dépôts » et un tableau vide.
//
// La règle qui manquait : un relevé partiel n'est pas un relevé plus récent,
// c'est une vue partielle du même objet. Personne n'ayant les dix-sept dépôts
// clonés en permanence, l'écriture fusionne.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coverageVerdict,
  indexAdoption,
  mergeAdoption,
} from '../scripts/adoption-merge.mjs';

const HIER = '2026-08-24T22:14:45.266Z';
const MAINTENANT = '2026-08-26T22:00:00.000Z';

/** Un relevé de seize apps, comme celui qui a failli disparaître. */
const precedent = {
  generatedAt: HIER,
  measured: 16,
  apps: Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [
      `app-${String(i).padStart(2, '0')}`,
      { symbols: ['FamilyApps'], duplicates: [] },
    ])
  ),
};

test('un relevé partiel n’efface pas celui des autres', () => {
  const partiel = {
    'mister-family-map': { symbols: ['AppVersion'], duplicates: [] },
  };
  const fusion = mergeAdoption(precedent, partiel, { stampedAt: MAINTENANT });

  assert.equal(
    fusion.measured,
    17,
    'les seize doivent survivre, plus la neuve'
  );
  assert.equal(fusion.measuredNow, 1);
  assert.equal(fusion.kept, 16);
  assert.deepEqual(fusion.apps['app-00'].symbols, ['FamilyApps']);
});

test('une app remesurée écrase SA propre entrée, et elle seule', () => {
  const nouveau = {
    'app-00': { symbols: ['FamilyApps', 'Button'], duplicates: [] },
  };
  const fusion = mergeAdoption(precedent, nouveau, { stampedAt: MAINTENANT });

  assert.equal(fusion.measured, 16, 'aucune app n’apparaît ni ne disparaît');
  assert.deepEqual(fusion.apps['app-00'].symbols, ['FamilyApps', 'Button']);
  assert.equal(fusion.apps['app-00'].measuredAt, MAINTENANT);
  // Les autres gardent la date du relevé dont elles viennent : sans elle, une
  // entrée vieille de six mois ressemble à une entrée d'il y a dix secondes.
  assert.equal(fusion.apps['app-01'].measuredAt, HIER);
});

test('--replace ne garde que ce qui vient d’être relevé', () => {
  const fusion = mergeAdoption(
    precedent,
    { 'app-00': { symbols: [], duplicates: [] } },
    { replace: true, stampedAt: MAINTENANT }
  );
  assert.deepEqual(Object.keys(fusion.apps), ['app-00']);
});

test('réduire la couverture est refusé, sauf --force', () => {
  const refus = coverageVerdict(precedent, 2, { replace: true });
  assert.equal(refus.refuse, true);
  assert.equal(refus.before, 16);
  assert.equal(refus.after, 2);

  const forcee = coverageVerdict(precedent, 2, { replace: true, force: true });
  assert.equal(forcee.refuse, false);
  assert.equal(forcee.warn, true, '--force doit rester bruyant');

  // La fusion, elle, ne peut rien perdre : jamais de refus sans --replace.
  assert.equal(coverageVerdict(precedent, 2, {}).refuse, false);
  // Et grandir n'a jamais rien à refuser.
  assert.equal(coverageVerdict(precedent, 17, { replace: true }).refuse, false);
});

test('sans relevé précédent, la première écriture passe', () => {
  const fusion = mergeAdoption(
    null,
    { a: { symbols: [], duplicates: [] } },
    {
      stampedAt: MAINTENANT,
    }
  );
  assert.equal(fusion.measured, 1);
  assert.equal(coverageVerdict(null, 1, { replace: true }).refuse, false);
});

test('les index sont triés — le fichier engendré ne bouge pas sans raison', () => {
  const { bySymbol, byDuplicate } = indexAdoption({
    zeta: { symbols: ['Button'], duplicates: [{ exported: 'backup' }] },
    alpha: { symbols: ['Button'], duplicates: [{ exported: 'backup' }] },
  });
  assert.deepEqual(bySymbol.Button, ['alpha', 'zeta']);
  assert.deepEqual(byDuplicate.backup, ['alpha', 'zeta']);
});

/* ── Le tableau du README, et le défaut n°1 qui y survivait ─────────────── */

/**
 * `adoptionTable` cherchait un symbole portant LE NOM DU BESOIN. Or dix des
 * vingt-sept clés ne sont le nom d'aucun export — `testing/pwa-register`,
 * `backup`, `format`, `Toast`, `links`, `useI18n`, `share`, `geo`,
 * `webVitals`, `security`. Leur colonne « Importé par » affichait donc ZÉRO par
 * construction, quel que soit le nombre d'apps ayant migré.
 *
 * Le relevé avait été corrigé le 30/08 ; le document qu'il alimente, non. Le
 * cas qui l'a révélé le 01/09 : `testing/pwa-register` annoncé `0 / 17` alors
 * que CINQ apps importent `swStub` — cinq migrations réussies, affichées comme
 * n'existant pas, dans le document qui sert à convaincre.
 */
test('le tableau compte les adoptants par les symboles LIBÉRATEURS', async () => {
  const { adoptionTable } = await import('../scripts/sync-generated.mjs');

  const releve = {
    measured: 17,
    generatedAt: '2026-09-01T00:00:00.000Z',
    bySymbol: {
      // Personne n'importe un symbole nommé « testing/pwa-register » : ce
      // n'est le nom d'aucun export. L'adoption se lit sur `swStub`.
      swStub: ['miss-dice', 'mister-molkky', 'mister-cim10'],
      pwaRegisterAlias: ['miss-dice', 'miss-badminton'],
    },
    byDuplicate: { 'testing/pwa-register': ['miss-uwh', 'mister-doc'] },
  };

  const ligne = adoptionTable(releve)
    .split('\n')
    .find(l => l.startsWith('| `testing/pwa-register`'));

  // Quatre apps distinctes : miss-dice importe les DEUX symboles et ne doit
  // compter qu'une fois.
  assert.match(ligne, /\| 4 \/ 17 \|/, `ligne obtenue : ${ligne}`);
  assert.match(ligne, /\| 2 \/ 17 \|/);
});

test('un besoin sans symboles déclarés se compte encore par son nom', () => {
  // La règle par défaut reste : `Button` est le nom d'un export, et c'est lui
  // qu'on compte. Le correctif n'est pas censé la déplacer.
  return import('../scripts/sync-generated.mjs').then(({ adoptionTable }) => {
    const ligne = adoptionTable({
      measured: 17,
      generatedAt: '2026-09-01T00:00:00.000Z',
      bySymbol: { Button: ['miss-dice', 'mister-molkky'] },
      byDuplicate: {},
    })
      .split('\n')
      .find(l => l.startsWith('| `Button`'));
    assert.match(ligne, /\| 2 \/ 17 \|/, `ligne obtenue : ${ligne}`);
  });
});
